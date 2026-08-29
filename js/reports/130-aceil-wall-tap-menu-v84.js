
(function(){
"use strict";
if(window.__A·CEILWallTapMenuV84)return;
window.__A·CEILWallTapMenuV84=true;
var selectedSide=-1;

function sideName(i){
  try{return N(i)+N((i+1)%pts.length)}catch(_){return "№"+(i+1)}
}
function sideLength(i){
  try{return Number(typeof _sideLenCm==="function"?_sideLenCm(i):lengths[i])||0}catch(_){return 0}
}
function hasCurve(i){
  try{return typeof _isArcSide==="function"&&_isArcSide(i)}catch(_){return false}
}
function close(){
  var m=document.getElementById("rmWallTapMenuV84");
  if(m){m.classList.remove("open");m.style.display="none";m.setAttribute("aria-hidden","true")}
}
function open(i){
  selectedSide=Number(i); window.__A·CEILSelectedSideV89=selectedSide;
  var m=document.getElementById("rmWallTapMenuV84");
  if(!m)return;
  var title=document.getElementById("rmWallTapTitleV84");
  var sub=document.getElementById("rmWallTapSubV84");
  var label=document.getElementById("rmWallTapCurveLabelV84");
  if(title)title.textContent="Стіна "+sideName(selectedSide);
  var len=sideLength(selectedSide);
  if(sub)sub.textContent=(len>0?"Довжина "+window._formatReportCm(len)+" см · ":"")+"оберіть дію";
  if(label)label.textContent=hasCurve(selectedSide)?"Редагувати криволінійну ділянку":"Криволінійна ділянка";
  m.style.display="flex";
  m.classList.add("open");
  m.setAttribute("aria-hidden","false");
}
function addElement(){
  var i=selectedSide;close();
  if(i<0)return;
  try{if(typeof flashWallSide==="function")flashWallSide(i)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  if(typeof window.createWallMarkOnSide==="function")window.createWallMarkOnSide(i);
  else if(typeof createWallMarkOnSide==="function")createWallMarkOnSide(i);
}
function openCurveEditorForSide(i){
  if(i<0)return;
  try{
    if(!hasCurve(i)&&typeof window.toggleSideArcType==="function")window.toggleSideArcType(i);
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    if(typeof window.openSideInputModal==="function")window.openSideInputModal();
    else if(typeof openSideInputModal==="function")openSideInputModal();
  }catch(e){
    try{showToast("Не вдалося відкрити редактор кривої")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return;
  }
  setTimeout(function(){
    try{
      var card=document.getElementById("sideArcEditor_"+i);
      if(card){
        card.style.display="";
        card.scrollIntoView({behavior:"smooth",block:"center"});
        var input=card.querySelector("input");
        if(input)input.focus();
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  },180);
}
function curve(){
  var i=selectedSide;close();
  openCurveEditorForSide(i);
}
function install(){
  var current=window.handleWallTap;
  if(current&&current.__wallTapMenuV84)return;
  var previous=current;
  var wrapped=function(x,y){
    try{
      if(typeof closed!=="undefined"&&!closed)return false;
      if((typeof circleMode!=="undefined"&&circleMode)||
         (typeof diagonalMode!=="undefined"&&diagonalMode)||
         (typeof lightMode!=="undefined"&&lightMode))return false;

      /* Existing wall element remains directly editable. */
      if(typeof window.findWallMarkHit==="function"){
        var markHit=window.findWallMarkHit(x,y);
        if(markHit>=0&&Array.isArray(window.wallMarks)&&window.wallMarks[markHit]){
          if(typeof window.openWallEditModal==="function")window.openWallEditModal(window.wallMarks[markHit].id);
          return true;
        }
      }

      if(typeof window.findWallSideHit==="function"){
        var side=window.findWallSideHit(x,y);
        if(side>=0){
          try{if(typeof window.flashWallSide==="function")window.flashWallSide(side)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
          open(side);
          return true;
        }
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return typeof previous==="function"?previous.apply(this,arguments):false;
  };
  wrapped.__wallTapMenuV84=true;
  window.handleWallTap=wrapped;
  try{handleWallTap=wrapped}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
window.rmWallTapCloseV84=close;
window.rmWallTapAddElementV84=addElement;
window.rmWallTapCurveV84=curve;
window.rmWallTapOpenV84=open;

function boot(){
  install();
  [100,350,800,1600,3200].forEach(function(ms){setTimeout(install,ms)});
  var modal=document.getElementById("rmWallTapMenuV84");
  if(modal)modal.addEventListener("click",function(e){if(e.target===modal)close()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
