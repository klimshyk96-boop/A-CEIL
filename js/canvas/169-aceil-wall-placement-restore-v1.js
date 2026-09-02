(function(){
  "use strict";

  function byId(id){ return document.getElementById(id); }

  function ensurePlacementUi(){
    var anchor=byId("rwe2Anchor");
    if(!anchor) return false;

    var title=byId("rwe2PositionTitle");
    if(!title){
      title=document.createElement("label");
      title.id="rwe2PositionTitle";
      title.className="rwe-pos-title";
      title.textContent="Розташування на стіні";
      anchor.parentNode.insertBefore(title,anchor);
    }

    var grid=byId("rwe2PositionGrid");
    if(!grid){
      grid=document.createElement("div");
      grid.id="rwe2PositionGrid";
      grid.className="rwe-pos-grid rwe-visual";
      anchor.insertAdjacentElement("afterend",grid);
    }

    try {
      if(typeof window.rwe2AnchorChanged==="function") window.rwe2AnchorChanged();
    } catch(e){ window.__diagSilent&&window.__diagSilent(e); }
    return true;
  }

  var previous=window.openWallEditModal;
  if(typeof previous==="function" && !previous.__placementRestore){
    var wrapped=function(){
      var result=previous.apply(this,arguments);
      setTimeout(ensurePlacementUi,20);
      setTimeout(ensurePlacementUi,90);
      return result;
    };
    wrapped.__placementRestore=true;
    window.openWallEditModal=wrapped;
    try { openWallEditModal=wrapped; } catch(e){ window.__diagSilent&&window.__diagSilent(e); }
  }

  document.addEventListener("click",function(e){
    if(e.target&&e.target.closest&&e.target.closest("#wallEditModal")) setTimeout(ensurePlacementUi,0);
  },true);

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){ setTimeout(ensurePlacementUi,250); },{once:true});
  }else{
    setTimeout(ensurePlacementUi,250);
  }
})();
