(function(){
  "use strict";
  if(window.__aceilEveningFixesV1)return;
  window.__aceilEveningFixesV1=true;

  /* The plan viewer and its Figure-tile interceptor are intentionally retired. */
  window.ACEILPlanViewerV1=true;

  function clearGeometryWarning(){
    try{
      var api=window.A_CEIL_HonestGeometry;
      if(api&&typeof api.clear==="function")api.clear();
      var badge=document.getElementById("aceilGeometryWarning");
      if(badge){badge.style.display="none";badge.textContent=""}
    }catch(error){window.__diagSilent&&window.__diagSilent(error)}
  }
  function removePlanUi(){
    ["aceilPlanTile","aceilPlanViewer","A-CEIL-figure-source-menu"].forEach(function(id){
      var node=document.getElementById(id);if(node&&node.parentNode)node.parentNode.removeChild(node);
    });
    var shapeMenu=document.getElementById("shapeMenu"),tile=shapeMenu&&shapeMenu.parentElement&&shapeMenu.parentElement.querySelector("button.tile-btn");
    if(tile)tile.__aceilFigureImportWired=true;
  }
  function wrapReset(name){
    var original=window[name];
    if(typeof original!=="function"||original.__aceilWarningReset)return;
    var wrapped=function(){clearGeometryWarning();return original.apply(this,arguments)};
    wrapped.__aceilWarningReset=true;
    window[name]=wrapped;
  }
  function install(){
    removePlanUi();
    wrapReset("resetAllSilent");
    wrapReset("resetAll");
  }
  install();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  setTimeout(install,0);setTimeout(install,700);
})();
