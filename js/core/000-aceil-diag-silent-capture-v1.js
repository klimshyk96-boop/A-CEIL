
!function(){
"use strict";
var KEY = "A·CEIL_diag_silent_v1";
var MAX = 60;
var buf = [];
var dirty = false;

window.__diagSilent = function(e){
  try {
    var msg = "";
    var stack = "";
    if (e instanceof Error) {
      msg = e.message || String(e);
      stack = e.stack ? String(e.stack).slice(0, 300) : "";
    } else {
      msg = String(e);
    }
    buf.push({ t: Date.now(), m: msg.slice(0, 200), s: stack });
    if (buf.length > MAX) buf.shift();
    dirty = true;
  } catch(err){window.__diagSilent&&window.__diagSilent(err)}
};

function flush(){
  if (!dirty) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(buf));
    dirty = false;
  } catch(err){window.__diagSilent&&window.__diagSilent(err)}
}

setInterval(flush, 3000);
window.addEventListener("beforeunload", flush);
window.addEventListener("pagehide", flush);

window.__diagSilentGetAll = function(){
  flush();
  return buf.slice();
};
window.__diagSilentClear = function(){
  buf = [];
  try { localStorage.removeItem(KEY); } catch(err){window.__diagSilent&&window.__diagSilent(err)}
};
}();
