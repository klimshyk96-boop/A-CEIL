
(function(){
"use strict";
if(window.__A_CEIL_SaveMemoryRoomPriceFixV1)return;
window.__A_CEIL_SaveMemoryRoomPriceFixV1=true;

/* Pending synchronization is owned by 032-aceil-pending-sync-queue.js. */

/* ProjectPersistence is canonical in project-repository.js. */

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
