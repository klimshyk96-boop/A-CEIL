
(function(){
  'use strict';
  window.A·CEIL = window.A·CEIL || {};
  window.A·CEIL.VERSION = '2026.08.31-rc13';

  /* Canonical Safari storage repair. Several later modules use this API, so it
     must live before ProjectRepository and must not be supplied by a late patch. */
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
      }catch(_){}
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
      }catch(_){}
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
        duplicateCacheKeys.forEach(key=>{
          if(localStorage.getItem(key)!=null){localStorage.removeItem(key);removed.push(key);}
        });
        if(aggressive)trimDiagnostics(8);
        if(force && storageBytes()>4200000)diagnosticKeys.forEach(key=>{
          if(localStorage.getItem(key)!=null){localStorage.removeItem(key);removed.push(key);}
        });
      }catch(_){}
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
  const CACHE_LIMIT = 8;
  const schema = window.A·CEILProjectSchema || null;
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const normalize = projects => schema && typeof schema.migrateProjects === 'function'
    ? schema.migrateProjects(projects)
    : (Array.isArray(projects) ? projects.filter(isObject) : []);
  const clone = value => schema && typeof schema.clone === 'function'
    ? schema.clone(value)
    : JSON.parse(JSON.stringify(value));

  let memoryCache = null;

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
    try{if(typeof _activeObjectId!=='undefined'&&_activeObjectId!=null)ids.push(String(_activeObjectId));}catch(_){}
    try{if(typeof _currentProjectId!=='undefined'&&_currentProjectId!=null)ids.push(String(_currentProjectId));}catch(_){}
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
    }catch(_){}
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
      }catch(_){}
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
  function readRaw(){
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch(_) { return []; }
  }
  function ensureMemory(){
    if(memoryCache===null)memoryCache=normalize(readRaw());
    return memoryCache;
  }
  let lastWriteMeta=null;
  function writePersistent(fullProjects){
    const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
    const limits=[CACHE_LIMIT,5,2,0];
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
    }catch(_){}
  }
  function list(options){
    const projects=ensureMemory();
    return options && options.clone ? clone(projects) : projects;
  }
  function replaceAll(projects){
    const normalized=normalize(projects);
    memoryCache=normalized;
    if(!writePersistent(normalized))reportStorageError();
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
    replaceAll(filtered);
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
  function clear(){
    memoryCache=[];
    try { localStorage.removeItem(STORAGE_KEY); return true; }
    catch(_) { return false; }
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

  /* First load: preserve what was in Safari in memory, then immediately rewrite
     only a light local cache. Supabase remains the source of truth. */
  memoryCache=normalize(readRaw());
  writePersistent(memoryCache);
  try{
    const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
    if(repair&&typeof repair.freeSpace==='function')repair.freeSpace({aggressive:true});
  }catch(_){}

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
    cacheInfo
  });
  window.A·CEIL.ProjectRepository = api;
  window.A·CEILProjectRepository = api;
  window.getProjects = function(){ return api.list(); };
  window.setProjects = function(projects){ return api.replaceAll(projects); };
  try { getProjects = window.getProjects; setProjects = window.setProjects; } catch(_){}

  /* Canonical local persistence lives with the repository.
     This matches the final runtime behavior that previously arrived much later
     from save-memory-roomprice-fix-v1. */
  window.A·CEIL.ProjectPersistence = Object.freeze({
    saveProjects: async function(nextProjects, meta){
      try{
        api.replaceAll(Array.isArray(nextProjects) ? nextProjects : []);
        return {ok:true,stage:'repository',reason:'saved'};
      }catch(e){
        return {ok:false,reason:'repository_write_failed',error:String(e&&e.message||e)};
      }
    }
  });

  /* Preserve unsynced local projects during cloud hydration.
     This replaces the late project-preservation-v35 override while keeping
     the same backup key and restore API for compatibility. */
  (function installProjectPreservation(){
    if(window.__A·CEILProjectPreservationCanonical) return;
    window.__A·CEILProjectPreservationCanonical=true;
    const BACKUP_KEY='ceiling_projects_backup_v35';
    const cloneSafe=value=>{try{return clone(value);}catch(_){return value;}};
    const strip=value=>{
      try{
        const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
        return repair&&typeof repair.stripThumbs==='function'?repair.stripThumbs(value):cloneSafe(value);
      }catch(_){return cloneSafe(value);}
    };
    const backup=(projects,reason)=>{
      try{
        const risky=(Array.isArray(projects)?projects:[]).filter(isUnsynced).map(strip);
        if(!risky.length){localStorage.removeItem(BACKUP_KEY);return;}
        const payload=JSON.stringify({at:Date.now(),reason:reason||'',projects:risky});
        const repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
        if(repair&&typeof repair.retrySetItem==='function')repair.retrySetItem(BACKUP_KEY,payload);
        else localStorage.setItem(BACKUP_KEY,payload);
      }catch(_){window.__diagSilent&&window.__diagSilent(_);}
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
    const oldMerge=window.A·CEILMergeCloudProjects;
    if(typeof oldMerge==='function'&&!oldMerge.__preserveAllCanonical){
      const wrapped=function(incoming){
        const before=api.list({clone:true});
        backup(before,'before_cloud_merge');
        let result;
        try{result=oldMerge.apply(this,arguments);}catch(e){api.replaceAll(before);throw e;}
        const after=api.list({clone:true});
        const preserved=union(before,after);
        if(JSON.stringify(after)!==JSON.stringify(preserved))api.replaceAll(preserved);
        return preserved;
      };
      wrapped.__preserveAllCanonical=true;
      window.A·CEILMergeCloudProjects=wrapped;
      try{A·CEILMergeCloudProjects=wrapped;}catch(_){}
    }
    window.A·CEILRestoreProjectsBackup=function(){
      try{
        const b=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');
        if(!b||!Array.isArray(b.projects))return {ok:false,reason:'backup_not_found'};
        const merged=union(api.list({clone:true}),b.projects);
        api.replaceAll(merged);
        return {ok:true,count:merged.length,backupAt:b.at||null};
      }catch(e){return {ok:false,reason:String(e&&e.message||e)};}
    };
    window.addEventListener('pagehide',function(){backup(api.list({clone:true}),'pagehide');});
  })();
})();
