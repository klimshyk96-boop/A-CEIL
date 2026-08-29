
(function(){
"use strict";
var activeSide=-1;
function ptsArr(){ try{return Array.isArray(pts)?pts:[]}catch(e){return[]} }
function pointName(i){
  var n=i+1,s="";
  while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}
  return s;
}
function sideLabel(i){var p=ptsArr();return pointName(i)+pointName((i+1)%Math.max(1,p.length));}
function close(){var m=document.getElementById("rmWallActionsModal");if(m)m.classList.remove("open");}
window.rmCloseWallActions=close;
window.rmOpenWallActions=function(sideIndex){
  activeSide=Number(sideIndex);
  if(!(activeSide>=0))return;
  var curves=window.A·CEILCurves&&typeof window.A·CEILCurves.getAll==="function"?window.A·CEILCurves.getAll():{};
  var curve=curves&&curves[activeSide];
  var hasNativeArc=false,nativeArcLenCm=0;
  try{
    if(typeof wallTypes!=="undefined"&&wallTypes[activeSide]==="arc"&&typeof arcPoints!=="undefined"&&Array.isArray(arcPoints[activeSide])&&arcPoints[activeSide].length){
      hasNativeArc=true;
      nativeArcLenCm=typeof _sideCurveLenCm==="function"?Number(_sideCurveLenCm(activeSide))||0:0;
    }
  }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  var title=document.getElementById("rmWallActionsTitle");
  var sub=document.getElementById("rmWallActionsSub");
  var state=document.getElementById("rmWallCurveState");
  var action=document.getElementById("rmWallCurveActionLabel");
  if(title)title.textContent="Стіна "+sideLabel(activeSide);
  var len=0;try{if(typeof window._sideLenCm==="function")len=Number(window._sideLenCm(activeSide))||0;else if(Array.isArray(lengths))len=Number(lengths[activeSide])||0}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  if(sub)sub.textContent=len>0?"Довжина по прямій: "+Math.round(len)+" см":"Оберіть дію";
  if(hasNativeArc){
    if(state){state.style.display="block";state.textContent="Дуга · по кривій ~"+Math.round(nativeArcLenCm)+" см";}
    if(action)action.textContent="Редагувати дугу";
  }else if(curve){
    if(state){state.style.display="block";state.textContent="Дуга · по кривій "+Math.round(Number(curve.arcCm)||0)+" см · R "+Math.round(Number(curve.radiusCm)||0)+" см";}
    if(action)action.textContent="Редагувати дугу";
  }else{
    if(state){state.style.display="none";state.textContent="";}
    if(action)action.textContent="Тип стіни";
  }
  var removeBtn=document.getElementById("rmWallActionRemoveCurve");
  if(removeBtn)removeBtn.style.display=(hasNativeArc||curve)?"flex":"none";
  var modal=document.getElementById("rmWallActionsModal");
  if(modal)modal.classList.add("open");
};
window.rmWallActionCurve=function(){var i=activeSide;close();if(i>=0&&typeof window.openCurveModal==="function")window.openCurveModal(i);};
window.rmWallActionElement=function(){var i=activeSide;close();if(i>=0&&typeof window.createWallMarkOnSide==="function")window.createWallMarkOnSide(i);};
window.rmWallActionRemoveCurve=function(){
  var i=activeSide;close();
  if(!(i>=0))return;
  try{if(typeof wallTypes!=="undefined")wallTypes[i]="straight";}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof arcPoints!=="undefined")arcPoints[i]=[];}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(window.A·CEILCurves&&typeof window.A·CEILCurves.remove==="function")window.A·CEILCurves.remove(i);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(window.A·CEILHybridCurve&&typeof window.A·CEILHybridCurve.remove==="function")window.A·CEILHybridCurve.remove(i);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof saveState==="function")saveState();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof showToast==="function")showToast("Стіну знову зроблено прямою");}catch(e){window.__diagSilent&&window.__diagSilent(e)}
};
function install(){
  /* Intentionally disabled: this legacy installer used to wrap
     window.handleWallTap and route empty-wall taps to the obsolete
     "Тип стіни" (пряма/крива) menu via rmOpenWallActions(). That entire
     handleWallTap chain is dead code — the real, single entry point for
     wall taps is A·CEILHandleWallTapV89 (PC) / A·CEILHandleWallTouchV90
     (touch), which open the current #rmWallTapMenuV84 "Додати елемент /
     Криволінійна ділянка" menu directly. Left as a no-op instead of being
     deleted outright to avoid disturbing surrounding script load order. */
  return;
}
function boot(){
  var oldBtn=document.getElementById("rmCurveMenuButton");if(oldBtn)oldBtn.remove();
  install();
  [120,500,1500,4000].forEach(function(ms){setTimeout(install,ms);});
  if(typeof MutationObserver!=="undefined"){
    var queued=false;
    new MutationObserver(function(){
      if(queued)return;queued=true;
      requestAnimationFrame(function(){queued=false;install();});
    }).observe(document.body,{childList:true,subtree:true});
  }
  var modal=document.getElementById("rmWallActionsModal");if(modal)modal.addEventListener("click",function(e){if(e.target===modal)close()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
