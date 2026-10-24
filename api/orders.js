import { neon } from '@neondatabase/serverless'
import catalog from '../data/products.json' with { type: 'json' }

const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, 200) : '')
const dbUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL

const ensureTable = (sql) => sql`
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    customer JSONB NOT NULL,
    items JSONB NOT NULL,
    total INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'new'
  )`

const shape = (r) => ({
  id: 'MM' + (1000 + r.id), time: r.created_at, customer: r.customer,
  items: r.items, total: r.total, status: r.status
})

export default async function handler(req, res) {
  if (req.method === 'POST') {
    let b = req.body || {}
    if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } }
    const customer = { name: clean(b.name), phone: clean(b.phone), address: clean(b.address), city: clean(b.city) }
    if (!customer.name || !customer.phone || !customer.address || !customer.city)
      return res.status(400).json({ error: 'Please fill in your name, phone, address and city.' })
    const items = (Array.isArray(b.items) ? b.items : []).map((i) => {
      const p = catalog.products.find((x) => x.id === i.id)
      const qty = Math.floor(Number(i.qty))
      return p && qty > 0 && qty <= 500 ? { id: p.id, name: p.n, brand: p.v || '', qty, price: p.price } : null
    }).filter(Boolean)
    if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' })
    if (!dbUrl()) return res.status(503).json({ error: 'Orders are not set up yet. Please order on WhatsApp.' })
    const total = items.reduce((s, l) => s + l.qty * l.price, 0)
    try {
      const sql = neon(dbUrl())
      await ensureTable(sql)
      const rows = await sql`
        INSERT INTO orders (customer, items, total)
        VALUES (${JSON.stringify(customer)}::jsonb, ${JSON.stringify(items)}::jsonb, ${total})
        RETURNING *`
      return res.status(201).json({ order: shape(rows[0]) })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'Could not save your order. Please try again or order on WhatsApp.' })
    }
  }

  if (req.method === 'GET') {
    const key = process.env.ADMIN_KEY
    if (!key) return res.status(503).json({ error: 'Set ADMIN_KEY in Vercel environment variables first.' })
    if (req.headers['x-admin-key'] !== key) return res.status(401).json({ error: 'Wrong password.' })
    if (!dbUrl()) return res.status(503).json({ error: 'Database is not connected yet.' })
    try {
      const sql = neon(dbUrl())
      await ensureTable(sql)
      const rows = await sql`SELECT * FROM orders ORDER BY id DESC LIMIT 500`
      return res.status(200).json(rows.map(shape))
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'Could not read orders.' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
