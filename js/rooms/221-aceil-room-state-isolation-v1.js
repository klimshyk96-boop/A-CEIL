(function(){
'use strict';
if(window.__aceilRoomIsolation221)return;window.__aceilRoomIsolation221=true;
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}
function parse(v){try{return typeof v==='string'?JSON.parse(v||'{}'):(v||{})}catch(_){return {}}}
function setArray(name,value){var a=Array.isArray(value)?clone(value):[];try{window[name]=a}catch(_){};try{eval(name+'=a')}catch(_){} }
function hardClearRoomRuntime(){
  ['pts','lengths','realPts','diagonals','notes','lightMarks','wallMarks','linearElements','wallTypes','arcPoints','elemItems','elemGroups'].forEach(function(n){setArray(n,[])});
  try{window.ceilingCornices=[]}catch(_){}
  try{window.wallParallelElements=[]}catch(_){}
  try{selectedPoint=null;selectedLightId=null;lightMode=null;closed=false;circleMode=false;circleDiamCm=0;diagonalOverrides={}}catch(_){}
}
function forceRoomArrays(room){
  var s=parse(room&&room.state);
  ['pts','lengths','realPts','diagonals','notes','lightMarks','wallMarks','linearElements','wallTypes','arcPoints','elemItems','elemGroups'].forEach(function(n){if(!Array.isArray(s[n]))s[n]=[]});
  if(!Array.isArray(s.ceilingCornices))s.ceilingCornices=[];
  return s;
}
var oldLoad=window._loadRoomToCanvas;
if(typeof oldLoad==='function'){
  var wrapped=function(obj,idx){
    hardClearRoomRuntime();
    var room=obj&&Array.isArray(obj.rooms)?obj.rooms[idx]:null;
    if(room){var s=forceRoomArrays(room);room.state=JSON.stringify(s)}
    var r=oldLoad.apply(this,arguments);
    // Missing fields must mean empty, never "keep whatever previous project had".
    if(room){var st=forceRoomArrays(room);['lightMarks','wallMarks','linearElements','wallTypes','arcPoints'].forEach(function(n){setArray(n,st[n])});window.ceilingCornices=clone(st.ceilingCornices||[])}
    try{if(typeof updateLightBadge==='function')updateLightBadge();if(typeof updateElemBadge==='function')updateElemBadge();if(typeof requestDraw==='function')requestDraw();else if(typeof draw==='function')draw()}catch(_){}
    return r;
  };
  wrapped.__roomIsolation221=true;window._loadRoomToCanvas=wrapped;try{_loadRoomToCanvas=wrapped}catch(_){}
}
// The legacy one/center action hard-coded "spot". Preserve the requested type.
var oldApply=window.rmLfApply;
if(typeof oldApply==='function'){
  window.rmLfApply=function(){
    var wanted=window.__aceilLightPlacementType==='double_spot'?'double_spot':'spot';
    if(wanted!=='double_spot')return oldApply.apply(this,arguments);
    var before=[];try{before=Array.isArray(lightMarks)?lightMarks.slice():[]}catch(_){}
    var r=oldApply.apply(this,arguments);
    try{
      var list=Array.isArray(lightMarks)?lightMarks:(Array.isArray(window.lightMarks)?window.lightMarks:[]);
      list.forEach(function(m){if(m&&m.type==='spot'&&before.indexOf(m)<0){m.type='double_spot';m.orientation=window.__aceilDoubleSpotOrientation==='vertical'?'vertical':'horizontal'}});
      if(typeof syncLightMarksToElems==='function')syncLightMarksToElems();if(typeof saveState==='function')saveState();if(typeof requestDraw==='function')requestDraw();else if(typeof draw==='function')draw();
    }catch(_){}
    return r;
  };
}
})();
