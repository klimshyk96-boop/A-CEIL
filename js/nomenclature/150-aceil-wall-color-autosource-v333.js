
(function(){
"use strict";
if(window.__rmWallColorAutosourceV333)return;
window.__rmWallColorAutosourceV333=true;

function recalcSoon(){
  setTimeout(function(){
    try{
      if(typeof window.rmUniversalAutoCountV319==="function"){
        window.rmUniversalAutoCountV319({noSave:false});
      }
    }catch(e){try{window.__diagSilent&&window.__diagSilent(e)}catch(_){}}
  },40);
}

var prev=window.rwe2Save;
if(typeof prev==="function"&&!prev.__wallColorAutosourceV333){
  var wrapped=function(){
    var r=prev.apply(this,arguments);
    recalcSoon();
    return r;
  };
  wrapped.__wallColorAutosourceV333=true;
  window.rwe2Save=wrapped;
  try{rwe2Save=wrapped}catch(_){}
}

var prevLegacy=window.saveWallEdit;
if(typeof prevLegacy==="function"&&!prevLegacy.__wallColorAutosourceV333){
  var wrappedLegacy=function(){
    var r=prevLegacy.apply(this,arguments);
    recalcSoon();
    return r;
  };
  wrappedLegacy.__wallColorAutosourceV333=true;
  window.saveWallEdit=wrappedLegacy;
  try{saveWallEdit=wrappedLegacy}catch(_){}
}

window.A·CEIL_BUILD_LABEL="v3.50 WALL-PRESET-ORDER";
})();
