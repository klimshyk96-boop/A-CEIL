
(function(){
"use strict";
function els(){return{wrap:document.getElementById("A·CEILRoomMenu"),toggle:document.getElementById("A·CEILRoomMenuToggle"),popup:document.getElementById("A·CEILRoomMenuPopup")};}
function close(){var e=els();if(!e.popup)return;e.popup.hidden=true;if(e.toggle)e.toggle.setAttribute("aria-expanded","false");}
function syncCanvasAction(){
  var api=window.A·CEIL&&window.A·CEIL.ToolPanel;
  var collapsed=!!(api&&typeof api.isCollapsed==="function"&&api.isCollapsed());
  var title=document.getElementById("A·CEILCanvasModeTitle"),hint=document.getElementById("A·CEILCanvasModeHint");
  if(title)title.textContent=collapsed?"Повернути меню":"Розгорнути канвас";
  if(hint)hint.textContent=collapsed?"Показати нижні інструменти":"Сховати нижні інструменти";
  syncCleanViewAction();
}
function readCleanView(){
  try{return localStorage.getItem("A·CEIL_clean_canvas_view")==="1";}catch(e){return false;}
}
function syncCleanViewAction(){
  var hidden=!!window.A·CEILCanvasCleanView;
  var title=document.getElementById("A·CEILCleanViewTitle"),hint=document.getElementById("A·CEILCleanViewHint");
  if(title)title.textContent=hidden?"Повернути службові елементи":"Чистий контур";
  if(hint)hint.textContent=hidden?"Повернути точки, кути й підписи":"Лише контур кімнати";
}
function toggleCleanView(){
  window.A·CEILCanvasCleanView=!window.A·CEILCanvasCleanView;
  try{localStorage.setItem("A·CEIL_clean_canvas_view",window.A·CEILCanvasCleanView?"1":"0");}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  syncCleanViewAction();
  close();
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return window.A·CEILCanvasCleanView;
}
function toggle(ev){if(ev){ev.preventDefault();ev.stopPropagation();}var e=els();if(!e.popup)return false;var open=e.popup.hidden;e.popup.hidden=!open;if(e.toggle)e.toggle.setAttribute("aria-expanded",open?"true":"false");if(open)syncCanvasAction();return open;}
function validPoints(){try{return Array.isArray(window.pts)?window.pts.filter(function(p){return p&&isFinite(Number(p.x))&&isFinite(Number(p.y));}):(typeof pts!=="undefined"&&Array.isArray(pts)?pts.filter(function(p){return p&&isFinite(Number(p.x))&&isFinite(Number(p.y));}):[]);}catch(e){return[];}}
function showWholeRoom(){
  close();
  try{
    var list=validPoints(),canvas=document.getElementById("cv");
    if(!canvas||list.length<2){if(typeof resetZoom==="function")resetZoom();return true;}
    var xs=list.map(function(p){return Number(p.x);}),ys=list.map(function(p){return Number(p.y);});
    var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
    var bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),w=canvas.width||750,h=canvas.height||750;
    var pad=Math.max(70,Math.min(w,h)*.11),scale=Math.min((w-pad*2)/bw,(h-pad*2)/bh);
    if(!isFinite(scale)||scale<=0)scale=1;
    viewScale=Math.max(.5,Math.min(5,scale));
    viewOffsetX=w/2-((minX+maxX)/2)*viewScale;
    viewOffsetY=h/2-((minY+maxY)/2)*viewScale;
    if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();
    return true;
  }catch(e){try{if(typeof resetZoom==="function")resetZoom();}catch(_){window.__diagSilent&&window.__diagSilent(_)}return false;}
}
function toggleCanvasMode(){
  var api=window.A·CEIL&&window.A·CEIL.ToolPanel;
  if(!api||typeof api.toggle!=="function")return false;
  api.toggle();syncCanvasAction();close();return true;
}
function deleteCurrent(btn){try{if(typeof window.deleteActiveRoom==="function")return window.deleteActiveRoom(btn);}catch(e){window.__diagSilent&&window.__diagSilent(e)}try{if(typeof deleteActiveRoom==="function")return deleteActiveRoom(btn);}catch(e){window.__diagSilent&&window.__diagSilent(e)}if(typeof showToast==="function")showToast("⚠️ Немає активної кімнати");return false;}
document.addEventListener("click",function(ev){var e=els();if(e.wrap&&!e.wrap.contains(ev.target))close();});
document.addEventListener("keydown",function(ev){if(ev.key==="Escape")close();});
window.addEventListener("A·CEIL:tool-panel-change",syncCanvasAction);
window.A·CEILCanvasCleanView=readCleanView();
window.toggleA·CEILRoomMenu=toggle;window.closeA·CEILRoomMenu=close;window.A·CEILShowWholeRoom=showWholeRoom;window.A·CEILToggleCanvasMode=toggleCanvasMode;window.A·CEILToggleCleanCanvasView=toggleCleanView;window.A·CEILDeleteCurrentRoom=deleteCurrent;
window.A·CEIL=window.A·CEIL||{};window.A·CEIL.RoomMenu={toggle:toggle,close:close,showWholeRoom:showWholeRoom,toggleCanvasMode:toggleCanvasMode,toggleCleanView:toggleCleanView,deleteCurrentRoom:deleteCurrent,syncCanvasAction:syncCanvasAction};
if(typeof rmOnReady==="function")rmOnReady(syncCanvasAction);else if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",syncCanvasAction,{once:true});else syncCanvasAction();
})();
