
(function(){
"use strict";
if(window.__rmSketchOnly359)return;window.__rmSketchOnly359=true;
function g(id){return document.getElementById(id)}
function mode(){
 var r=g("rmLfRow"),q=g("rmLfGrid");
 if(q&&!q.classList.contains("rm-lf-hidden"))return"grid";
 if(r&&!r.classList.contains("rm-lf-hidden"))return"row";
 return"one";
}
function normalize(){
 var h=g("rmLightClean353"), main=g("rm353Main"); if(!h||!main)return;
 var m=mode();
 /* v3.53 internal state can remain 'sketch' from earlier UI.
    Force the normal mode back to its normal automatic placement. */
 var auto=h.querySelector('.rm353-method[data-method="room"]');
 if(auto && !h.querySelector('.rm353-method.active:not([data-method="sketch"])')){
   try{auto.click()}catch(_){}
 }
 main.textContent = m==="one" ? "Готово — поставити світильник" :
                    m==="row" ? "Готово — створити ряд" :
                                "Готово — створити сітку";
 main.dataset.rm359Normal="1";
}
document.addEventListener("click",function(e){
 var main=e.target&&e.target.closest&&e.target.closest("#rm353Main[data-rm359-normal='1']");
 if(main){
   /* Stop v3.53 capture handler from routing stale 'sketch' state.
      Select normal automatic method first, then let its own apply path run. */
   var h=g("rmLightClean353"), auto=h&&h.querySelector('.rm353-method[data-method="room"]');
   if(auto && !auto.classList.contains("active")){
     e.preventDefault();e.stopImmediatePropagation();
     try{auto.click()}catch(_){}
     setTimeout(function(){var b=g("rm353Main");if(b)b.click()},0);
   }
 }
 if(e.target&&e.target.closest&&e.target.closest("#rmLfTabs"))setTimeout(normalize,0);
},true);
var modal=g("lightFlowModal");
if(modal)try{new MutationObserver(function(){if(modal.classList.contains("open"))setTimeout(normalize,0)}).observe(modal,{attributes:true,attributeFilter:["class"]})}catch(_){}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",normalize,{once:true});else setTimeout(normalize,0);
window.A·CEIL_BUILD_LABEL="v3.75 A·CEIL REPORT-REBRAND";
})();
