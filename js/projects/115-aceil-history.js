
(function(){
"use strict";
window.A·CEIL=window.A·CEIL||{};

var STORAGE_KEY="ceiling_v18";
var MAX_STEPS=60;
var undoStack=[];
var redoStack=[];
var currentSnapshot=null;
var contextKey=null;
var applying=false;
var undoButton=null;
var redoButton=null;
var pending=false;
var pendingContext=null;
var editGroup=null;
var lastGroup=null;

function cloneString(value){return typeof value==="string"?value:null;}
function readSnapshot(){
  try{
    // Read the completed live action, including fields added by persistence
    // layers after the base saveState call. Storage is not the history model.
    return JSON.stringify({pts:pts,lengths:lengths,realPts:realPts,closed:closed,
      diagonals:diagonals,circleMode:circleMode,circleDiamCm:circleDiamCm,
      diagonalOverrides:diagonalOverrides,notes:notes,elemItems:elemItems,
      elemGroups:elemGroups,lightMarks:lightMarks,wallMarks:wallMarks,
      linearElements:linearElements,wallTypes:closed?wallTypes:pts.slice(1).map(function(){return 'straight';}),arcPoints:closed?arcPoints:pts.slice(1).map(function(){return [];}),
      ceilingCornices:Array.isArray(window.ceilingCornices)?window.ceilingCornices:[]});
  }catch(e){return null;}
}
function actionKey(snapshot){
  var state=JSON.parse(snapshot);
  (state.elemItems||[]).forEach(function(item){
    if(!item.manualQtyOverride&&(item.source||item.autoFilled))delete item.qty;
    ['autoFilled','autoZero','calculatedQty','autoQty','resultQty','computedQty','lineTotal','total','sum','amount'].forEach(function(k){delete item[k];});
  });
  return JSON.stringify(state);
}
function getContextKey(){
  var project="",room="";
  try{project=String(typeof _activeObjectId!=="undefined"&&_activeObjectId!=null?_activeObjectId:(typeof _currentProjectId!=="undefined"&&_currentProjectId!=null?_currentProjectId:""));}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{room=String(window._activeRoomId!=null?window._activeRoomId:(typeof _activeRoomIdx!=="undefined"&&_activeRoomIdx!=null?_activeRoomIdx:""));}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return project+"::"+room;
}
function updateButtons(){
  if(undoButton)undoButton.disabled=undoStack.length===0;
  if(redoButton)redoButton.disabled=redoStack.length===0;
}
function trim(stack){if(stack.length>MAX_STEPS)stack.splice(0,stack.length-MAX_STEPS);}
function reset(snapshot){
  pending=false;pendingContext=null;editGroup=null;lastGroup=null;
  undoStack=[];redoStack=[];
  currentSnapshot=cloneString(typeof snapshot==="string"?snapshot:readSnapshot());
  contextKey=getContextKey();
  updateButtons();
}
function flush(){
  if(!pending||applying)return false;
  pending=false;
  if(pendingContext!==getContextKey()){reset();return false;}
  if(window.__A·CEILReportRendering||window.__A·CEILSessionSwitching)return false;
  var next=readSnapshot();
  if(!next)return false;
  var nextContext=getContextKey();
  if(contextKey!==nextContext){reset(next);return false;}
  if(currentSnapshot===null){currentSnapshot=next;updateButtons();return false;}
  if(next===currentSnapshot)return false;
  // Automatic quantities can finish after the user action. Keep the latest
  // totals without adding an invisible step or destroying the redo branch.
  if(actionKey(next)===actionKey(currentSnapshot)){currentSnapshot=next;return false;}
  if(!editGroup||lastGroup!==editGroup){undoStack.push(currentSnapshot);trim(undoStack);}
  lastGroup=editGroup;
  currentSnapshot=next;
  redoStack=[];
  updateButtons();
  return true;
}
function captureAfterSave(){
  if(applying||window.__A·CEILReportRendering||window.__A·CEILSessionSwitching)return false;
  if(!pending){pending=true;pendingContext=getContextKey();setTimeout(flush,0);}
  return true;
}
function resetAfterLoad(){queueMicrotask(function(){if(!applying)reset();});}
function beginInput(e){
  if(applying||e.target&&e.target.closest&&e.target.closest('#A·CEILHistoryControls'))return;
  flush();
  if(contextKey!==getContextKey())reset();
  var group=(e.type==='input'||e.type==='change')?e.target:null;
  if(!group||group!==editGroup)lastGroup=null;
  editGroup=group;
  captureAfterSave();
}
function refreshAfterRestore(){
  try{if(typeof loadState==="function")loadState();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof _restoreCanvasStats==="function")_restoreCanvasStats();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof updateCornerCount==="function"&&typeof closed!=="undefined"&&closed)updateCornerCount();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof rpcUpdate==="function")rpcUpdate();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(window.A·CEILCurveGeometryV306)window.A·CEILCurveGeometryV306.updateStats();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof renderElemList==='function'&&document.getElementById('elementsModal')?.classList.contains('open'))renderElemList();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
}
function applySnapshot(snapshot){
  if(typeof snapshot!=="string")return false;
  applying=true;
  try{
    localStorage.setItem(STORAGE_KEY,snapshot);
    window.ceilingCornices=JSON.parse(snapshot).ceilingCornices||[];
    if(window.A_CEIL_HonestGeometry)window.A_CEIL_HonestGeometry.clear();
    selectedPoint=null;selectedLightId=null;
    refreshAfterRestore();
    try{if(typeof saveState==="function")saveState();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    currentSnapshot=readSnapshot()||snapshot;
    try{if(typeof _dirty!=="undefined")_dirty=true;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{if(typeof _updateDirtyIndicator==="function")_updateDirtyIndicator();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return true;
  }catch(e){
    try{if(window.A·CEIL.DebugLog)window.A·CEIL.DebugLog.error("history.restore_failed",{message:String(e&&e.message||e)});}catch(_e){window.__diagSilent&&window.__diagSilent(_e)}
    return false;
  }finally{
    applying=false;
    updateButtons();
  }
}
function undo(){
  flush();editGroup=null;lastGroup=null;
  if(contextKey!==getContextKey()){reset();return false;}
  if(!undoStack.length)return false;
  var target=undoStack.pop();
  if(currentSnapshot!==null){redoStack.push(currentSnapshot);trim(redoStack);}
  if(!applySnapshot(target)){
    var failed=redoStack.pop();
    undoStack.push(target);
    if(failed!==undefined)currentSnapshot=failed;
    updateButtons();
    return false;
  }
  return true;
}
function redo(){
  flush();editGroup=null;lastGroup=null;
  if(contextKey!==getContextKey()){reset();return false;}
  if(!redoStack.length)return false;
  var target=redoStack.pop();
  if(currentSnapshot!==null){undoStack.push(currentSnapshot);trim(undoStack);}
  if(!applySnapshot(target)){
    var failed=undoStack.pop();
    redoStack.push(target);
    if(failed!==undefined)currentSnapshot=failed;
    updateButtons();
    return false;
  }
  return true;
}
function button(id,title,path){
  var b=document.createElement("button");
  b.type="button";b.id=id;b.className="rm-history-btn";b.title=title;b.setAttribute("aria-label",title);
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"></path></svg>';
  b.addEventListener("pointerdown",function(e){e.stopPropagation();});
  b.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();if(id==="A·CEILUndoBtn")undo();else redo();});
  return b;
}
function mount(){
  var host=document.querySelector(".canvas-container");
  if(!host||document.getElementById("A·CEILHistoryControls"))return;
  var wrap=document.createElement("div");wrap.id="A·CEILHistoryControls";
  undoButton=button("A·CEILUndoBtn","Скасувати дію","M9 14 4 9l5-5 M4 9h9a7 7 0 0 1 7 7v4");
  redoButton=button("A·CEILRedoBtn","Повторити дію","M9 14 4 9l5-5 M4 9h9a7 7 0 0 1 7 7v4");
  redoButton.classList.add("rm-history-btn-mirror");
  wrap.appendChild(undoButton);wrap.appendChild(redoButton);host.appendChild(wrap);
  reset(readSnapshot());
}
function handleKey(e){
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  var tag=(e.target&&e.target.tagName||"").toLowerCase();
  if(tag==="input"||tag==="textarea"||tag==="select"||e.target&&e.target.isContentEditable)return;
  if(String(e.key).toLowerCase()==="z"){
    e.preventDefault();
    if(e.shiftKey)redo();else undo();
  }else if(String(e.key).toLowerCase()==="y"){
    e.preventDefault();redo();
  }
}
window.A·CEIL.History={captureAfterSave:captureAfterSave,undo:undo,redo:redo,reset:reset,resetAfterLoad:resetAfterLoad,canUndo:function(){flush();return undoStack.length>0;},canRedo:function(){flush();return redoStack.length>0;},clear:function(){reset(readSnapshot());},getState:function(){flush();return{undo:undoStack.length,redo:redoStack.length,contextKey:contextKey};}};
window.A·CEILUndo=undo;window.A·CEILRedo=redo;
document.addEventListener("keydown",handleKey);
['click','touchend','pointerup','input','change'].forEach(function(type){document.addEventListener(type,beginInput,true);});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
setTimeout(function(){mount();if(currentSnapshot===null)reset(readSnapshot());},250);
})();
