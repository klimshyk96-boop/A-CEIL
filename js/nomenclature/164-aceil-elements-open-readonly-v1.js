
(function(){
"use strict";
if(window.__A_CEIL_ElementsOpenReadonlyV1)return;
window.__A_CEIL_ElementsOpenReadonlyV1=true;

function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return[]}}
function items(){try{return Array.isArray(elemItems)?elemItems:(window.elemItems||[])}catch(_){return window.elemItems||[]}}
function key(it){return it&&it.id!=null?"id:"+String(it.id):"n:"+String(it&&it.name||"").trim().toLowerCase()+"|g:"+String(it&&it.groupId==null?"":it.groupId)+"|u:"+String(it&&it.unit||"")}
function restoreResultFields(before){
  var cur=items(),by={};
  (before||[]).forEach(function(it){by[key(it)]=it});
  var fields=["qty","manualQtyOverride","autoFilled","autoZero","calculatedQty","autoQty","resultQty","computedQty","lineTotal","total","sum","amount","price","optionalEstimateEnabled"];
  cur.forEach(function(it){
    var old=by[key(it)];
    if(!old)return;
    fields.forEach(function(f){
      if(Object.prototype.hasOwnProperty.call(old,f))it[f]=clone(old[f]);
    });
  });
  try{elemItems=cur;window.elemItems=cur}catch(_){window.elemItems=cur}
}

var old=window.openElementsModal||(typeof openElementsModal==="function"?openElementsModal:null);
if(typeof old==="function"&&!old.__elementsReadonlyV1){
  var wrapped=async function(){
    var before=clone(items());
    var r=old.apply(this,arguments);
    if(r&&typeof r.then==="function")r=await r;
    restoreResultFields(before);
    try{if(typeof renderElemList==="function")renderElemList()}catch(_){}
    try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){}
    try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){}
    return r;
  };
  wrapped.__elementsReadonlyV1=true;
  window.openElementsModal=wrapped;
  try{openElementsModal=wrapped}catch(_){}
}
})();
