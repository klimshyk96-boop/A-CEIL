
(function(){
  'use strict';
  window.A·CEIL = window.A·CEIL || {};
  window.A·CEIL.VERSION = '20261027-report-safari-sync8';
  const reportNonFatal = (error, operation) => {
    try{
      if(typeof window.__diagSilent==='function')window.__diagSilent(error,operation||'project-repository');
      else if(window.console&&typeof window.console.warn==='function')console.warn('[A·CEIL] '+(operation||'project-repository'),error);
    }catch(_){}
  };

  /* Shared localStorage quota handling for the project repository and saves. */
  if(!window.A·CEIL.StorageRepair){
    const quotaError = error => !!error && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 || error.code === 1014
    );
    const keyBytes = () => {
      const out={};
      try{
        for(let i=0;i<localStorage.length;i++){
          const key=localStorage.key(i);
          if(key!=null)out[key]=2*(String(key).length+String(localStorage.getItem(key)||'').length);
        }
      }catch(_){reportNonFatal(_)}
      return out;
    };
    const storageBytes = () => Object.values(keyBytes()).reduce((sum,size)=>sum+size,0);
    const diagnosticKeys = ['A·CEIL_debug_errors_v2','A·CEIL_debug_log','A·CEIL_diag_silent_v1'];
    /* The cloud-first snapshot duplicates current canvas/project state. Recovery
       drafts are intentionally not removed here: they may be the only copy of
       work made immediately before Safari terminated the page. */
    const duplicateCacheKeys = ['A·CEIL_cloud_cache_v330'];
    const stripThumbs = value => {
      const seen=new WeakSet();
      const walk=(input,parentKey) => {
        if(typeof input==='string' && parentKey==='state' && input.length>1000 && /^[\s]*[\[{]/.test(input)){
          try{return JSON.stringify(walk(JSON.parse(input),''));}catch(_){return input;}
        }
        if(!input || typeof input!=='object')return input;
        if(seen.has(input))return null;
        seen.add(input);
        if(Array.isArray(input))return input.map(item=>walk(item,''));
        const out={};
        Object.keys(input).forEach(key=>{
          const val=input[key];
          if(/^(thumb|thumbnail|preview|previewImage|canvasPreview|snapshotImage)$/i.test(key) &&
             (typeof val!=='string' || val.length>512 || /^data:image|^blob:/i.test(val)))return;
          out[key]=walk(val,key);
        });
        return out;
      };
      return walk(value,'');
    };
    const trimJsonArray = (key,limit) => {
      try{
        const value=JSON.parse(localStorage.getItem(key)||'[]');
        if(Array.isArray(value)&&value.length>limit)localStorage.setItem(key,JSON.stringify(value.slice(-limit)));
      }catch(_){reportNonFatal(_)}
    };
    const trimDiagnostics = limit => {
      const n=Math.max(0,Number(limit)||8);
      trimJsonArray('A·CEIL_debug_errors_v2',n);
      trimJsonArray('A·CEIL_debug_log',n);
      trimJsonArray('A·CEIL_diag_silent_v1',n);
    };
    const freeSpace = options => {
      const before=storageBytes(),aggressive=!!(options&&options.aggressive),force=!!(options&&options.force),removed=[];
      if(!force && before<2300000)return {beforeBytes:before,afterBytes:before,removed:removed};
      try{
        try{const sc=window.A·CEIL&&window.A·CEIL.StorageCleanup;if(sc){if(typeof sc.removeDeadCache==='function')sc.removeDeadCache();if(typeof sc.cleanLegacy==='function')sc.cleanLegacy();}}catch(_){reportNonFatal(_)}
        duplicateCacheKeys.forEach(key=>{
          if(localStorage.getItem(key)!=null){localStorage.removeItem(key);removed.push(key);}
        });
        if(aggressive)trimDiagnostics(8);
        if(force && storageBytes()>4200000)diagnosticKeys.forEach(key=>{
          if(localStorage.getItem(key)!=null){localStorage.removeItem(key);removed.push(key);}
        });
      }catch(_){reportNonFatal(_)}
      return {beforeBytes:before,afterBytes:storageBytes(),removed:removed};
    };
    let lastError=null;
    const retrySetItem = (key,value) => {
      try{localStorage.setItem(key,value);lastError=null;return true;}
      catch(error){
        lastError=error;
        if(!quotaError(error))return false;
        freeSpace({aggressive:true,force:true});
        try{localStorage.setItem(key,value);lastError=null;return true;}
        catch(second){lastError=second;return false;}
      }
    };
    window.A·CEIL.StorageRepair=Object.freeze({
      keyBytes:keyBytes,storageBytes:storageBytes,stripThumbs:stripThumbs,
      trimDiagnostics:trimDiagnostics,freeSpace:freeSpace,retrySetItem:retrySetItem,
      isQuotaError:quotaError,lastError:()=>lastError
    });
  }

  const STORAGE_KEY = 'ceiling_projects';
  const CACHE_LIMIT = 4; /* Менший Safari-safe офлайн-кеш останніх хмарних проєктів. */
  const schema = window.A·CEILProjectSchema || null;
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const normalize = projects => schema && typeof schema.migrateProjects === 'function'
    ? schema.migrateProjects(projects)
    : (Array.isArray(projects) ? projects.filter(isObject) : []);
  const clone = value => schema && typeof schema.clone === 'function'
    ? schema.clone(value)
    : JSON.parse(JSON.stringify(value));

  let memoryCache = null;
  let memoryUserId = '';
  let lastReadMeta={state:'unknown',at:0};
  const SAFETY_DB='aceil-project-safety-v1';
  const SAFETY_STORE='snapshots';
  const SAFETY_TTL=30*24*60*60*1000;
  let safetyDbPromise=null,safetyTimer=null,safetyPending=null,safetyChain=Promise.resolve();
  let recentlyRemoved=[];

  function safetyUser(){return currentStorageUser()||'guest';}
  function safetyHash(text){
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16)+':'+text.length;
  }
  function openSafetyDb(){
    if(safetyDbPromise)return safetyDbPromise;
    if(!window.indexedDB)return Promise.resolve(null);
    safetyDbPromise=new Promise((resolve,reject)=>{
      const request=window.indexedDB.open(SAFETY_DB,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(SAFETY_STORE))db.createObjectStore(SAFETY_STORE,{keyPath:'key'});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('indexeddb_open_failed'));
      request.onblocked=()=>reject(new Error('indexeddb_blocked'));
    }).catch(error=>{reportNonFatal(error,'safety-db-open');return null;});
    return safetyDbPromise;
  }
  async function safetyGet(key){
    const db=await openSafetyDb();if(!db)return null;
    return new Promise(resolve=>{
      try{const request=db.transaction(SAFETY_STORE,'readonly').objectStore(SAFETY_STORE).get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>resolve(null);}
      catch(error){reportNonFatal(error,'safety-db-read');resolve(null);}
    });
  }
  async function safetyPut(value){
    const db=await openSafetyDb();if(!db)return false;
    return new Promise(resolve=>{
      try{const tx=db.transaction(SAFETY_STORE,'readwrite');tx.objectStore(SAFETY_STORE).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);}
      catch(error){reportNonFatal(error,'safety-db-write');resolve(false);}
    });
  }
  function safeSnapshotProjects(projects){return normalize(projects).map(stripLocalHeavyData);}
  function commitSafetySnapshot(payload){
    safetyChain=safetyChain.then(async()=>{
      const projects=safeSnapshotProjects(payload.projects),serialized=JSON.stringify(projects),hash=safetyHash(serialized);
      const key=payload.user+':current',current=await safetyGet(key);
      if(current&&current.hash===hash)return true;
      if(current)await safetyPut(Object.assign({},current,{key:payload.user+':previous',rotatedAt:Date.now()}));
      return safetyPut({key:key,user:payload.user,at:Date.now(),reason:payload.reason||'replace',hash:hash,projects:projects});
    }).catch(error=>{reportNonFatal(error,'safety-snapshot');return false;});
    return safetyChain;
  }
  function queueSafetySnapshot(projects,reason,immediate){
    safetyPending={user:safetyUser(),projects:clone(Array.isArray(projects)?projects:[]),reason:reason||'replace'};
    if(safetyTimer){clearTimeout(safetyTimer);safetyTimer=null;}
    if(immediate){const next=safetyPending;safetyPending=null;return commitSafetySnapshot(next);}
    safetyTimer=setTimeout(()=>{safetyTimer=null;const next=safetyPending;safetyPending=null;if(next)commitSafetySnapshot(next);},180);
    return Promise.resolve(true);
  }
  function flushSafetySnapshot(){
    if(safetyTimer){clearTimeout(safetyTimer);safetyTimer=null;}
    const next=safetyPending;safetyPending=null;
    return next?commitSafetySnapshot(next):safetyChain;
  }
  function stashRemoved(projects,reason){
    const removed=clone(Array.isArray(projects)?projects:[]).map(stripLocalHeavyData);
    if(!removed.length)return Promise.resolve(false);
    const user=safetyUser(),key=user+':trash';
    safetyChain=safetyChain.then(async()=>{
      const old=await safetyGet(key),now=Date.now(),entries=old&&Array.isArray(old.entries)?old.entries.filter(x=>x&&x.deletedAt>now-SAFETY_TTL):[];
      removed.forEach(project=>{
        const ids=projectKeys(project),index=entries.findIndex(row=>row&&row.project&&projectKeys(row.project).some(id=>ids.includes(id)));
        const row={deletedAt:now,expiresAt:now+SAFETY_TTL,reason:reason||'removed',project:project};
        if(index>=0)entries[index]=row;else entries.unshift(row);
      });
      return safetyPut({key:key,user:user,at:now,entries:entries.slice(0,50)});
    }).catch(error=>{reportNonFatal(error,'safety-trash');return false;});
    return safetyChain;
  }

  function currentStorageUser(){
    try{return window.A_CEIL_UserStorage?String(window.A_CEIL_UserStorage.getUserId()||''):'';}catch(_){return '';}
  }

  const projectKeys = project => {
    const keys = [];
    if(!isObject(project)) return keys;
    if(project.id != null) keys.push(String(project.id));
    if(project._dbId != null) keys.push(String(project._dbId));
    if(project._localId != null) keys.push(String(project._localId));
    return keys;
  };
  const sameProject = (a,b) => {
    const bKeys = new Set(projectKeys(b));
    return projectKeys(a).some(key => bKeys.has(key));
  };
  function activeIds(){
    const ids=[];
    try{if(typeof _activeObjectId!=='undefined'&&_activeObjectId!=null)ids.push(String(_activeObjectId));}catch(_){reportNonFatal(_)}
    try{if(typeof _currentProjectId!=='undefined'&&_currentProjectId!=null)ids.push(String(_currentProjectId));}catch(_){reportNonFatal(_)}
    return ids;
  }
  function isUnsynced(project){
    if(!project)return false;
    const id=String(project.id||project._localId||'');
    const st=String(project._syncStatus||'');
    return !!(
      project._dirty ||
      project._localUpdatedAt ||
      st.startsWith('pending') ||
      st.startsWith('error') ||
      st.startsWith('failed') ||
      id.startsWith('local_') ||
      id.startsWith('obj_') ||
      (!project._dbId && id && !id.includes('-'))
    );
  }
  function stripLocalHeavyData(project){
    let p=clone(project);
    try{
      const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
      if(repair&&typeof repair.stripThumbs==='function')p=repair.stripThumbs(p);
    }catch(_){reportNonFatal(_)}
    if(Array.isArray(p.rooms)){
      p.rooms.forEach(room=>{
        if(!room||typeof room!=='object')return;
        /* state already contains these; duplicate copies only waste Safari localStorage. */
        delete room.elemItems;
        delete room.elemGroups;
      });
    }
    /* Apartment state can mirror the whole rooms[] array. Keep rooms[] as local authority,
       but remove only that duplicate mirror from the persisted cache. */
    if(Array.isArray(p.rooms)&&p.state){
      try{
        const st=typeof p.state==='string'?JSON.parse(p.state):clone(p.state);
        if(st&&typeof st==='object'&&Array.isArray(st.rooms)){
          delete st.rooms;
          p.state=typeof p.state==='string'?JSON.stringify(st):st;
        }
      }catch(_){reportNonFatal(_)}
    }
    return p;
  }
  function persistentSubset(projects,syncedLimit){
    const src=Array.isArray(projects)?projects:[];
    const limit=Number.isFinite(syncedLimit)?Math.max(0,syncedLimit):CACHE_LIMIT;
    const chosen=[],seen=new Set();
    function add(p){
      if(!p)return;
      const keys=projectKeys(p);
      const key=keys[0]||('idx_'+src.indexOf(p));
      if(seen.has(key))return;
      seen.add(key);chosen.push(p);
    }

    /* Never discard anything that may not yet exist in Supabase. */
    src.filter(isUnsynced).forEach(add);

    /* Keep the currently opened project even if it is old. */
    const act=new Set(activeIds());
    src.forEach(p=>{if(projectKeys(p).some(k=>act.has(k)))add(p);});

    /* Synced cloud projects are only a cache: keep the most recent few. */
    let syncedAdded=0;
    src.forEach(p=>{
      if(isUnsynced(p))return;
      const was=chosen.length;
      if(syncedAdded<limit)add(p);
      if(chosen.length>was)syncedAdded++;
    });
    return chosen.map(stripLocalHeavyData);
  }
  function recoveryRaw(){
    try{
      const backup=JSON.parse(localStorage.getItem('aceil_project_recovery')||'null');
      return backup&&Array.isArray(backup.projects)?backup.projects:[];
    }catch(_){return [];}
  }
  function readRaw(){
    let raw=null;
    try{raw=localStorage.getItem(STORAGE_KEY);}catch(error){lastReadMeta={state:'unavailable',at:Date.now(),error:String(error&&error.message||error)};return recoveryRaw();}
    if(raw==null){const recovered=recoveryRaw();lastReadMeta={state:'missing',at:Date.now(),recovered:recovered.length};return recovered;}
    try{
      const value=JSON.parse(raw);
      if(Array.isArray(value)){lastReadMeta={state:'valid',at:Date.now(),count:value.length};return value;}
      lastReadMeta={state:'invalid_shape',at:Date.now()};
    }catch(error){lastReadMeta={state:'corrupt',at:Date.now(),error:String(error&&error.message||error)};}
    const recovered=recoveryRaw();
    if(recovered.length)lastReadMeta.recovered=recovered.length;
    return recovered;
  }
  function ensureMemory(){
    const uid=currentStorageUser();
    if(memoryCache===null||memoryUserId!==uid){
      memoryUserId=uid;
      memoryCache=normalize(readRaw());
    }
    return memoryCache;
  }
  let lastWriteMeta=null;
  function writePersistent(fullProjects){
    const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
    const limits=[CACHE_LIMIT,2,0];
    for(let i=0;i<limits.length;i++){
      try{
        const persistent=persistentSubset(fullProjects,limits[i]);
        const serialized=JSON.stringify(persistent);
        const ok=repair&&typeof repair.retrySetItem==='function'
          ? repair.retrySetItem(STORAGE_KEY,serialized)
          : (localStorage.setItem(STORAGE_KEY,serialized),true);
        lastWriteMeta={ok:!!ok,attemptedKB:Math.round(serialized.length*2/1024),persistedCount:persistent.length,syncedLimit:limits[i]};
        if(ok)return true;
      }catch(error){lastWriteMeta={ok:false,error:String(error&&error.message||error),syncedLimit:limits[i]};}
    }
    return false;
  }
  function reportStorageError(){
    /* Local project cache is only a fallback. Cloud persistence remains authoritative.
       Safari can reject a cache write during reload/resume even when cloud sync succeeds,
       so keep the event in diagnostics instead of showing a misleading user-facing toast. */
    try{
      const now=Date.now();
      if(!window.__rmStorageRepairLogTs||now-window.__rmStorageRepairLogTs>60000){
        window.__rmStorageRepairLogTs=now;
        const log=window.A·CEIL&&window.A·CEIL.DebugLog;
        if(log&&typeof log.warn==='function'){
          const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
          const error=repair&&typeof repair.lastError==='function'?repair.lastError():null;
          log.warn('local_project_cache_write_failed',{
            storageKey:STORAGE_KEY,
            errorName:error&&error.name||'',
            errorMessage:String(error&&error.message||''),
            storageKB:repair&&repair.storageBytes?Math.round(repair.storageBytes()/1024):null,
            write:lastWriteMeta,
            cache:cacheInfo()
          });
        }
      }
    }catch(_){reportNonFatal(_)}
  }
  function list(options){
    const projects=ensureMemory();
    return options && options.clone ? clone(projects) : projects;
  }
  function replaceAll(projects,options){
    const previous=memoryCache===null?normalize(readRaw()):clone(memoryCache);
    const normalized=normalize(projects);
    if(!(options&&options.allowUnsyncedRemoval)){
      previous.filter(isUnsynced).forEach(project=>{if(!normalized.some(item=>sameProject(item,project)))normalized.push(clone(project));});
    }
    const removed=previous.filter(project=>!normalized.some(item=>sameProject(item,project)));
    if(removed.length){
      if(options&&options.trashRemoved===true)stashRemoved(removed,options.reason||'replace');
      else{
        const expiresAt=Date.now()+30000;
        removed.forEach(project=>{const ids=projectKeys(project),at=recentlyRemoved.findIndex(row=>row&&projectKeys(row.project).some(id=>ids.includes(id)));const row={expiresAt:expiresAt,project:clone(project)};if(at>=0)recentlyRemoved[at]=row;else recentlyRemoved.push(row);});
        recentlyRemoved=recentlyRemoved.filter(row=>row&&row.expiresAt>Date.now()).slice(-30);
      }
    }
    memoryUserId=currentStorageUser();
    memoryCache=normalized;
    if(!writePersistent(normalized))reportStorageError();
    queueSafetySnapshot(normalized,options&&options.reason||'replace',!!(options&&options.immediateSnapshot));
    return normalized;
  }
  function findById(id, options){
    if(id == null) return null;
    const key = String(id);
    const found = list().find(project => projectKeys(project).includes(key)) || null;
    return found && options && options.clone ? clone(found) : found;
  }
  function upsert(project, options){
    if(!isObject(project)) throw new TypeError('ProjectRepository.upsert: project має бути об’єктом');
    const normalized = normalize([project])[0];
    if(!normalized) throw new TypeError('ProjectRepository.upsert: проєкт не пройшов нормалізацію');
    const projects = list({clone:true});
    const index = projects.findIndex(item => sameProject(item, normalized));
    const next = index >= 0 && !(options && options.replace)
      ? Object.assign({}, projects[index], normalized)
      : normalized;
    if(index >= 0) projects[index] = next;
    else if(options && options.append) projects.push(next);
    else projects.unshift(next);
    replaceAll(projects);
    return next;
  }
  function remove(id){
    if(id == null) return false;
    const key = String(id);
    const projects = list({clone:true});
    const filtered = projects.filter(project => !projectKeys(project).includes(key));
    if(filtered.length === projects.length) return false;
    replaceAll(filtered,{allowUnsyncedRemoval:true,trashRemoved:true,reason:'explicit_remove',immediateSnapshot:true});
    return true;
  }
  function merge(incoming, resolver){
    const result = list({clone:true});
    normalize(incoming).forEach(project => {
      const index = result.findIndex(item => sameProject(item, project));
      if(index < 0) result.push(project);
      else result[index] = typeof resolver === 'function'
        ? resolver(result[index], project)
        : Object.assign({}, result[index], project);
    });
    return replaceAll(result);
  }
  function transaction(mutator){
    if(typeof mutator !== 'function') throw new TypeError('ProjectRepository.transaction: mutator має бути функцією');
    const current = list({clone:true});
    const result = mutator(current);
    const next = typeof result === 'undefined' ? current : result;
    if(!Array.isArray(next)) throw new TypeError('ProjectRepository.transaction: результат має бути масивом проєктів');
    return replaceAll(next);
  }
  function clear(options){
    const before=list({clone:true});
    if(before.length)stashRemoved(before,options&&options.reason||'explicit_clear');
    memoryCache=[];memoryUserId=currentStorageUser();
    const ok=writePersistent([]);
    queueSafetySnapshot([],options&&options.reason||'explicit_clear',true);
    return !!ok;
  }
  function audit(){
    return list().map(project => ({
      id: project.id ?? project._dbId ?? project._localId ?? null,
      issues: schema && typeof schema.auditProject === 'function' ? schema.auditProject(project) : []
    })).filter(entry => entry.issues.length);
  }
  function cacheInfo(){
    const full=list();
    const persisted=persistentSubset(full);
    return {
      fullCount:full.length,
      persistedCount:persisted.length,
      cacheLimit:CACHE_LIMIT,
      unsyncedCount:full.filter(isUnsynced).length,
      lastWrite:lastWriteMeta
    };
  }

  async function safetyStatus(){
    await flushSafetySnapshot();
    const user=safetyUser(),current=await safetyGet(user+':current'),previous=await safetyGet(user+':previous'),trash=await safetyGet(user+':trash');
    return {available:!!window.indexedDB,user:user,lastRead:clone(lastReadMeta),currentAt:current&&current.at||null,
      currentCount:current&&Array.isArray(current.projects)?current.projects.length:0,
      previousAt:previous&&previous.at||null,previousCount:previous&&Array.isArray(previous.projects)?previous.projects.length:0,
      trashCount:visibleTrashEntries(trash).length};
  }
  async function restoreSafety(kind){
    const user=safetyUser(),record=await safetyGet(user+':'+(kind==='previous'?'previous':'current'));
    if(!record||!Array.isArray(record.projects)||!record.projects.length)return {ok:false,reason:'snapshot_not_found'};
    const merged=clone(list({clone:true})),now=Date.now(),restored=[];
    record.projects.forEach(project=>{
      const copy=clone(project),index=merged.findIndex(item=>sameProject(item,copy));
      copy._dirty=true;copy._syncStatus=copy._dbId?'pending_update':'pending_create';copy._localUpdatedAt=now;restored.push(copy);
      if(index<0)merged.push(copy);else merged[index]=Object.assign({},merged[index],copy);
    });
    replaceAll(merged,{allowUnsyncedRemoval:true,reason:'manual_safety_restore',immediateSnapshot:true});
    restored.forEach(project=>{try{if(typeof window.addToPendingQueue==='function')window.addToPendingQueue({type:'save',payload:{localId:project.id,dbId:project._dbId||null},addedAt:now});}catch(_){reportNonFatal(_)}});
    try{if(typeof window.flushPendingQueue==='function')window.flushPendingQueue();}catch(_){reportNonFatal(_)}
    return {ok:true,count:record.projects.length,at:record.at||null};
  }
  function visibleTrashEntries(record){
    const now=Date.now(),current=list();
    return record&&Array.isArray(record.entries)?record.entries.filter(row=>row&&row.expiresAt>now&&row.project&&!current.some(project=>sameProject(project,row.project))):[];
  }
  async function listTrash(){
    await safetyChain;
    const record=await safetyGet(safetyUser()+':trash');
    return visibleTrashEntries(record).map(row=>clone(row));
  }
  async function restoreTrash(id){
    await safetyChain;
    const user=safetyUser(),key=user+':trash',record=await safetyGet(key),entries=record&&Array.isArray(record.entries)?record.entries:[];
    const index=entries.findIndex(row=>row&&row.project&&projectKeys(row.project).includes(String(id)));
    if(index<0)return {ok:false,reason:'trash_item_not_found'};
    const row=entries[index],existing=list({clone:true}).find(item=>sameProject(item,row.project)),now=Date.now();
    if(existing){
      entries.splice(index,1);await safetyPut({key:key,user:user,at:now,entries:entries});
      return {ok:true,project:existing,alreadyPresent:true};
    }
    const project=clone(row.project);
    project._localId=project._localId||project.id||project._dbId||null;
    delete project._dbId;project.id='restored_'+now+'_'+Math.random().toString(36).slice(2,8);
    project._dirty=true;project._syncStatus='pending_create';project._localUpdatedAt=now;
    entries.splice(index,1);await safetyPut({key:key,user:user,at:now,entries:entries});
    upsert(project,{replace:true});
    try{if(typeof window.addToPendingQueue==='function')window.addToPendingQueue({type:'save',payload:{localId:project.id,dbId:null},addedAt:now});}catch(_){reportNonFatal(_)}
    try{if(typeof window.flushPendingQueue==='function')window.flushPendingQueue();}catch(_){reportNonFatal(_)}
    return {ok:true,project:project};
  }
  async function autoRecoverSafety(){
    const state=lastReadMeta.state,user=safetyUser();
    if(state==='valid'||list().length)return {ok:false,reason:'primary_available'};
    const record=await safetyGet(user+':current');
    if(currentStorageUser()!==user||list().length)return {ok:false,reason:'context_changed'};
    if(!record||!Array.isArray(record.projects)||!record.projects.length)return {ok:false,reason:'snapshot_not_found'};
    replaceAll(record.projects,{allowUnsyncedRemoval:true,reason:'indexeddb_auto_recovery',immediateSnapshot:true});
    try{window.dispatchEvent(new CustomEvent('aceil:project-recovered',{detail:{source:'indexeddb',count:record.projects.length,at:record.at||null}}));}catch(_){reportNonFatal(_)}
    try{if(typeof showToast==='function')showToast('♻️ Відновлено локальні проєкти: '+record.projects.length,5000);}catch(_){reportNonFatal(_)}
    return {ok:true,count:record.projects.length,at:record.at||null};
  }
  function confirmDeletion(reference){
    const ids=[];
    if(reference&&typeof reference==='object'){
      [reference.id,reference.localId,reference.dbId,reference._localId,reference._dbId].forEach(value=>{if(value!=null)ids.push(String(value));});
    }else if(reference!=null)ids.push(String(reference));
    if(!ids.length)return Promise.resolve(false);
    recentlyRemoved=recentlyRemoved.filter(row=>row&&row.expiresAt>Date.now());
    let project=list({clone:true}).find(item=>projectKeys(item).some(id=>ids.includes(id)));
    if(!project){const row=recentlyRemoved.find(item=>item&&item.project&&projectKeys(item.project).some(id=>ids.includes(id)));project=row&&clone(row.project);}
    if(!project)return Promise.resolve(false);
    recentlyRemoved=recentlyRemoved.filter(row=>!row.project||!projectKeys(row.project).some(id=>ids.includes(id)));
    return stashRemoved([project],'explicit_delete_queue');
  }
  const safetyApi=Object.freeze({status:safetyStatus,flush:flushSafetySnapshot,restore:restoreSafety,listTrash:listTrash,restoreTrash:restoreTrash,autoRecover:autoRecoverSafety,confirmDeletion:confirmDeletion});

  /* First load: preserve what was in Safari in memory, then immediately rewrite
     only a light local cache. Supabase remains the source of truth. */
  memoryCache=normalize(readRaw());
  memoryUserId=currentStorageUser();
  writePersistent(memoryCache);
  try{
    const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
    if(repair&&typeof repair.freeSpace==='function')repair.freeSpace({aggressive:true});
  }catch(_){reportNonFatal(_)}

  const api = Object.freeze({
    STORAGE_KEY,
    list,
    getAll:list,
    replaceAll,
    findById,
    getById:findById,
    upsert,
    save:upsert,
    remove,
    merge,
    transaction,
    clear,
    audit,
    cacheInfo,
    safety:safetyApi
  });
  window.A·CEIL.ProjectRepository = api;
  window.A·CEIL.ProjectSafety = safetyApi;
  window.A·CEILProjectRepository = api;
  window.A_CEIL_ProjectSafety = safetyApi;
  window.getProjects = function(){ return api.list(); };
  window.setProjects = function(projects){ return api.replaceAll(projects); };
  try { getProjects = window.getProjects; setProjects = window.setProjects; } catch(_){reportNonFatal(_)}

  function scheduleSafetyRecovery(){
    const state=lastReadMeta.state;
    if(state==='valid'){queueSafetySnapshot(list({clone:true}),'startup');return;}
    setTimeout(()=>{autoRecoverSafety().catch(error=>reportNonFatal(error,'safety-auto-recovery'));},80);
  }
  scheduleSafetyRecovery();
  window.addEventListener('aceil:user-storage-changed',function(){
    memoryCache=null;
    memoryUserId='';
    ensureMemory();
    scheduleSafetyRecovery();
    try{if(typeof renderProjects==='function')renderProjects();}catch(_){reportNonFatal(_)}
  });
  window.addEventListener('pagehide',function(){flushSafetySnapshot();});

  /* Shared persistence used by autosave and explicit project saves. */
  window.A·CEIL.ProjectPersistence = Object.freeze({
    prepareSave: function(force){
      try{
        const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
        if(!repair)return;
        const bytes=typeof repair.storageBytes==='function'?repair.storageBytes():0;
        if(force||bytes>2300000){
          if(typeof repair.freeSpace==='function')repair.freeSpace({aggressive:true});
          if(typeof repair.trimDiagnostics==='function')repair.trimDiagnostics(8);
          window.setPendingQueue(window.getPendingQueue());
        }
      }catch(_){reportNonFatal(_)}
    },
    /* Both autosave and room saves commit locally before calling this method.
       Always resolve the latest repository record; never write an old caller snapshot. */
    syncProject: async function(reference){
      const ids=typeof reference==='object'&&reference ? projectKeys(reference) : [String(reference)];
      const find=()=>api.list({clone:true}).find(p=>projectKeys(p).some(id=>ids.includes(id)));
      const local=find();
      if(!local)return false;
      // Queue references are compact, so the latest local record must remain
      // protected from synced-cache eviction even if this request goes offline.
      local._dirty=true;
      local._syncStatus=local._dbId?'pending_update':'pending_create';
      local._localUpdatedAt=Date.now();
      const items=api.list({clone:true});
      const index=items.findIndex(p=>projectKeys(p).some(id=>projectKeys(local).includes(id)));
      if(index<0)return false;
      items[index]=local;api.replaceAll(items);
      const storage=window.A_CEIL_UserStorage;
      const owner=storage?storage.getUserId():'';
      window.addToPendingQueue({type:'save',payload:{localId:local.id,dbId:local._dbId||null},addedAt:Date.now()});
      await window.flushPendingQueue();
      if(storage&&storage.getUserId()!==owner)return false;
      const current=find();
      const waiting=current&&window.getPendingQueue().some(op=>op.payload&&projectKeys(current).some(id=>[op.payload.localId,op.payload.dbId].filter(v=>v!=null).map(String).includes(id)));
      const ok=!!current&&!waiting&&!current._dirty&&!String(current._syncStatus||'').startsWith('pending');
      try{if(document.getElementById('projectsModal')?.classList.contains('open')&&typeof renderProjects==='function')renderProjects();}catch(_){reportNonFatal(_)}
      return ok;
    },
    saveProjects: async function(nextProjects, meta){
      try{
        api.replaceAll(Array.isArray(nextProjects) ? nextProjects : []);
        return {ok:true,stage:'repository',reason:'saved'};
      }catch(e){
        return {ok:false,reason:'repository_write_failed',error:String(e&&e.message||e)};
      }
    }
  });

  /* Recovery snapshots protect unsynced projects while cloud data is merged. */
  (function installProjectRecovery(){
    const BACKUP_KEY='aceil_project_recovery';
    const LEGACY_BACKUP_KEY='ceiling_projects_backup_v35';
    const cloneSafe=value=>{try{return clone(value);}catch(_){return value;}};
    const strip=value=>{
      try{
        const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
        return repair&&typeof repair.stripThumbs==='function'?repair.stripThumbs(value):cloneSafe(value);
      }catch(_){return cloneSafe(value);}
    };
    const migrateLegacyBackup=()=>{
      try{
        if(localStorage.getItem(BACKUP_KEY)!=null)return;
        const legacy=localStorage.getItem(LEGACY_BACKUP_KEY);
        if(legacy==null)return;
        const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
        const copied=repair&&typeof repair.retrySetItem==='function'
          ? repair.retrySetItem(BACKUP_KEY,legacy)
          : (localStorage.setItem(BACKUP_KEY,legacy),true);
        if(copied&&localStorage.getItem(BACKUP_KEY)===legacy)localStorage.removeItem(LEGACY_BACKUP_KEY);
      }catch(error){reportNonFatal(error,'recovery-migration');}
    };
    migrateLegacyBackup();
    const backup=(projects,reason)=>{
      try{
        const persisted=readRaw();
        const risky=(Array.isArray(projects)?projects:[]).filter(isUnsynced).filter(project=>{
          const cached=persisted.find(item=>sameProject(item,project));
          if(!cached)return true;
          /* The primary project cache already contains this unsynced revision.
             Do not duplicate its full room state in Safari localStorage. */
          try{
            return JSON.stringify(stripLocalHeavyData(cached))!==JSON.stringify(stripLocalHeavyData(project));
          }catch(_){return true;}
        }).map(strip);
        if(!risky.length){localStorage.removeItem(BACKUP_KEY);return;}
        const payload=JSON.stringify({at:Date.now(),reason:reason||'',projects:risky});
        const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
        if(repair&&typeof repair.retrySetItem==='function')repair.retrySetItem(BACKUP_KEY,payload);
        else localStorage.setItem(BACKUP_KEY,payload);
      }catch(_){reportNonFatal(_);}
    };
    const union=(base,incoming)=>{
      const out=cloneSafe(Array.isArray(base)?base:[]);
      (Array.isArray(incoming)?incoming:[]).forEach(project=>{
        if(!isObject(project))return;
        const index=out.findIndex(item=>sameProject(item,project));
        if(index<0)out.push(cloneSafe(project));
        else out[index]=Object.assign({},out[index],cloneSafe(project));
      });
      return out;
    };
    const mergeCloudProjects=window.A·CEILMergeCloudProjects;
    if(typeof mergeCloudProjects==='function'){
      const wrapped=function(incoming){
        const before=api.list({clone:true});
        backup(before,'before_cloud_merge');
        let result;
        try{result=mergeCloudProjects.apply(this,arguments);}catch(e){api.replaceAll(before);throw e;}
        const after=api.list({clone:true});
        const preserved=union(before,after);
        if(JSON.stringify(after)!==JSON.stringify(preserved))api.replaceAll(preserved);
        return preserved;
      };
      window.A·CEILMergeCloudProjects=wrapped;
      try{A·CEILMergeCloudProjects=wrapped;}catch(_){reportNonFatal(_)}
    }
    const restore=function(){
      try{
        const b=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');
        if(!b||!Array.isArray(b.projects))return {ok:false,reason:'backup_not_found'};
        const merged=union(api.list({clone:true}),b.projects);
        api.replaceAll(merged);
        return {ok:true,count:merged.length,backupAt:b.at||null};
      }catch(e){return {ok:false,reason:String(e&&e.message||e)};}
    };
    window.A·CEIL.ProjectRecovery=Object.freeze({backup:backup,restore:restore,storageKey:BACKUP_KEY});
    window.addEventListener('pagehide',function(){backup(api.list({clone:true}),'pagehide');});
  })();
})();
