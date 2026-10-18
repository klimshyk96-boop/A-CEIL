
(function(){
  'use strict';
  if(window.__A·CEILMultiroomSaveControllerV1) return;
  window.__A·CEILMultiroomSaveControllerV1 = true;

  var singleRoomOpenSaveProjectModal = typeof window.openSaveProjectModal === 'function' ? window.openSaveProjectModal : null;
  var singleRoomSaveProject = typeof window.saveProject === 'function' ? window.saveProject : null;

  function clone(value){ try{return JSON.parse(JSON.stringify(value));}catch(_){return value;} }
  function projects(){
    try {
      return window.A·CEIL.ProjectRepository ? window.A·CEIL.ProjectRepository.list({clone:true}) : (typeof getProjects === 'function' ? clone(getProjects()) : []);
    } catch(_) { return []; }
  }
  function matches(project,id){
    return !!project && id != null && [project.id,project._dbId,project._localId].some(function(value){
      return value != null && String(value) === String(id);
    });
  }
  function activeObjectRecord(source){
    try {
      if(typeof _activeObjectId === 'undefined' || _activeObjectId == null) return null;
      var list = Array.isArray(source) ? source : projects();
      var index = list.findIndex(function(project){ return matches(project,_activeObjectId); });
      return index >= 0 ? {projects:list,index:index,obj:list[index]} : null;
    } catch(_) { return null; }
  }
  function setCurrentMeta(obj,name,addr,phone,comment){
    try {
      if(typeof _currentProjectId !== 'undefined') _currentProjectId = obj.id || obj._dbId || _currentProjectId;
      if(typeof _currentProjName !== 'undefined') _currentProjName = name;
      if(typeof _currentProjAddr !== 'undefined') _currentProjAddr = addr;
      if(typeof _currentProjPhone !== 'undefined') _currentProjPhone = phone;
      if(typeof _currentProjComment !== 'undefined') _currentProjComment = comment;
    } catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  function showSaveError(result){
    try {
      if(window.A·CEIL && window.A·CEIL.DebugLog) window.A·CEIL.DebugLog.error('project_save_failed',{result:result});
    } catch(_){window.__diagSilent&&window.__diagSilent(_)}
    if(typeof showToast === 'function') showToast('⚠️ Проєкт не збережено');
  }

  window.openSaveProjectModal = function(){
    var rec = activeObjectRecord();
    if(!rec) return singleRoomOpenSaveProjectModal ? singleRoomOpenSaveProjectModal.apply(this,arguments) : undefined;
    if(typeof closed !== 'undefined' && !closed){
      if(typeof showToast === 'function') showToast('Спочатку замкніть контур');
      return;
    }
    var obj=rec.obj||{};
    var fields={name:document.getElementById('projName'),addr:document.getElementById('projAddr'),phone:document.getElementById('projPhone'),comment:document.getElementById('projComment')};
    if(fields.name) fields.name.value=obj.name||'';
    if(fields.addr) fields.addr.value=obj.addr||'';
    if(fields.phone) fields.phone.value=obj.phone||'';
    if(fields.comment) fields.comment.value=obj.comment||'';
    var modal=document.getElementById('saveProjectModal');
    if(modal) modal.classList.add('open');
    setTimeout(function(){ try{if(fields.name) fields.name.focus();}catch(_){window.__diagSilent&&window.__diagSilent(_)} },100);
  };

  window.saveProject = async function(){
    if(!activeObjectRecord()) return singleRoomSaveProject ? singleRoomSaveProject.apply(this,arguments) : undefined;

    var name=(document.getElementById('projName')?.value||'').trim();
    var addr=(document.getElementById('projAddr')?.value||'').trim();
    var phone=(document.getElementById('projPhone')?.value||'').trim();
    var comment=(document.getElementById('projComment')?.value||'').trim();
    if(!name){ if(typeof showToast==='function') showToast('Введіть назву проєкту'); return false; }

    if(typeof window.saveCurrentRoom === 'function'){
      var roomSaved = await window.saveCurrentRoom({silent:true,skipCloud:true});
      if(roomSaved === false){
        if(typeof showToast==='function') showToast('⚠️ Не вдалося зберегти активну кімнату');
        return false;
      }
    }

    var current=projects();
    var rec=activeObjectRecord(current);
    if(!rec) return false;
    var obj=rec.obj;
    obj.name=name; obj.addr=addr; obj.phone=phone; obj.comment=comment;
    obj.projectType='apartment'; obj.multiRoom=true;
    obj.state=typeof apartmentState==='function'?JSON.stringify(apartmentState(obj)):obj.state;
    if(window.__A·CEILLocationDirty){
      var location=clone(window.__A·CEILPendingLocation);
      var stateValue={};
      try{stateValue=typeof obj.state==='string'?JSON.parse(obj.state||'{}'):(obj.state&&typeof obj.state==='object'?clone(obj.state):{});}catch(_){stateValue={};}
      if(location){obj.location=location;stateValue.location=location;}
      else{delete obj.location;delete stateValue.location;}
      obj.state=JSON.stringify(stateValue);
    }
    obj._localUpdatedAt=Date.now(); obj._dirty=true;
    obj._syncStatus=obj._dbId?'pending_update':'pending_create';
    rec.projects[rec.index]=obj;

    var persistence=window.A·CEIL&&window.A·CEIL.ProjectPersistence;
    var result=persistence&&typeof persistence.saveProjects==='function'
      ? await persistence.saveProjects(rec.projects,{currentProjects:current,reason:'save_project_info',projectId:obj.id||obj._dbId||null})
      : {ok:false,reason:'persistence_unavailable'};
    if(!result.ok){ showSaveError(result); return false; }

    var synced=false;
    try { if(typeof window._updateObjectInCloud==='function') synced=await window._updateObjectInCloud(obj); }
    catch(e){ try{window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.warn('cloud_update_failed_saveinfo',{message:String(e&&e.message||e),projectId:obj.id||obj._dbId||null,source:'project-save-controller',operation:'update'});}catch(_){window.__diagSilent&&window.__diagSilent(_)} }

    if(synced){
      var latest=projects(),latestRec=activeObjectRecord(latest);
      if(latestRec){
        delete latestRec.obj._syncStatus; delete latestRec.obj._dirty; delete latestRec.obj._localUpdatedAt;
        latestRec.projects[latestRec.index]=latestRec.obj;
        if(window.A·CEIL.ProjectRepository) window.A·CEIL.ProjectRepository.replaceAll(latestRec.projects);
      }
    }
    if(typeof closeModal==='function') closeModal('saveProjectModal');
    if(typeof showToast==='function') showToast('💾 Багатокімнатний проєкт збережено');
    setCurrentMeta(obj,name,addr,phone,comment);
    return true;
  };

  window.rpcSaveProject = async function(){
    if(activeObjectRecord()){
      /* Не зберігаємо кімнату перед відкриттям форми.
         Раніше silent-save міг повернути false, і кнопка виглядала повністю мертвою.
         Актуальна кімната зберігається один раз — після натискання "✓ Зберегти" у формі. */
      window.openSaveProjectModal();
      return true;
    }
    return singleRoomOpenSaveProjectModal ? singleRoomOpenSaveProjectModal() : false;
  };

  try { openSaveProjectModal=window.openSaveProjectModal; saveProject=window.saveProject; } catch(_){window.__diagSilent&&window.__diagSilent(_)}
})();
