import { useEffect, useMemo, useState } from 'react'

const fmt = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-US')
const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled']
const TABS = ['Dashboard', 'Orders', 'Suits', 'Categories', 'Banners', 'Settings']

const makeCall = (key) => async (action, data = {}) => {
  const r = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body: JSON.stringify({ action, ...data })
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong.')
  return j
}

// Shrink a photo in the browser before uploading (keeps the database small).
async function shrink(file, max = 1100) {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.82)
}

function Upload({ call, onUrls, multiple, label = 'Upload photos' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function pick(e) {
    const files = [...e.target.files]; e.target.value = ''
    if (!files.length) return
    setBusy(true); setErr('')
    try {
      const urls = []
      for (const f of files) urls.push((await call('upload', { dataUrl: await shrink(f) })).url)
      onUrls(urls)
    } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <div>
      <label className="btn line upl">{busy ? 'Uploading…' : label}
        <input type="file" accept="image/*" multiple={multiple} onChange={pick} disabled={busy} hidden />
      </label>
      {err && <p className="err">{err}</p>}
    </div>
  )
}

function Field({ label, children }) { return <label className="fld">{label}{children}</label> }

// ---------------------------------------------------------------- dashboard
const RANGES = [['Today', 0], ['Last 7 days', 7], ['Last 30 days', 30], ['All time', -1]]
function Dashboard({ call }) {
  const [range, setRange] = useState(30)
  const [s, setS] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let from = ''
    if (range >= 0) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - range); from = d.toISOString() }
    call('dashboard', { from }).then((j) => setS(j.summary)).catch((e) => setErr(e.message))
  }, [range])
  if (err) return <p className="err">{err}</p>
  if (!s) return <p>Loading…</p>
  const cards = [
    ['Orders', s.orders, ''], ['Revenue (delivered)', fmt(s.revenue), ''], ['Profit', fmt(s.profit), s.profit < 0 ? 'bad' : 'good'],
    ['Cash received from courier', fmt(s.received), 'good'], ['Cash pending with courier', fmt(s.pending), 'warn'],
    ['On the way (shipped)', fmt(s.transit), ''], ['New + confirmed', fmt(s.open), ''], ['Return courier loss', fmt(s.returnLoss), s.returnLoss ? 'bad' : '']
  ]
  return (
    <>
      <div className="chips left">{RANGES.map(([n, v]) => <button key={n} className="chip" aria-pressed={range === v} onClick={() => setRange(v)}>{n}</button>)}</div>
      <div className="stats">{cards.map(([n, v, c]) => <div key={n} className={'stat ' + c}><small>{n}</small><b>{v}</b></div>)}</div>
      <p className="mute">Profit = delivered sales minus purchase cost of the suits, minus courier charges you paid (including returns). Cash is “received” once you tick “Courier paid me” on a delivered order.</p>
      <div className="split">
        <div className="panel"><h3>Orders by status</h3>{STATUSES.map((k) => <div className="rowl" key={k}><span className={'tag-' + k}>{k}</span><b>{s.byStatus[k] || 0}</b></div>)}</div>
        <div className="panel"><h3>Best sellers</h3>{s.top.length ? s.top.map((t) => <div className="rowl" key={t.name}><span>{t.name}</span><b>{t.qty}</b></div>) : <p className="mute">No sales yet.</p>}</div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------- orders
const waPhone = (p) => { const d = p.replace(/\D/g, ''); return d.startsWith('0') ? '92' + d.slice(1) : d }
function OrderCard({ o, call }) {
  const [x, setX] = useState({ status: o.status, courier_cost: o.courier_cost, tracking: o.tracking, notes: o.notes, settled: o.settled })
  const [msg, setMsg] = useState('')
  const set = (k, v) => setX((p) => ({ ...p, [k]: v }))
  async function save() {
    setMsg('Saving…')
    try { const j = await call('orderUpdate', { id: o.id, ...x }); setX((p) => ({ ...p, settled: j.order.settled })); setMsg('Saved') }
    catch (e) { setMsg(e.message) }
  }
  const text = `Assalam o Alaikum ${o.customer.name}, your MM Collection order ${o.code} (${fmt(o.total)}) is ${x.status}.${x.tracking ? ' Tracking: ' + x.tracking : ''}`
  return (
    <div className="order">
      <div className="oh"><b>{o.code}</b><span>{new Date(o.created_at).toLocaleString()}</span><b>{fmt(o.total)}</b></div>
      <p><b>{o.customer.name}</b>, {o.customer.phone}<br />{o.customer.address}, {o.customer.city}</p>
      <ul>{o.items.map((i) => <li key={i.id}>{i.qty} x {i.name} <small>({fmt(i.price)} each, cost {fmt(i.cost)})</small></li>)}</ul>
      <p className="mute">Subtotal {fmt(o.subtotal)} + delivery {fmt(o.shipping)}</p>
      <div className="chips left">{STATUSES.map((s) => <button key={s} className={'chip tag-' + s} aria-pressed={x.status === s} onClick={() => set('status', s)}>{s}</button>)}</div>
      <div className="grid2">
        <Field label="Courier charge I paid (Rs.)"><input type="number" min="0" value={x.courier_cost} onChange={(e) => set('courier_cost', e.target.value)} /></Field>
        <Field label="Tracking number"><input value={x.tracking} onChange={(e) => set('tracking', e.target.value)} /></Field>
      </div>
      <Field label="Notes"><input value={x.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      {x.status === 'delivered' && <label className="chk"><input type="checkbox" checked={!!x.settled} onChange={(e) => set('settled', e.target.checked)} /> Courier paid me the cash for this order</label>}
      <div className="row">
        <button className="btn solid" onClick={save}>Save</button>
        <a className="btn line" target="_blank" rel="noopener" href={`https://wa.me/${waPhone(o.customer.phone)}?text=${encodeURIComponent(text)}`}>WhatsApp customer</a>
        <span className="mute">{msg}</span>
      </div>
    </div>
  )
}
function Orders({ call }) {
  const [st, setSt] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { setRows(null); call('orders', { status: st }).then((j) => setRows(j.orders)).catch((e) => setErr(e.message)) }, [st])
  return (
    <>
      <div className="chips left">{['', ...STATUSES].map((s) => <button key={s} className="chip" aria-pressed={st === s} onClick={() => setSt(s)}>{s || 'all'}</button>)}</div>
      {err && <p className="err">{err}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p className="mute">No orders here yet.</p> : rows.map((o) => <OrderCard key={o.id} o={o} call={call} />)}
    </>
  )
}

// --------------------------------------------------------------------- suits
const blank = { name: '', brand: '', category_id: '', price: '', cost: '', description: '', details: [], images: [], active: true }
function Suits({ call }) {
  const [data, setData] = useState(null)
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const load = () => call('products').then(setData).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  if (!data) return <p>{msg || 'Loading…'}</p>

  const set = (k, v) => setEdit((p) => ({ ...p, [k]: v }))
  async function save(e) {
    e.preventDefault(); setMsg('Saving…')
    try { await call('productSave', { product: { ...edit, category_id: edit.category_id || null } }); setEdit(null); setMsg(''); load() }
    catch (x) { setMsg(x.message) }
  }
  async function toggle(p) { await call('productSave', { product: { ...p, active: !p.active } }); load() }
  async function remove(p) { if (confirm(`Delete ${p.name}? This cannot be undone.`)) { await call('productDelete', { id: p.id }); load() } }

  if (edit) return (
    <form className="panel" onSubmit={save}>
      <h3>{edit.id ? 'Edit suit' : 'Add a new suit'}</h3>
      <Field label="Suit name"><input required value={edit.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Brand"><input value={edit.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Orang" /></Field>
        <Field label="Category"><select value={edit.category_id || ''} onChange={(e) => set('category_id', e.target.value)}>
          <option value="">No category</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Selling price (Rs.)"><input required type="number" min="0" value={edit.price} onChange={(e) => set('price', e.target.value)} /></Field>
        <Field label="Your purchase cost (Rs.)"><input type="number" min="0" value={edit.cost} onChange={(e) => set('cost', e.target.value)} /></Field>
      </div>
      <Field label="Short description"><input value={edit.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <Field label="Details (one per line)"><textarea rows="4" value={(edit.details || []).join('\n')} onChange={(e) => set('details', e.target.value.split('\n'))} /></Field>
      <div className="fld">Photos (first photo is the cover)
        <div className="thumbrow">{edit.images.map((u, i) => (
          <div className="th2" key={u + i}><img src={u} alt="" />
            <div>{i > 0 && <button type="button" onClick={() => set('images', [u, ...edit.images.filter((_, j) => j !== i)])}>cover</button>}
              <button type="button" onClick={() => set('images', edit.images.filter((_, j) => j !== i))}>remove</button></div></div>))}</div>
        <Upload call={call} multiple onUrls={(urls) => set('images', [...edit.images, ...urls])} />
      </div>
      <label className="chk"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} /> Show on the website</label>
      {msg && <p className="err">{msg}</p>}
      <div className="row"><button className="btn solid">Save suit</button><button type="button" className="btn line" onClick={() => { setEdit(null); setMsg('') }}>Cancel</button></div>
    </form>
  )

  const shown = data.products.filter((p) => (p.name + p.brand).toLowerCase().includes(q.toLowerCase()))
  const catName = (id) => data.categories.find((c) => c.id === id)?.name
  return (
    <>
      <div className="row"><button className="btn solid" onClick={() => setEdit({ ...blank })}>+ Add suit</button>
        <input className="search" placeholder="Search suits" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search suits" /></div>
      {msg && <p className="err">{msg}</p>}
      {shown.map((p) => (
        <div className={'prow' + (p.active ? '' : ' off')} key={p.id}>
          <img src={p.images[0] || '/logo.png'} alt="" />
          <div><b>{p.name}</b><small>{[p.brand, catName(p.category_id)].filter(Boolean).join(' · ') || 'No brand'}</small>
            <small>{fmt(p.price)} · cost {fmt(p.cost)} · margin {fmt(p.price - p.cost)}</small></div>
          <div className="acts"><button onClick={() => setEdit({ ...p })}>Edit</button><button onClick={() => toggle(p)}>{p.active ? 'Hide' : 'Show'}</button><button onClick={() => remove(p)}>Delete</button></div>
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------- categories
function Categories({ call }) {
  const [rows, setRows] = useState(null)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const load = () => call('products').then((j) => setRows(j.categories))
  useEffect(() => { load() }, [])
  const run = async (fn) => { setMsg(''); try { await fn(); load() } catch (e) { setMsg(e.message) } }
  if (!rows) return <p>Loading…</p>
  return (
    <>
      <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await call('catSave', { name }); setName('') }) }}>
        <input className="search" placeholder="New category, e.g. Wedding or Winter" value={name} onChange={(e) => setName(e.target.value)} aria-label="New category" />
        <button className="btn solid">Add</button>
      </form>
      {msg && <p className="err">{msg}</p>}
      {rows.map((c) => <CatRow key={c.id} c={c} onSave={(n) => run(() => call('catSave', { id: c.id, name: n }))} onDelete={() => confirm(`Delete “${c.name}”? Suits stay, but lose this category.`) && run(() => call('catDelete', { id: c.id }))} />)}
    </>
  )
}
function CatRow({ c, onSave, onDelete }) {
  const [n, setN] = useState(c.name)
  return <div className="prow"><input value={n} onChange={(e) => setN(e.target.value)} aria-label="Category name" /><div className="acts"><button onClick={() => onSave(n)}>Save</button><button onClick={onDelete}>Delete</button></div></div>
}

// ------------------------------------------------------------------- banners
function Banners({ call }) {
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')
  const load = () => call('banners').then((j) => setRows(j.banners)).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  const set = (k, v) => setEdit((p) => ({ ...p, [k]: v }))
  if (!rows) return <p>{msg || 'Loading…'}</p>
  async function save(e) { e.preventDefault(); try { await call('bannerSave', { banner: edit }); setEdit(null); setMsg(''); load() } catch (x) { setMsg(x.message) } }
  if (edit) return (
    <form className="panel" onSubmit={save}>
      <h3>{edit.id ? 'Edit banner' : 'New banner'}</h3>
      {edit.image && <img className="bnprev" src={edit.image} alt="" />}
      <Upload call={call} label={edit.image ? 'Change image' : 'Upload banner image'} onUrls={(u) => set('image', u[0])} />
      <p className="mute">Wide pictures work best (about 1600 × 600).</p>
      <Field label="Title (optional)"><input value={edit.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="Small text (optional)"><input value={edit.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></Field>
      <Field label="Link when tapped (optional, e.g. #shop)"><input value={edit.link} onChange={(e) => set('link', e.target.value)} /></Field>
      <Field label="Order (smaller shows first)"><input type="number" min="0" value={edit.sort} onChange={(e) => set('sort', e.target.value)} /></Field>
      <label className="chk"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} /> Show on the website</label>
      {msg && <p className="err">{msg}</p>}
      <div className="row"><button className="btn solid">Save banner</button><button type="button" className="btn line" onClick={() => { setEdit(null); setMsg('') }}>Cancel</button></div>
    </form>
  )
  return (
    <>
      <button className="btn solid" onClick={() => setEdit({ title: '', subtitle: '', image: '', link: '', active: true, sort: rows.length })}>+ Add banner</button>
      {rows.length === 0 && <p className="mute">No banners yet. Add one for an offer or a new arrival.</p>}
      {rows.map((b) => (
        <div className={'prow' + (b.active ? '' : ' off')} key={b.id}>
          <img className="wide" src={b.image} alt="" />
          <div><b>{b.title || '(no title)'}</b><small>{b.active ? 'Showing' : 'Hidden'} · order {b.sort}</small></div>
          <div className="acts"><button onClick={() => setEdit({ ...b })}>Edit</button>
            <button onClick={async () => { if (confirm('Delete this banner?')) { await call('bannerDelete', { id: b.id }); load() } }}>Delete</button></div>
        </div>
      ))}
    </>
  )
}

// ------------------------------------------------------------------ settings
function Settings({ call }) {
  const [c, setC] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { call('settingsGet').then((j) => setC(j.config)).catch((e) => setMsg(e.message)) }, [])
  if (!c) return <p>{msg || 'Loading…'}</p>
  const set = (k, v) => setC((p) => ({ ...p, [k]: v }))
  async function save(e) {
    e.preventDefault(); setMsg('Saving…')
    try { setC((await call('settingsSave', { config: c })).config); setMsg('Saved. The website updates within a minute.') } catch (x) { setMsg(x.message) }
  }
  return (
    <form className="panel" onSubmit={save}>
      <Field label="Top announcement bar text"><input value={c.announcement} onChange={(e) => set('announcement', e.target.value)} /></Field>
      <Field label="WhatsApp number (with 92, e.g. 923007235997)"><input value={c.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Delivery charge (Rs., 0 = free)"><input type="number" min="0" value={c.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} /></Field>
        <Field label="Free delivery above (Rs., 0 = never)"><input type="number" min="0" value={c.free_above} onChange={(e) => set('free_above', e.target.value)} /></Field>
      </div>
      <div className="row"><button className="btn solid">Save settings</button><span className="mute">{msg}</span></div>
    </form>
  )
}

// --------------------------------------------------------------------- shell
export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem('mm-key') || '')
  const [input, setInput] = useState('')
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('Dashboard')
  const call = useMemo(() => makeCall(key), [key])

  useEffect(() => { if (key) call('ping').then(() => setOk(true)).catch(() => { sessionStorage.removeItem('mm-key'); setKey('') }) }, [])
  async function login(e) {
    e.preventDefault(); setErr('')
    try { await makeCall(input)('ping'); sessionStorage.setItem('mm-key', input); setKey(input); setOk(true) }
    catch (x) { setErr(x.message) }
  }

  if (!ok) return (
    <div className="wrap admin">
      <h1>MM Collection admin</h1>
      <form onSubmit={login} className="adminform">
        <input type="password" placeholder="Admin password" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Admin password" autoFocus />
        <button className="btn solid">Open</button>
        {err && <p className="err">{err}</p>}
      </form>
      <a href="#/">Back to shop</a>
    </div>
  )
  const View = { Dashboard, Orders, Suits, Categories, Banners, Settings }[tab]
  return (
    <div className="wrap admin">
      <div className="ah"><h1>Admin</h1><span><a href="#/">View shop</a> · <button className="link" onClick={() => { sessionStorage.removeItem('mm-key'); setOk(false); setKey('') }}>Log out</button></span></div>
      <nav className="tabs">{TABS.map((t) => <button key={t} aria-current={tab === t} onClick={() => setTab(t)}>{t}</button>)}</nav>
      <View key={tab} call={call} />
    </div>
  )
}
