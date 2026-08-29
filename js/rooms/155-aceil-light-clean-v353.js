
(function(){
"use strict";
if(window.__rmLightClean353)return;window.__rmLightClean353=true;
var S={mode:"one",qty:5,method:"room",orient:"auto",gridQ:8};
function g(id){return document.getElementById(id)}
function call(n){var f=window[n];if(typeof f==="function")return f.apply(window,[].slice.call(arguments,1))}
function modeFromOld(){
 var row=g("rmLfRow"),grid=g("rmLfGrid");
 if(grid&&!grid.classList.contains("rm-lf-hidden"))return"grid";
 if(row&&!row.classList.contains("rm-lf-hidden"))return"row";
 return"one";
}
function syncOld(){
 try{call("rmLfSetMode",S.mode)}catch(_){}
 if(S.mode!=="one")try{call("rmLfSetQty",S.mode==="grid"?S.gridQ:S.qty)}catch(_){}
 if(S.mode==="row")try{call("rmLfSetOrient",S.orient)}catch(_){}
 if(S.mode==="one")try{call("rmLfSetOnePlace",S.method==="zone"?"zone":S.method==="manual"?"manual":"room")}catch(_){}
}
function btn(txt,method,wide){
 return '<button type="button" class="rm353-method'+(S.method===method?' active':'')+(wide?' wide':'')+'" data-method="'+method+'">'+txt+'</button>';
}
function render(){
 var host=g("rmLightClean353");if(!host)return;
 S.mode=modeFromOld();
 var html="";
 if(S.mode!=="one"){
   html+='<div class="rm353-card"><div class="rm353-qty"><div><div class="rm353-label">Кількість</div><div class="rm353-qtytitle">'+(S.mode==="row"?"Світильників у ряду":"Світильників у сітці")+'</div></div><div class="rm353-step"><button data-step="-1">−</button><div class="rm353-num">'+(S.mode==="grid"?S.gridQ:S.qty)+'</div><button data-step="1">+</button></div></div></div>';
 }
 html+='<div class="rm353-card"><div class="rm353-label">Спосіб розміщення</div><div class="rm353-methods">';
 if(S.mode==="one"){
   html+=btn("◎ По центру кімнати","room",false)+btn("◉ По центру зони","zone",false)+btn("⌖ Вказати місце","manual",true);
 }else{
   html+=btn("✦ Вирівняти по ескізу<small>тикаєте приблизно — A·CEIL вирівнює</small>","sketch",true);
   html+=btn("◎ Автоматично по центру","room",false)+btn("⌖ За розмірами / вручну","manual",false);
 }
 html+='</div></div>';
 if(S.mode==="row"){
   html+='<div class="rm353-card"><div class="rm353-label">Напрямок ряду</div><div class="rm353-orient"><button data-orient="auto" class="'+(S.orient==="auto"?"active":"")+'">Авто</button><button data-orient="h" class="'+(S.orient==="h"?"active":"")+'">↔ По ширині</button><button data-orient="v" class="'+(S.orient==="v"?"active":"")+'">↕ По довжині</button></div></div>';
 }
 if(S.mode==="grid"){
   var structs=[[4,"2 × 2"],[6,"3 × 2"],[8,"4 × 2"],[10,"5 × 2"],[12,"4 × 3"],[15,"5 × 3"]];
   html+='<div class="rm353-card"><div class="rm353-label">Структура сітки</div><div class="rm353-struct">'+structs.map(function(x){return '<button data-grid="'+x[0]+'" class="'+(S.gridQ===x[0]?"active":"")+'">'+x[1]+'</button>'}).join("")+'</div><div class="rm353-tip">Оберіть готову структуру. A·CEIL використовує відповідну загальну кількість світильників.</div></div>';
 }
 var label=S.method==="sketch"?"Почати розстановку по ескізу":S.method==="manual"?"Вказати на плані":S.mode==="one"?"Поставити світильник":S.mode==="row"?"Створити ряд":"Створити сітку";
 html+='<button type="button" class="rm353-main" id="rm353Main">'+label+'</button>';
 host.innerHTML=html;
}
function ensure(){
 var modal=g("lightFlowModal"),box=modal&&modal.querySelector(".modal"),tabs=g("rmLfTabs");if(!box||!tabs)return;
 var host=g("rmLightClean353");
 if(!host){host=document.createElement("div");host.id="rmLightClean353";tabs.insertAdjacentElement("afterend",host)}
 render();
}
function action(){
 syncOld();
 if(S.method==="sketch"){
   var q=(S.mode==="grid"?S.gridQ:S.qty);
   try{call("rmLfSetQty",q)}catch(_){}
   try{call("rmLfClose")}catch(_){}
   /* Direct start: skip rmSa347Open(), because its dialog asks quantity again. */
   return call("rmSa347Start",q);
 }
 if(S.method==="manual"){try{call("rmLfClose")}catch(_){};return call("rmLfManualSpot")}
 return call("rmLfApply");
}
document.addEventListener("click",function(e){
 var modal=e.target&&e.target.closest&&e.target.closest("#lightFlowModal");if(!modal)return;
 var t=e.target.closest("button");if(!t)return;
 if(t.dataset.step){var d=Number(t.dataset.step)||0;if(S.mode==="grid"){S.gridQ=Math.max(4,Math.min(24,S.gridQ+d))}else{S.qty=Math.max(2,Math.min(24,S.qty+d))}syncOld();render();return}
 if(t.dataset.method){S.method=t.dataset.method;render();return}
 if(t.dataset.orient){S.orient=t.dataset.orient;try{call("rmLfSetOrient",S.orient)}catch(_){};render();return}
 if(t.dataset.grid){S.gridQ=Number(t.dataset.grid)||8;try{call("rmLfSetQty",S.gridQ)}catch(_){};render();return}
 if(t.id==="rm353Main"){e.preventDefault();e.stopPropagation();action();return}
 if(t.closest("#rmLfTabs"))setTimeout(function(){S.mode=modeFromOld();S.method=S.mode==="one"?"room":"sketch";ensure()},0);
},true);
var oldOpen=window.openLightFlowModal;
if(typeof oldOpen==="function"&&!oldOpen.__v353){
 var op=function(){var r=oldOpen.apply(this,arguments);setTimeout(ensure,0);return r};op.__v353=true;window.openLightFlowModal=op;try{openLightFlowModal=op}catch(_){}
}
var m=g("lightFlowModal");
if(m)try{new MutationObserver(function(){if(m.classList.contains("open"))setTimeout(ensure,0)}).observe(m,{attributes:true,attributeFilter:["class"]})}catch(_){}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensure,{once:true});else ensure();
window.A·CEIL_BUILD_LABEL="v3.54 LIGHT-MENU-DIRECT-SKETCH";
})();
