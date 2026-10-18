
(function(){
"use strict";
if(window.__rmOptionalInstallWorksV370)return;
window.__rmOptionalInstallWorksV370=true;

function norm(v){
  return String(v||"").toLowerCase().replace(/[’'`]/g,"").replace(/\s+/g," ").trim();
}
function isOptional(it){
  var n=norm(it&&it.name);
  return n.indexOf("вусат")>=0 || n.indexOf("захист підлог")>=0;
}
function enabled(it){ return !!(it&&it.optionalEstimateEnabled===true); }
function areaM2(){
  try{
    var v=parseFloat(String(document.getElementById("area")?.textContent||"0").replace(",","."));
    return isFinite(v)?v:0;
  }catch(_){return 0}
}
function perimeterM(){
  try{
    if(typeof lengths!=="undefined"&&Array.isArray(lengths)&&lengths.length)
      return lengths.reduce(function(a,b){return a+(Number(b)||0)},0)/100;
  }catch(_){}
  try{
    var v=parseFloat(String(document.getElementById("per")?.textContent||"0").replace(",","."));
    return isFinite(v)?v:0;
  }catch(_){return 0}
}
function inferredQty(it){
  var n=norm(it&&it.name);
  if(n.indexOf("захист підлог")>=0)return {qty:Math.round(areaM2()*100)/100,unit:"м²"};
  if(n.indexOf("вусат")>=0)return {qty:Math.round(perimeterM()*100)/100,unit:"м"};
  return {qty:1,unit:it.unit||"шт"};
}
function applyOne(it){
  if(!isOptional(it))return false;
  if(!enabled(it)){
    it.qty=0; it.autoFilled=false; it.autoZero=true;
    return true;
  }
  /* If the row already has a real dynamic source, let the normal calculator
     calculate it. Otherwise use the sensible room measure for this option. */
  var q=Number(it.qty)||0;
  if(q<=0){
    var v=inferredQty(it);
    it.qty=v.qty; it.unit=v.unit;
  }
  it.autoFilled=false; it.autoZero=!(Number(it.qty)>0);
  return true;
}
function enforce(){
  var a=(typeof elemItems!=="undefined"&&Array.isArray(elemItems))?elemItems:(window.elemItems||[]);
  var changed=false;
  a.forEach(function(it){if(applyOne(it))changed=true});
  return changed;
}
window.rmToggleOptionalEstimateV370=function(id,on){
  var a=(typeof elemItems!=="undefined"&&Array.isArray(elemItems))?elemItems:(window.elemItems||[]);
  var it=a.find(function(x){return x&&String(x.id)===String(id)});
  if(!it)return;
  it.optionalEstimateEnabled=!!on;
  if(on){
    /* Start clean, then allow existing auto source to calculate when available. */
    it.qty=0; it.manualQtyOverride=false;
    try{if(typeof autoFillNomenclature==="function")autoFillNomenclature({silent:true})}catch(_){}
    applyOne(it);
  }else{
    it.qty=0; it.autoFilled=false; it.autoZero=true; it.manualQtyOverride=false;
  }
  try{if(typeof renderElemList==="function")renderElemList()}catch(_){}
  try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){}
  try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){}
  try{if(typeof saveState==="function")saveState()}catch(_){}
};

var oldRender=window.renderItemRow||(typeof renderItemRow==="function"?renderItemRow:null);
if(typeof oldRender==="function"){
  var wrappedRender=function(it){
    var html=oldRender.apply(this,arguments);
    if(!isOptional(it))return html;
    var on=enabled(it);
    html=html.replace('class="em-row"', 'class="em-row '+(on?'rm-opt-on':'rm-opt-off')+'"');
    var marker='<div class="em-name"';
    var idx=html.indexOf(marker);
    if(idx>=0){
      var end=html.indexOf('</div>',idx);
      if(end>=0){
        end+=6;
        var safeId=String(it.id).replace(/"/g,"&quot;");
        html=html.slice(0,end)+
          '<label class="em-opt-check" title="'+(on?'Включено в кошторис':'Додати в кошторис')+'">'+
          '<input type="checkbox" '+(on?'checked ':'')+
          'data-opt-id="'+safeId+'" onchange="rmToggleOptionalEstimateV370(this.getAttribute(\'data-opt-id\'),this.checked)">'+
          '</label>'+html.slice(end);
      }
    }
    return html;
  };
  window.renderItemRow=wrappedRender;
  try{renderItemRow=wrappedRender}catch(_){}
}

/* Important: old AutoFill may still try to add these rows.
   Always enforce the checkbox AFTER every automatic recalculation. */
var oldAuto=window.autoFillNomenclature||(typeof autoFillNomenclature==="function"?autoFillNomenclature:null);
if(typeof oldAuto==="function"){
  var wrappedAuto=function(){
    var r=oldAuto.apply(this,arguments);
    enforce();
    try{if(typeof renderElemList==="function")renderElemList()}catch(_){}
    try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){}
    try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){}
    return r;
  };
  window.autoFillNomenclature=wrappedAuto;
  try{autoFillNomenclature=wrappedAuto}catch(_){}
}

/* Migration: existing projects must NOT suddenly include optional work. */
try{
  var a=(typeof elemItems!=="undefined"&&Array.isArray(elemItems))?elemItems:(window.elemItems||[]);
  a.forEach(function(it){
    if(isOptional(it)&&it.optionalEstimateEnabled!==true){
      it.optionalEstimateEnabled=false; it.qty=0; it.autoFilled=false; it.autoZero=true;
    }
  });
  try{if(typeof saveState==="function")saveState()}catch(_){}
}catch(_){}

})();
