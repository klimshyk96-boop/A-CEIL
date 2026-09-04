
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
  var nativeFillText=ctx.fillText;
  var nativeStrokeText=ctx.strokeText;
  function smallerFont(font){
    return String(font||"").replace(/(\d+(?:\.\d+)?)px/,function(_,size){
      return Math.max(8,Number(size)*.8).toFixed(1)+"px";
    });
  }
  ctx.stroke=function(){
    var original=this.lineWidth;
    /* На великому екрані canvas масштабується сильніше, тому базовий
       контур візуально ставав грубим. Не потовщуємо його до 4 px, як у
       попередньому desktop-патчі, а акуратно обмежуємо двома пікселями. */
    if(String(this.strokeStyle).toLowerCase()==="#1d1d1f"&&original>=1.5)this.lineWidth=1.5;
    try{return nativeStroke.apply(this,arguments)}finally{this.lineWidth=original}
  };
  ctx.fillText=function(){
    var original=this.font;
    this.font=smallerFont(original);
    try{return nativeFillText.apply(this,arguments)}finally{this.font=original}
  };
  ctx.strokeText=function(){
    var original=this.font;
    this.font=smallerFont(original);
    try{return nativeStrokeText.apply(this,arguments)}finally{this.font=original}
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

function textOf(id,fallback){var el=gid(id);return el?String(el.textContent||"").trim():(fallback||"—")}
function switchDesktopTab(name){
  var estimate=gid("adsbEstimatePanel"),room=gid("adsbRoomPanel");
  if(estimate)estimate.hidden=name!=="estimate";
  if(room)room.hidden=name!=="room";
  document.querySelectorAll("#aceilDesktopSidebar .adsb-tab").forEach(function(btn){
    btn.classList.toggle("active",btn.getAttribute("data-tab")===name);
  });
}
function applyDesktopSearch(){
  var input=gid("adsbSearch"),q=String(input&&input.value||"").toLowerCase().trim();
  document.querySelectorAll("#adsbGroups .adsb-grp").forEach(function(group){
    var groupMatch=String(group.getAttribute("data-name")||"").indexOf(q)>=0,visible=0;
    group.querySelectorAll(".adsb-row").forEach(function(row){
      var show=!q||groupMatch||String(row.getAttribute("data-name")||"").indexOf(q)>=0;
      row.style.display=show?"":"none";if(show)visible++;
    });
    group.style.display=(!q||groupMatch||visible)?"":"none";
  });
}

function buildShell(){
  var host=document.querySelector(".panel-column");
  if(!host)return false;
  if(!gid("aceilDesktopSidebar")){
    var card=document.createElement("div");
    card.id="aceilDesktopSidebar";
    card.innerHTML=
      '<div class="adsb-tabs">'+
        '<button type="button" class="adsb-tab active" data-tab="estimate">Кошторис</button>'+
        '<button type="button" class="adsb-tab" data-tab="room">Кімната</button>'+
      '</div>'+
      '<div id="adsbEstimatePanel" class="adsb-panel">'+
        '<div class="adsb-head"><div><div class="adsb-title">Номенклатура</div><div class="adsb-meta" id="adsbMeta">0 груп · 0 позицій</div></div><button type="button" class="adsb-head-action" onclick="openElementsModal()" aria-label="Налаштувати">'+ico("rmi-wrench")+'</button></div>'+
        '<label class="adsb-search">⌕<input id="adsbSearch" type="search" placeholder="Пошук позиції…"></label>'+
        '<div id="adsbGroups"></div>'+
        '<div class="adsb-total"><div><span>До сплати</span><b id="adsbTotal">₴0</b></div></div>'+
        '<div class="adsb-actions"><button type="button" onclick="openElementsModal()">'+ico("rmi-pencil")+' Редагувати</button><button type="button" class="primary" onclick="openReportSettings()">'+ico("rmi-report")+' Створити звіт</button></div>'+
      '</div>'+
      '<div id="adsbRoomPanel" class="adsb-panel" hidden>'+
        '<div class="adsb-head"><div><div class="adsb-title">Параметри кімнати</div><div class="adsb-meta">Поточний макет</div></div></div>'+
        '<div class="adsb-room-grid"><div><span>Площа</span><b id="adsbRoomArea">—</b></div><div><span>Периметр</span><b id="adsbRoomPer">—</b></div><div><span>Внутр. кути</span><b id="adsbRoomIn">—</b></div><div><span>Зовн. кути</span><b id="adsbRoomOut">—</b></div></div>'+
        '<div class="adsb-property"><span>Кімната</span><b id="adsbRoomName">1</b></div>'+
        '<div class="adsb-property"><span>Полотно</span><b id="adsbRoomFilm">M303 · AUTO</b></div>'+
        '<div class="adsb-room-actions"><button type="button" onclick="openSideInputModal()">'+ico("rmi-measure")+' Розміри</button><button type="button" onclick="openRmLightStart()">'+ico("rmi-light")+' Світло</button><button type="button" onclick="openElementsModal()">'+ico("rmi-elements")+' Елементи</button><button type="button" onclick="openProjectsModal()">'+ico("rmi-folder")+' Проєкти</button></div>'+
      '</div>';
    host.insertBefore(card,host.firstChild);
    card.querySelectorAll(".adsb-tab").forEach(function(btn){btn.addEventListener("click",function(){switchDesktopTab(btn.getAttribute("data-tab"))})});
    var search=gid("adsbSearch");if(search)search.addEventListener("input",applyDesktopSearch);
  }
  var legacy=gid("aceilDesktopQuickActions");if(legacy)legacy.remove();
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

  var rows=[],grandTotal=0,groupCount=0,itemCount=0;
  groups().forEach(function(g){
    var list=byGroup[String(g.id)];
    if(!list||!list.length)return;
    groupCount++;itemCount+=list.length;
    var subtotal=0;
    var itemsHtml=list.map(function(it){
      var line=(Number(it.qty)||0)*(Number(it.price)||0);
      subtotal+=line;
      return '<div class="adsb-row" data-name="'+esc(String(it.name||"").toLowerCase())+'">'+
        '<div class="adsb-rn">'+esc(it.name||"Позиція")+'</div>'+
        '<div class="adsb-rq">'+(Number(it.qty)||0)+' '+esc(it.unit||"")+'</div>'+
        '<div class="adsb-rp">'+money(line)+'</div>'+
      '</div>';
    }).join("");
    grandTotal+=subtotal;
    rows.push(
      '<div class="adsb-grp" data-name="'+esc(String(g.name||"").toLowerCase())+'">'+
        '<div class="adsb-grp-head">'+ico(groupIconId(g.name),"rm-ico adsb-grp-ico")+
          '<div class="adsb-grp-name">'+esc(g.name||"Група")+'</div>'+
          '<div class="adsb-grp-sum">'+money(subtotal)+'</div>'+
        '</div>'+itemsHtml+
      '</div>'
    );
  });

  body.innerHTML=rows.length?rows.join(""):'<div class="adsb-empty">'+ico("rmi-folder")+'<div>Ще немає заповнених позицій</div></div>';
  if(badge)badge.textContent=groupCount+(groupCount===1?" група":groupCount>=2&&groupCount<=4?" групи":" груп");
  var meta=gid("adsbMeta");if(meta)meta.textContent=groupCount+" груп · "+itemCount+" позицій";
  if(totalEl)totalEl.textContent=money(grandTotal);
  var area=gid("adsbRoomArea"),per=gid("adsbRoomPer"),inc=gid("adsbRoomIn"),out=gid("adsbRoomOut"),roomName=gid("adsbRoomName"),film=gid("adsbRoomFilm");
  if(area)area.textContent=textOf("area","0.00")+" м²";
  if(per)per.textContent=textOf("per","0.00")+" м";
  if(inc)inc.textContent=textOf("inCorners","0");
  if(out)out.textContent=textOf("outCorners","0");
  if(roomName)roomName.textContent=textOf("rpcRoomName","1");
  if(film){var code=document.querySelector("#aceilColorPickerBtn .acpb-code"),width=document.querySelector("#aceilColorPickerBtn .acpb-width");film.textContent=[code&&code.textContent,width&&width.textContent].filter(Boolean).join(" · ")||"M303 · AUTO"}
  applyDesktopSearch();
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
