# MM Collection - Vercel + Neon (Postgres) store with admin panel

React (Vite) shop + Vercel functions in `api/` + Neon Postgres database.
Suits, categories, banners, orders, delivery charges and COD finance sab database mein hain
aur admin panel se badle jate hain. Code ko dobara upload karne ki zaroorat nahi.

## Vercel par lagane ke qadam
1. Is folder ke andar ki cheezein (index.html, package.json, api, src ...) GitHub repository ke sab se upar upload karein.
2. vercel.com > Add New > Project > repository Import > Deploy (Framework "Vite" khud chun liya jata hai).
3. Project > **Storage** > Marketplace se **Neon (Postgres)** chunein, Free plan, Connect.
   Vercel khud `DATABASE_URL` laga deta hai.
4. Project > Settings > Environment Variables: `ADMIN_KEY` = apna mazboot password (kam az kam 12 huroof).
5. Deployments > Redeploy.
6. Website kholein. Pehli dafa khulne par tables khud ban jati hain aur 17 starter suits database mein aa jate hain
   (`data/products.json` sirf isi pehli dafa ke liye hai).

## Admin panel: `aap-ka-link/#/admin`
- **Dashboard:** orders, revenue, profit, courier se aaya hua cash, courier ke paas phansa hua cash, best sellers.
- **Orders:** status (new, confirmed, shipped, delivered, returned, cancelled), courier charge, tracking, notes,
  "Courier paid me" tick, aur customer ko WhatsApp.
- **Suits:** naya suit, photos upload, price, **purchase cost** (profit ke liye), category, brand, show/hide, delete.
- **Categories:** website par filter buttons yehi banate hain.
- **Banners:** top par slide hone wale banners (image, title, link, order, show/hide).
- **Settings:** announcement bar, WhatsApp number, delivery charge, free delivery limit.

## COD hisaab kaise chalta hai
- Order aate hi "new". Delivered hone par revenue mein ginta hai.
- Delivered order par "Courier paid me" tick karein jab courier ne cash de diya. Tab tak wo "pending with courier" mein rehta hai.
- Profit = delivered sales - suits ki purchase cost - courier charges (return wale orders ka courier kharcha bhi nuksan mein).
- Purchase cost har suit mein bharna zaroori hai, warna profit ghalat ziada dikhega.

## Dhyan rakhein
- Photos upload karte waqt browser unhein chhota kar deta hai aur database mein save hoti hain. Free Neon plan
  (0.5 GB) mein sainkron suits ki photos aaraam se aati hain. Bahut zyada ho jayein to Vercel Blob par shift kar sakte hain.
- Admin ya suit mein tabdeeli website par 20-60 second mein nazar aati hai (caching).
- Admin password ghalat dalne par 0.5 second ka intezar hota hai, lekin password mazboot hi rakhein.
- Neon aur Vercel ke free plans ki limits badal sakti hain; un ki sites par dekhte rahein.
- Computer par poora chalane ke liye: `npm i -g vercel`, `vercel link`, `vercel env pull .env.local`, `vercel dev`.
  Sirf design dekhne ke liye `npm run dev`.
