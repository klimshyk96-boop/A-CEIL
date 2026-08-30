(function(){
"use strict";
var sessionId=null, heartbeatTimer=null, starting=false, lastUserId="", retryAfter=0;
var HEARTBEAT_MS=30000;

function sb(){try{return (typeof _sb!=="undefined"&&_sb)||window._sb||null}catch(e){return window._sb||null}}
function user(){try{return (typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}catch(e){return window._sbUser||null}}
function diag(e){try{window.__diagSilent&&window.__diagSilent(e)}catch(_){}}
function deviceLabel(){
  try{
    var ua=navigator.userAgent||"";
    if(/iPhone/i.test(ua))return "iPhone";
    if(/iPad/i.test(ua))return "iPad";
    if(/Android/i.test(ua))return "Android";
    if(/Macintosh|Mac OS X/i.test(ua))return "Mac";
    if(/Windows/i.test(ua))return "Windows";
    return (navigator.platform||"Browser").slice(0,120);
  }catch(e){return "Browser"}
}
function clearTimer(){if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}}
async function heartbeat(){
  if(!sessionId||document.visibilityState!=="visible")return;
  var c=sb(),u=user();if(!c||!u)return;
  try{
    var r=await c.rpc("activity_heartbeat",{p_session_id:sessionId});
    if(r.error)throw r.error;
    if(r.data!==true){sessionId=null;await start()}
  }catch(e){diag(e)}
}
async function start(){
  if(starting||sessionId||document.visibilityState!=="visible"||Date.now()<retryAfter)return;
  var c=sb(),u=user();if(!c||!u||!u.id)return;
  starting=true;
  try{
    var r=await c.rpc("activity_start",{
      p_device:deviceLabel(),
      p_user_agent:(navigator.userAgent||"").slice(0,500)
    });
    if(r.error)throw r.error;
    sessionId=r.data||null;
    retryAfter=0;
    lastUserId=String(u.id);
    clearTimer();
    if(sessionId)heartbeatTimer=setInterval(heartbeat,HEARTBEAT_MS);
  }catch(e){retryAfter=Date.now()+60000;diag(e)}finally{starting=false}
}
async function finish(){
  clearTimer();
  var id=sessionId;sessionId=null;
  if(!id)return;
  var c=sb(),u=user();if(!c||!u)return;
  try{var r=await c.rpc("activity_finish",{p_session_id:id});if(r.error)throw r.error}catch(e){diag(e)}
}
function reconcile(){
  var u=user();
  if(!u){if(sessionId)finish();lastUserId="";return}
  if(lastUserId&&lastUserId!==String(u.id)){finish();lastUserId=""}
  if(document.visibilityState==="visible"&&!sessionId)start();
}

document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="hidden")finish();else setTimeout(reconcile,250);
});
window.addEventListener("pagehide",function(){finish()});
setInterval(reconcile,2000);
setTimeout(reconcile,400);

window.A_CEIL_Activity={start:start,heartbeat:heartbeat,finish:finish,reconcile:reconcile};
})();
