
(function(){
"use strict";
if(window.__aceilColorPickerV2)return;
window.__aceilColorPickerV2=true;

/* ============================================================
   A·CEIL — вибір кольору плівки (v2)
   Кнопка прямо на канвасі + пошук/популярні/фактури в модалці.

   ВАЖЛИВО ПРО ЗБЕРІГАННЯ ДАНИХ (на відміну від тестової версії,
   де код кольору ховався рядком у полі resultQty — полі, яке вже
   зайняте іншою логікою мерджу/синку номенклатури):
   тут кожен обраний колір — це 2 ЗВИЧАЙНІ елементи elemItems з
   реальними name/price/colorCode/colorTexture/filmWidth. Ніяких
   прихованих полів, ніяких сторонніх сутностей. Це саме ті поля,
   які й так читає autoFillNomenclature (за filmWidth) і які
   потрапляють у звіти/CSV/синк "як є", без окремих обгорток. ============================================================ */

function gid(x){return document.getElementById(x)}
function items(){
  try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemItems)?window.elemItems:[];
}
function groups(){
  try{if(typeof elemGroups!=="undefined"&&Array.isArray(elemGroups))return elemGroups}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemGroups)?window.elemGroups:[];
}
function esc(s){
  try{if(typeof escapeHtml==="function")return escapeHtml(s)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]});
}
function norm(v){return String(v||"").trim().toLowerCase()}

function catalog(){return Array.isArray(window.ACEIL_COLOR_CATALOG)?window.ACEIL_COLOR_CATALOG:[]}
function pricing(){return window.ACEIL_FILM_PRICING||{}}
function texLabels(){return window.ACEIL_TEXTURE_LABELS||{lak:"Глянець",mat:"Мат",satin:"Сатин"}}
function popularCodes(){return Array.isArray(window.ACEIL_POPULAR_CODES)?window.ACEIL_POPULAR_CODES:[]}

var _activeTexture="";   // "" = показуємо все (популярні/пошук), інакше конкретна фактура
var _searchQuery="";

/* ---------- пошук поточного кольору кімнати (без прихованих слотів) ---------- */
function currentColorItems(){
  return items().filter(function(it){return it&&it.colorCode});
}
function currentColorCode(){
  var withQty=currentColorItems().find(function(it){return Number(it.qty)>0});
  var any=withQty||currentColorItems()[0];
  return any?any.colorCode:null;
}

/* ---------- пошук/створення групи "Плівка Premium" ---------- */
function findOrCreateFilmGroup(){
  var g=groups().find(function(x){
    var n=norm(x&&x.name);
    return n.indexOf("плів")>=0||n.indexOf("полотно")>=0||n.indexOf("film")>=0;
  });
  if(g)return g.id;
  var ng={id:"g_film_"+Date.now(),name:"Плівка Premium",collapsed:false};
  groups().unshift(ng);
  return ng.id;
}

/* ---------- застосування вибору кольору ---------- */
function chooseColor(code,texture){
  var arr=items();
  var groupId=findOrCreateFilmGroup();
  var price=pricing()[texture]||pricing().lak||{t36:0,t51:0};

  /* Одна кімната = один колір плівки: прибираємо попередній вибір
     (будь-де в номенклатурі кімнати, не тільки в цій групі) перш ніж
     додати новий — це звичайні елементи, видаляємо їх звичайним filter. */
  for(var i=arr.length-1;i>=0;i--){
    if(arr[i].colorCode)arr.splice(i,1);
  }

  var stamp="e"+Date.now();
  arr.push({
    id:stamp+"a",groupId:groupId,icon:"🎨",
    name:code+" 3.6м",qty:0,unit:"м²",price:price.t36||0,
    inputMode:"manual",source:"",sourceVariant:"",
    filmWidth:3.6,filmSelected:true,
    colorCode:code,colorTexture:texture
  });
  arr.push({
    id:stamp+"b",groupId:groupId,icon:"🎨",
    name:code+" 5.1м",qty:0,unit:"м²",price:price.t51||0,
    inputMode:"manual",source:"",sourceVariant:"",
    filmWidth:5.1,filmSelected:true,
    colorCode:code,colorTexture:texture
  });

  try{if(typeof autoFillNomenclature==="function")autoFillNomenclature({silent:true})}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof renderElemList==="function")renderElemList()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof saveState==="function")saveState()}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  closePicker();
  updateButton();
  try{
    if(typeof showToast==="function"){
      var need=requiredWidthCm();
      var w=need>0?(need<=360?" · 360 см":need<=560?" · 560 см":" · немає достатньої ширини"):"";
      showToast("🎨 Колір "+code+w,3200);
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* ---------- потрібна ширина / площа кімнати (ті самі готові функції проєкту) ---------- */
function requiredWidthCm(){
  try{if(typeof getRequiredFilmWidthMeters==="function")return (Number(getRequiredFilmWidthMeters())||0)*100}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return 0;
}

/* ---------- плаваюча кнопка на канвасі ---------- */
function buildButton(){
  var host=document.querySelector(".canvas-container");
  if(!host)return false;
  if(gid("aceilColorPickerBtn"))return true;
  var btn=document.createElement("button");
  btn.type="button";
  btn.id="aceilColorPickerBtn";
  btn.innerHTML='<span class="acpb-icon">🎨</span><span class="acpb-code" id="acpbCode">Колір</span><span class="acpb-width" id="acpbWidth">обрати</span>';
  btn.addEventListener("click",openPicker);
  host.appendChild(btn);
  return true;
}
function updateButton(){
  var codeEl=gid("acpbCode"),widthEl=gid("acpbWidth"),btn=gid("aceilColorPickerBtn");
  if(!codeEl||!widthEl||!btn)return;
  var code=currentColorCode();
  if(!code){
    codeEl.textContent="Колір";
    widthEl.textContent="обрати";
    btn.classList.remove("acpb-error");
    return;
  }
  codeEl.textContent=code;
  var need=requiredWidthCm();
  if(need<=0){widthEl.textContent="AUTO";btn.classList.remove("acpb-error");return}
  if(need<=360+1e-6){widthEl.textContent="360 см";btn.classList.remove("acpb-error");return}
  if(need<=560+1e-6){widthEl.textContent="560 см";btn.classList.remove("acpb-error");return}
  widthEl.textContent="немає ширини";btn.classList.add("acpb-error");
}

/* ---------- модалка: популярні / вкладки / пошук / сітка ---------- */
function buildModal(){
  if(gid("aceilColorPickerModalV2"))return;
  var modal=document.createElement("div");
  modal.id="aceilColorPickerModalV2";
  modal.innerHTML=
    '<div class="acp2-card">'+
      '<div class="acp2-head">'+
        '<div><div class="acp2-title">Колір плівки MSD Premium</div>'+
        '<div class="acp2-sub">Глянець · Мат · Сатин — '+catalog().length+' кольорів</div></div>'+
        '<button type="button" class="acp2-x" id="acp2Close">×</button>'+
      '</div>'+
      '<div class="acp2-body">'+
        '<div class="acp2-label">Популярні</div>'+
        '<div class="acp2-popular" id="acp2Popular"></div>'+
        '<label class="acp2-search"><span>⌕</span>'+
          '<input id="acp2Search" type="text" inputmode="search" placeholder="Пошук: 402, глянець, мат…" autocomplete="off" autocapitalize="off" spellcheck="false"></label>'+
        '<div class="acp2-tabs" id="acp2Tabs"></div>'+
        '<div class="acp2-grid" id="acp2Grid"></div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(modal);
  gid("acp2Close").addEventListener("click",closePicker);
  gid("acp2Search").addEventListener("input",function(){_searchQuery=this.value;_activeTexture="";renderTabs();renderGrid()});
  modal.addEventListener("click",function(e){if(e.target===modal)closePicker()});
}

function renderPopular(){
  var host=gid("acp2Popular");if(!host)return;
  var current=currentColorCode();
  var list=catalog().filter(function(c){return popularCodes().indexOf(c.code)!==-1});
  host.innerHTML=list.map(function(c){
    return '<button type="button" class="acp2-pop-btn'+(c.code===current?" active":"")+'" onclick="window.__aceilColorPickerChoose(\''+c.code+'\',\''+c.texture+'\')">'+esc(c.code)+'</button>';
  }).join("");
}
function renderTabs(){
  var host=gid("acp2Tabs");if(!host)return;
  var order=["lak","mat","satin"];
  var labels=texLabels();
  host.innerHTML=order.map(function(t){
    var count=catalog().filter(function(c){return c.texture===t}).length;
    return '<button type="button" class="acp2-tab'+(t===_activeTexture?" active":"")+'" onclick="window.__aceilColorPickerTab(\''+t+'\')">'+esc(labels[t]||t)+' <span>'+count+'</span></button>';
  }).join("");
}
var TEXTURE_WORDS={"глянець":"lak","глянц":"lak","лак":"lak","мат":"mat","матов":"mat","сатин":"satin"};
function renderGrid(){
  var host=gid("acp2Grid");if(!host)return;
  var q=norm(_searchQuery).replace(/\s+/g,"");
  var list;
  if(q){
    var wordTexture="";
    Object.keys(TEXTURE_WORDS).forEach(function(w){if(q.indexOf(w)===0)wordTexture=TEXTURE_WORDS[w]});
    list=catalog().filter(function(c){
      return c.code.toLowerCase().indexOf(q)!==-1||(wordTexture&&c.texture===wordTexture);
    });
  }else if(_activeTexture){
    list=catalog().filter(function(c){return c.texture===_activeTexture});
  }else{
    list=[];
  }
  if(!list.length){
    host.innerHTML='<div class="acp2-empty">'+(q?"Нічого не знайдено":"Оберіть фактуру вище або скористайтесь пошуком")+'</div>';
    return;
  }
  var current=currentColorCode();
  host.innerHTML=list.map(function(c){
    var marks=[];
    if(c.insert)marks.push('<span title="Можлива кольорова вставка">✦</span>');
    if(c.extra400)marks.push('<span title="Додатково є ширина 400см">400</span>');
    if(c.extra500)marks.push('<span title="Додатково є ширина 500см">500</span>');
    var tex=q?('<div class="acp2-chip-tex">'+esc(texLabels()[c.texture]||"")+'</div>'):"";
    return '<button type="button" class="acp2-chip'+(c.code===current?" active":"")+'" onclick="window.__aceilColorPickerChoose(\''+c.code+'\',\''+c.texture+'\')">'+
      '<div class="acp2-chip-code">'+esc(c.code)+'</div>'+tex+
      (marks.length?'<div class="acp2-chip-marks">'+marks.join("")+'</div>':"")+
      '</button>';
  }).join("");
}

function openPicker(e){
  if(e){e.preventDefault();e.stopPropagation()}
  buildModal();
  _searchQuery="";_activeTexture="";
  var input=gid("acp2Search");if(input)input.value="";
  renderPopular();renderTabs();renderGrid();
  gid("aceilColorPickerModalV2").classList.add("open");
  if(input)setTimeout(function(){input.focus()},180);
  return false;
}
function closePicker(){
  var m=gid("aceilColorPickerModalV2");
  if(m)m.classList.remove("open");
}

window.__aceilColorPickerChoose=chooseColor;
window.__aceilColorPickerTab=function(t){_activeTexture=t;_searchQuery="";var input=gid("acp2Search");if(input)input.value="";renderTabs();renderGrid()};

/* ---------- реакція на зміну кімнати/площі, щоб кнопка лишалась актуальною ---------- */
function installRoomHooks(){
  var oldLoad=window._loadRoomToCanvas||((typeof _loadRoomToCanvas==="function")?_loadRoomToCanvas:null);
  if(typeof oldLoad==="function"&&!oldLoad.__colorPickerV2){
    var loadWrap=function(){var r=oldLoad.apply(this,arguments);setTimeout(updateButton,0);return r};
    loadWrap.__colorPickerV2=true;window._loadRoomToCanvas=loadWrap;
    try{_loadRoomToCanvas=loadWrap}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  var oldNew=window.confirmNewRoom||((typeof confirmNewRoom==="function")?confirmNewRoom:null);
  if(typeof oldNew==="function"&&!oldNew.__colorPickerV2){
    var newWrap=function(){var r=oldNew.apply(this,arguments);setTimeout(updateButton,30);return r};
    newWrap.__colorPickerV2=true;window.confirmNewRoom=newWrap;
    try{confirmNewRoom=newWrap}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  var oldTab=window._switchToRoomTab||((typeof _switchToRoomTab==="function")?_switchToRoomTab:null);
  if(typeof oldTab==="function"&&!oldTab.__colorPickerV2){
    var tabWrap=function(){var r=oldTab.apply(this,arguments);setTimeout(updateButton,30);return r};
    tabWrap.__colorPickerV2=true;window._switchToRoomTab=tabWrap;
    try{_switchToRoomTab=tabWrap}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  var areaNode=gid("area");
  if(areaNode&&typeof MutationObserver==="function"&&!window.__aceilColorPickerAreaObs){
    window.__aceilColorPickerAreaObs=new MutationObserver(updateButton);
    window.__aceilColorPickerAreaObs.observe(areaNode,{childList:true,characterData:true,subtree:true});
  }
}

function boot(){
  if(!buildButton())return;
  installRoomHooks();
  updateButton();
}

window.addEventListener("keydown",function(e){if(e.key==="Escape")closePicker()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
/* канвас-контейнер інколи зʼявляється пізніше за цей скрипт при першому завантаженні —
   кілька спроб протягом перших секунд, без нескінченного інтервалу як у тестовій версії */
var _bootTries=0;
var _bootTimer=setInterval(function(){
  _bootTries++;
  if(gid("aceilColorPickerBtn")||_bootTries>20){clearInterval(_bootTimer);return}
  boot();
},250);
})();
