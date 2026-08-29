
(function(){
"use strict";
if(window.__rmNomNewItemV320)return;
window.__rmNomNewItemV320=true;
var targetGroup=null;

function gid(x){return document.getElementById(x)}
function getItems(){
  try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemItems)?window.elemItems:[];
}
function getGroups(){
  try{if(typeof elemGroups!=="undefined"&&Array.isArray(elemGroups))return elemGroups}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemGroups)?window.elemGroups:[];
}
function sourceOptions(){
  var out=[{value:"",label:"Автоматично по назві / вручну"}];
  var old=gid("editElemSource");
  if(old){
    Array.prototype.slice.call(old.options||[]).forEach(function(o){
      if(!o.value)return;
      if(!out.some(function(x){return x.value===o.value})){
        out.push({value:o.value,label:o.textContent||o.value});
      }
    });
  }
  try{
    if(typeof window.rmUniversalAutoCountV319==="function"){
      /* v3.19 dynamically injects plan sources into edit selector when edit opens.
         We create a temporary refresh by opening no modal; custom types are appended below. */
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    var types=Array.isArray(window.lightTypes)?window.lightTypes:JSON.parse(localStorage.getItem("lightTypes_v1")||"[]");
    if(Array.isArray(types))types.forEach(function(t){
      if(!t||!t.id||!String(t.label||"").trim())return;
      var v="lighttype:"+String(t.id);
      if(!out.some(function(x){return x.value===v})){
        out.push({value:v,label:String(t.icon||"◉")+" "+String(t.label)+" (кількість)"});
      }
    });
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    var wm=(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks))?wallMarks:(window.wallMarks||[]);
    var seen={};
    wm.forEach(function(m){
      var label=String(m&&m.type||m&&m.name||m&&m.title||"").trim();if(!label||seen[label])return;seen[label]=1;
      out.push({value:"walltype:"+encodeURIComponent(label),label:"━ "+label+" (довжина)"});
    });
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    var le=(typeof linearElements!=="undefined"&&Array.isArray(linearElements))?linearElements:(window.linearElements||[]);
    var labels={lightLine:"Світлова лінія",magneticTrack:"Магнітний трек",surfaceTrack:"Накладний трек",custom:"Інший"};
    var seenL={};
    le.forEach(function(e){
      var key=String(e&&e.elementType||"custom");if(seenL[key])return;seenL[key]=1;
      out.push({value:"lineartype:"+encodeURIComponent(key),label:"▱ "+(labels[key]||key)+" (довжина)"});
    });
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return out;
}
function fillSources(){
  var s=gid("rmNiSourceV320");if(!s)return;
  var opts=sourceOptions();
  s.innerHTML="";
  opts.forEach(function(x){
    var o=document.createElement("option");o.value=x.value;o.textContent=x.label;s.appendChild(o);
  });
}
window.rmOpenNomNewItemV320=function(groupId){
  targetGroup=groupId||null;
  var m=gid("rmNomNewItemV320");if(!m)return;
  gid("rmNiNameV320").value="";
  gid("rmNiPriceV320").value="";
  gid("rmNiUnitV320").value="шт";
  fillSources();
  gid("rmNiSourceV320").value="";
  m.classList.add("open");m.setAttribute("aria-hidden","false");
  /* IMPORTANT: no autofocus here — keyboard must not pop automatically. */
};
window.rmCloseNomNewItemV320=function(){
  var m=gid("rmNomNewItemV320");if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true")}
  targetGroup=null;
};
window.rmSaveNomNewItemV320=function(){
  var name=String(gid("rmNiNameV320").value||"").trim();
  if(!name){
    try{if(typeof showToast==="function")showToast("Введіть назву товару")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    gid("rmNiNameV320").focus();return;
  }
  var unit=String(gid("rmNiUnitV320").value||"шт");
  var price=parseFloat(String(gid("rmNiPriceV320").value||"0").replace(",","."));
  if(!isFinite(price)||price<0)price=0;
  var source=String(gid("rmNiSourceV320").value||"");
  var id="e"+Date.now();
  var item={
    id:id,groupId:targetGroup,icon:"📦",name:name,qty:0,unit:unit,price:price,
    inputMode:"manual",source:source,sourceVariant:""
  };
  getItems().push(item);
  try{if(typeof window.rmUniversalAutoCountV319==="function")window.rmUniversalAutoCountV319()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof renderElemList==="function")renderElemList()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof saveState==="function")saveState()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  window.rmCloseNomNewItemV320();
  try{if(typeof showToast==="function")showToast("✓ "+name+" додано")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
};

/* Replace the old inline quick input opened by the + button in each group. */
window.toggleGroupAddRow=function(groupId){
  window.rmOpenNomNewItemV320(groupId);
};
try{toggleGroupAddRow=window.toggleGroupAddRow}catch(_){window.__diagSilent&&window.__diagSilent(_)}

/* If legacy code calls addElemToGroup directly, route it to the normal creator too. */
window.addElemToGroup=function(groupId){
  window.rmOpenNomNewItemV320(groupId);
};
try{addElemToGroup=window.addElemToGroup}catch(_){window.__diagSilent&&window.__diagSilent(_)}

var modal=gid("rmNomNewItemV320");
if(modal)modal.addEventListener("click",function(e){if(e.target===modal)window.rmCloseNomNewItemV320()});
})();
