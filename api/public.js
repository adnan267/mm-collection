import { q, init, getConfig, wrap } from './_lib/lib.js'

export default wrap(async (_req, res) => {
  await init()
  const [cfg, banners, categories, products] = await Promise.all([
    getConfig(),
    q(`SELECT id, title, subtitle, image, link FROM banners WHERE active ORDER BY sort, id`),
    q(`SELECT id, name FROM categories ORDER BY sort, name`),
    q(`SELECT id, name, brand, category_id, price, description, details, images
       FROM products WHERE active ORDER BY sort, created_at DESC`)
  ])
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=120')
  res.status(200).json({
    config: { announcement: cfg.announcement, phone: cfg.phone, delivery_fee: cfg.delivery_fee, free_above: cfg.free_above },
    banners, categories, products
  })
})
