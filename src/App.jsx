import { lazy, Suspense, useEffect, useState } from 'react'
import seed from '../data/products.json'

const Admin = lazy(() => import('./Admin.jsx'))
const fmt = (n) => 'Rs. ' + n.toLocaleString('en-US')
const WORDS = ['winter wear', 'weddings', 'everyday style', 'bulk orders']
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const shipFor = (cfg, sub) => (cfg.free_above > 0 && sub >= cfg.free_above ? 0 : cfg.delivery_fee)
const dial = (p) => (p.startsWith('92') ? '0' + p.slice(2) : p)

// If the database is not connected yet, the shop still shows the starter suits.
function fallback() {
  const vols = [...new Set(seed.products.map((p) => p.v).filter(Boolean))]
  return {
    config: { announcement: '100% original brands · Nationwide cash on delivery · Bulk orders available', phone: seed.shop.phone, delivery_fee: 0, free_above: 0 },
    banners: [],
    categories: vols.map((v) => ({ id: v, name: v.replace(' | ', ' ') })),
    products: seed.products.map((p) => ({ id: p.id, name: p.n, brand: (p.v || '').split(' | ')[0], category_id: p.v || null, price: p.price, description: p.t, details: p.c, images: p.i }))
  }
}

function useTyped(words) {
  const [text, setText] = useState('')
  const [w, setW] = useState(0)
  const [del, setDel] = useState(false)
  useEffect(() => {
    if (still()) { setText(words[0]); return }
    const full = words[w]
    const wait = !del && text === full ? 1600 : del ? 38 : 85
    const id = setTimeout(() => {
      if (!del && text === full) setDel(true)
      else if (del && text === '') { setDel(false); setW((w + 1) % words.length) }
      else setText(full.slice(0, text.length + (del ? -1 : 1)))
    }, wait)
    return () => clearTimeout(id)
  }, [text, w, del])
  return text
}

const waLink = (phone, o) =>
  `https://wa.me/${phone}?text=` + encodeURIComponent(
    `Assalam o Alaikum, I placed order ${o.id}:\n` +
    o.items.map((i) => `- ${i.qty} x ${i.name}${i.brand ? ` [${i.brand}]` : ''}`).join('\n') +
    `\nTotal: ${fmt(o.total)} (cash on delivery)\nName: ${o.customer.name}\nPhone: ${o.customer.phone}\nAddress: ${o.customer.address}, ${o.customer.city}`)

function Banners({ items }) {
  const [k, setK] = useState(0)
  useEffect(() => {
    if (items.length < 2 || still()) return
    const id = setInterval(() => setK((x) => (x + 1) % items.length), 5000)
    return () => clearInterval(id)
  }, [items.length])
  if (!items.length) return null
  return (
    <section className="bn" aria-label="Offers">
      {items.map((b, i) => {
        const inner = (
          <>
            <img src={b.image} alt="" />
            {(b.title || b.subtitle) && <div className="bt"><h2>{b.title}</h2>{b.subtitle && <p>{b.subtitle}</p>}</div>}
          </>
        )
        const cls = 'slide' + (i === k ? ' on' : '')
        return b.link
          ? <a key={b.id} className={cls} href={b.link} tabIndex={i === k ? 0 : -1} aria-hidden={i !== k}>{inner}</a>
          : <div key={b.id} className={cls} aria-hidden={i !== k}>{inner}</div>
      })}
      {items.length > 1 && (
        <div className="dots">
          {items.map((b, i) => <button key={b.id} aria-label={`Banner ${i + 1}`} aria-current={i === k} onClick={() => setK(i)} />)}
        </div>
      )}
    </section>
  )
}

function Card({ p, onOpen, onAdd }) {
  return (
    <article className="card">
      <button className="pic" onClick={() => onOpen(p)} aria-label={`View ${p.n}`}>
        <img src={p.i[0]} alt={p.n} loading="lazy" />
        {p.i[1] && <img src={p.i[1]} alt="" loading="lazy" />}
        <span className="qv">Quick view</span>
      </button>
      {p.v && <div className="vd">{p.v}</div>}
      <h3>{p.n}</h3>
      <div className="pr">{fmt(p.price)}</div>
      <button className="btn line" onClick={() => onAdd(p.id)}>Add to cart</button>
    </article>
  )
}

function Quick({ p, onClose, onAdd }) {
  const [k, setK] = useState(0)
  const [q, setQ] = useState(1)
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [])
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="box" role="dialog" aria-modal="true" aria-label={p.n}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <div>
          <img className="big" src={p.i[k]} alt={p.n} />
          {p.i.length > 1 && (
            <div className="thumbs">
              {p.i.map((s, j) => (
                <button key={s} aria-current={j === k} aria-label={`Photo ${j + 1}`} onClick={() => setK(j)}><img src={s} alt="" /></button>
              ))}
            </div>
          )}
        </div>
        <div>
          {p.v && <div className="vd">{p.v}</div>}
          <h2>{p.n}</h2>
          <div className="big-pr">{fmt(p.price)}</div>
          {p.t && <p className="tag">{p.t}</p>}
          <ul>{p.c.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="qty">
            <button onClick={() => setQ(Math.max(1, q - 1))} aria-label="Less">−</button>
            <span>{q}</span>
            <button onClick={() => setQ(q + 1)} aria-label="More">+</button>
          </div>
          <button className="btn solid w" onClick={() => onAdd(p.id, q)}>Add to cart</button>
        </div>
      </div>
    </div>
  )
}

function Drawer({ products, cart, setCart, cfg, onClose }) {
  const [step, setStep] = useState('cart')
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const lines = products.filter((p) => cart[p.id] > 0)
  const sub = lines.reduce((s, p) => s + p.price * cart[p.id], 0)
  const ship = shipFor(cfg, sub)
  const bump = (id, d) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }))
  const field = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })
  const totals = (
    <div className="sums">
      <div><span>Subtotal</span><span>{fmt(sub)}</span></div>
      <div><span>Delivery</span><span>{ship ? fmt(ship) : 'Free'}</span></div>
      <div className="tot"><span>Total (cash on delivery)</span><b>{fmt(sub + ship)}</b></div>
    </div>
  )

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: lines.map((p) => ({ id: p.id, qty: cart[p.id] })) })
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setDone(j.order); setCart({})
    } catch (x) { setErr(x.message || 'Something went wrong. Please try again.') }
    setBusy(false)
  }

  return (
    <>
      <div className="veil" onClick={onClose} />
      <aside className="drawer" aria-label="Cart">
        <div className="dh"><h2>{done ? 'Order placed' : step === 'form' ? 'Delivery details' : 'Your cart'}</h2><button className="x" onClick={onClose} aria-label="Close cart">×</button></div>
        {done ? (
          <div className="pad">
            <p className="ok">Order <b>{done.id}</b> received. Total {fmt(done.total)}, cash on delivery.</p>
            <p className="mute">Send the order on WhatsApp so we can confirm it with you.</p>
            <a className="btn solid w" href={waLink(cfg.phone, done)} target="_blank" rel="noopener">Confirm on WhatsApp</a>
            <button className="btn line w" onClick={onClose}>Keep shopping</button>
          </div>
        ) : step === 'cart' ? (
          <>
            <div className="items">
              {lines.length === 0 && <p className="empty">Your cart is empty.</p>}
              {lines.map((p) => (
                <div className="li" key={p.id}>
                  <img src={p.i[0]} alt="" />
                  <div><b>{p.n}</b><small>{fmt(p.price)}</small>
                    <div className="qty"><button onClick={() => bump(p.id, -1)} aria-label="Less">−</button><span>{cart[p.id]}</span><button onClick={() => bump(p.id, 1)} aria-label="More">+</button></div>
                  </div>
                  <b>{fmt(p.price * cart[p.id])}</b>
                </div>
              ))}
            </div>
            {lines.length > 0 && (
              <div className="df">
                {totals}
                <button className="btn solid w" onClick={() => setStep('form')}>Checkout</button>
              </div>
            )}
          </>
        ) : (
          <form className="pad" onSubmit={submit}>
            <label>Full name<input required autoComplete="name" {...field('name')} /></label>
            <label>Phone / WhatsApp<input required type="tel" autoComplete="tel" {...field('phone')} /></label>
            <label>Address<textarea required rows="2" autoComplete="street-address" {...field('address')} /></label>
            <label>City<input required autoComplete="address-level2" {...field('city')} /></label>
            {totals}
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn solid w" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
            <button type="button" className="btn line w" onClick={() => setStep('cart')}>Back to cart</button>
          </form>
        )}
      </aside>
    </>
  )
}

export default function App() {
  const [d, setD] = useState(null)
  const [filter, setFilter] = useState('')
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('mm-cart') || '{}') } catch { return {} } })
  const [open, setOpen] = useState(false)
  const [quick, setQuick] = useState(null)
  const [hash, setHash] = useState(location.hash)
  const typed = useTyped(WORDS)

  useEffect(() => {
    fetch('/api/public').then((r) => { if (!r.ok) throw new Error(); return r.json() }).then(setD).catch(() => setD(fallback()))
  }, [])
  useEffect(() => { try { localStorage.setItem('mm-cart', JSON.stringify(cart)) } catch {} }, [cart])
  useEffect(() => {
    const h = () => setHash(location.hash)
    addEventListener('hashchange', h)
    return () => removeEventListener('hashchange', h)
  }, [])

  if (hash === '#/admin') return <Suspense fallback={<div className="load">Loading…</div>}><Admin /></Suspense>
  if (!d) return <div className="load">Loading…</div>

  const cfg = d.config
  const products = d.products.map((p) => ({
    id: p.id, n: p.name, v: p.brand, t: p.description, c: p.details || [],
    i: p.images && p.images.length ? p.images : ['/logo.png'], price: p.price, cat: p.category_id
  }))
  const cats = d.categories.filter((c) => products.some((p) => p.cat === c.id))
  const brands = [...new Set(products.map((p) => p.v).filter(Boolean))]
  const list = products.filter((p) => !filter || p.cat === filter)
  const count = products.reduce((s, p) => s + (cart[p.id] || 0), 0)
  const add = (id, n = 1) => { setCart((c) => ({ ...c, [id]: (c[id] || 0) + n })); setQuick(null); setOpen(true) }
  const ticker = [...brands, 'Unstitched suits', 'Nationwide COD', 'Bulk orders', '100% original']
  const hero = [0, 1, 2].map((k) => products[Math.floor((k * products.length) / 3)]).filter(Boolean)

  return (
    <>
      {cfg.announcement && <div className="bar">{cfg.announcement}</div>}
      <header>
        <div className="wrap hd">
          <a className="brand" href="#top"><img src="/logo.png" alt="" /><b>MM Collection</b></a>
          <nav><a href="#top">Home</a><a href="#shop">Shop</a><a href="#contact">Contact</a></nav>
          <button className="cartbtn" onClick={() => setOpen(true)} aria-label={`Open cart, ${count} items`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
            {count > 0 && <span className="cnt">{count}</span>}
          </button>
        </div>
      </header>

      <main id="top">
        <Banners items={d.banners} />
        <section className="hero">
          <div className="wrap hgrid">
            <div>
              <h1>Original branded suits for <span className="typed">{typed}</span><i className="caret" /></h1>
              <p>Unstitched women’s suits from Pakistan’s best brands, at wholesale prices, delivered across the country.</p>
              <div className="row">
                <a className="btn solid" href="#shop">Shop the collection</a>
                <a className="btn line" href={`https://wa.me/${cfg.phone}?text=${encodeURIComponent('Assalam o Alaikum, I want wholesale rates for bulk orders.')}`} target="_blank" rel="noopener">Bulk order rates</a>
              </div>
            </div>
            <div className="stack" aria-hidden="true">
              {hero.map((p, i) => <img key={p.id} className={'s' + (i + 1)} src={p.i[0]} alt="" />)}
            </div>
          </div>
        </section>

        <div className="mq" aria-hidden="true"><div>{[...ticker, ...ticker].map((t, i) => <span key={i}>{t}</span>)}</div></div>

        <section className="sec wrap" id="shop">
          <h2>The collection</h2>
          {cats.length > 0 && (
            <div className="chips">
              {[{ id: '', name: 'All suits' }, ...cats].map((c) => (
                <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>{c.name}</button>
              ))}
            </div>
          )}
          {list.length === 0 && <p className="empty">New suits are coming soon.</p>}
          <div className="grid">{list.map((p) => <Card key={p.id} p={p} onOpen={setQuick} onAdd={add} />)}</div>
        </section>

        <section className="trust wrap">
          <div><b>100% original</b>Branded suits only</div>
          <div><b>Bulk orders</b>Wholesale prices</div>
          <div><b>Nationwide COD</b>Pay when it arrives</div>
          <div><b>WhatsApp support</b>{dial(cfg.phone)}</div>
        </section>
      </main>

      <footer id="contact">
        <div className="wrap fgrid">
          <div><h3>MM Collection Faisalabad</h3><p>Wakilan Wali Street No. 04, Bin Saeed Plaza, 2nd Floor, Chiniot Bazar, Faisalabad</p><p>{dial(cfg.phone)}</p></div>
          <div><a href={`https://wa.me/${cfg.phone}`} target="_blank" rel="noopener">WhatsApp us</a><a href="https://www.facebook.com/MMcollection247">Facebook</a></div>
        </div>
        <p className="copy">© 2026 MM Collection Faisalabad</p>
      </footer>

      {quick && <Quick p={quick} onClose={() => setQuick(null)} onAdd={add} />}
      {open && <Drawer products={products} cart={cart} setCart={setCart} cfg={cfg} onClose={() => setOpen(false)} />}
    </>
  )
}
