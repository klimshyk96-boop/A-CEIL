
(function(){
"use strict";
if(window.__A_CEIL_SaveMemoryRoomPriceFixV1)return;
window.__A_CEIL_SaveMemoryRoomPriceFixV1=true;

/* Pending synchronization is owned by 032-aceil-pending-sync-queue.js. */

/* ProjectPersistence is canonical in project-repository.js. */

/* Refresh the current room's own nomenclature total AFTER room state has been installed.
   This prevents the previous room's price from remaining in the cockpit/header. */
function refreshRoomPrice(){
  try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof rpcUpdate==="function")rpcUpdate();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof rpUpdateHome==="function")rpUpdateHome();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
var prevLoad=window._loadRoomToCanvas;
if(typeof prevLoad==="function"&&!prevLoad.__roomPriceFinalFix){
  var wrappedLoad=function(){
    var r=prevLoad.apply(this,arguments);
    refreshRoomPrice();
    setTimeout(refreshRoomPrice,0);
    setTimeout(refreshRoomPrice,80);
    return r;
  };
  wrappedLoad.__roomPriceFinalFix=true;
  window._loadRoomToCanvas=wrappedLoad;
  try{_loadRoomToCanvas=wrappedLoad;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* Keep Safari storage from slowly growing during a long measuring session. */
function housekeeping(force){
  try{
    var repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
    if(!repair)return;
    var bytes=typeof repair.storageBytes==="function"?repair.storageBytes():0;
    if(force||bytes>2300000){
      if(typeof repair.freeSpace==="function")repair.freeSpace({aggressive:true});
      if(typeof repair.trimDiagnostics==="function")repair.trimDiagnostics(8);
      window.setPendingQueue(window.getPendingQueue());
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
housekeeping(true);
setInterval(function(){housekeeping(false);},120000);
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="hidden")housekeeping(false);
});

/* Before either single-room or multi-room save, make a little headroom.
   This is intentionally silent: no false "memory full" toast if cloud/local repo save succeeds. */
var prevSaveProject=window.saveProject;
if(typeof prevSaveProject==="function"&&!prevSaveProject.__memoryHeadroomFix){
  var wrappedSave=async function(){
    housekeeping(true);
    return await prevSaveProject.apply(this,arguments);
  };
  wrappedSave.__memoryHeadroomFix=true;
  window.saveProject=wrappedSave;
  try{saveProject=wrappedSave;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

})();
