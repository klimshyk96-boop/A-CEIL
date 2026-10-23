
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

  window.A·CEIL.pipeline.get("rwe2Save").stage("colorAutosource",{around:function(next,args){
    var r=next();
    recalcSoon();
    return r;
    }
  });
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

/* window.A·CEIL_BUILD_LABEL superseded in 154-aceil-light-menu.js */
})();
