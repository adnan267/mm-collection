MM COLLECTION - WEBSITE (offline chalne wali)

KAISE CHALAYEIN
- "index.html" par double-click karein. Internet ki zaroorat nahi.
  (Fonts, images aur code sab isi folder ke andar hain.)
- WhatsApp se order bhejne ke liye phone mein internet chahiye.

VERCEL PAR LAGANA
- Is poore folder ko GitHub repository mein upload karein
  (index.html folder ke sab se upar honi chahiye), phir Vercel mein
  "Add New > Project" se wo repository import kar ke Deploy dabayein.

NAYA SUIT ADD KARNA
1. Suit ki photo images/products/ folder mein rakhein (jpg).
2. js/products.js kholein (Notepad mein) aur kisi suit ki line copy kar ke
   naya suit likh dein:
   {n:"Suit ka naam",v:"Brand | Volume",t:"Choti si line",c:["Detail 1","Detail 2"],i:["images/products/photo.jpg"]},
   - n = naam, v = brand (filter button isi se banta hai, na dena ho to hata dein)
   - c = details ki list, i = photos ki list (pehli photo card par dikhti hai)
3. Save karein aur index.html dobara kholein.

PRICE / NUMBER BADLANA
- js/products.js ke sab se upar: window.SHOP={phone:"923007235997",price:4000};
  phone mein 92 ke sath number likhein (0 ke baghair), price sab suits ka ek hi hai.

FOLDERS
- index.html       : website ka page
- css/style.css    : design
- js/app.js        : cart, quick view, WhatsApp order
- js/products.js   : suits ki list
- images/          : logo aur suits ki photos
- fonts/           : website ke fonts
