
(function(){
"use strict";
if(window.__rmCleanModes357)return;window.__rmCleanModes357=true;
function g(id){return document.getElementById(id)}
function call(n){var f=window[n];if(typeof f==="function")return f.apply(window,[].slice.call(arguments,1))}
function dots(cols,rows){
 var line=Array(cols+1).join("• ");
 return Array(rows+1).join(line.trim()+"\n").trim();
}
function decorateGrid(){
 var map={4:[2,2],6:[3,2],8:[4,2],10:[5,2],12:[4,3],15:[5,3]};
 document.querySelectorAll("#rmLightClean353 .rm353-struct button[data-grid]").forEach(function(b){
   var q=Number(b.dataset.grid),m=map[q]; if(m)b.setAttribute("data-rm357-dots",dots(m[0],m[1]));
 });
}
function ensureLauncher(){
 var modal=g("lightFlowModal"), box=modal&&modal.querySelector(".modal"), host=g("rmLightClean353");
 if(!box||!host)return;
 var old=g("rm357SketchLaunch"); if(old)old.remove();
 var b=document.createElement("button");
 b.type="button"; b.id="rm357SketchLaunch";
 b.innerHTML='<div class="t">✦ Розставити по ескізу</div><div class="s">Окремий режим: задайте кількість, приблизно поставте точки — A·CEIL вирівняє їх.</div>';
 /* Put it after the normal One/Row/Grid UI, but not inside any mode options. */
 host.insertAdjacentElement("afterend",b);
}
function refresh(){decorateGrid();ensureLauncher()}
document.addEventListener("click",function(e){
 var b=e.target&&e.target.closest&&e.target.closest("#rm357SketchLaunch");
 if(b){e.preventDefault();e.stopPropagation();try{call("rmLfClose")}catch(_){};return call("rmSa347Open")}
 if(e.target&&e.target.closest&&e.target.closest("#rmLfTabs"))setTimeout(refresh,0);
},true);
var modal=g("lightFlowModal");
if(modal)try{new MutationObserver(function(){if(modal.classList.contains("open"))setTimeout(refresh,0)}).observe(modal,{attributes:true,attributeFilter:["class"]})}catch(_){}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh,{once:true});else setTimeout(refresh,0);
window.A·CEIL_BUILD_LABEL="v3.58 CLEANUP-PASS-1";
})();
