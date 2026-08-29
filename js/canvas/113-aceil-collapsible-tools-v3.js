
(function(){
"use strict";
var STORAGE_KEY="A·CEIL_tools_collapsed_v1";
var mainArea=null,panel=null,canvasHost=null,canvas=null;
var originalCanvasWidth=0,originalCanvasHeight=0,resizeFrame=0;

function isCollapsed(){return !!(mainArea&&mainArea.classList.contains("rm-tools-collapsed"));}
function viewportHeight(){
  try{if(window.visualViewport&&window.visualViewport.height)return window.visualViewport.height;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return window.innerHeight||document.documentElement.clientHeight||0;
}
function redraw(){try{if(typeof window.requestDraw==="function")window.requestDraw();else if(typeof window.draw==="function")window.draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
function applyCanvasLayout(){
  if(!canvasHost||!canvas)return;
  cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(function(){
    if(isCollapsed()){
      var rect=canvasHost.getBoundingClientRect();
      var safeBottom=12;
      try{safeBottom=Math.max(12,parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat-bottom"))||12);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
      var available=Math.max(360,Math.floor(viewportHeight()-rect.top-safeBottom));
      var cssWidth=Math.max(1,canvasHost.clientWidth||rect.width||canvas.clientWidth||1);
      var backingWidth=canvas.width||originalCanvasWidth||750;
      var backingHeight=Math.max(1,Math.round(available*(backingWidth/cssWidth)));
      canvasHost.style.height=available+"px";
      canvas.style.height=available+"px";
      if(canvas.height!==backingHeight)canvas.height=backingHeight;
    }else{
      canvasHost.style.height="";
      canvas.style.height="";
      if(originalCanvasHeight&&canvas.height!==originalCanvasHeight)canvas.height=originalCanvasHeight;
      if(originalCanvasWidth&&canvas.width!==originalCanvasWidth)canvas.width=originalCanvasWidth;
    }
    redraw();
    try{window.dispatchEvent(new CustomEvent("A·CEIL:tool-panel-change",{detail:{collapsed:isCollapsed()}}));}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  });
}
function setCollapsed(collapsed,persist){
  if(!mainArea||!panel)return false;
  mainArea.classList.toggle("rm-tools-collapsed",!!collapsed);
  if(persist!==false){try{localStorage.setItem(STORAGE_KEY,collapsed?"1":"0");}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
  applyCanvasLayout();
  return true;
}
function toggle(){return setCollapsed(!isCollapsed(),true);}
function init(){
  mainArea=document.getElementById("main-area");
  panel=document.getElementById("A·CEILToolPanel");
  canvasHost=document.querySelector(".canvas-container");
  canvas=document.getElementById("cv");
  if(!mainArea||!panel||!canvasHost||!canvas)return;
  originalCanvasWidth=canvas.width;originalCanvasHeight=canvas.height;
  var saved=false;try{saved=localStorage.getItem(STORAGE_KEY)==="1";}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  setCollapsed(saved,false);
  window.addEventListener("resize",applyCanvasLayout,{passive:true});
  window.addEventListener("orientationchange",function(){setTimeout(applyCanvasLayout,120);},{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener("resize",applyCanvasLayout,{passive:true});
}
window.toggleA·CEILToolPanel=toggle;
window.A·CEIL=window.A·CEIL||{};
window.A·CEIL.ToolPanel={toggle:toggle,collapse:function(){return setCollapsed(true,true);},expand:function(){return setCollapsed(false,true);},isCollapsed:isCollapsed,resize:applyCanvasLayout};
if(typeof rmOnReady==="function")rmOnReady(init);else if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
