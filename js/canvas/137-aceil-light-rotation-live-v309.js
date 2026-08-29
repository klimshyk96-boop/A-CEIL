
(function(){
"use strict";
if(window.__A·CEILLightRotationLiveV309)return;
window.__A·CEILLightRotationLiveV309=true;
document.addEventListener("input",function(ev){
  var t=ev.target;
  if(!t||t.id!=="leRotationDeg")return;
  try{
    var e=typeof find==="function"?find(curId):null;
    if(!e||e.elementType!=="lightLine")return;
    var v=Number(String(t.value).replace(",","."));
    if(!Number.isFinite(v))return;
    e.rotation=v;
    syncPoints(e);
    repaintOnly();
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
});
})();
