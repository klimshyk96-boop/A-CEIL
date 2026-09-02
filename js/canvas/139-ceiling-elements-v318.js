
(function(){
"use strict";
if(window.__rmCeilingElementsV318)return;
window.__rmCeilingElementsV318=true;
function gid(x){return document.getElementById(x)}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})}
function types(){
  try{if(Array.isArray(window.lightTypes))return window.lightTypes.slice()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{var a=JSON.parse(localStorage.getItem("lightTypes_v1")||"[]");return Array.isArray(a)?a:[]}catch(_){return[]}
}
function typeIsVent(t){var s=(String(t&&t.id||"")+" "+String(t&&t.label||"")).toLowerCase();return /vent|exhaust|hood|витяж|вентил/.test(s)}
function typeIsCustom(t){
  var id=String(t&&t.id||"").toLowerCase();
  return !!(t&&t.ceilingElement)||id.indexOf("ce_")===0;
}
/* A custom element may legitimately contain words such as "витяжка" or
   "люстра". Only built-in ids are system cards; labels must not hide it. */
function typeIsSystem(t){
  var id=String(t&&t.id||"").toLowerCase();
  if(typeIsCustom(t))return false;
  return id==="spot"||id==="chandelier"||id==="vent"||id==="exhaust"||id==="hood";
}
function findVent(){
  var a=types(),i;
  for(i=0;i<a.length;i++)if(!typeIsCustom(a[i])&&String(a[i]&&a[i].id||"").toLowerCase()==="vent")return a[i];
  for(i=0;i<a.length;i++)if(!typeIsCustom(a[i])&&typeIsVent(a[i]))return a[i];
  return null;
}
function setMode(id){
  try{
    var lm=(typeof lightMarks!=="undefined"&&Array.isArray(lightMarks))?lightMarks:(Array.isArray(window.lightMarks)?window.lightMarks:[]);
    window.__A·CEILCeilingOneShotV325={
      type:String(id),
      before:lm.filter(function(m){return m&&String(m.type)===String(id)}).length
    };
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var ok=false;
  try{
    if(typeof window.setLightMode==="function"){
      window.setLightMode(id);
      ok=true;
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  if(!ok){
    try{lightMode=id;ok=true}catch(_){window.lightMode=id;ok=true}
    try{if(typeof closeLightMenu==="function")closeLightMenu()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof updateLightBadge==="function")updateLightBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof draw==="function")draw()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  try{
    var a=types(),t=a.find(function(x){return String(x&&x.id||"")===String(id)});
    if(typeof showToast==="function")showToast("Тапніть на кресленні, щоб поставити: "+String(t&&t.label||"елемент"));
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return ok;
}
function closeMain(){try{if(typeof window.closeRmLightStart==="function")window.closeRmLightStart()}catch(_){window.__diagSilent&&window.__diagSilent(_)}}
function customCards(){
  return types().filter(function(t){return t&&!typeIsSystem(t)&&String(t.label||"").trim()}).map(function(t){
    return '<button type="button" class="rm-ce-card" data-custom-ce="'+esc(t.id)+'" onclick="rmCeUseCustomV318(this.getAttribute(\'data-custom-ce\'))">'
      +'<span class="rm-ce-icon violet">'+esc(t.icon||"◉")+'</span><span><b>'+esc(t.label)+'</b><small>розмістити на плані</small></span></button>';
  }).join("");
}
function render(){
  var card=gid("rmLightStartModal")&&gid("rmLightStartModal").querySelector(".modal");if(!card)return;
  var vent=findVent(), ventBtn=vent
    ?'<button type="button" class="rm-ce-card" onclick="rmCeVentV318()"><span class="rm-ce-icon green">◯</span><span><b>Витяжка</b><small>розташування + кількість</small></span></button>'
    :"";
  card.innerHTML=
    '<div class="rm-ce-head"><div><div class="rm-ce-title">Елементи стелі</div><div class="rm-ce-sub">Розміщення елементів і автоматичний прорахунок</div></div>'
    +'<button type="button" class="rm-ce-close" onclick="closeRmLightStart()">×</button></div>'
    +'<div class="rm-ce-grid">'
    +'<button type="button" class="rm-ce-card primary wide" data-flp="1" onclick="rmOpenLinearLightingV317()"><span class="rm-ce-icon">━</span><span><b>Лінійне освітлення</b><small>Готові фігури • Довільна форма</small></span></button>'
    +'<button type="button" class="rm-ce-card" onclick="rmStartChandelier()"><span class="rm-ce-icon">✶</span><span><b>Люстра</b><small>центр або ручне розташування</small></span></button>'
    +'<button type="button" class="rm-ce-card" onclick="rmStartSpotFlow()"><span class="rm-ce-icon">⊙</span><span><b>Точкові</b><small>один / ряд / сітка</small></span></button>'
    +ventBtn
    +'<button type="button" class="rm-ce-card" onclick="rmCeTrackV318()"><span class="rm-ce-icon">▭</span><span><b>Трекове освітлення</b><small>магнітний або накладний трек</small></span></button>'
    +customCards()
    +'</div>'
    +'<button type="button" class="rm-ce-new" onclick="rmOpenNewCeilingElementV318()">＋ Новий елемент</button>';
}
window.rmRenderCeilingElementsV318=render;
window.rmCeUseCustomV318=function(id){closeMain();setMode(id)};
var hostClick=gid("rmLightStartModal");
if(hostClick)hostClick.addEventListener("click",function(e){
  var b=e.target&&e.target.closest?e.target.closest("[data-custom-ce]"):null;
  if(b&&b.getAttribute("onclick")==null){
    e.preventDefault();
    window.rmCeUseCustomV318(b.getAttribute("data-custom-ce"));
  }
});
window.rmCeVentV318=function(){var t=findVent();if(t){closeMain();setMode(t.id)}};
window.rmCeTrackV318=function(){
  closeMain();
  try{
    if(typeof window.rmOpenLinearElement==="function")window.rmOpenLinearElement();
    if(typeof window.leChooseType==="function")window.leChooseType("magneticTrack");
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
};
window.rmOpenNewCeilingElementV318=function(){
  closeMain();
  var m=gid("rmNewCeilingElementV318");if(!m)return;
  gid("rmNceNameV318").value="";
  gid("rmNceIconV318").value="◉";
  m.classList.add("open");m.setAttribute("aria-hidden","false");
  setTimeout(function(){try{gid("rmNceNameV318").focus()}catch(_){window.__diagSilent&&window.__diagSilent(_)}},80);
};
window.rmCloseNewCeilingElementV318=function(){
  var m=gid("rmNewCeilingElementV318");if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true")}
};
window.rmNceIconV318=function(v){var e=gid("rmNceIconV318");if(e)e.value=v};
window.rmSaveNewCeilingElementV318=function(){
  var name=String(gid("rmNceNameV318")&&gid("rmNceNameV318").value||"").trim();
  var icon=String(gid("rmNceIconV318")&&gid("rmNceIconV318").value||"◉").trim().slice(0,3)||"◉";
  if(!name){try{if(typeof showToast==="function")showToast("Введіть назву елемента")}catch(_){window.__diagSilent&&window.__diagSilent(_)};return}
  var arr=types();
  var id="ce_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6);
  arr.push({id:id,label:name,icon:icon,ceilingElement:true});
  try{localStorage.setItem("lightTypes_v1",JSON.stringify(arr))}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{window.lightTypes=arr;lightTypes=arr}catch(_){window.lightTypes=arr}
  try{if(typeof renderLightTypeRowsV2==="function")renderLightTypeRowsV2()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof syncLightMarksToElems==="function")syncLightMarksToElems()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  /* Persist the newly-created type immediately; placement is a separate step. */
  try{if(typeof saveState==="function")saveState()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  window.rmCloseNewCeilingElementV318();
  setMode(id);
  try{if(typeof showToast==="function")showToast("✓ "+name+": вкажіть розташування на плані")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
};
var newModal=gid("rmNewCeilingElementV318");
if(newModal)newModal.addEventListener("click",function(e){if(e.target===newModal)window.rmCloseNewCeilingElementV318()});

/* Final wrapper: every opening of the old Light button now shows Ceiling Elements. */
var prevOpen=window.openRmLightStart;
window.openRmLightStart=function(){
  var r;
  try{if(typeof prevOpen==="function")r=prevOpen.apply(this,arguments)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  render();
  var m=gid("rmLightStartModal");if(m)m.classList.add("open");
  return r;
};
try{openRmLightStart=window.openRmLightStart}catch(_){window.__diagSilent&&window.__diagSilent(_)}

/* Keep the old v3.17 observer satisfied: our linear-lighting tile owns data-flp and the correct label. */
var host=gid("rmLightStartModal");
if(host){
  try{new MutationObserver(function(){
    var card=host.querySelector(".modal");
    if(!card)return;
    if(!/Елементи стелі/.test(card.textContent||""))render();
  }).observe(host,{childList:true,subtree:true})}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
setTimeout(render,120);
})();
