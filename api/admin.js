import { q, init, getConfig, DEFAULTS, withCode, isAdmin, wrap, text, int, slug } from './_lib/lib.js'

const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled']
const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
const list = (v, n = 20) => (Array.isArray(v) ? v : []).map((x) => text(x, 500)).filter(Boolean).slice(0, n)

const actions = {
  ping: async () => ({ ok: true }),

  // ---- dashboard & COD finance -------------------------------------------
  dashboard: async ({ from }) => {
    const rows = await q(`SELECT * FROM orders WHERE created_at >= $1 ORDER BY id DESC`, [from || '1970-01-01'])
    const s = { orders: rows.length, byStatus: {}, revenue: 0, cogs: 0, courier: 0, received: 0, pending: 0, transit: 0, open: 0, returnLoss: 0 }
    const top = {}
    for (const o of rows) {
      s.byStatus[o.status] = (s.byStatus[o.status] || 0) + 1
      if (o.status === 'delivered') {
        s.revenue += o.total
        s.cogs += o.items.reduce((t, i) => t + i.qty * (i.cost || 0), 0)
        s.courier += o.courier_cost
        if (o.settled) s.received += o.total; else s.pending += o.total
      } else if (o.status === 'shipped') s.transit += o.total
      else if (o.status === 'new' || o.status === 'confirmed') s.open += o.total
      else if (o.status === 'returned') s.returnLoss += o.courier_cost
      if (o.status !== 'cancelled' && o.status !== 'returned')
        for (const i of o.items) top[i.name] = (top[i.name] || 0) + i.qty
    }
    s.profit = s.revenue - s.cogs - s.courier - s.returnLoss
    s.top = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }))
    return { summary: s }
  },

  // ---- orders ---------------------------------------------------------------
  orders: async ({ status }) => {
    const rows = STATUSES.includes(status)
      ? await q(`SELECT * FROM orders WHERE status = $1 ORDER BY id DESC LIMIT 300`, [status])
      : await q(`SELECT * FROM orders ORDER BY id DESC LIMIT 300`)
    return { orders: rows.map(withCode) }
  },
  orderUpdate: async (d) => {
    if (d.status != null && !STATUSES.includes(d.status)) fail(400, 'Unknown status.')
    const rows = await q(
      `UPDATE orders SET
         status = COALESCE($2::text, status),
         courier_cost = COALESCE($3::int, courier_cost),
         tracking = COALESCE($4::text, tracking),
         notes = COALESCE($5::text, notes),
         settled = CASE WHEN COALESCE($2::text, status) <> 'delivered' THEN false ELSE COALESCE($6::boolean, settled) END,
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [int(d.id), d.status ?? null, d.courier_cost == null ? null : int(d.courier_cost),
        d.tracking == null ? null : text(d.tracking, 100), d.notes == null ? null : text(d.notes, 500),
        d.settled == null ? null : !!d.settled])
    if (!rows.length) fail(404, 'Order not found.')
    return { order: withCode(rows[0]) }
  },

  // ---- products ---------------------------------------------------------------
  products: async () => ({
    products: await q(`SELECT * FROM products ORDER BY sort, created_at DESC`),
    categories: await q(`SELECT id, name FROM categories ORDER BY sort, name`)
  }),
  productSave: async ({ product: p }) => {
    const name = text(p?.name, 120)
    if (!name) fail(400, 'Suit name is required.')
    const price = int(p.price, -1)
    if (price < 0) fail(400, 'Enter a valid price.')
    let id = text(p.id, 100)
    if (!id) {
      const base = slug(name)
      id = base
      for (let n = 2; (await q(`SELECT 1 FROM products WHERE id = $1`, [id])).length; n++) id = `${base}-${n}`
    }
    const rows = await q(
      `INSERT INTO products (id, name, brand, category_id, price, cost, description, details, images, active, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,(SELECT COALESCE(MIN(sort),0) - 1 FROM products))
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand, category_id = EXCLUDED.category_id,
         price = EXCLUDED.price, cost = EXCLUDED.cost, description = EXCLUDED.description, details = EXCLUDED.details,
         images = EXCLUDED.images, active = EXCLUDED.active
       RETURNING *`,
      [id, name, text(p.brand, 80), p.category_id ? int(p.category_id) : null, price, int(p.cost),
        text(p.description, 400), JSON.stringify(list(p.details)), JSON.stringify(list(p.images, 12)), p.active !== false])
    return { product: rows[0] }
  },
  productDelete: async ({ id }) => { await q(`DELETE FROM products WHERE id = $1`, [text(id, 100)]); return { ok: true } },

  // ---- categories -----------------------------------------------------------
  catSave: async ({ id, name }) => {
    const n = text(name, 80)
    if (!n) fail(400, 'Category name is required.')
    try {
      const rows = id
        ? await q(`UPDATE categories SET name = $2 WHERE id = $1 RETURNING *`, [int(id), n])
        : await q(`INSERT INTO categories (name, sort) VALUES ($1, (SELECT COALESCE(MAX(sort),0) + 1 FROM categories)) RETURNING *`, [n])
      return { category: rows[0] }
    } catch (e) { if (e.code === '23505') fail(400, 'That category already exists.'); throw e }
  },
  catDelete: async ({ id }) => { await q(`DELETE FROM categories WHERE id = $1`, [int(id)]); return { ok: true } },

  // ---- banners --------------------------------------------------------------
  banners: async () => ({ banners: await q(`SELECT * FROM banners ORDER BY sort, id`) }),
  bannerSave: async ({ banner: b }) => {
    if (!text(b?.image, 600)) fail(400, 'Please add a banner image.')
    const v = [text(b.title, 120), text(b.subtitle, 200), text(b.image, 600), text(b.link, 300), b.active !== false, int(b.sort)]
    const rows = b.id
      ? await q(`UPDATE banners SET title=$2, subtitle=$3, image=$4, link=$5, active=$6, sort=$7 WHERE id=$1 RETURNING *`, [int(b.id), ...v])
      : await q(`INSERT INTO banners (title, subtitle, image, link, active, sort) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, v)
    return { banner: rows[0] }
  },
  bannerDelete: async ({ id }) => { await q(`DELETE FROM banners WHERE id = $1`, [int(id)]); return { ok: true } },

  // ---- settings & uploads ---------------------------------------------------
  settingsGet: async () => ({ config: await getConfig() }),
  settingsSave: async ({ config: c }) => {
    const cfg = {
      announcement: text(c?.announcement, 200),
      phone: text(c?.phone, 20).replace(/\D/g, '') || DEFAULTS.phone,
      delivery_fee: int(c?.delivery_fee),
      free_above: int(c?.free_above)
    }
    await q(`INSERT INTO settings (key, value) VALUES ('config', $1::jsonb)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify(cfg)])
    return { config: cfg }
  },
  upload: async ({ dataUrl }) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '')
    if (!m) fail(400, 'Please upload a JPG, PNG or WebP image.')
    if (m[2].length > 3_000_000) fail(400, 'Image is too large.')
    const rows = await q(`INSERT INTO images (mime, data) VALUES ($1, $2) RETURNING id`, [m[1], m[2]])
    return { url: `/api/img?id=${rows[0].id}` }
  }
}

export default wrap(async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  if (!process.env.ADMIN_KEY) return res.status(503).json({ error: 'Set ADMIN_KEY in Vercel environment variables first.' })
  if (!isAdmin(req)) {
    await new Promise((r) => setTimeout(r, 500))
    return res.status(401).json({ error: 'Wrong password.' })
  }
  let b = req.body || {}
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } }
  const run = actions[b.action]
  if (!run) return res.status(400).json({ error: 'Unknown action.' })
  await init()
  res.status(200).json(await run(b))
})
