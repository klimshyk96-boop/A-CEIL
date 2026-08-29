
(function(){
  "use strict";
  var canvas=document.getElementById("cv");
  if(!canvas || canvas.__A·CEILTouchInputGuardV2) return;
  canvas.__A·CEILTouchInputGuardV2=true;

  var blockClicksUntil=0;
  var lastAcceptedTouchAt=0;
  var lastAcceptedTouchX=NaN;
  var lastAcceptedTouchY=NaN;

  function stop(ev){
    try{ev.preventDefault();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{ev.stopImmediatePropagation();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{ev.stopPropagation();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  // This capture handler runs before the original canvas touch handler.
  // Some Android/Telegram WebViews can emit a repeated touchstart as well as
  // a later synthetic click.  Accept only one touch at the same position.
  canvas.addEventListener("touchstart",function(ev){
    if(!ev.touches || ev.touches.length!==1) return;
    var t=ev.touches[0], now=Date.now();
    var duplicate=now-lastAcceptedTouchAt<450 &&
      Number.isFinite(lastAcceptedTouchX) &&
      Math.hypot(t.clientX-lastAcceptedTouchX,t.clientY-lastAcceptedTouchY)<28;
    if(duplicate){
      blockClicksUntil=now+1800;
      stop(ev);
      return;
    }
    lastAcceptedTouchAt=now;
    lastAcceptedTouchX=t.clientX;
    lastAcceptedTouchY=t.clientY;
    blockClicksUntil=now+1800;
  },true);

  // The core polygon input is already handled on touchstart.  Therefore every
  // click generated shortly after a touch must be ignored, even when the
  // WebView reports click coordinates as 0/0 or slightly shifted.
  canvas.addEventListener("click",function(ev){
    if(Date.now()<blockClicksUntil) stop(ev);
  },true);

  // Pointer events generated from touch must not become a second input path.
  canvas.addEventListener("pointerup",function(ev){
    if(ev.pointerType==="touch" && Date.now()<blockClicksUntil) {
      // Do not stop the dedicated element-placement subsystem here; polygon
      // drawing itself does not use pointerup.  Mark the following click only.
      blockClicksUntil=Math.max(blockClicksUntil,Date.now()+900);
    }
  },true);
})();
