
(function(){
  'use strict';
  if(window.__A·CEILRoomNomenIsolationV1) return;
  window.__A·CEILRoomNomenIsolationV1=true;

  function clone(v){
    try{return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));}
    catch(_){try{return JSON.parse(JSON.stringify(v));}catch(__){return Array.isArray(v)?v.slice():v;}}
  }
  function list(){try{return window.A·CEIL.ProjectRepository.list({clone:true});}catch(_){try{return typeof getProjects==='function'?getProjects():[];}catch(__){return [];}}}
  function write(arr){try{return window.A·CEIL.ProjectRepository.replaceAll(arr||[]);}catch(_){try{return typeof setProjects==='function'?setProjects(arr||[]):false;}catch(__){return false;}}}
  function match(p,id){return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&String(v)===String(id);});}
  function parseState(raw){if(raw&&typeof raw==='object')return clone(raw);try{return JSON.parse(raw||'{}');}catch(_){return {};}}
  function currentSchema(){try{return window.A·CEILProjectSchema?window.A·CEILProjectSchema.CURRENT_VERSION:3;}catch(_){return 3;}}
  function freshItems(source){
    var items=clone(Array.isArray(source)?source:[]);
    items.forEach(function(it){
      if(!it||typeof it!=='object')return;
      it.qty=0;
      // Clear only known room-result/cache fields; catalog configuration stays intact.
      ['calculatedQty','autoQty','resultQty','computedQty','lineTotal','total','sum','amount'].forEach(function(k){
        if(Object.prototype.hasOwnProperty.call(it,k)){
          if(typeof it[k]==='number')it[k]=0;
          else if(k!=='amount')delete it[k];
        }
      });
    });
    return items;
  }
  function emptyRoomState(items,groups){
    return {
      schemaVersion:currentSchema(),projectType:'room',pts:[],lengths:[],realPts:[],closed:false,
      diagonals:[],diagonalOverrides:{},circleMode:false,circleDiamCm:0,notes:[],
      elemItems:clone(items),elemGroups:clone(groups),lightMarks:[],wallMarks:[],linearElements:[],wallTypes:[],arcPoints:[]
    };
  }
  function activeRecord(){
    var arr=list(),oid=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
    var oi=arr.findIndex(function(p){return match(p,oid);});
    if(oi<0)return null;
    var obj=arr[oi],ri=typeof _activeRoomIdx!=='undefined'?_activeRoomIdx:null;
    if(!Number.isInteger(ri)||!Array.isArray(obj.rooms)||!obj.rooms[ri]){
      var rid=String(window._activeRoomId||'');
      if(rid&&Array.isArray(obj.rooms))ri=obj.rooms.findIndex(function(r){return String(r&&r.id)===rid;});
    }
    return Number.isInteger(ri)&&obj.rooms&&obj.rooms[ri]?{arr:arr,oi:oi,obj:obj,ri:ri,room:obj.rooms[ri]}:null;
  }
  function installFreshRuntime(items,groups){
    try{elemItems=freshItems(items);window.elemItems=elemItems;}catch(_){window.elemItems=freshItems(items);}
    try{elemGroups=clone(Array.isArray(groups)?groups:[]);window.elemGroups=elemGroups;}catch(_){window.elemGroups=clone(Array.isArray(groups)?groups:[]);}
    try{if(typeof updateElemBadge==='function')updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{var m=document.getElementById('elementsModal');if(m&&m.classList.contains('open')&&typeof renderElemList==='function')renderElemList();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  function persistActiveRuntime(){
    var rec=activeRecord();if(!rec)return false;
    var st=parseState(rec.room.state);
    st.schemaVersion=st.schemaVersion||currentSchema();st.projectType='room';
    st.elemItems=clone(typeof elemItems!=='undefined'?elemItems:window.elemItems||[]);
    st.elemGroups=clone(typeof elemGroups!=='undefined'?elemGroups:window.elemGroups||[]);
    rec.room.elemItems=clone(st.elemItems);rec.room.elemGroups=clone(st.elemGroups);rec.room.state=JSON.stringify(st);
    rec.obj.rooms[rec.ri]=rec.room;rec.arr[rec.oi]=rec.obj;write(rec.arr);return true;
  }

  var oldConfirm=window.confirmNewRoom||((typeof confirmNewRoom==='function')?confirmNewRoom:null);
  if(typeof oldConfirm==='function'&&!oldConfirm.__roomNomenIsolationV1){
    var wrappedConfirm=function(){
      // Capture catalog before resetAllSilent mutates the active room quantities.
      var catalog=clone(typeof elemItems!=='undefined'?elemItems:window.elemItems||[]);
      var groups=clone(typeof elemGroups!=='undefined'?elemGroups:window.elemGroups||[]);
      var result=oldConfirm.apply(this,arguments);
      var items=freshItems(catalog);
      installFreshRuntime(items,groups);
      var rec=activeRecord();
      if(rec){
        var st=emptyRoomState(items,groups);
        rec.room.elemItems=clone(items);rec.room.elemGroups=clone(groups);rec.room.state=JSON.stringify(st);
        rec.obj.rooms[rec.ri]=rec.room;rec.arr[rec.oi]=rec.obj;write(rec.arr);
      }
      try{if(typeof saveState==='function')saveState();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      return result;
    };
    wrappedConfirm.__roomNomenIsolationV1=true;
    window.confirmNewRoom=wrappedConfirm;try{confirmNewRoom=wrappedConfirm;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  var oldLoad=window._loadRoomToCanvas||((typeof _loadRoomToCanvas==='function')?_loadRoomToCanvas:null);
  if(typeof oldLoad==='function'&&!oldLoad.__roomNomenIsolationV1){
    var wrappedLoad=function(obj,roomIdx){
      // Keep a clean catalog fallback before old loader calls resetAllSilent().
      var fallbackItems=clone(typeof elemItems!=='undefined'?elemItems:window.elemItems||[]);
      var fallbackGroups=clone(typeof elemGroups!=='undefined'?elemGroups:window.elemGroups||[]);
      var result=oldLoad.apply(this,arguments);
      var room=obj&&Array.isArray(obj.rooms)?obj.rooms[roomIdx]:null;
      var st=room?parseState(room.state):{};
      var roomItems=Array.isArray(st.elemItems)&&st.elemItems.length?st.elemItems:(room&&Array.isArray(room.elemItems)&&room.elemItems.length?room.elemItems:null);
      var roomGroups=Array.isArray(st.elemGroups)&&st.elemGroups.length?st.elemGroups:(room&&Array.isArray(room.elemGroups)&&room.elemGroups.length?room.elemGroups:fallbackGroups);
      if(roomItems){
        try{elemItems=clone(roomItems);window.elemItems=elemItems;}catch(_){window.elemItems=clone(roomItems);}
      }else{
        installFreshRuntime(fallbackItems,roomGroups);
        if(room){
          var created=freshItems(fallbackItems);st=Object.assign(emptyRoomState(created,roomGroups),st||{});st.elemItems=clone(created);st.elemGroups=clone(roomGroups);
          room.elemItems=clone(created);room.elemGroups=clone(roomGroups);room.state=JSON.stringify(st);
        }
      }
      try{elemGroups=clone(roomGroups||[]);window.elemGroups=elemGroups;}catch(_){window.elemGroups=clone(roomGroups||[]);}
      try{if(typeof updateElemBadge==='function')updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      return result;
    };
    wrappedLoad.__roomNomenIsolationV1=true;
    window._loadRoomToCanvas=wrappedLoad;try{_loadRoomToCanvas=wrappedLoad;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  // Save explicit room-local copies whenever the room is saved.
  var oldSaveRoom=window.saveCurrentRoom;
  if(typeof oldSaveRoom==='function'&&!oldSaveRoom.__roomNomenIsolationV1){
    var wrappedSaveRoom=async function(){persistActiveRuntime();return await oldSaveRoom.apply(this,arguments);};
    wrappedSaveRoom.__roomNomenIsolationV1=true;window.saveCurrentRoom=wrappedSaveRoom;try{saveCurrentRoom=wrappedSaveRoom;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
})();
