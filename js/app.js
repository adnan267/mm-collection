var PHONE=SHOP.phone,PRICE=SHOP.price;
var S=window.PRODUCTS;
var cart={},$=function(i){return document.getElementById(i)};
function fmt(n){return "Rs. "+n.toLocaleString("en-US")}
function wa(m){return "https://wa.me/"+PHONE+"?text="+encodeURIComponent(m)}
$("hero").style.backgroundImage="url("+S[2].i[0]+")";
$("sub").textContent=S.length+" products";
$("fwa").href=wa("Assalam o Alaikum, I want wholesale rates for bulk orders.");$("fwa").target="_blank";
S.forEach(function(s,k){
  var d=document.createElement("article");d.className="card";d.dataset.v=s.v||"";
  d.innerHTML='<button class="pic" data-q="'+k+'" aria-label="View '+s.n+'"><span class="badge">Original</span><img src="'+s.i[0]+'" alt="'+s.n+'"><img src="'+s.i[1]+'" alt=""></button>'+(s.v?'<div class="vd">'+s.v+'</div>':'')+'<h3>'+s.n+'</h3><div class="pr">'+fmt(PRICE)+'</div><button class="btn o w" data-a="'+k+'">Add to cart</button>';
  $("grid").appendChild(d);
});
var vs=[];S.forEach(function(s){if(s.v&&vs.indexOf(s.v)<0)vs.push(s.v)});
$("chips").innerHTML=["All"].concat(vs).map(function(v,j){return '<button class="chip" data-f="'+(j?v:"")+'" aria-pressed="'+(j==0)+'">'+v+'</button>'}).join("");
function filt(f){var n=0;document.querySelectorAll(".card").forEach(function(c){var on=!f||c.dataset.v===f;c.style.display=on?"":"none";if(on)n++});
document.querySelectorAll(".chip").forEach(function(c){c.setAttribute("aria-pressed",c.dataset.f===f)});$("sub").textContent=n+" products"}
function add(k,q){cart[k]=(cart[k]||0)+(q||1);draw();openCart()}
function draw(){
  var n=0,t=0,h="";
  Object.keys(cart).forEach(function(k){var q=cart[k];if(q<1)return;n+=q;t+=q*PRICE;var s=S[k];
    h+='<div class="li"><img src="'+s.i[0]+'" alt=""><div><b>'+s.n+'</b><small>'+fmt(PRICE)+'</small><br><div class="qty"><button data-m="'+k+'" aria-label="Less">−</button><span>'+q+'</span><button data-p="'+k+'" aria-label="More">+</button></div></div><b>'+fmt(q*PRICE)+'</b></div>'});
  $("cnt").textContent=n;
  $("items").innerHTML=n?h:'<div class="empty">Your cart is empty.</div>';
  $("df").innerHTML=n?'<div class="tot"><span>Total</span><b>'+fmt(t)+'</b></div><p>Your order goes to our WhatsApp. We confirm it and arrange cash on delivery.</p><a class="btn w" id="co" target="_blank" rel="noopener">Checkout on WhatsApp</a>':'<a class="btn w" href="#catalog" id="shop">Continue shopping</a>';
  if(n){var m="Assalam o Alaikum, I want to place an order:\n";Object.keys(cart).forEach(function(k){if(cart[k]>0)m+="- "+cart[k]+" x "+S[k].n+(S[k].v?" ["+S[k].v+"]":"")+" ("+fmt(PRICE)+")\n"});m+="Total: "+fmt(t)+"\n\nName:\nAddress:\nCity:";$("co").href=wa(m)}
  else $("shop").onclick=closeAll;
}
function openCart(){closeQV();$("drawer").classList.add("on");$("ov").classList.add("on")}
function closeAll(){$("drawer").classList.remove("on");$("ov").classList.remove("on");closeQV()}
function closeQV(){$("qv").classList.remove("on");$("qv").innerHTML=""}
function quick(k){
  var s=S[k],q=1;$("ov").classList.add("on");
  $("qv").innerHTML='<div class="qb"><button class="x" data-c="1" aria-label="Close">×</button><div><img class="main'+(s.p?' pt':'')+'" src="'+s.i[0]+'" alt="'+s.n+'"><div class="th" '+(s.i.length<2?'hidden':'')+'>'+s.i.map(function(x,j){return '<button data-j="'+j+'" aria-current="'+(j==0)+'" aria-label="Photo '+(j+1)+'"><img src="'+x+'" alt=""></button>'}).join("")+'</div></div><div>'+(s.v?'<div class="vd">'+s.v+'</div>':'')+'<h2>'+s.n+'</h2><div class="qp">'+fmt(PRICE)+'</div><p>'+s.t+'.</p><ul>'+s.c.map(function(x){return "<li>"+x+"</li>"}).join("")+'</ul><div class="qty"><button id="qm" aria-label="Less">−</button><span id="qn">1</span><button id="qpl" aria-label="More">+</button></div><button class="btn w" id="qa">Add to cart</button><a class="btn o w" target="_blank" rel="noopener" href="'+wa("Assalam o Alaikum, I want to order: "+s.n+(s.v?" ["+s.v+"]":"")+" ("+fmt(PRICE)+"). Please share details.")+'">Buy it now on WhatsApp</a></div></div>';
  $("qv").classList.add("on");
  var b=$("qv");
  b.querySelectorAll(".th button").forEach(function(t){t.onclick=function(){b.querySelector(".main").src=s.i[t.dataset.j];b.querySelectorAll(".th button").forEach(function(o){o.setAttribute("aria-current",o===t)})}});
  $("qm").onclick=function(){q=Math.max(1,q-1);$("qn").textContent=q};
  $("qpl").onclick=function(){q++;$("qn").textContent=q};
  $("qa").onclick=function(){add(k,q)};
}
document.addEventListener("click",function(e){
  var t=e.target.closest("button,div");if(!t)return;var d=t.dataset||{};
  if(d.q!==undefined)quick(+d.q);
  else if(d.a!==undefined)add(+d.a,1);
  else if(d.f!==undefined)filt(d.f);
  else if(d.p!==undefined){cart[d.p]++;draw()}
  else if(d.m!==undefined){cart[d.m]--;draw()}
  else if(d.c||t.id==="closeCart"||t.id==="ov")closeAll();
  else if(t.id==="qv"&&e.target===t)closeAll();
});
$("openCart").onclick=openCart;
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAll()});
draw();
