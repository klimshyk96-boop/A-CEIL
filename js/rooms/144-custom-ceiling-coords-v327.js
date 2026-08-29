
(function(){
"use strict";
if(window.__rmCustomCeilingCoordsV327)return;
window.__rmCustomCeilingCoordsV327=true;

function gid(id){return document.getElementById(id)}
function esc(v){return String(v==null?"":v).replace(/[&<>'"]/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]})}
function marks(){
  try{if(typeof lightMarks!=="undefined"&&Array.isArray(lightMarks))return lightMarks}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  if(!Array.isArray(window.lightMarks))window.lightMarks=[];
  return window.lightMarks;
}
function types(){
  try{if(typeof lightTypes!=="undefined"&&Array.isArray(lightTypes))return lightTypes}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{var a=JSON.parse(localStorage.getItem("lightTypes_v1")||"[]");return Array.isArray(a)?a:[]}catch(_){return[]}
}
function typeObj(id){
  id=String(id||"");
  var a=types();
  for(var i=0;i<a.length;i++)if(String(a[i]&&a[i].id||"")===id)return a[i];
  return null;
}
function isExhaust(type){
  try{if(typeof window.rmIsExhaustLightType==="function")return !!window.rmIsExhaustLightType(type)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var t=typeObj(type)||{},s=(String(type||"")+" "+String(t.label||"")).toLowerCase();
  return /vent|exhaust|hood|витяж|вентиляц/.test(s);
}
function isCustomCeiling(type){
  var id=String(type||""),t=typeObj(type)||{};
  if(isExhaust(type))return false;
  if(id==="spot"||id==="chandelier")return false;
  return id.indexOf("ce_")===0 || t.ceilingElement===true;
}
function roomCenter(){
  try{
    if(Array.isArray(pts)&&pts.length>=3){
      var A=0,cx=0,cy=0;
      for(var i=0;i<pts.length;i++){
        var p=pts[i],q=pts[(i+1)%pts.length],f=p.x*q.y-q.x*p.y;
        A+=f;cx+=(p.x+q.x)*f;cy+=(p.y+q.y)*f;
      }
      A/=2;
      if(Math.abs(A)>.01)return{x:cx/(6*A),y:cy/(6*A)};
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var c=gid("cv");
  return{x:(c&&c.width?c.width:800)/2,y:(c&&c.height?c.height:600)/2};
}
function baseOptions(selected){
  var html="";
  try{
    if(Array.isArray(pts)&&pts.length){
      html=pts.map(function(p,i){
        var n=typeof N==="function"?N(i):String.fromCharCode(65+i);
        return '<option value="'+i+'" '+(String(i)===String(selected)?"selected":"")+">"+esc(n)+'</option>';
      }).join("");
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return html||'<option value="0">A</option>';
}
function draft(){
  var id=window.__rmCustomCeilingDraftV327;
  if(!id)return null;
  var a=marks();
  for(var i=0;i<a.length;i++)if(a[i]&&a[i].id===id)return a[i];
  return null;
}
function closeModalOnly(){
  var m=gid("lightEditModal");
  if(m)m.classList.remove("open");
}
window.rmCancelCustomCeilingDraftV327=function(){
  var d=draft(),a=marks();
  if(d){
    var i=a.indexOf(d);
    if(i>=0)a.splice(i,1);
  }
  window.__rmCustomCeilingDraftV327=null;
  try{selectedLightId=null}catch(_){window.selectedLightId=null}
  closeModalOnly();
  try{if(typeof updateLightBadge==="function")updateLightBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof syncLightMarksToElems==="function")syncLightMarksToElems()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
};
window.rmApplyCustomCeilingDraftV327=function(){
  var d=draft();if(!d)return;
  var base=parseInt((gid("lightEditBase")||{}).value||"0",10)||0;
  var x=parseFloat((gid("lightEditX")||{}).value);
  var y=parseFloat((gid("lightEditY")||{}).value);
  if(!isFinite(x)||!isFinite(y)){
    try{if(typeof showToast==="function")showToast("Введіть X та Y")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return;
  }
  try{
    var p=typeof lightCoordsToCanvas==="function"?lightCoordsToCanvas(x,y,base):null;
    if(p){d.x=Math.round(p.x);d.y=Math.round(p.y)}
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  d.baseIndex=base;
  d.coordX=Math.round(x*10)/10;
  d.coordY=Math.round(y*10)/10;
  delete d._draftCustomCeiling;
  window.__rmCustomCeilingDraftV327=null;
  window.__A·CEILCeilingOneShotV325=null;
  try{selectedLightId=null}catch(_){window.selectedLightId=null}
  closeModalOnly();
  try{if(typeof updateLightBadge==="function")updateLightBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof syncLightMarksToElems==="function")syncLightMarksToElems()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof saveState==="function")saveState()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    var t=typeObj(d.type)||{};
    if(typeof showToast==="function")showToast("✓ "+String(t.label||"Елемент")+" додано");
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
};
function openDraftEditor(type){
  try{
    if(typeof closed!=="undefined"&&!closed && !(typeof circleMode!=="undefined"&&circleMode)){
      if(typeof showToast==="function")showToast("Спочатку замкніть контур");
      return false;
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var t=typeObj(type)||{id:type,label:"Елемент стелі",icon:"◉"};
  var c=roomCenter();
  var m={
    id:"ce_draft_"+Date.now(),
    type:String(type),
    x:Math.round(c.x),y:Math.round(c.y),
    _draftCustomCeiling:true
  };
  try{m.baseIndex=typeof _nearestLightBaseIndex==="function"?_nearestLightBaseIndex(m.x,m.y):0}catch(_){m.baseIndex=0}
  try{if(typeof _updateLightCoords==="function")_updateLightCoords(m)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  if(!isFinite(Number(m.coordX)))m.coordX=0;
  if(!isFinite(Number(m.coordY)))m.coordY=0;
  marks().push(m);
  window.__rmCustomCeilingDraftV327=m.id;
  try{selectedLightId=m.id}catch(_){window.selectedLightId=m.id}
  try{lightMode=null}catch(_){window.lightMode=null}
  window.__A·CEILCeilingOneShotV325=null;

  var modal=gid("lightEditModal"),box=modal&&modal.querySelector(".modal");
  if(!modal||!box)return false;
  box.innerHTML=
    '<div class="rmle-head"><div><div class="rmle-title">'+esc(t.icon||"◉")+' Розташування '+esc(t.label||"елемента")+'</div>'+
    '<div class="rmle-sub">Точні координати елемента стелі</div></div></div>'+
    '<input id="lightEditType" type="hidden" value="'+esc(type)+'">'+
    '<label class="rmle-label">Від якої точки рахувати?</label>'+
    '<select id="lightEditBase" class="rmle-select" onchange="refreshLightEditCoordsFromBase&&refreshLightEditCoordsFromBase()">'+baseOptions(m.baseIndex)+'</select>'+
    '<label class="rmle-label">Координати, см</label>'+
    '<div class="rmle-grid2">'+
      '<input id="lightEditX" class="rmle-input" type="number" inputmode="decimal" placeholder="X" value="'+esc(m.coordX)+'">'+
      '<input id="lightEditY" class="rmle-input" type="number" inputmode="decimal" placeholder="Y" value="'+esc(m.coordY)+'">'+
    '</div>'+
    '<div class="light-hint-small">X — вздовж сторони від вибраної точки A/B/C, Y — всередину кімнати.</div>'+
    '<div class="rmle-footer">'+
      '<button type="button" class="rmle-cancel" onclick="rmCancelCustomCeilingDraftV327()">Відміна</button>'+
      '<button type="button" class="rmle-ok" onclick="rmApplyCustomCeilingDraftV327()">✓ Застосувати</button>'+
    '</div>';
  modal.classList.add("open");
  try{if(typeof updateLightBadge==="function")updateLightBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  setTimeout(function(){var x=gid("lightEditX");if(x){x.focus();x.select()}},70);
  return true;
}

/* Перехоплюємо тільки кастомні елементи стелі.
   Споти, люстра і витяжка продовжують працювати своїми чинними механізмами. */
var prevSet=window.setLightMode;
window.setLightMode=function(type){
  if(isCustomCeiling(type)){
    return openDraftEditor(type);
  }
  if(typeof prevSet==="function")return prevSet.apply(this,arguments);
  try{lightMode=type}catch(_){window.lightMode=type}
};
try{setLightMode=window.setLightMode}catch(_){window.__diagSilent&&window.__diagSilent(_)}

/* Закриття через загальний closeModal не повинно залишати чернетку. */
var prevClose=window.closeModal;
window.closeModal=function(id){
  if(id==="lightEditModal"&&draft()){
    window.rmCancelCustomCeilingDraftV327();
    return;
  }
  if(typeof prevClose==="function")return prevClose.apply(this,arguments);
  var m=gid(id);if(m)m.classList.remove("open");
};
})();
