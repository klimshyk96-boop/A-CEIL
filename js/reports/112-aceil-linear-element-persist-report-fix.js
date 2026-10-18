
(function(){
  "use strict";
  function parseState(raw){
    try{return raw?(typeof raw==='string'?JSON.parse(raw):raw||{}):{};}catch(e){return {};}
  }
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return Array.isArray(v)?v.slice():v;}}
  function currentLinear(){return Array.isArray(window.linearElements)?window.linearElements:[];}
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
  function restoreFromState(raw){
    var st=parseState(raw),list=setLinear(st.linearElements||[]);
    setTimeout(function(){
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

  // Restore after the final project loader has applied the room/project state.
  var oldLoadProject=window.loadProject||((typeof loadProject==='function')?loadProject:null);
  if(typeof oldLoadProject==='function'&&!oldLoadProject.__linearPersistV5){
    var wrappedLoadProject=async function(id){
      var r=await oldLoadProject.apply(this,arguments);
      try{
        var ps=typeof getProjects==='function'?getProjects():[];
        var p=(ps||[]).find(function(x){return x&&(String(x.id)===String(id)||String(x._dbId)===String(id)||String(x._localId)===String(id));});
        var raw=null;
        if(p&&Array.isArray(p.rooms)&&typeof _activeRoomIdx!=='undefined'&&_activeRoomIdx!=null&&p.rooms[_activeRoomIdx])raw=p.rooms[_activeRoomIdx].state;
        else if(p)raw=p.state;
        restoreFromState(raw);
      }catch(e){setLinear([]);}
      return r;
    };
    wrappedLoadProject.__linearPersistV5=true;window.loadProject=wrappedLoadProject;try{loadProject=wrappedLoadProject;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  var oldOpenObjectRooms=window.openObjectRooms;
  if(typeof oldOpenObjectRooms==='function'&&!oldOpenObjectRooms.__linearPersistV5){
    var wrappedOpenObjectRooms=async function(id){
      var r=await oldOpenObjectRooms.apply(this,arguments);
      try{
        var ps=typeof getProjects==='function'?getProjects():[];
        var p=(ps||[]).find(function(x){return x&&(String(x.id)===String(id)||String(x._dbId)===String(id)||String(x._localId)===String(id));});
        var raw=p&&Array.isArray(p.rooms)&&typeof _activeRoomIdx!=='undefined'&&p.rooms[_activeRoomIdx]?p.rooms[_activeRoomIdx].state:null;
        restoreFromState(raw);
      }catch(e){setLinear([]);}
      return r;
    };
    wrappedOpenObjectRooms.__linearPersistV5=true;window.openObjectRooms=wrappedOpenObjectRooms;try{openObjectRooms=wrappedOpenObjectRooms;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

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
