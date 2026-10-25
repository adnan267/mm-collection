import { neon } from '@neondatabase/serverless'
import { createHash, timingSafeEqual } from 'node:crypto'
import seed from '../../data/products.json' with { type: 'json' }

// ---- database -------------------------------------------------------------
let client
export async function q(text, params = []) {
  if (globalThis.__TEST_Q__) return globalThis.__TEST_Q__(text, params)
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw Object.assign(new Error('Database is not connected yet.'), { status: 503 })
  client ||= neon(url)
  return client.query(text, params)
}

export const DEFAULTS = {
  announcement: '100% original brands · Nationwide cash on delivery · Bulk orders available',
  phone: '923007235997',
  delivery_fee: 0,
  free_above: 0
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS categories (
     id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, sort INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS products (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT '',
     category_id INT REFERENCES categories(id) ON DELETE SET NULL,
     price INT NOT NULL, cost INT NOT NULL DEFAULT 0, description TEXT NOT NULL DEFAULT '',
     details JSONB NOT NULL DEFAULT '[]', images JSONB NOT NULL DEFAULT '[]',
     active BOOLEAN NOT NULL DEFAULT true, sort INT NOT NULL DEFAULT 0,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS banners (
     id SERIAL PRIMARY KEY, title TEXT NOT NULL DEFAULT '', subtitle TEXT NOT NULL DEFAULT '',
     image TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
     active BOOLEAN NOT NULL DEFAULT true, sort INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS orders (
     id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     customer JSONB NOT NULL, items JSONB NOT NULL,
     subtotal INT NOT NULL DEFAULT 0, shipping INT NOT NULL DEFAULT 0, total INT NOT NULL,
     status TEXT NOT NULL DEFAULT 'new', courier_cost INT NOT NULL DEFAULT 0,
     tracking TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
     settled BOOLEAN NOT NULL DEFAULT false)`,
  `CREATE TABLE IF NOT EXISTS images (
     id SERIAL PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
]

let ready
export function init() {
  ready ||= (async () => {
    for (const s of SCHEMA) await q(s)
    const done = await q(`SELECT 1 FROM settings WHERE key = 'seeded'`)
    if (!done.length) await seedCatalog()
  })().catch((e) => { ready = null; throw e })
  return ready
}

// First run only: copy the starter suits from data/products.json into the database.
async function seedCatalog() {
  const label = (v) => v.replace(' | ', ' ')
  const vols = [...new Set(seed.products.map((p) => p.v).filter(Boolean))]
  for (const [i, v] of vols.entries())
    await q(`INSERT INTO categories (name, sort) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [label(v), i])
  const cats = await q(`SELECT id, name FROM categories`)
  for (const [n, p] of seed.products.entries()) {
    const cat = p.v ? cats.find((c) => c.name === label(p.v))?.id ?? null : null
    await q(
      `INSERT INTO products (id, name, brand, category_id, price, description, details, images, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.n, (p.v || '').split(' | ')[0], cat, p.price, p.t, JSON.stringify(p.c), JSON.stringify(p.i), n])
  }
  await q(`INSERT INTO settings (key, value) VALUES ('config', $1::jsonb) ON CONFLICT (key) DO NOTHING`, [JSON.stringify(DEFAULTS)])
  await q(`INSERT INTO settings (key, value) VALUES ('seeded', 'true') ON CONFLICT (key) DO NOTHING`)
}

export async function getConfig() {
  const r = await q(`SELECT value FROM settings WHERE key = 'config'`)
  return { ...DEFAULTS, ...(r[0]?.value || {}) }
}

export const shipping = (cfg, subtotal) =>
  cfg.free_above > 0 && subtotal >= cfg.free_above ? 0 : cfg.delivery_fee

export const withCode = (o) => ({ ...o, code: 'MM' + (1000 + o.id) })

// ---- helpers --------------------------------------------------------------
const hash = (s) => createHash('sha256').update(String(s)).digest()
export const isAdmin = (req) => {
  const key = process.env.ADMIN_KEY
  return !!key && timingSafeEqual(hash(key), hash(req.headers['x-admin-key'] || ''))
}

export const wrap = (fn) => async (req, res) => {
  try { await fn(req, res) } catch (e) {
    if (!e.status) console.error(e)
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong. Please try again.' })
  }
}

export const text = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const int = (v, d = 0) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : d }
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'
