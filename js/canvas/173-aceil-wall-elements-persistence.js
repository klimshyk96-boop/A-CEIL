(function(){
  "use strict";
  if(window.__A_CEIL_WALL_ELEMENTS_PERSISTENCE_V2)return;
  window.__A_CEIL_WALL_ELEMENTS_PERSISTENCE_V2=true;

  var BACKUP_KEY="aceil_wall_elements_backup_v2";
  var restoring=false;

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
    if(restoring||!hasWallData(snapshot))return;
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
  function backupForProject(project){
    var all=backupRead(),ids=project?[project.id,project._dbId,project._localId]:[];
    for(var i=0;i<ids.length;i++){
      var item=all.projects&&all.projects[key(ids[i])];
      if(item&&hasWallData(item.data))return clone(item.data);
    }
    return null;
  }
  function backupForRoom(project,roomIndex){
    var all=backupRead(),ids=project?[project.id,project._dbId,project._localId]:[];
    for(var i=0;i<ids.length;i++){
      var item=all.rooms&&all.rooms[key(ids[i])+":"+key(roomIndex)];
      if(item&&hasWallData(item.data))return clone(item.data);
    }
    return null;
  }
  function applySnapshot(snapshot){
    if(!snapshot)return;
    restoring=true;
    try{
      wallMarks=clone(snapshot.wallMarks||[]);
      linearElements=clone(snapshot.linearElements||[]);
      wallTypes=clone(snapshot.wallTypes||[]);
      arcPoints=clone(snapshot.arcPoints||[]);
      window.wallMarks=wallMarks;
      if(typeof draw==="function")draw();
    }finally{restoring=false;}
  }
  function redrawLater(snapshot){
    [0,80,240].forEach(function(delay){
      setTimeout(function(){applySnapshot(snapshot);},delay);
    });
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

  function wrapSaveState(){
    var previous=window.saveState||typeof saveState==="function"&&saveState;
    if(typeof previous!=="function"||previous.__wallPersistenceV2)return;
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
    if(typeof previous!=="function"||previous.__wallPersistenceV2)return;
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
  function wrapLoadProject(){
    var previous=window.loadProject||typeof loadProject==="function"&&loadProject;
    if(typeof previous!=="function"||previous.__wallPersistenceV2)return;
    var wrapped=function(id){
      var project=findProject(id),snapshot=project?snapshotFromState(project.state,project):null;
      var result=previous.apply(this,arguments);
      /* Saved project state is authoritative, including an intentionally empty wallMarks array.
         Never resurrect wall elements from a previous backup on load. */
      if(snapshot)redrawLater(snapshot);
      return result;
    };
    wrapped.__wallPersistenceV2=true;
    window.loadProject=wrapped;
    try{loadProject=wrapped;}catch(_){ }
  }
  function wrapLoadRoom(){
    var previous=window._loadRoomToCanvas||typeof _loadRoomToCanvas==="function"&&_loadRoomToCanvas;
    if(typeof previous!=="function"||previous.__wallPersistenceV2)return;
    var wrapped=function(project,roomIndex){
      var room=project&&project.rooms&&project.rooms[roomIndex];
      var snapshot=room?snapshotFromState(room.state,room):null;
      var result=previous.apply(this,arguments);
      /* An empty room is valid state. Do not fall back to stale wall-element backups:
         that was the source of cross-room/project "resurrection" after deletion. */
      if(snapshot)redrawLater(snapshot);
      return result;
    };
    wrapped.__wallPersistenceV2=true;
    window._loadRoomToCanvas=wrapped;
    try{_loadRoomToCanvas=wrapped;}catch(_){ }
  }
  // The lifecycle owns room capture and commits. Keep only the optional backup.
  window.A·CEIL=window.A·CEIL||{};
  window.A·CEIL.WallElementPersistence=Object.freeze({
    backupRoom:function(project,roomId){
      var index=project&&Array.isArray(project.rooms)?project.rooms.findIndex(function(room){return room&&key(room.id)===key(roomId);}):-1;
      if(index<0)return;
      var room=project.rooms[index];
      backupWrite(snapshotFromState(room.state,room),null,project.id,index);
    }
  });

  function init(){wrapSaveState();wrapSaveProject();wrapLoadProject();wrapLoadRoom();}
  init();
  setTimeout(init,100);
  setTimeout(init,700);
})();
