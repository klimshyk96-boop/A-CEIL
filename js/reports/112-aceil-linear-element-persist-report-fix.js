
(function(){
  "use strict";
  function parseState(raw){
    try{return raw?(typeof raw==='string'?JSON.parse(raw):raw||{}):{};}catch(e){return {};}
  }
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return Array.isArray(v)?v.slice():v;}}
  function currentLinear(){try{if(typeof linearElements!=='undefined'&&Array.isArray(linearElements)&&(linearElements.length||!Array.isArray(window.linearElements)))window.linearElements=linearElements;}catch(e){window.__diagSilent&&window.__diagSilent(e)}return Array.isArray(window.linearElements)?window.linearElements:[];}
  function setLinear(list){
    window.linearElements=Array.isArray(list)?clone(list):[];
    try{linearElements=window.linearElements;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return window.linearElements;
  }
  function syncLogicalCenters(){
    currentLinear().forEach(function(el){
      try{if(typeof syncLogicalCenterFromCanvas==='function')syncLogicalCenterFromCanvas(el);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    });
  }
  function injectIntoState(raw){
    var st=parseState(raw);
    syncLogicalCenters();
    st.linearElements=clone(currentLinear());
    return st;
  }
  function restoreList(values){
    var list=setLinear(values||[]);
    setTimeout(function(){
      if(currentLinear()!==list)return;
      list.forEach(function(el){
        if(!el.centerCanvasPx&&el.center&&typeof lightCoordsToCanvas==='function'){
          try{
            var p=lightCoordsToCanvas(el.center.x,el.center.y,Number.isFinite(+el.baseIndex)?+el.baseIndex:0);
            if(p&&isFinite(p.x)&&isFinite(p.y))el.centerCanvasPx={x:p.x,y:p.y};
          }catch(e){window.__diagSilent&&window.__diagSilent(e)}
        }
      });
      try{if(typeof draw==='function')draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    },0);
    return list;
  }

  window.A·CEIL=window.A·CEIL||{};
  window.A·CEIL.LinearPersistence=Object.freeze({restore:restoreList});

  // Save the linear elements in every normal saveState() snapshot.
  var oldSaveState=window.saveState||((typeof saveState==='function')?saveState:null);
  if(typeof oldSaveState==='function'&&!oldSaveState.__linearPersistV5){
    var wrappedSaveState=function(){
      try{
        syncLogicalCenters();
        // saveState serializes globals, so keeping the canonical global array
        // current is sufficient and does not change its normal storage flow.
        window.linearElements=currentLinear();
        try{linearElements=window.linearElements;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
      }catch(e){window.__diagSilent&&window.__diagSilent(e)}
      return oldSaveState.apply(this,arguments);
    };
    wrappedSaveState.__linearPersistV5=true;
    window.saveState=wrappedSaveState;try{saveState=wrappedSaveState;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  // Multi-room persistence is handled by A·CEIL-multiroom-lifecycle-v31, whose canonical canvas state already includes linearElements.

  // Project and room loaders restore linear state directly via WallElementPersistence.

  // Add light-line details to the existing report light-coordinate section.
  var oldGet=window.getLightCoordLines||((typeof getLightCoordLines==='function')?getLightCoordLines:null);
  if(typeof oldGet==='function'&&!oldGet.__linearPersistV5){
    var wrappedGet=function(state){
      var rows=[];try{rows=oldGet.apply(this,arguments)||[];}catch(e){rows=[];}
      try{
        var st=state&&typeof state==='object'?state:parseState(state);
        var els=Array.isArray(st.linearElements)?st.linearElements:currentLinear();
        els.forEach(function(el,i){
          if(!el||el.elementType!=='lightLine')return;
          var segs=(el.segments||[]).map(function(v){return Math.round(Number(v)||0)+' см';}).join(' + ');
          var total=Number(el.totalLengthCm)||0;
          if(!total)total=(el.segments||[]).reduce(function(s,v){return s+(Number(v)||0);},0);
          var shape=el.shape==='L'?'Г-подібна':el.shape==='U'?'П-подібна':el.shape==='rectangle'?'Прямокутник':'Пряма';
          rows.push('Світлова лінія '+(i+1)+' — '+shape+'; розміри: '+segs+'; загальна довжина: '+(Math.round(total)/100).toFixed(2)+' м');
        });
      }catch(e){window.__diagSilent&&window.__diagSilent(e)}
      return rows;
    };
    wrappedGet.__linearPersistV5=true;window.getLightCoordLines=wrappedGet;try{getLightCoordLines=wrappedGet;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  // Clear ghost elements when starting a truly new project.
  var oldReset=window.resetAllSilent||((typeof resetAllSilent==='function')?resetAllSilent:null);
  if(typeof oldReset==='function'&&!oldReset.__linearPersistV5){
    var wrappedReset=function(){var r=oldReset.apply(this,arguments);setLinear([]);return r;};
    wrappedReset.__linearPersistV5=true;window.resetAllSilent=wrappedReset;try{resetAllSilent=wrappedReset;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }
})();
