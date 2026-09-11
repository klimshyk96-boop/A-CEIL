(function(){
  "use strict";

  function byId(id){ return document.getElementById(id); }
  function wallMarksList(){
    try { if(Array.isArray(window.wallMarks)) return window.wallMarks; } catch(e){}
    try { if(typeof wallMarks!=="undefined" && Array.isArray(wallMarks)) return wallMarks; } catch(e){}
    return [];
  }
  function currentWallMark(){
    var id=window._rwe2CurrentWallId||window._wallEditId||null;
    return wallMarksList().find(function(m){ return m&&String(m.id)===String(id); })||null;
  }
  function isCornice(mark){
    var input=byId("rwe2Name")||byId("wallEditType");
    return /карниз/i.test(String(input&&input.value||mark&&mark.type||""));
  }

  function ensureBreakOption(){
    var anchor=byId("rwe2Anchor")||byId("wallEditAnchor");
    if(!anchor) return;
    var row=byId("rwe2ForceBreaksRow");
    if(!row){
      row=document.createElement("label");
      row.id="rwe2ForceBreaksRow";
      row.style.cssText="display:flex;align-items:flex-start;gap:9px;margin:12px 0 4px;padding:11px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;color:#9a3412;font-size:12px;font-weight:800;text-transform:none;letter-spacing:0";
      row.innerHTML='<input id="rwe2ForceBreaks" type="checkbox" style="width:19px;height:19px;flex:0 0 auto;accent-color:#ea580c"><span>Рахувати 2 обриви завжди<small style="display:block;margin-top:3px;color:#9a3412;font-weight:600">Без галочки: від стіни до стіни — 0; один вільний край — 1; два — 2.</small></span>';
      var grid=byId("rwe2PositionGrid");
      (grid||anchor).insertAdjacentElement("afterend",row);
    }
    var mark=currentWallMark(),checkbox=byId("rwe2ForceBreaks");
    row.style.display=isCornice(mark)?"flex":"none";
    var markId=String(mark&&mark.id||"");
    if(checkbox&&row.dataset.markId!==markId){ checkbox.checked=!!(mark&&mark.forceBreaks); row.dataset.markId=markId; }
  }

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
    ensureBreakOption();
    return true;
  }

  var previousSave=window.rwe2Save;
  if(typeof previousSave==="function" && !previousSave.__breakOption){
    var wrappedSave=function(){
      var mark=currentWallMark(),checkbox=byId("rwe2ForceBreaks");
      if(mark) mark.forceBreaks=!!(checkbox&&checkbox.checked&&isCornice(mark));
      return previousSave.apply(this,arguments);
    };
    wrappedSave.__breakOption=true;
    window.rwe2Save=wrappedSave;
    try { rwe2Save=wrappedSave; } catch(e){ window.__diagSilent&&window.__diagSilent(e); }
  }

  var previousLegacySave=window.saveWallEdit;
  if(typeof previousLegacySave==="function" && !previousLegacySave.__breakOption){
    var wrappedLegacySave=function(){
      var mark=currentWallMark(),checkbox=byId("rwe2ForceBreaks");
      if(mark) mark.forceBreaks=!!(checkbox&&checkbox.checked&&isCornice(mark));
      return previousLegacySave.apply(this,arguments);
    };
    wrappedLegacySave.__breakOption=true;
    window.saveWallEdit=wrappedLegacySave;
    try { saveWallEdit=wrappedLegacySave; } catch(e){ window.__diagSilent&&window.__diagSilent(e); }
  }

  var previous=window.openWallEditModal;
  if(typeof previous==="function" && !previous.__placementRestore){
    var wrapped=function(){
      var breakRow=byId("rwe2ForceBreaksRow");
      if(breakRow) breakRow.dataset.markId="";
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
    if(e.target&&e.target.closest&&e.target.closest("#wallEditModal")&&!e.target.closest("#rwe2ForceBreaksRow")) setTimeout(ensurePlacementUi,0);
  },true);
  document.addEventListener("input",function(e){
    if(e.target&&(e.target.id==="rwe2Name"||e.target.id==="wallEditType")) ensureBreakOption();
  },true);

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){ setTimeout(ensurePlacementUi,250); },{once:true});
  }else{
    setTimeout(ensurePlacementUi,250);
  }
})();
