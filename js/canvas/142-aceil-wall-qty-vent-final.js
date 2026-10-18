
(function(){
"use strict";
if(window.__rmV325Final)return;
window.__rmV325Final=true;

/* Кастомні елементи стелі та витяжка: одна команда = одна поставлена точка.
   Після фактичного додавання точки режим вимикається, щоб наступні тапи не створювали фантомні витяжки/камери. */
var prevSync=window.syncLightMarksToElems;
if(typeof prevSync==="function"){
  window.syncLightMarksToElems=function(){
    var r=prevSync.apply(this,arguments);
    try{
      var one=window.__A·CEILCeilingOneShotV325;
      if(one){
        var lm=(typeof lightMarks!=="undefined"&&Array.isArray(lightMarks))?lightMarks:(Array.isArray(window.lightMarks)?window.lightMarks:[]);
        var now=lm.filter(function(m){return m&&String(m.type)===String(one.type)}).length;
        if(now>Number(one.before||0)){
          window.__A·CEILCeilingOneShotV325=null;
          setTimeout(function(){
            try{
              if(typeof clearLightMode==="function")clearLightMode();
              else if(typeof window.clearLightMode==="function")window.clearLightMode();
              else {try{lightMode=null}catch(_){window.lightMode=null}}
            }catch(_){window.__diagSilent&&window.__diagSilent(_)}
          },0);
        }
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return r;
  };
  try{syncLightMarksToElems=window.syncLightMarksToElems}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
})();
