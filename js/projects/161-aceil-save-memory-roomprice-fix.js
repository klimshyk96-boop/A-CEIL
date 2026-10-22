
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
  var persistence=window.A·CEIL&&window.A·CEIL.ProjectPersistence;
  if(persistence&&typeof persistence.prepareSave==='function') persistence.prepareSave(force);
}
housekeeping(true);
setInterval(function(){housekeeping(false);},120000);
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="hidden")housekeeping(false);
});

})();
