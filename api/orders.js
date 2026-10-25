import { q, init, getConfig, shipping, withCode, wrap, text } from './_lib/lib.js'

export default wrap(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  let b = req.body || {}
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } }
  const customer = { name: text(b.name), phone: text(b.phone, 30), address: text(b.address, 300), city: text(b.city, 80) }
  if (!customer.name || !customer.phone || !customer.address || !customer.city)
    return res.status(400).json({ error: 'Please fill in your name, phone, address and city.' })
  const wanted = (Array.isArray(b.items) ? b.items : [])
    .map((i) => ({ id: text(i?.id, 100), qty: Math.floor(Number(i?.qty)) }))
    .filter((i) => i.id && i.qty > 0 && i.qty <= 500)
  if (!wanted.length) return res.status(400).json({ error: 'Your cart is empty.' })

  await init()
  const prods = await q(`SELECT id, name, brand, price, cost FROM products WHERE active AND id = ANY($1::text[])`, [wanted.map((w) => w.id)])
  const items = wanted.map((w) => {
    const p = prods.find((x) => x.id === w.id)
    return p ? { id: p.id, name: p.name, brand: p.brand, qty: w.qty, price: p.price, cost: p.cost } : null
  }).filter(Boolean)
  if (!items.length) return res.status(400).json({ error: 'These suits are no longer available.' })

  const subtotal = items.reduce((s, l) => s + l.qty * l.price, 0)
  const ship = shipping(await getConfig(), subtotal)
  const rows = await q(
    `INSERT INTO orders (customer, items, subtotal, shipping, total)
     VALUES ($1::jsonb, $2::jsonb, $3, $4, $5) RETURNING *`,
    [JSON.stringify(customer), JSON.stringify(items), subtotal, ship, subtotal + ship])
  const o = withCode(rows[0])
  // The customer only needs a receipt, not our cost prices.
  res.status(201).json({ order: { id: o.code, time: o.created_at, customer, total: o.total, shipping: o.shipping,
    items: items.map(({ cost, ...rest }) => rest) } })
})
