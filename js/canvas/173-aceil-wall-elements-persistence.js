(function(){
  "use strict";
  if(window.__A_CEIL_WALL_ELEMENTS_PERSISTENCE_V2)return;
  window.__A_CEIL_WALL_ELEMENTS_PERSISTENCE_V2=true;

  var BACKUP_KEY="aceil_wall_elements_backup_v2";

  function clone(value){
    try{return JSON.parse(JSON.stringify(value));}
    catch(_){return Array.isArray(value)?value.slice():value;}
  }
  function parse(value){
    try{return typeof value==="string"?JSON.parse(value||"{}"):value&&typeof value==="object"?value:{};}
    catch(_){return {};}
  }
  function key(value){return value==null?"":String(value);}
  function projectList(){
    try{return typeof getProjects==="function"?getProjects():[];}
    catch(_){return [];}
  }
  function findProject(id){
    var wanted=key(id);
    return projectList().find(function(project){
      return project&&[project.id,project._dbId,project._localId].some(function(value){return key(value)===wanted;});
    })||null;
  }
  function currentSnapshot(){
    return {
      wallMarks:clone(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks)?wallMarks:[]),
      linearElements:clone(typeof linearElements!=="undefined"&&Array.isArray(linearElements)?linearElements:[]),
      wallTypes:clone(typeof wallTypes!=="undefined"&&Array.isArray(wallTypes)?wallTypes:[]),
      arcPoints:clone(typeof arcPoints!=="undefined"&&Array.isArray(arcPoints)?arcPoints:[])
    };
  }
  function snapshotFromState(state,topLevel){
    var parsed=parse(state),fallback=topLevel||{};
    return {
      wallMarks:clone(Array.isArray(parsed.wallMarks)?parsed.wallMarks:Array.isArray(fallback.wallMarks)?fallback.wallMarks:[]),
      linearElements:clone(Array.isArray(parsed.linearElements)?parsed.linearElements:[]),
      wallTypes:clone(Array.isArray(parsed.wallTypes)?parsed.wallTypes:[]),
      arcPoints:clone(Array.isArray(parsed.arcPoints)?parsed.arcPoints:[])
    };
  }
  function hasWallData(snapshot){
    return !!(snapshot&&((snapshot.wallMarks&&snapshot.wallMarks.length)||(snapshot.linearElements&&snapshot.linearElements.length)));
  }
  function backupRead(){
    try{return parse(localStorage.getItem(BACKUP_KEY));}
    catch(_){return {};}
  }
  function backupWrite(snapshot,projectId,objectId,roomIndex){
    if(!hasWallData(snapshot))return;
    try{
      var all=backupRead();
      all.projects=all.projects||{};
      all.rooms=all.rooms||{};
      all.last={savedAt:Date.now(),data:clone(snapshot)};
      if(projectId!=null)all.projects[key(projectId)]={savedAt:Date.now(),data:clone(snapshot)};
      if(objectId!=null&&roomIndex!=null)all.rooms[key(objectId)+":"+key(roomIndex)]={savedAt:Date.now(),data:clone(snapshot)};
      localStorage.setItem(BACKUP_KEY,JSON.stringify(all));
    }catch(_){ }
  }
  function patchState(target,snapshot){
    if(!target||!snapshot)return;
    var state=parse(target.state);
    state.wallMarks=clone(snapshot.wallMarks||[]);
    state.linearElements=clone(snapshot.linearElements||[]);
    state.wallTypes=clone(snapshot.wallTypes||[]);
    state.arcPoints=clone(snapshot.arcPoints||[]);
    target.state=JSON.stringify(state);
    target.wallMarks=clone(snapshot.wallMarks||[]);
  }

  var saveStateInstalled=false,saveProjectInstalled=false;
  function wrapSaveState(){
    var previous=window.saveState||typeof saveState==="function"&&saveState;
    if(typeof previous!=="function"||saveStateInstalled)return;
    saveStateInstalled=true;
    var wrapped=function(){
      var result=previous.apply(this,arguments),snapshot=currentSnapshot();
      var projectId=typeof _currentProjectId!=="undefined"?_currentProjectId:null;
      var objectId=typeof _activeObjectId!=="undefined"?_activeObjectId:null;
      var roomIndex=typeof _activeRoomIdx!=="undefined"?_activeRoomIdx:null;
      backupWrite(snapshot,projectId,objectId,roomIndex);
      return result;
    };
    wrapped.__wallPersistenceV2=true;
    window.saveState=wrapped;
    try{saveState=wrapped;}catch(_){ }
  }
  function wrapSaveProject(){
    var previous=window.saveProject||typeof saveProject==="function"&&saveProject;
    if(typeof previous!=="function"||saveProjectInstalled)return;
    saveProjectInstalled=true;
    var wrapped=function(){
      var snapshot=currentSnapshot();
      var beforeId=typeof _currentProjectId!=="undefined"?_currentProjectId:null;
      var storage=window.A_CEIL_UserStorage,owner=storage?storage.getUserId():'';
      var objectId=typeof _activeObjectId!=="undefined"?_activeObjectId:null;
      var roomIndex=typeof _activeRoomIdx!=="undefined"?_activeRoomIdx:null;
      backupWrite(snapshot,beforeId,null,null);
      var result=previous.apply(this,arguments);
      Promise.resolve(result).then(function(saved){
        if(saved===false||(storage&&storage.getUserId()!==owner))return;
        var afterId=typeof _currentProjectId!=="undefined"?_currentProjectId:beforeId;
        var original=findProject(beforeId);
        if(beforeId!=null&&(!original||![original.id,original._dbId,original._localId].some(function(id){return id!=null&&key(id)===key(afterId);})))return;
        if((typeof _activeObjectId!=="undefined"?_activeObjectId:null)!==objectId
          ||(typeof _activeRoomIdx!=="undefined"?_activeRoomIdx:null)!==roomIndex
          ||JSON.stringify(currentSnapshot())!==JSON.stringify(snapshot))return;
        backupWrite(snapshot,afterId,null,null);
        var project=findProject(afterId||beforeId);
        if(project){
          patchState(project,snapshot);
          try{setProjects(projectList());}catch(_){ }
        }
      });
      return result;
    };
    wrapped.__wallPersistenceV2=true;
    window.saveProject=wrapped;
    try{saveProject=wrapped;}catch(_){ }
  }
  // Lifecycle owns capture/commits; loaders call restoration directly.
  window.A·CEIL=window.A·CEIL||{};
  window.A·CEIL.WallElementPersistence=Object.freeze({
    // Restore once, before the owner's first draw/save. Empty arrays are authoritative.
    restoreCanvasState:function(target){
      var snapshot=snapshotFromState(target&&target.state,target);
      wallMarks=clone(snapshot.wallMarks);window.wallMarks=wallMarks;
      var lines=window.A·CEIL&&window.A·CEIL.LinearPersistence;
      if(lines)lines.restore(snapshot.linearElements);
      else linearElements=clone(snapshot.linearElements);
      wallTypes=clone(snapshot.wallTypes);arcPoints=clone(snapshot.arcPoints);
    },
    backupRoom:function(project,roomId){
      var index=project&&Array.isArray(project.rooms)?project.rooms.findIndex(function(room){return room&&key(room.id)===key(roomId);}):-1;
      if(index<0)return;
      var room=project.rooms[index];
      backupWrite(snapshotFromState(room.state,room),null,project.id,index);
    }
  });

  function init(){wrapSaveState();wrapSaveProject();}
  init();
  setTimeout(init,100);
  setTimeout(init,700);
})();
