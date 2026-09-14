
(function(){
  'use strict';
  if(window.__A·CEILMultiRoomLifecycleV31) return;
  window.__A·CEILMultiRoomLifecycleV31 = true;

  function clone(v){ try{return JSON.parse(JSON.stringify(v));}catch(_){return v;} }
  function parse(v){ try{return typeof v==='string'?JSON.parse(v||'{}'):(v&&typeof v==='object'?v:{});}catch(_){return{};} }
  function list(){ try{return window.A·CEIL.ProjectRepository.list();}catch(_){return[];} }
  function write(arr){ return window.A·CEIL.ProjectRepository.replaceAll(arr); }
  function match(p,id){ return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&String(v)===String(id);}); }
  function roomId(room){
    if(!room) return '';
    if(!room.id) room.id='room_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    return String(room.id);
  }
  function syncStateRooms(obj){
    var s=parse(obj.state);
    s.schemaVersion=window.A·CEILProjectSchema?window.A·CEILProjectSchema.CURRENT_VERSION:3;
    s.projectType='apartment'; s.multiRoom=true; s.rooms=clone(Array.isArray(obj.rooms)?obj.rooms:[]);
    obj.state=JSON.stringify(s);
  }
  function normalizeObject(obj){
    if(!obj) return obj;
    var s=parse(obj.state);
    if(!Array.isArray(obj.rooms)&&Array.isArray(s.rooms)) obj.rooms=clone(s.rooms);
    if(!Array.isArray(obj.rooms)) obj.rooms=[];
    obj.rooms.forEach(roomId);
    syncStateRooms(obj);
    return obj;
  }
  function currentCanvasState(){
    return {
      schemaVersion:window.A·CEILProjectSchema?window.A·CEILProjectSchema.CURRENT_VERSION:3,
      projectType:'room',
      pts:clone(typeof pts!=='undefined'?pts:[]),
      lengths:clone(typeof lengths!=='undefined'?lengths:[]),
      realPts:clone(typeof realPts!=='undefined'?realPts:[]),
      closed:typeof closed!=='undefined'?!!closed:false,
      diagonals:clone(typeof diagonals!=='undefined'?diagonals:[]),
      circleMode:typeof circleMode!=='undefined'?!!circleMode:false,
      circleDiamCm:typeof circleDiamCm!=='undefined'?circleDiamCm:0,
      diagonalOverrides:clone(typeof diagonalOverrides!=='undefined'?diagonalOverrides:{}),
      notes:clone(typeof notes!=='undefined'?notes:[]),
      elemItems:clone(typeof elemItems!=='undefined'?elemItems:[]),
      elemGroups:clone(typeof elemGroups!=='undefined'?elemGroups:[]),
      lightMarks:clone(typeof lightMarks!=='undefined'?lightMarks:[]),
      wallMarks:clone(typeof wallMarks!=='undefined'?wallMarks:[]),linearElements:clone(typeof linearElements!=='undefined'?linearElements:[]),wallTypes:clone(typeof wallTypes!=='undefined'?wallTypes:[]),arcPoints:clone(typeof arcPoints!=='undefined'?arcPoints:[])
    };
  }
  function resolveActive(arr){
    var objectId=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
    var oi=arr.findIndex(function(p){return match(p,objectId);});
    if(oi<0) return null;
    var obj=normalizeObject(arr[oi]);
    var rid=window._activeRoomId||'';
    var ri=rid?obj.rooms.findIndex(function(r){return String(r&&r.id)===String(rid);}):-1;
    if(ri<0&&typeof _activeRoomIdx!=='undefined'&&Number.isInteger(_activeRoomIdx)&&_activeRoomIdx>=0&&_activeRoomIdx<obj.rooms.length) ri=_activeRoomIdx;
    if(ri<0||!obj.rooms[ri]) return {arr:arr,oi:oi,obj:obj,ri:-1,room:null};
    roomId(obj.rooms[ri]);
    return {arr:arr,oi:oi,obj:obj,ri:ri,room:obj.rooms[ri]};
  }
  function buildLocalCommit(showMessage){
    if(window.__A·CEILReportRendering||window.__A·CEILSessionSwitching) return null;
    var arr=list(), rec=resolveActive(arr);
    if(!rec||!rec.room){
      if(showMessage&&typeof showToast==='function') showToast('⚠️ Активну кімнату не знайдено. Дані не перезаписано.');
      return null;
    }
    var expectedObject=String(typeof _activeObjectId!=='undefined'?_activeObjectId:'');
    var expectedRoom=roomId(rec.room);
    if(window._activeRoomId&&String(window._activeRoomId)!==expectedRoom) return null;
    var st=currentCanvasState();
    rec.room.thumb=typeof getCanvasThumb==='function'?getCanvasThumb(.4):(rec.room.thumb||'');
    rec.room.area=document.getElementById('area')?.textContent||'';
    rec.room.per=document.getElementById('per')?.textContent||'';
    rec.room.inC=document.getElementById('inCorners')?.textContent||'';
    rec.room.outC=document.getElementById('outCorners')?.textContent||'';
    rec.room.state=JSON.stringify(st);
    rec.obj.projectType='apartment'; rec.obj.multiRoom=true;
    rec.obj.thumb=rec.room.thumb||rec.obj.thumb||'';
    rec.obj._roomRevision=Date.now(); rec.obj._localUpdatedAt=Date.now(); rec.obj._dirty=true;
    rec.obj._syncStatus=rec.obj._dbId?'pending_update':'pending_create';
    syncStateRooms(rec.obj);
    rec.arr[rec.oi]=rec.obj;
    window._activeRoomId=expectedRoom;
    try{ _activeRoomIdx=rec.ri; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    if(String(typeof _activeObjectId!=='undefined'?_activeObjectId:'')!==expectedObject) return null;
    return {project:clone(rec.obj),projects:rec.arr,roomId:expectedRoom};
  }
  function commitLocal(showMessage){
    var prepared=buildLocalCommit(showMessage);
    if(!prepared) return null;
    write(prepared.projects);
    return prepared.project;
  }

  window.saveCurrentRoom=async function(options){
    options=options||{};
    var current=list();
    var prepared=buildLocalCommit(!options.silent);
    if(!prepared) return false;

    /* Джерело істини — фактичний локальний запис.
       Раніше кімната вже була у Repository, але SafeSave/backup міг повернути false,
       тому UI помилково писав "Кімнату не збережено" і блокував збереження проєкту. */
    var localSaved=write(prepared.projects);
    if(!localSaved){
      try{window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.error('room_local_save_failed',{projectId:prepared.project.id||prepared.project._dbId||null,roomId:prepared.roomId});}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      if(!options.silent&&typeof showToast==='function') showToast('⚠️ Кімнату не збережено');
      return false;
    }

    /* Backup/SafeSave — додатковий захист, але його збій не скасовує вже успішний локальний запис. */
    try{
      var persistence=window.A·CEIL&&window.A·CEIL.ProjectPersistence;
      if(persistence&&typeof persistence.saveProjects==='function'){
        var result=await persistence.saveProjects(prepared.projects,{
          currentProjects:current,
          reason:'save_current_room',
          projectId:prepared.project.id||prepared.project._dbId||null,
          roomId:prepared.roomId,
          allowWriteWithoutBackup:true
        });
        if(!result||result.ok===false){
          try{window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.warn('room_backup_save_warning',{result:result,projectId:prepared.project.id||prepared.project._dbId||null,roomId:prepared.roomId});}catch(_){window.__diagSilent&&window.__diagSilent(_)}
        }
      }
    }catch(e){
      try{window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.warn('room_backup_save_exception',{message:String(e&&e.message||e),projectId:prepared.project.id||prepared.project._dbId||null,roomId:prepared.roomId});}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    }

    if(!options.skipCloud){
      try{ if(typeof window._updateObjectInCloud==='function') await window._updateObjectInCloud(prepared.project); }
      catch(e){try{window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.warn('cloud_update_failed_saveroom',{message:String(e&&e.message||e),projectId:prepared.project&&(prepared.project.id||prepared.project._dbId)||null,roomIdx:'undefined'!=typeof _activeRoomIdx?_activeRoomIdx:null,source:'saveCurrentRoom',operation:'update'});}catch(_){window.__diagSilent&&window.__diagSilent(_)}}
    }
    try{ if(typeof _renderRoomTabsAboveCanvas==='function') _renderRoomTabsAboveCanvas(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    if(!options.silent&&typeof showToast==='function') showToast('✓ Кімнату збережено');
    return true;
  };
  try{saveCurrentRoom=window.saveCurrentRoom;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  // Видалення конкретної кімнати. Успадковує ті самі примітиви, що й saveCurrentRoom:
  // match() (id/_dbId/_localId), syncStateRooms() (дзеркало state.rooms), dirty-маркери, write().
  // Legacy-версія з раннього блоку цього не робила — звідси тихі відмови й «воскресіння» кімнат.
  window.deleteRoom=function(roomIdx,btn){
    var run=function(){
      var arr=list();
      var objectId=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
      var oi=arr.findIndex(function(p){ return match(p,objectId); });
      if(oi<0){ if(typeof showToast==='function') showToast('⚠️ Обʼєкт не знайдено'); return; }
      var obj=normalizeObject(arr[oi]);
      var room=obj.rooms&&obj.rooms[roomIdx];
      if(!room){ if(typeof showToast==='function') showToast('⚠️ Кімнату не знайдено'); return; }
      var removedId=roomId(room), removedName=room.name||'Кімната';
      var wasActive=String(window._activeRoomId||'')===String(removedId);
      obj.rooms.splice(roomIdx,1);
      obj._roomRevision=Date.now(); obj._localUpdatedAt=Date.now(); obj._dirty=true;
      obj._syncStatus=obj._dbId?'pending_update':'pending_create';
      syncStateRooms(obj);
      arr[oi]=obj; write(arr);
      // Вказівник на активну кімнату: видалену — скинути, інакше перерахувати індекс за стабільним id.
      if(wasActive){
        window._activeRoomId=null;
        try{ _activeRoomIdx=null; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        // Полотно показує вже неіснуючу кімнату — переходимо на сусідню.
        // _commitRoomToObject усередині _switchToRoomTab викликає commitLocal(false) (мовчазний)
        // і без активної кімнати нічого не перезаписує.
        if(obj.rooms.length){
          try{ if(typeof _switchToRoomTab==='function') _switchToRoomTab(Math.max(0,roomIdx-1)); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        }
      }else{
        var ri=obj.rooms.findIndex(function(r){ return String(r&&r.id)===String(window._activeRoomId||''); });
        try{ _activeRoomIdx=ri>=0?ri:null; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
      }
      // Хмару не чекаємо — інакше UI блокується мережею.
      try{
        if(typeof window._updateObjectInCloud==='function'){
          Promise.resolve(window._updateObjectInCloud(clone(obj))).catch(function(e){
            try{
              if(window.A·CEIL&&window.A·CEIL.DebugLog){
                window.A·CEIL.DebugLog.warn('cloud_update_failed_deleteroom',{
                  projectId:obj&&(obj.id||obj._dbId)||null,
                  roomId:removedId,
                  message:e&&e.message?e.message:String(e),
                  source:'deleteRoom',
                  operation:'update'
                });
              }
            }catch(_){window.__diagSilent&&window.__diagSilent(_)}
          });
        }
      }catch(_){window.__diagSilent&&window.__diagSilent(_)}
      try{ if(typeof _renderRoomTabsAboveCanvas==='function') _renderRoomTabsAboveCanvas(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
      try{ if(typeof renderObjectRooms==='function') renderObjectRooms(clone(obj)); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
      try{if(typeof window.closeA·CEILRoomMenu==='function')window.closeA·CEILRoomMenu();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      if(typeof showToast==='function') showToast('🗑 Кімнату «'+removedName+'» видалено');
    };
    var arr0=list();
    var objectId0=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
    var oi0=arr0.findIndex(function(p){ return match(p,objectId0); });
    var obj0=oi0>=0?normalizeObject(arr0[oi0]):null;
    var room0=obj0&&obj0.rooms&&obj0.rooms[roomIdx];
    var roomName0=(room0&&room0.name)||('Кімната '+(Number(roomIdx)+1));
    if(!room0){ if(typeof showToast==='function') showToast('⚠️ Кімнату не знайдено'); return false; }
    if(!window.confirm('Видалити кімнату «'+roomName0+'»?\n\nЦю дію не можна скасувати.')) return false;
    run();
    return true;
  };
  try{deleteRoom=window.deleteRoom;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  // Видалення кімнати, відкритої на полотні (кнопка у зум-меню).
  window.deleteActiveRoom=function(btn){
    if(typeof _activeObjectId==='undefined'||_activeObjectId===null){
      if(typeof showToast==='function') showToast('⚠️ Це не багатокімнатний обʼєкт');
      return;
    }
    var arr=list();
    var oi=arr.findIndex(function(p){ return match(p,_activeObjectId); });
    if(oi<0){ if(typeof showToast==='function') showToast('⚠️ Обʼєкт не знайдено'); return; }
    var obj=normalizeObject(arr[oi]);
    var rid=String(window._activeRoomId||'');
    var ri=rid?obj.rooms.findIndex(function(r){ return String(r&&r.id)===rid; }):-1;
    if(ri<0&&typeof _activeRoomIdx!=='undefined'&&Number.isInteger(_activeRoomIdx)) ri=_activeRoomIdx;
    if(ri<0||!obj.rooms[ri]){ if(typeof showToast==='function') showToast('⚠️ Активну кімнату не знайдено'); return; }
    window.deleteRoom(ri,btn);
  };
  try{deleteActiveRoom=window.deleteActiveRoom;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  window.A·CEILDeleteCurrentRoom=window.deleteActiveRoom;

  // Кнопка видима лише у багатокімнатному режимі. Синхронізуємо там, де вже
  // перемальовуються вкладки кімнат (це відбувається на кожній зміні складу/активної кімнати).
  function _syncDeleteRoomBtn(){
    var b=document.getElementById('deleteRoomBtn');
    if(!b) return;
    var show=typeof _activeObjectId!=='undefined'&&_activeObjectId!==null;
    var want=show?'':'none';
    if(b.style.display!==want) b.style.display=want;
  }
  var _prevRenderRoomTabs=window._renderRoomTabsAboveCanvas;
  window._renderRoomTabsAboveCanvas=function(){
    try{
      if(typeof _prevRenderRoomTabs==='function') return _prevRenderRoomTabs.apply(this,arguments);
    }finally{ try{ _syncDeleteRoomBtn(); }catch(_){window.__diagSilent&&window.__diagSilent(_)} }
  };
  try{_renderRoomTabsAboveCanvas=window._renderRoomTabsAboveCanvas;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{ _syncDeleteRoomBtn(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}

  // Commit only an existing active room. Never create a room as a side effect of save/switch/report.
  window._commitRoomToObject=function(nameOverride,callback){
    var saved=commitLocal(false);
    if(saved&&nameOverride){
      var arr=list(),rec=resolveActive(arr);
      if(rec&&rec.room){rec.room.name=nameOverride;syncStateRooms(rec.obj);rec.arr[rec.oi]=rec.obj;write(rec.arr);saved=clone(rec.obj);}
    }
    if(saved&&typeof window._updateObjectInCloud==='function') Promise.resolve(window._updateObjectInCloud(saved)).catch(function(e){try{window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.warn("cloud_update_failed_commitroom",{message:String(e&&e.message||e),projectId:saved&&(saved.id||saved._dbId)||null,source:"_commitRoomToObject",operation:"update"})}catch(_e){window.__diagSilent&&window.__diagSilent(_e)}});
    if(typeof callback==='function') callback();
    return !!saved;
  };
  try{_commitRoomToObject=window._commitRoomToObject;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  /* Canonical room creation. This includes the first-room
     persistence behavior that previously lived in a later fix file. */
  function _hasCanvasContent(st){
    return !!(
      (Array.isArray(st.pts)&&st.pts.length>0)||
      (Array.isArray(st.realPts)&&st.realPts.length>0)||
      (st.circleMode&&Number(st.circleDiamCm)>0)||
      (Array.isArray(st.lightMarks)&&st.lightMarks.length>0)||
      (Array.isArray(st.elemItems)&&st.elemItems.length>0)||
      (Array.isArray(st.notes)&&st.notes.length>0)
    );
  }
  function _fillRoomFromCanvas(room,st){
    roomId(room);
    room.name=room.name||'Кімната 1';
    room.thumb=typeof getCanvasThumb==='function'?getCanvasThumb(.4):(room.thumb||'');
    var areaEl=document.getElementById('area'),perEl=document.getElementById('per');
    var inEl=document.getElementById('inCorners'),outEl=document.getElementById('outCorners');
    room.area=areaEl?areaEl.textContent:'';
    room.per=perEl?perEl.textContent:'';
    room.inC=inEl?inEl.textContent:'';
    room.outC=outEl?outEl.textContent:'';
    room.state=JSON.stringify(st);
    room.elemItems=clone(st.elemItems||[]);
    room.elemGroups=clone(st.elemGroups||[]);
    return room;
  }
  window.confirmNewRoom=function(){
    var input=document.getElementById('newRoomName'),name=(input&&input.value||'').trim();
    if(!name){if(typeof showToast==='function')showToast('Введіть назву кімнати');return;}
    var arr=list(),objectId=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
    var oi=arr.findIndex(function(p){return match(p,objectId);});
    if(oi<0){if(typeof showToast==='function')showToast('Помилка: активний обʼєкт не знайдено');return;}
    var obj=normalizeObject(arr[oi]);
    var st=currentCanvasState(),idx=-1,rid=window._activeRoomId||'';
    if(rid)idx=obj.rooms.findIndex(function(r){return String(r&&r.id)===String(rid);});
    if(idx<0&&typeof _activeRoomIdx!=='undefined'&&Number.isInteger(_activeRoomIdx)&&_activeRoomIdx>=0&&_activeRoomIdx<obj.rooms.length)idx=_activeRoomIdx;
    if(idx<0&&obj.rooms.length===1)idx=0;
    if(idx>=0&&obj.rooms[idx]){
      _fillRoomFromCanvas(obj.rooms[idx],st);
    }else if(_hasCanvasContent(st)){
      var first={id:'room_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),name:'Кімната 1',area:'',per:'',inC:'',outC:'',thumb:'',state:null,elemItems:[],elemGroups:[]};
      _fillRoomFromCanvas(first,st);obj.rooms.push(first);idx=obj.rooms.length-1;
    }
    var room={id:'room_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),name:name,area:'',per:'',inC:'',outC:'',thumb:'',state:null,elemItems:[],elemGroups:[]};
    obj.rooms.push(room);obj.projectType='apartment';obj.multiRoom=true;obj._roomRevision=Date.now();obj._localUpdatedAt=Date.now();obj._dirty=true;obj._syncStatus=obj._dbId?'pending_update':'pending_create';
    syncStateRooms(obj);arr[oi]=obj;write(arr);
    try{_activeObjectId=obj.id||obj._dbId||objectId;_activeRoomIdx=obj.rooms.length-1;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    window._activeRoomId=room.id;
    var modal=document.getElementById('newRoomModal');if(modal)modal.style.display='none';
    try{resetAllSilent();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    ['per','area'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='0.00';});
    ['inCorners','outCorners'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='0';});
    try{var tbl=document.getElementById('tbl');if(tbl)tbl.innerHTML='<table><tr><td style="color:#8e8e93;padding:10px;text-align:center;font-size:11px;">Натискайте на екран, щоб ставити кути</td></tr></table>';}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{var dl=document.getElementById('diagList');if(dl)dl.innerHTML='немає';}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof _hideAddRoomBtn==='function')_hideAddRoomBtn();if(typeof draw==='function')draw();if(typeof _renderRoomTabsAboveCanvas==='function')_renderRoomTabsAboveCanvas();if(typeof _showRoomSaveBar==='function')_showRoomSaveBar(name);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    /* Preserve TEST7 behavior: room creation is committed locally first;
       explicit room/project save performs the complete cloud sync. */
    if(typeof showToast==='function')showToast('🚪 '+name+' — першу кімнату збережено');
  };
  try{confirmNewRoom=window.confirmNewRoom;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  function beginSwitch(){
    window.__A·CEILSessionSwitching=true;
    try{clearTimeout(window.__wmCloudTimer3626);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    window._activeRoomId=null;
    try{_activeRoomIdx=null;_activeObjectId=null;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{resetAllSilent();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  function endSwitch(){window.__A·CEILSessionSwitching=false;}

  var oldOpenObject=window.openObjectRooms||((typeof openObjectRooms==='function')?openObjectRooms:null);
  if(typeof oldOpenObject==='function'){
    window.openObjectRooms=async function(id){
      beginSwitch();
      try{return await oldOpenObject.apply(this,arguments);}finally{
        try{
          var arr=list(),obj=arr.find(function(p){return match(p,typeof _activeObjectId!=='undefined'?_activeObjectId:id);});
          if(obj){normalizeObject(obj);var idx=typeof _activeRoomIdx!=='undefined'?_activeRoomIdx:null;if(Number.isInteger(idx)&&obj.rooms[idx])window._activeRoomId=roomId(obj.rooms[idx]);}
        }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        endSwitch();
      }
    };
    try{openObjectRooms=window.openObjectRooms;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  var oldLoadProject=window.loadProject||((typeof loadProject==='function')?loadProject:null);
  if(typeof oldLoadProject==='function'){
    window.loadProject=async function(id){
      beginSwitch();
      try{return await oldLoadProject.apply(this,arguments);}finally{
        try{var arr=list(),obj=arr.find(function(p){return match(p,typeof _activeObjectId!=='undefined'&&_activeObjectId!=null?_activeObjectId:id);});if(obj&&Number.isInteger(_activeRoomIdx)&&obj.rooms?.[_activeRoomIdx])window._activeRoomId=roomId(obj.rooms[_activeRoomIdx]);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
        endSwitch();
      }
    };
    try{loadProject=window.loadProject;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  // NOTE (cleanup audit, safe removal): this used to wrap window.openRoom and
  // window._switchToRoomTab. Both are unconditionally redefined (not wrapped, fully
  // replaced) by A·CEIL-multiroom-identity-fix-v32 immediately below in document order,
  // with nothing in between able to invoke the wrapped versions here, so the wrap was dead
  // on arrival and has been removed. v32's own versions call activeObject()/loadRoom()
  // directly and do not depend on anything this block used to set up.

  // Cloud data must not erase newer/local room arrays.
  var oldMerge=window.A·CEILMergeCloudProjects;
  if(typeof oldMerge==='function'&&!oldMerge.__roomLifecycleV31){
    var wrappedMerge=function(incoming){
      var local=list();
      incoming=(Array.isArray(incoming)?incoming:[]).map(function(remote){
        var lp=local.find(function(p){return match(p,remote&& (remote._dbId??remote.id));});
        if(!lp) return remote;
        normalizeObject(lp); normalizeObject(remote);
        var localRooms=lp.rooms||[],remoteRooms=remote.rooms||[];
        if(localRooms.length>remoteRooms.length||lp._dirty||lp._syncStatus||lp._roomRevision){
          remote=Object.assign({},remote,{rooms:clone(localRooms),_roomRevision:lp._roomRevision||Date.now()});
          syncStateRooms(remote);
        }
        return remote;
      });
      return oldMerge.call(this,incoming);
    };
    wrappedMerge.__roomLifecycleV31=true;
    window.A·CEILMergeCloudProjects=wrappedMerge;
    try{A·CEILMergeCloudProjects=window.A·CEILMergeCloudProjects;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
})();

/* Canonical multiroom identity handling. */
(function(){
  'use strict';
  function list(){ try{return window.A·CEIL.ProjectRepository.list();}catch(_){return [];} }
  function match(p,id){return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&String(v)===String(id);});}
  function ensureRoomId(room){if(!room)return '';if(!room.id)room.id='room_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);return String(room.id);}
  function activeObject(){var id=typeof _activeObjectId!=='undefined'?_activeObjectId:null;return list().find(function(p){return match(p,id);})||null;}
  function loadRoom(obj,index){
    if(!obj||!Array.isArray(obj.rooms)||!obj.rooms[index])return false;
    var room=obj.rooms[index];
    var rid=ensureRoomId(room);
    try{_activeRoomIdx=index;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    window._activeRoomId=rid;
    if(typeof _loadRoomToCanvas==='function'){_loadRoomToCanvas(obj,index);return true;}
    return false;
  }
  function saveCurrentBeforeSwitch(){
    if(window.__A·CEILReportRendering||window.__A·CEILSessionSwitching)return;
    try{if(typeof window._commitRoomToObject==='function')window._commitRoomToObject(null,null);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  window._switchToRoomTab=function(index){
    var obj=activeObject();
    if(!obj||!Array.isArray(obj.rooms)||!obj.rooms[index])return false;
    var current=typeof _activeRoomIdx!=='undefined'?_activeRoomIdx:null;
    if(index===current){window._activeRoomId=ensureRoomId(obj.rooms[index]);return true;}
    saveCurrentBeforeSwitch();
    obj=activeObject();
    if(!obj||!obj.rooms||!obj.rooms[index])return false;
    return loadRoom(obj,index);
  };
  try{_switchToRoomTab=window._switchToRoomTab;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  window.openRoom=function(index){
    var obj=activeObject();
    if(!obj||!Array.isArray(obj.rooms)||!obj.rooms[index])return false;
    var current=typeof _activeRoomIdx!=='undefined'?_activeRoomIdx:null;
    if(Number.isInteger(current)&&current!==index)saveCurrentBeforeSwitch();
    obj=activeObject();
    return loadRoom(obj,index);
  };
  try{openRoom=window.openRoom;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  window.A·CEILMultiRoomAudit=function(projectId){
    var obj=list().find(function(p){return match(p,projectId!=null?projectId:(typeof _activeObjectId!=='undefined'?_activeObjectId:null));});
    if(!obj||!Array.isArray(obj.rooms))return {ok:false,reason:'object_not_found',duplicates:[]};
    var groups={},duplicates=[];
    obj.rooms.forEach(function(r,i){var key=String(r&&r.state||'');if(!key)return;(groups[key]||(groups[key]=[])).push(i);});
    Object.keys(groups).forEach(function(k){if(groups[k].length>1)duplicates.push(groups[k].slice());});
    return {ok:true,roomCount:obj.rooms.length,duplicates:duplicates};
  };
})();
