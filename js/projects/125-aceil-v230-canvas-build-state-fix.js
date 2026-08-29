
(function(){
"use strict";
function isOpenContour(){ try{return typeof closed!=="undefined"&&!closed;}catch(e){return false;} }
function clearTransientCurveState(){
  if(!isOpenContour()) return;
  try{
    if(Array.isArray(wallTypes)){ wallTypes.length=0; for(var i=0;i<Math.max(0,(Array.isArray(pts)?pts.length:0)-1);i++) wallTypes.push("straight"); }
  }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{
    if(Array.isArray(arcPoints)){ arcPoints.length=0; for(var j=0;j<Math.max(0,(Array.isArray(pts)?pts.length:0)-1);j++) arcPoints.push([]); }
  }catch(e){window.__diagSilent&&window.__diagSilent(e)}
}
var previousDraw=window.draw;
if(typeof previousDraw==="function"&&!previousDraw.__rmBuildStateGuard){
  var guarded=function(){
    if(isOpenContour()) clearTransientCurveState();
    return previousDraw.apply(this,arguments);
  };
  guarded.__rmBuildStateGuard=true;
  window.draw=guarded;
  try{draw=guarded;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
}
var oldReset=window.resetAll;
if(typeof oldReset==="function"&&!oldReset.__rmBuildCurveCleanup){
  var resetWrapped=function(){
    var project="none",room="single";
    try{if(typeof _activeObjectId!=="undefined"&&_activeObjectId!=null)project=String(_activeObjectId);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{if(typeof _activeRoomId!=="undefined"&&_activeRoomId!=null)room=String(_activeRoomId);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    var r=oldReset.apply(this,arguments);
    try{if(Array.isArray(wallTypes))wallTypes.length=0;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{if(Array.isArray(arcPoints))arcPoints.length=0;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{window.A·CEILCurves={};}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{window.A·CEILComplexWalls={};}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{
      localStorage.removeItem("A·CEIL_curves_v1::"+project+"::"+room);
      localStorage.removeItem("A·CEIL_complex_walls_v1::"+project+"::"+room);
    }catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{if(typeof draw==="function")draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return r;
  };
  resetWrapped.__rmBuildCurveCleanup=true;
  window.resetAll=resetWrapped;
  try{resetAll=resetWrapped;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
}
})();
