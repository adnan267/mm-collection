# MM Collection - Vercel + Neon (Postgres)

React (Vite) front end + Vercel serverless function (`api/orders.js`) + Neon Postgres database.
Suits ki list `data/products.json` mein hai, orders database mein save hote hain.

## Vercel par lagane ke qadam
1. Is folder ko GitHub repository mein upload (push) karein. `node_modules` aur `dist` upload na karein (.gitignore sambhal leta hai).
2. vercel.com > Add New > Project > wo repository Import karein. Framework "Vite" khud chun liya jata hai,
   koi setting na chhedein. Deploy dabayein.
   (GitHub par `index.html` repository ke sab se upar nazar aani chahiye, kisi folder ke andar nahi.)
3. Database jorna: Vercel mein project kholein > **Storage** tab > Marketplace se **Neon (Postgres)** chunein >
   plan (Free) aur region chunein > project se Connect karein.
   Vercel khud `DATABASE_URL` environment variable laga deta hai.
4. Admin password: Project > Settings > Environment Variables > naya variable
   `ADMIN_KEY` = apna-mazboot-password (Production ke liye).
5. Project > Deployments > latest deployment > Redeploy (taake naye variables lag jayein).
6. Test: website par ek order dein. Phir `https://aap-ka-link/#/admin` kholein, password dalein, order nazar aana chahiye.
   (`orders` table pehle order par khud ban jati hai, kuch alag se banana nahi parta.)

## Naya suit add karna
1. Photo `public/images/` mein rakhein.
2. `data/products.json` mein kisi suit ka block copy karein aur badal dein:
   `id` (unique), `n` (naam), `v` (brand | volume), `price`, `t`, `c`, `i` (photos, `/images/photo.jpg` ki tarah).
3. GitHub par push karein. Vercel khud dobara deploy kar deta hai.

## Computer par chalana
- Sirf design dekhne ke liye: `npm install` phir `npm run dev` (orders ka form yahan kaam nahi karega).
- Poora (database samet): `npm i -g vercel`, `vercel link`, `vercel env pull .env.local`, phir `vercel dev`.

## Folder
- `index.html`, `vite.config.js`, `package.json` (sab se upar)
- `src/` React code, `public/` logo aur suits ki photos
- `api/orders.js` order function, `data/products.json` suits ki list

## Dhyan rakhein
- Neon ka free plan chhote store ke liye kaafi hai, lekin limits badal sakti hain; neon.com par check karte rahein.
- `ADMIN_KEY` kisi ko na batayein. Password kam se kam 12 huroof ka rakhein.
