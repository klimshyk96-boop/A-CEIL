
(function(){
"use strict";
if(window.__rmLightClean353)return;window.__rmLightClean353=true;
var S={mode:"one",qty:5,method:"room",orient:"auto",gridQ:8};
var D={x:50,y:50,stepX:100,stepY:100};
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
function gridShape(q){
 var known={4:[2,2],6:[3,2],8:[4,2],10:[5,2],12:[4,3],15:[5,3]};
 if(known[q])return known[q];
 var cols=Math.ceil(Math.sqrt(q)),rows=Math.ceil(q/cols);return[cols,rows];
}
function buildByDimensions(){
 var box=roomBox(),k=pxPerCm(),x0=box.left+D.x*k,y0=box.top+D.y*k,points=[];
 if(S.mode==="row"){
   var vertical=S.orient==="v"||(S.orient==="auto"&&(box.bottom-box.top)>(box.right-box.left));
   for(var i=0;i<S.qty;i++)points.push({x:x0+(vertical?0:i*D.stepX*k),y:y0+(vertical?i*D.stepY*k:0)});
 }else{
   var shape=gridShape(S.gridQ),cols=shape[0],rows=shape[1],made=0;
   for(var r=0;r<rows&&made<S.gridQ;r++)for(var c=0;c<cols&&made<S.gridQ;c++,made++)points.push({x:x0+c*D.stepX*k,y:y0+r*D.stepY*k});
 }
 var outside=points.some(function(p){return p.x<box.left||p.x>box.right||p.y<box.top||p.y>box.bottom||!insidePoly(p,box.poly)});
 if(outside){try{showToast("Частина світильників виходить за межі кімнати — змініть відступ або крок")}catch(_){};return}
 if(replaceSpots(points)){
   try{call("rmLfClose")}catch(_){}
   try{showToast("Створено за розмірами: "+points.length+" світильників")}catch(_){}
 }
}
function numField(key,label){return '<label class="rm353-dimfield"><span>'+label+'</span><input type="number" inputmode="decimal" min="0" step="1" data-dim="'+key+'" value="'+D[key]+'"><small>см</small></label>'}
function dimensionsHtml(){
 if(S.method!=="manual"||S.mode==="one")return"";
 var fields=numField("x","Перша точка — зліва")+numField("y","Перша точка — зверху");
 if(S.mode==="row")fields+=numField(S.orient==="v"?"stepY":"stepX","Крок між точками");
 else fields+=numField("stepX","Крок по горизонталі")+numField("stepY","Крок між рядами");
 return '<div class="rm353-card rm353-dimcard"><div class="rm353-label">Розміри розміщення</div><div class="rm353-dimgrid">'+fields+'</div><div class="rm353-tip">Відлік ведеться від лівої та верхньої габаритних меж кімнати.</div></div>';
}
function ensureDimCss(){
 if(g("rm353DimCss"))return;var st=document.createElement("style");st.id="rm353DimCss";
 st.textContent="#rmLightClean353 .rm353-dimgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}#rmLightClean353 .rm353-dimfield{position:relative;display:block;border:1.5px solid #dbe2ea;border-radius:13px;background:#fff;padding:7px 38px 7px 10px}#rmLightClean353 .rm353-dimfield span{display:block;font-size:9px;font-weight:850;color:#64748b;margin-bottom:2px}#rmLightClean353 .rm353-dimfield input{width:100%;height:28px;border:0!important;outline:0;background:transparent;font-size:16px;font-weight:950;color:#0f172a;padding:0!important;box-shadow:none!important}#rmLightClean353 .rm353-dimfield small{position:absolute;right:10px;bottom:13px;font-size:10px;font-weight:850;color:#94a3b8}@media(max-width:370px){#rmLightClean353 .rm353-dimgrid{grid-template-columns:1fr}}";
 document.head.appendChild(st);
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
 html+=dimensionsHtml();
 var label=S.method==="sketch"?"Почати розстановку по ескізу":S.method==="manual"?"Вказати на плані":S.mode==="one"?"Поставити світильник":S.mode==="row"?"Створити ряд":"Створити сітку";
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
   if(S.mode!=="one")return buildByDimensions();
   try{call("rmLfClose")}catch(_){};return call("rmLfManualSpot")
 }
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
