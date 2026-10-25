import { q, wrap } from './_lib/lib.js'

export default wrap(async (req, res) => {
  const id = Number(req.query?.id)
  if (!Number.isInteger(id) || id < 1) return res.status(404).end()
  const r = await q(`SELECT mime, data FROM images WHERE id = $1`, [id])
  if (!r.length) return res.status(404).end()
  res.setHeader('Content-Type', r[0].mime)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.status(200).end(Buffer.from(r[0].data, 'base64'))
})
