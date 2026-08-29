
(function(){
"use strict";
if(window.__rmLightRef356)return;window.__rmLightRef356=true;
function g(id){return document.getElementById(id)}
function mode(){
 var r=g("rmLfRow"),q=g("rmLfGrid");
 if(q&&!q.classList.contains("rm-lf-hidden"))return"grid";
 if(r&&!r.classList.contains("rm-lf-hidden"))return"row";
 return"one";
}
function decorate(){
 var h=g("rmLightClean353");if(!h)return;
 var m=mode();
 h.setAttribute("data-rm356-one",m==="one"?"1":"0");
 var oq=g("rm356OneQty");
 if(m==="one"){
   if(!oq){
     oq=document.createElement("div");oq.id="rm356OneQty";oq.className="rm356-oneqty";
     oq.innerHTML='<button type="button" disabled>−</button><b>1</b><button type="button" disabled>＋</button>';
     h.insertBefore(oq,h.firstChild);
   }
 }else if(oq)oq.remove();

 /* Give reference-like explanatory subtitles without changing actions. */
 h.querySelectorAll(".rm353-method").forEach(function(b){
   if(b.querySelector("small"))return;
   var s=document.createElement("small");
   if(b.dataset.method==="room")s.textContent=m==="one"?"Світильник стане по центру кімнати":m==="row"?"Ряд стане по центру кімнати":"Автоматичне розміщення по зоні";
   else if(b.dataset.method==="zone")s.textContent="Розміщення по центру виділеної зони";
   else if(b.dataset.method==="manual")s.textContent=m==="one"?"Вкажіть точку вручну на плані":"Задати відступи та положення вручну";
   b.appendChild(s);
 });
}
var modal=g("lightFlowModal");
if(modal)try{new MutationObserver(function(){if(modal.classList.contains("open"))setTimeout(decorate,0)}).observe(modal,{attributes:true,attributeFilter:["class"]})}catch(_){}
document.addEventListener("click",function(e){if(e.target&&e.target.closest&&e.target.closest("#rmLfTabs"))setTimeout(decorate,0)},true);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",decorate,{once:true});else setTimeout(decorate,0);
window.A·CEIL_BUILD_LABEL="v3.56 LIGHT-REFERENCE-UI";
})();
