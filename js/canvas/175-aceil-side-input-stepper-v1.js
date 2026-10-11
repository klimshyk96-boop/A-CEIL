/* A·CEIL — введення розмірів стін (кнопка «Розміри»).

   Режими:
   • «Усі сторони» (за замовчуванням) — компактна таблиця AB, BC, CD… внизу екрана + прев'ю канваса зверху.
   • «По одній стороні» — одне велике поле з навігацією ‹ ›.

   Як це влаштовано:
   • Власний шар #aceilDimsV18 (CSS у assets/ui2.css). Старе вікно #sideInputModal НЕ переписується —
     воно лишається для редагування кривих стін (див. openSideInputModalLegacy) і працює як раніше.
   • Шар прив'язаний до visualViewport, тому на iPhone таблиця стоїть прямо над клавіатурою.
     Прев'ю зверху — жива копія канваса #cv (із синьою підсвіткою активної стіни),
     тож геометрія, draw(), undo/redo та інші модулі не чіпаються.
   • Розміри застосовуються лише по «Побудувати»: lengths[] → rebuild() → saveState() (той самий шлях, що й у старому вікні). */
(function(){
"use strict";
if(window.__A_CEIL_SIDE_INPUT_DOCK_V18)return;
window.__A_CEIL_SIDE_INPUT_DOCK_V18=true;

var legacyOpen=window.openSideInputModal;   /* оригінальне вікно з редактором дуг (#019 + обгортка #129) */
var layer=null,view=null,pv=null,pctx=null,sheet=null,body=null,countEl=null,modeBtn=null,prevBtn=null,nextBtn=null;
var isOpen=false,mode="all",activeIndex=0,draft=[],bound=false,layoutRaf=0,syncRaf=0;
var voice={rec:null,on:false,seen:{},timer:0,btn:null,hint:null};

function nm(i){try{return N(i);}catch(_){return String.fromCharCode(65+(i%26));}}
function sideName(i){return nm(i)+nm((i+1)%pts.length);}
function num(v){var x=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(x)&&x>0?x:0;}
function fmt(v){return v?String(Math.round(v*100)/100):"";}
function isArc(i){try{return wallTypes[i]==="arc";}catch(_){return false;}}
function cleanNum(s){return String(s).replace(/[^0-9.,]/g,"");}
function inputs(){return body?body.querySelectorAll("input[data-di]"):[];}

/* ---------- прев'ю канваса ---------- */
function sync(){
  if(!isOpen||!pv)return;
  var src=document.getElementById("cv");if(!src||!src.width||!src.height)return;
  var w=Math.min(src.width,1000),h=Math.round(w*src.height/src.width);
  if(pv.width!==w||pv.height!==h){pv.width=w;pv.height=h;}
  try{pctx.clearRect(0,0,w,h);pctx.drawImage(src,0,0,w,h);}catch(_){}
}
function scheduleSync(){
  sync();
  cancelAnimationFrame(syncRaf);
  syncRaf=requestAnimationFrame(function(){sync();syncRaf=requestAnimationFrame(sync);});
}
function paintWall(i){
  try{_wallSideFlash=i;draw();}catch(_){}
  scheduleSync();
}
function fitPreview(){
  if(!view||!pv||layer.classList.contains("aceil-dims--float"))return;
  var src=document.getElementById("cv");if(!src||!src.width)return;
  var cs=getComputedStyle(view);
  var aw=view.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  var ah=view.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  if(aw<=0||ah<=0)return;
  var k=Math.min(aw/src.width,ah/src.height);
  pv.style.width=Math.floor(src.width*k)+"px";pv.style.height=Math.floor(src.height*k)+"px";
}

/* ---------- розкладка під visualViewport (клавіатура iPhone) ---------- */
function layout(){
  if(!isOpen||!layer)return;
  var vv=window.visualViewport;
  var w=vv?vv.width:innerWidth,h=vv?vv.height:innerHeight;
  var top=vv?vv.offsetTop:0,left=vv?vv.offsetLeft:0;
  var coarse=false;try{coarse=matchMedia("(pointer:coarse)").matches;}catch(_){}
  var floating=!(coarse||w<700);
  var kb=(innerHeight-h)>120;
  layer.classList.toggle("aceil-dims--float",floating);
  layer.classList.toggle("aceil-dims--kb",kb);
  if(floating){
    layer.style.top="0";layer.style.left="0";layer.style.width="100%";layer.style.height="100%";
    sheet.style.maxHeight="";
  }else{
    layer.style.top=Math.round(top)+"px";layer.style.left=Math.round(left)+"px";
    layer.style.width=Math.round(w)+"px";layer.style.height=Math.round(h)+"px";
    sheet.style.maxHeight=Math.max(150,Math.round(h*0.66))+"px";
  }
  fitPreview();
}
function scheduleLayout(){cancelAnimationFrame(layoutRaf);layoutRaf=requestAnimationFrame(layout);}
function bindViewport(){
  if(bound)return;bound=true;
  if(window.visualViewport){visualViewport.addEventListener("resize",scheduleLayout);visualViewport.addEventListener("scroll",scheduleLayout);}
  window.addEventListener("resize",scheduleLayout);
  window.addEventListener("orientationchange",function(){setTimeout(scheduleLayout,150);});
  document.addEventListener("keydown",function(e){if(isOpen&&e.key==="Escape"){e.preventDefault();hide(true);}});
}

/* ---------- дані ---------- */
function commit(){
  var f=inputs();
  for(var k=0;k<f.length;k++)draft[+f[k].dataset.di]=num(f[k].value);
}

/* ---------- UI ---------- */
function build(){
  if(!document.getElementById("aceilDimsSelectionStyle")){
    var style=document.createElement("style");
    style.id="aceilDimsSelectionStyle";
    style.textContent=
      '#aceilDimsV18 .aceil-dims-cell.active{border-color:#2563eb!important;background:#eff6ff!important}'+
      '#aceilDimsV18 .aceil-dims-cell.active .aceil-dims-lab{color:#1d4ed8!important}'+
      '#aceilDimsV18 .aceil-dims-single strong{color:#1d4ed8!important}'+
      '#aceilDimsV18 .aceil-dims-field{border-color:#2563eb!important;background:#eff6ff!important}'+
      '#aceilDimsV18 .aceil-dims-voice-btn{margin-left:auto!important;height:32px!important;min-height:32px!important;width:40px!important;padding:0!important;border:0!important;border-radius:10px!important;background:#eff6ff!important;color:#1d4ed8!important;font-size:16px!important;box-shadow:none!important}'+
      '#aceilDimsV18 .aceil-dims-voice-btn[hidden]{display:none!important}'+
      '#aceilDimsV18 .aceil-dims-voice-btn+.aceil-dims-mode{margin-left:0!important}'+
      '#aceilDimsV18 .aceil-dims-voice-btn.on{background:#dc2626!important;color:#fff!important}'+
      '#aceilDimsV18 .aceil-dims-voice-hint{flex:0 0 auto;padding:0 2px 4px;font-size:13px;font-weight:700;color:#1d4ed8}'+
      '#aceilDimsV18 .aceil-dims-voice-hint.bad{color:#b45309}'+
      '#aceilDimsV18 .aceil-dims-voice-hint[hidden]{display:none!important}';
    document.head.appendChild(style);
  }
  layer=document.createElement("div");
  layer.id="aceilDimsV18";layer.className="aceil-dims";layer.hidden=true;
  layer.setAttribute("role","dialog");layer.setAttribute("aria-label","Розміри стін");
  layer.innerHTML=
    '<div class="aceil-dims-view"><canvas class="aceil-dims-cv" aria-hidden="true"></canvas></div>'+
    '<div class="aceil-dims-sheet">'+
      '<div class="aceil-dims-head"><h3>📋 Розміри</h3><span class="aceil-dims-count"></span>'+
        '<button type="button" class="aceil-dims-voice-btn" aria-label="Голосовий ввід розмірів" hidden>🎤</button>'+
        '<button type="button" class="aceil-dims-mode"></button>'+
        '<button type="button" class="aceil-dims-x" aria-label="Закрити">×</button></div>'+
      '<div class="aceil-dims-voice-hint" hidden></div>'+
      '<div class="aceil-dims-body"></div>'+
      '<div class="aceil-dims-actions">'+
        '<button type="button" class="aceil-dims-nav" data-nav="-1" aria-label="Попередня сторона">‹</button>'+
        '<button type="button" class="aceil-dims-nav" data-nav="1" aria-label="Наступна сторона">›</button>'+
        '<button type="button" class="aceil-dims-apply">Побудувати</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(layer);
  view=layer.querySelector(".aceil-dims-view");pv=layer.querySelector(".aceil-dims-cv");pctx=pv.getContext("2d");
  sheet=layer.querySelector(".aceil-dims-sheet");body=layer.querySelector(".aceil-dims-body");
  countEl=layer.querySelector(".aceil-dims-count");modeBtn=layer.querySelector(".aceil-dims-mode");
  prevBtn=layer.querySelector('[data-nav="-1"]');nextBtn=layer.querySelector('[data-nav="1"]');
  voice.btn=layer.querySelector(".aceil-dims-voice-btn");voice.hint=layer.querySelector(".aceil-dims-voice-hint");

  /* кнопки не забирають фокус із поля (на ПК) — клавіатура не мигає */
  layer.querySelectorAll("button").forEach(function(b){b.addEventListener("mousedown",function(e){e.preventDefault();});});
  layer.querySelector(".aceil-dims-x").onclick=function(){hide(true);};
  layer.querySelector(".aceil-dims-apply").onclick=apply;
  modeBtn.onclick=function(){setMode(mode==="all"?"single":"all");};
  prevBtn.onclick=function(){go(activeIndex-1,true);};
  nextBtn.onclick=function(){next();};
  voice.btn.onclick=function(){if(voice.on)voiceStop();else voiceStart();};   /* старт — у жесті дотику: iOS інакше не дасть мікрофон */
  /* не гортаємо сторінку під шаром (iOS) — крім самої таблиці */
  layer.addEventListener("touchmove",function(e){if(!e.target.closest||!e.target.closest(".aceil-dims-body"))e.preventDefault();},{passive:false});
}

function renderBody(){
  var n=pts.length,h="",i;
  if(mode==="all"){
    h='<div class="aceil-dims-grid">';
    for(i=0;i<n;i++){
      h+='<div class="aceil-dims-cell'+(draft[i]?' filled':'')+'" data-row="'+i+'">'+
         '<button type="button" class="aceil-dims-lab" data-lab="'+i+'" tabindex="-1">'+sideName(i)+(isArc(i)?'<i>〜</i>':'')+'</button>'+
         '<input data-di="'+i+'" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="'+(i===n-1?'done':'next')+'" value="'+fmt(draft[i])+'" placeholder="0" aria-label="'+sideName(i)+', см">'+
         '<em>см</em></div>';
    }
    h+='</div>';
  }else{
    h='<div class="aceil-dims-single"><strong></strong><div class="aceil-dims-field">'+
      '<input data-di="0" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="0"><em>см</em></div></div>';
  }
  body.innerHTML=h;
  var f=inputs();
  for(i=0;i<f.length;i++)bindField(f[i]);
  body.querySelectorAll("[data-lab]").forEach(function(b){b.onclick=function(){go(+b.dataset.lab,true);};});
}

function bindField(f){
  f.addEventListener("focus",function(){
    var i=+f.dataset.di;
    if(i!==activeIndex){activeIndex=i;paint();paintWall(i);}
  });
  f.addEventListener("input",function(){
    var c=cleanNum(f.value);if(c!==f.value)f.value=c;
    var i=+f.dataset.di;draft[i]=num(f.value);
    var cell=f.closest(".aceil-dims-cell");if(cell)cell.classList.toggle("filled",!!draft[i]);
  });
  f.addEventListener("keydown",function(e){
    if(e.key!=="Enter"&&e.key!=="Go"&&e.key!=="Next")return;
    e.preventDefault();next();
  });
}

/* Оновлює підсвітку/лічильники (у режимі «По одній» — ще й вміст єдиного поля, не пересоздаючи його: клавіатура лишається). */
function paint(){
  var n=pts.length;
  if(mode==="all"){
    body.querySelectorAll(".aceil-dims-cell").forEach(function(c,k){c.classList.toggle("active",k===activeIndex);});
  }else{
    var f=body.querySelector("input[data-di]"),lab=body.querySelector(".aceil-dims-single strong");
    if(f){f.dataset.di=String(activeIndex);f.value=fmt(draft[activeIndex]);f.setAttribute("aria-label",sideName(activeIndex)+", см");
      f.setAttribute("enterkeyhint",activeIndex===n-1?"done":"next");}
    if(lab)lab.textContent=sideName(activeIndex)+(isArc(activeIndex)?" 〜":"");
  }
  countEl.textContent=(activeIndex+1)+"/"+n;
  prevBtn.disabled=activeIndex===0;
  modeBtn.textContent=mode==="all"?"По одній стороні":"Усі сторони";
}

function ensureVisible(){
  if(mode!=="all")return;
  var row=body.querySelector('.aceil-dims-cell[data-row="'+activeIndex+'"]');if(!row)return;
  var top=row.offsetTop,bottom=top+row.offsetHeight;
  if(top<body.scrollTop)body.scrollTop=Math.max(0,top-2);
  else if(bottom>body.scrollTop+body.clientHeight)body.scrollTop=bottom-body.clientHeight+2;
}
function focusField(){
  var f=mode==="all"?body.querySelector('input[data-di="'+activeIndex+'"]'):body.querySelector("input[data-di]");
  if(!f)return;
  try{f.focus({preventScroll:true});}catch(_){f.focus();}
  try{f.setSelectionRange(0,String(f.value).length);}catch(_){try{f.select();}catch(__){}}
  ensureVisible();
}

function go(i,focus){
  var n=pts.length;
  if(mode==="single")commit();                     /* зберегти значення поточної сторони */
  activeIndex=Math.max(0,Math.min(n-1,i));
  paint();paintWall(activeIndex);
  if(focus!==false)focusField();
  else ensureVisible();
}
function next(){
  if(mode==="single")commit();
  if(activeIndex<pts.length-1)go(activeIndex+1,true);
  else apply();                                    /* після останньої сторони — «Побудувати» */
}
function setMode(m){
  commit();mode=m;
  renderBody();paint();layout();paintWall(activeIndex);focusField();
}

/* ---------- відкриття / закриття / застосування ---------- */
function open(initialIndex){
  if(typeof closed==="undefined"||!closed||pts.length<3){try{showToast("Спочатку замкніть контур");}catch(_){}return;}
  if(!layer)build();
  var n=pts.length,i;draft=[];
  for(i=0;i<n;i++)draft[i]=num(lengths[i]);
  mode="all";activeIndex=Math.max(0,Math.min(n-1,Number.isFinite(+initialIndex)?+initialIndex:0));
  renderBody();
  voiceStop();voice.btn.hidden=!(voiceSR()&&window.A_CEIL_VoiceNumber);
  isOpen=true;layer.hidden=false;document.body.classList.add("aceil-dims-open");
  bindViewport();paint();layout();paintWall(activeIndex);
  focusField();                                    /* синхронно в жесті дотику — інакше iOS не покаже клавіатуру */
  setTimeout(function(){if(isOpen){layout();if(!layer.contains(document.activeElement))focusField();}},120);
}
function hide(redraw){
  if(!isOpen)return;
  isOpen=false;voiceStop();layer.hidden=true;document.body.classList.remove("aceil-dims-open");
  try{if(layer.contains(document.activeElement))document.activeElement.blur();}catch(_){}
  try{_wallSideFlash=-1;}catch(_){}
  if(redraw!==false){try{draw();}catch(_){}}
}
function apply(){
  if(!isOpen)return;
  commit();
  var n=pts.length,i;
  for(i=0;i<n;i++)lengths[i]=draft[i]||0;          /* на місці, як у старому вікні: масив lengths не підміняємо */
  document.querySelectorAll("#tbl input[data-i]").forEach(function(f){
    var k=+f.dataset.i||0;f.value=lengths[k]||"";f.classList.toggle("filled",!!lengths[k]);
  });
  var per=document.getElementById("per");if(per)per.textContent=(_totalPerimeterCm()/100).toFixed(2);
  hide(false);
  rebuild();saveState();
  setTimeout(function(){try{window["A·CEILMeasureConfidence"]&&typeof window["A·CEILMeasureConfidence"].notify==="function"&&window["A·CEILMeasureConfidence"].notify(true);}catch(e){window.__diagSilent&&window.__diagSilent(e);}},250);
}

/* ---------- голосовий ввід ----------
   Одна безперервна сесія розпізнавання (без перезапусків із таймера: iOS Safari їх блокує).
   Сказане число стає значенням активної сторони, далі те саме next(), що й по Enter;
   після останньої сторони next() викликає apply() — тобто «Побудувати» (мікрофон гаситься в hide()). */
function voiceSR(){return window.SpeechRecognition||window.webkitSpeechRecognition||null;}
function voiceSetHint(text,bad){
  if(!voice.hint)return;
  voice.hint.hidden=!text;voice.hint.textContent=text||"";voice.hint.classList.toggle("bad",!!bad);
}
function voiceUi(){
  if(!voice.btn)return;
  voice.btn.classList.toggle("on",voice.on);
  voice.btn.textContent=voice.on?"⏹":"🎤";
  voice.btn.setAttribute("aria-pressed",voice.on?"true":"false");
}
function voiceStop(keepHint){
  var r=voice.rec;voice.rec=null;voice.on=false;clearTimeout(voice.timer);voice.seen={};
  try{if(r)r.stop();}catch(_){}
  voiceUi();if(!keepHint)voiceSetHint("");
}
function voiceField(){
  return mode==="all"?body.querySelector('input[data-di="'+activeIndex+'"]'):body.querySelector("input[data-di]");
}
function voiceSetValue(v){
  var f=voiceField();if(!f)return;
  f.value=v;f.dispatchEvent(new Event("input",{bubbles:true}));   /* той самий шлях, що й ручне введення */
}
function voiceHandle(raw){
  var VN=window.A_CEIL_VoiceNumber;if(!VN||!isOpen)return;
  var cmd=VN.command(raw),n=pts.length;
  if(cmd==="stop"){voiceStop();return;}
  if(cmd==="back"){go(activeIndex-1,true);voiceSetHint("Назад: "+sideName(activeIndex));return;}
  if(cmd==="next"){go(Math.min(n-1,activeIndex+1),true);voiceSetHint("Далі: "+sideName(activeIndex));return;}
  if(cmd==="clear"){voiceSetValue("");voiceSetHint("Очищено: "+sideName(activeIndex));return;}
  var r=VN.parse(raw);
  if(!r){voiceSetHint("Не зрозумів: «"+raw+"»",true);return;}
  var name=sideName(activeIndex);
  voiceSetValue(String(r.cm));
  voiceSetHint(name+" = "+r.cm+" см"+((r.cm<10||r.cm>3000)?" — перевірте":""),r.cm<10||r.cm>3000);
  next();
}
function voiceFlush(){
  Object.keys(voice.seen).forEach(function(k){
    var o=voice.seen[k],t=o.cur;
    if(!t||t===o.done)return;
    var add=(o.done&&t.indexOf(o.done)===0)?t.slice(o.done.length).trim():t;   /* Safari іноді віддає текст наростаючим рядком */
    o.done=t;
    if(add)voiceHandle(add);
  });
}
function voiceStart(){
  var SR=voiceSR();if(!SR||!isOpen)return;
  var r=new SR();
  r.lang="uk-UA";r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
  voice.seen={};
  r.onresult=function(e){
    if(voice.rec!==r)return;
    var changed=false,last=e.results.length-1;
    for(var i=e.resultIndex;i<e.results.length;i++){
      var t=String(e.results[i][0].transcript||"").trim();
      var o=voice.seen[i]=voice.seen[i]||{done:"",cur:""};
      if(o.final&&t!==o.cur)o.done="";               /* той самий номер, нове висловлювання */
      o.cur=t;o.final=e.results[i].isFinal;changed=true;
    }
    if(changed){clearTimeout(voice.timer);voice.timer=setTimeout(voiceFlush,e.results[last].isFinal?50:1100);}
  };
  r.onerror=function(e){
    if(voice.rec!==r||e.error==="no-speech"||e.error==="aborted")return;
    var denied=e.error==="not-allowed"||e.error==="service-not-allowed";
    voiceStop(true);
    voiceSetHint(denied?"Мікрофон недоступний. Дозвольте його для сайту в Safari (або відкрийте сайт у вкладці Safari)":"Помилка мікрофона: "+e.error,true);
  };
  r.onend=function(){
    if(voice.rec!==r)return;
    voice.rec=null;voice.on=false;voiceUi();
    voiceSetHint("Мікрофон зупинився. Натисніть 🎤, щоб продовжити з "+sideName(activeIndex));
  };
  voice.rec=r;voice.on=true;
  try{r.start();}catch(_){voice.rec=null;voice.on=false;voiceSetHint("Не вдалося запустити мікрофон",true);}
  voiceUi();
  if(voice.on)voiceSetHint("Слухаю: "+sideName(activeIndex)+" (скажіть розмір у см)");
}

/* ---------- публічні точки входу ---------- */
function wallControlAt(clientX,clientY){
  var c=document.getElementById("cv"),rows=(window.__aceilShortWallHits||[]).concat(window.__aceilWLRows||[]);
  if(!c||!rows.length)return null;
  var r=c.getBoundingClientRect();if(!r.width||!r.height)return null;
  var px=(clientX-r.left)*(ACEILCanvas.width(c)/r.width),py=(clientY-r.top)*(ACEILCanvas.height(c)/r.height);
  for(var i=0;i<rows.length;i++){
    var q=rows[i];
    if(px>=q.x&&px<=q.x+q.w&&py>=q.y&&py<=q.y+q.h)return{i:q.i,action:q.action||"dimensions"};
  }
  return null;
}
function openWallListRow(e,point){
  var hit=wallControlAt(point.clientX,point.clientY);if(!hit)return;
  if(hit.action==="wall"){
    if(typeof window.rmWallTapOpenV84!=="function")return;
    if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();
    try{if(typeof flashWallSide==="function")flashWallSide(hit.i);}catch(_){}
    window.__A_CEILSelectedSideV89=hit.i;
    window.rmWallTapOpenV84(hit.i);
    return;
  }
  if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();open(hit.i);
}
document.addEventListener("touchstart",function(e){var t=e.touches&&e.touches[0];if(e.touches&&e.touches.length===1&&t)openWallListRow(e,t)},{capture:true,passive:false});
document.addEventListener("mousedown",function(e){openWallListRow(e,e)},true);

window.openSideInputModal=open;                        /* плитка «Розміри», меню стіни, ПК-сайдбар */
window.openSideInputModalLegacy=legacyOpen;            /* старе вікно з дугами — для редактора кривих (#130) */
window.openAllSideInputsModalV11=open;                 /* кнопка «Ввести всі розміри» у старому вікні → нова таблиця */
try{openSideInputModal=open;}catch(_){}
try{openAllSideInputsModalV11=open;}catch(_){}
})();
