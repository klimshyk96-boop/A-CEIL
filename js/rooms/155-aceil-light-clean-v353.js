
(function(){
"use strict";
if(window.__rmLightClean353)return;window.__rmLightClean353=true;
var S={mode:"one",qty:5,method:"room",orient:"auto",gridCols:4,gridRows:2,gridQ:8};
var D={edge:50};
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
 if(S.mode!=="one")try{call("rmLfSetQty",S.mode==="grid"?S.gridCols*S.gridRows:S.qty)}catch(_){}
 if(S.mode==="row")try{call("rmLfSetOrient",S.orient)}catch(_){}
 if(S.mode==="one")try{call("rmLfSetOnePlace",S.method==="zone"?"zone":S.method==="manual"?"manual":"room")}catch(_){}
}
function roomBox(){
 var cv=g("cv")||{width:800,height:600},list=[];
 try{list=typeof pts!=="undefined"&&Array.isArray(pts)?pts:[]}catch(_){list=Array.isArray(window.pts)?window.pts:[]}
 if(!list.length)return{left:0,top:0,right:Number(cv.width)||800,bottom:Number(cv.height)||600,poly:[]};
 var xs=list.map(function(p){return Number(p.x)||0}),ys=list.map(function(p){return Number(p.y)||0});
 return{left:Math.min.apply(null,xs),top:Math.min.apply(null,ys),right:Math.max.apply(null,xs),bottom:Math.max.apply(null,ys),poly:list};
}
function pxPerCm(){
 try{if(typeof scale!=="undefined"&&Number(scale)>0)return Number(scale)}catch(_){}
 try{if(typeof _pxPerCm==="function"){var v=Number(_pxPerCm());if(v>0)return v}}catch(_){}
 return 1;
}
function insidePoly(point,poly){
 if(!Array.isArray(poly)||poly.length<3)return true;
 var inside=false;
 for(var i=0,j=poly.length-1;i<poly.length;j=i++){
   var xi=Number(poly[i].x),yi=Number(poly[i].y),xj=Number(poly[j].x),yj=Number(poly[j].y);
   var cross=(yi>point.y)!==(yj>point.y)&&point.x<(xj-xi)*(point.y-yi)/(yj-yi||1e-9)+xi;
   if(cross)inside=!inside;
 }
 return inside;
}
function spot(mark){return String(mark&&mark.type||"").toLowerCase()==="spot"}
function replaceSpots(points){
 var list=null;
 try{list=typeof lightMarks!=="undefined"&&Array.isArray(lightMarks)?lightMarks:null}catch(_){}
 if(!list)list=Array.isArray(window.lightMarks)?window.lightMarks:null;
 if(!list)return false;
 for(var i=list.length-1;i>=0;i--)if(spot(list[i]))list.splice(i,1);
 var base=Date.now();
 points.forEach(function(p,index){
   var mark={id:"light_dim_"+base+"_"+index,type:"spot",x:Math.round(p.x),y:Math.round(p.y)};
   try{if(typeof _nearestLightBaseIndex==="function")mark.baseIndex=_nearestLightBaseIndex(mark.x,mark.y)}catch(_){}
   try{if(typeof _updateLightCoords==="function")_updateLightCoords(mark)}catch(_){}
   list.push(mark);
 });
 try{if(typeof updateLightBadge==="function")updateLightBadge()}catch(_){}
 try{if(typeof syncLightMarksToElems==="function")syncLightMarksToElems()}catch(_){}
 try{if(typeof saveState==="function")saveState()}catch(_){}
 try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw()}catch(_){}
 return true;
}
function buildByOffset(edgeCm,isAutomatic){
 var box=roomBox(),k=pxPerCm(),edge=Math.max(0,Number(edgeCm)||0)*k,points=[];
 var left=box.left+edge,right=box.right-edge,top=box.top+edge,bottom=box.bottom-edge;
 if(right<left||bottom<top){try{showToast("Відступ завеликий для цієї кімнати")}catch(_){};return}
 if(S.mode==="row"){
   var vertical=S.orient==="v"||(S.orient==="auto"&&(box.bottom-box.top)>(box.right-box.left));
   var fixedX=(box.left+box.right)/2,fixedY=(box.top+box.bottom)/2;
   for(var i=0;i<S.qty;i++){
     var t=S.qty===1?.5:i/(S.qty-1);
     points.push(vertical?{x:fixedX,y:top+(bottom-top)*t}:{x:left+(right-left)*t,y:fixedY});
   }
 }else{
   var cols=S.gridCols,rows=S.gridRows;
   for(var r=0;r<rows;r++)for(var c=0;c<cols;c++)points.push({
     x:cols===1?(left+right)/2:left+c*(right-left)/(cols-1),
     y:rows===1?(top+bottom)/2:top+r*(bottom-top)/(rows-1)
   });
 }
 var outside=points.some(function(p){return p.x<box.left||p.x>box.right||p.y<box.top||p.y>box.bottom||!insidePoly(p,box.poly)});
 if(outside){try{showToast("Частина світильників виходить за контур — змініть відступ")}catch(_){};return}
 if(replaceSpots(points)){
   try{call("rmLfClose")}catch(_){}
   try{showToast((isAutomatic?"Розміщено автоматично: ":"Створено з відступом: ")+points.length+" світильників")}catch(_){}
 }
}
function dimensionsHtml(){
 if(S.method!=="manual"||S.mode==="one")return"";
 return '<div class="rm353-card rm353-dimcard"><label class="rm353-edge"><span>Відступ від стін</span><input type="number" inputmode="decimal" min="0" step="1" data-dim="edge" value="'+D.edge+'"><small>см</small></label><div class="rm353-tip">Інші проміжки A·CEIL розрахує рівномірно.</div></div>';
}
function ensureDimCss(){
 if(g("rm353DimCss"))return;var st=document.createElement("style");st.id="rm353DimCss";
 st.textContent="#rmLightClean353 .rm353-gridcounts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}#rmLightClean353 .rm353-countbox{border:1.5px solid #dbe2ea;border-radius:13px;padding:7px;background:#fff}#rmLightClean353 .rm353-countbox>span{display:block;font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;margin:0 0 4px}#rmLightClean353 .rm353-mini{display:grid;grid-template-columns:32px 1fr 32px;align-items:center}#rmLightClean353 .rm353-mini button{height:32px!important;min-height:32px!important;padding:0!important;border:0!important;background:#f5f3ff!important;color:#2563eb!important;box-shadow:none!important;border-radius:9px!important;font-size:19px!important;font-weight:950!important}#rmLightClean353 .rm353-mini b{text-align:center;font-size:17px;color:#0f172a}#rmLightClean353[data-rm356-one=\"1\"]:before,#rmLightClean353 .rm356-oneqty{display:none!important}#rmLightClean353 .rm353-methods{grid-template-columns:1fr 1fr!important;gap:8px!important}#rmLightClean353 .rm353-method{min-height:52px!important;padding:8px 27px 8px 10px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;text-align:center!important;font-size:12px!important;line-height:1.12!important}#rmLightClean353 .rm353-method:before{display:none!important;content:none!important}#rmLightClean353 .rm353-method small{margin-top:3px!important;font-size:8.5px!important;line-height:1.15!important}#rmLightClean353 .rm353-method.wide{grid-column:1/-1!important}#rmLightClean353 .rm353-dimcard{margin-bottom:8px!important}#rmLightClean353 .rm353-edge{position:relative;display:block;border:1.5px solid #93c5fd;border-radius:13px;background:#eff6ff;padding:7px 42px 7px 11px}#rmLightClean353 .rm353-edge span{display:block;font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase}#rmLightClean353 .rm353-edge input{width:100%;height:28px;border:0!important;outline:0;background:transparent;font-size:17px;font-weight:950;color:#0f172a;padding:0!important;box-shadow:none!important}#rmLightClean353 .rm353-edge small{position:absolute;right:12px;bottom:13px;font-size:10px;font-weight:850;color:#64748b}#rm357SketchLaunch{min-height:0!important;margin:8px 0 0!important;padding:10px 12px!important;border-radius:13px!important}#rm357SketchLaunch .t{font-size:12px!important;line-height:1.2!important}#rm357SketchLaunch .s{display:none!important}@media(max-width:370px){#rmLightClean353 .rm353-methods{grid-template-columns:1fr 1fr!important}}";
 document.head.appendChild(st);
}
function btn(txt,method,wide){
 return '<button type="button" class="rm353-method'+(S.method===method?' active':'')+(wide?' wide':'')+'" data-method="'+method+'">'+txt+'</button>';
}
function render(){
 var host=g("rmLightClean353");if(!host)return;
 S.mode=modeFromOld();
 S.gridQ=S.gridCols*S.gridRows;
 var html="";
 if(S.mode==="row")html+='<div class="rm353-card"><div class="rm353-qty"><div><div class="rm353-label">Кількість</div><div class="rm353-qtytitle">Світильників у ряду</div></div><div class="rm353-step"><button data-step="-1">−</button><div class="rm353-num">'+S.qty+'</div><button data-step="1">+</button></div></div></div>';
 if(S.mode==="grid")html+='<div class="rm353-gridcounts"><div class="rm353-countbox"><span>По ширині</span><div class="rm353-mini"><button data-grid-axis="cols" data-delta="-1">−</button><b>'+S.gridCols+'</b><button data-grid-axis="cols" data-delta="1">+</button></div></div><div class="rm353-countbox"><span>Рядів</span><div class="rm353-mini"><button data-grid-axis="rows" data-delta="-1">−</button><b>'+S.gridRows+'</b><button data-grid-axis="rows" data-delta="1">+</button></div></div></div>';
 html+='<div class="rm353-card"><div class="rm353-label">Спосіб розміщення</div><div class="rm353-methods">';
 if(S.mode==="one"){
   html+=btn("◎ По центру кімнати","room",false)+btn("◉ По центру зони","zone",false)+btn("⌖ Вказати місце","manual",true);
 }else{
   html+=btn("✦ Вирівняти по ескізу<small>тикаєте приблизно — A·CEIL вирівнює</small>","sketch",true);
   html+=btn("◎ Автоматично","room",false)+btn("⌖ Відступ від стін","manual",false);
 }
 html+='</div></div>';
 if(S.mode==="row"){
   html+='<div class="rm353-card"><div class="rm353-label">Напрямок ряду</div><div class="rm353-orient"><button data-orient="auto" class="'+(S.orient==="auto"?"active":"")+'">Авто</button><button data-orient="h" class="'+(S.orient==="h"?"active":"")+'">↔ По ширині</button><button data-orient="v" class="'+(S.orient==="v"?"active":"")+'">↕ По довжині</button></div></div>';
 }
 html+=dimensionsHtml();
 var label=S.method==="sketch"?"Почати розстановку по ескізу":S.method==="manual"?"Створити з відступом":S.mode==="one"?"Поставити світильник":S.mode==="row"?"Створити ряд":"Створити сітку";
 html+='<button type="button" class="rm353-main" id="rm353Main">'+label+'</button>';
 host.innerHTML=html;
}
function ensure(){
 var modal=g("lightFlowModal"),box=modal&&modal.querySelector(".modal"),tabs=g("rmLfTabs");if(!box||!tabs)return;
 var host=g("rmLightClean353");
 if(!host){host=document.createElement("div");host.id="rmLightClean353";tabs.insertAdjacentElement("afterend",host)}
 ensureDimCss();
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
 if(S.method==="manual"){
   if(S.mode!=="one")return buildByOffset(D.edge,false);
   try{call("rmLfClose")}catch(_){};return call("rmLfManualSpot")
 }
 if(S.method==="room"&&S.mode==="grid")return buildByOffset(50,true);
 return call("rmLfApply");
}
document.addEventListener("click",function(e){
 var modal=e.target&&e.target.closest&&e.target.closest("#lightFlowModal");if(!modal)return;
 var t=e.target.closest("button");if(!t)return;
 if(t.dataset.step){var d=Number(t.dataset.step)||0;S.qty=Math.max(2,Math.min(24,S.qty+d));syncOld();render();return}
 if(t.dataset.gridAxis){var axis=t.dataset.gridAxis,delta=Number(t.dataset.delta)||0;if(axis==="cols")S.gridCols=Math.max(1,Math.min(12,S.gridCols+delta));else S.gridRows=Math.max(1,Math.min(12,S.gridRows+delta));S.gridQ=S.gridCols*S.gridRows;syncOld();render();return}
 if(t.dataset.method){S.method=t.dataset.method;render();return}
 if(t.dataset.orient){S.orient=t.dataset.orient;try{call("rmLfSetOrient",S.orient)}catch(_){};render();return}
 if(t.id==="rm353Main"){e.preventDefault();e.stopPropagation();action();return}
 if(t.closest("#rmLfTabs"))setTimeout(function(){S.mode=modeFromOld();S.method=S.mode==="one"?"room":"sketch";ensure()},0);
},true);
document.addEventListener("input",function(e){
 var input=e.target&&e.target.closest&&e.target.closest("#rmLightClean353 input[data-dim]");if(!input)return;
 var key=input.dataset.dim,value=parseFloat(String(input.value||"").replace(",","."));if(isFinite(value)&&value>=0)D[key]=value;
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
