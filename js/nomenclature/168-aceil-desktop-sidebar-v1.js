
(function(){
"use strict";
if(window.__aceilDesktopSidebarV1)return;
window.__aceilDesktopSidebarV1=true;

/* ============================================================
   A·CEIL — постійна бічна панель номенклатури для desktop (≥1024px)
   Не замінює модалку #elementsModal (вона й далі працює для
   редагування — на desktop просто центрується замість шторки знизу,
   див. CSS). Ця панель — легкий, синхронізований "вітринний" вигляд
   поруч із канвасом, щоб не відкривати модалку заради погляду на суму.
   ============================================================ */

function gid(x){return document.getElementById(x)}
function esc(s){
  try{if(typeof escapeHtml==="function")return escapeHtml(s)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]});
}
function items(){
  try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemItems)?window.elemItems:[];
}
function groups(){
  try{if(typeof elemGroups!=="undefined"&&Array.isArray(elemGroups))return elemGroups}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemGroups)?window.elemGroups:[];
}
function money(v){
  var n=Number(v)||0;
  try{return new Intl.NumberFormat("uk-UA",{minimumFractionDigits:0,maximumFractionDigits:2}).format(n)+" ₴"}catch(_){return n.toFixed(2)+" ₴"}
}

function installDesktopCanvasStroke(){
  if(!window.matchMedia||!window.matchMedia("(min-width:901px)").matches)return;
  var canvas=gid("cv"),ctx=canvas&&canvas.getContext&&canvas.getContext("2d");
  if(!ctx||ctx.__aceilDesktopStrokeV1)return;
  var nativeStroke=ctx.stroke;
  ctx.stroke=function(){
    var original=this.lineWidth;
    /* На великому екрані canvas масштабується сильніше, тому базовий
       контур візуально ставав грубим. Не потовщуємо його до 4 px, як у
       попередньому desktop-патчі, а акуратно обмежуємо двома пікселями. */
    if(String(this.strokeStyle).toLowerCase()==="#1d1d1f"&&original>=2)this.lineWidth=2;
    try{return nativeStroke.apply(this,arguments)}finally{this.lineWidth=original}
  };
  ctx.__aceilDesktopStrokeV1=true;
}

/* Той самий принцип іконки-за-назвою, що й isFilmItem()/category() у проєкті —
   тільки тут повертаємо id символу з вже існуючого спрайту #A·CEIL-icons-v1. */
function groupIconId(name){
  var n=String(name||"").toLowerCase();
  if(n.indexOf("плів")>=0||n.indexOf("полотно")>=0)return"rmi-film";
  if(n.indexOf("проф")>=0||n.indexOf("карниз")>=0||n.indexOf("багет")>=0||n.indexOf("тіньов")>=0||n.indexOf("парящ")>=0||n.indexOf("паряч")>=0)return"rmi-wrench";
  if(n.indexOf("встав")>=0||n.indexOf("шнур")>=0)return"rmi-insert";
  if(n.indexOf("освіт")>=0||n.indexOf("світ")>=0||n.indexOf("люстр")>=0||n.indexOf("led")>=0)return"rmi-light";
  return"rmi-folder";
}
function ico(id,cls){return '<svg class="'+(cls||"rm-ico")+'" aria-hidden="true"><use href="#'+id+'"></use></svg>'}

function buildShell(){
  var host=document.querySelector(".panel-column");
  if(!host)return false;
  if(gid("aceilDesktopSidebar"))return true;
  var card=document.createElement("div");
  card.id="aceilDesktopSidebar";
  card.innerHTML=
    '<div class="adsb-head">'+
      '<div class="adsb-title">Номенклатура</div>'+
      '<div class="adsb-badge" id="adsbBadge">0 груп</div>'+
    '</div>'+
    '<div id="adsbGroups"></div>'+
    '<div class="adsb-total"><div><span>Разом</span><b id="adsbTotal">₴0</b></div>'+
      '<button type="button" class="adsb-edit" onclick="openElementsModal()">'+ico("rmi-pencil")+' Редагувати</button>'+
    '</div>';
  host.insertBefore(card,host.firstChild);
  return true;
}

function render(){
  if(!buildShell())return;
  var body=gid("adsbGroups"),badge=gid("adsbBadge"),totalEl=gid("adsbTotal");
  if(!body)return;

  var byGroup={};
  items().forEach(function(it){
    var qty=Number(it&&it.qty)||0;
    if(qty<=0)return;
    var gidKey=String(it.groupId||"_none");
    (byGroup[gidKey]=byGroup[gidKey]||[]).push(it);
  });

  var rows=[],grandTotal=0,groupCount=0;
  groups().forEach(function(g){
    var list=byGroup[String(g.id)];
    if(!list||!list.length)return;
    groupCount++;
    var subtotal=0;
    var itemsHtml=list.map(function(it){
      var line=(Number(it.qty)||0)*(Number(it.price)||0);
      subtotal+=line;
      return '<div class="adsb-row">'+
        '<div class="adsb-rn">'+esc(it.name||"Позиція")+'</div>'+
        '<div class="adsb-rq">'+(Number(it.qty)||0)+' '+esc(it.unit||"")+'</div>'+
        '<div class="adsb-rp">'+money(line)+'</div>'+
      '</div>';
    }).join("");
    grandTotal+=subtotal;
    rows.push(
      '<div class="adsb-grp">'+
        '<div class="adsb-grp-head">'+ico(groupIconId(g.name),"rm-ico adsb-grp-ico")+
          '<div class="adsb-grp-name">'+esc(g.name||"Група")+'</div>'+
          '<div class="adsb-grp-sum">'+money(subtotal)+'</div>'+
        '</div>'+itemsHtml+
      '</div>'
    );
  });

  body.innerHTML=rows.length?rows.join(""):'<div class="adsb-empty">'+ico("rmi-folder")+'<div>Ще немає заповнених позицій</div></div>';
  if(badge)badge.textContent=groupCount+(groupCount===1?" група":groupCount>=2&&groupCount<=4?" групи":" груп");
  if(totalEl)totalEl.textContent=money(grandTotal);
}

/* Синхронізація: чіпляємось до вже існуючого renderElemList (той самий
   патерн, що й в інших наших файлах) — панель оновлюється кожного разу,
   коли оновлюється сама номенклатура, без окремих таймерів/спостерігачів. */
function installHook(){
  var prev=window.renderElemList||((typeof renderElemList==="function")?renderElemList:null);
  if(typeof prev==="function"&&!prev.__desktopSidebarV1){
    var wrapped=function(){var r=prev.apply(this,arguments);render();return r};
    wrapped.__desktopSidebarV1=true;
    window.renderElemList=wrapped;
    try{renderElemList=wrapped}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
}

function boot(){installDesktopCanvasStroke();installHook();render()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
var _tries=0,_timer=setInterval(function(){
  _tries++;
  if(!gid("aceilDesktopSidebar"))boot();else render();
  if(_tries>80)clearInterval(_timer);
},500);
})();
