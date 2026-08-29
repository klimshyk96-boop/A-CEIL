
(function(){
"use strict";
document.addEventListener("input",function(ev){
  if(!ev.target||ev.target.id!=="leRhombusSide")return;
  try{
    var e=typeof find==="function"?find(curId):null;
    if(!e||e.elementType!=="lightLine"||e.lightShapeMode!=="rhombus")return;
    e.rhombusSide=Math.max(1,Number(String(ev.target.value).replace(",","."))||1);
    computeTotals(e);syncPoints(e);repaintOnly();
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
});
})();
