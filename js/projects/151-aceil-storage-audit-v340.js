/* Storage audit + safe cleanup of dead legacy duplicates.
   006-user-storage-v1.js scopes tenant keys as "<key>::user:<id>". For the primary owner it COPIES the old
   unscoped key into the scoped one and leaves the old key behind. Nothing reads the old key afterwards,
   but it still counts against Safari's ~5 MB localStorage quota. This module removes such dead copies,
   and only when the scoped copy exists (and, for projects, already contains every legacy project). */
(function(){
"use strict";
var NS="A\u00b7CEIL";
var MARK="::user:";
var KEY_CLOUD_CACHE="A\u00b7CEIL_cloud_cache_v330";
var KEY_PROJECTS="ceiling_projects";
var KEY_BACKUP="ceiling_projects_backup_v35";
var KEY_STATE="ceiling_v18";
var WARN_KB=3800,QUOTA_KB=5000,WARN_FLAG="aceil_storage_warn_v1";
var NAMES={};
NAMES[KEY_PROJECTS]="проєкти";NAMES[KEY_BACKUP]="резерв";NAMES[KEY_CLOUD_CACHE]="хмарний кеш";NAMES[KEY_STATE]="поточний малюнок";

function root(){return window[NS]||(window[NS]={});}
function us(){return window.A_CEIL_UserStorage||null;}
function nat(){var u=us();return u&&u.native?u.native:null;}
function rawKeys(){
  var n=nat(),out=[];
  try{for(var i=0;i<localStorage.length;i++){var k=n?n.key.call(localStorage,i):localStorage.key(i);if(k!=null)out.push(k);}}catch(_){}
  return out;
}
function rawGet(k){try{var n=nat();return n?n.getItem.call(localStorage,k):localStorage.getItem(k);}catch(_){return null;}}
function rawRemove(k){try{var n=nat();if(n)n.removeItem.call(localStorage,k);else localStorage.removeItem(k);return true;}catch(_){return false;}}
function sizeOf(k){return 2*(String(k).length+String(rawGet(k)||"").length);}
function split(key){var i=key.lastIndexOf(MARK);return i<0?{base:key,scope:""}:{base:key.slice(0,i),scope:key.slice(i+MARK.length)};}
function currentUid(){try{var u=us();return u&&u.getUserId?String(u.getUserId()||""):"";}catch(_){return "";}}

function report(){
  var uid=currentUid(),u=us(),rows=rawKeys().map(function(k){
    var p=split(k),b=sizeOf(k);
    return {key:k,base:p.base,scope:p.scope,legacy:p.scope===""&&!!(u&&u.isTenantKey&&u.isTenantKey(p.base)),foreign:p.scope!==""&&p.scope!==uid,bytes:b,kb:Math.round(b/1024)};
  }).sort(function(a,b){return b.bytes-a.bytes;});
  var total=rows.reduce(function(s,r){return s+r.bytes;},0);
  return {rows:rows,totalBytes:total,totalKB:Math.round(total/1024)};
}
function label(r){
  var n=NAMES[r.base]||r.base;
  if(r.legacy)return n+" (стара копія)";
  if(r.foreign)return n+" (інший акаунт)";
  return n;
}

function parse(v){try{return JSON.parse(v);}catch(_){return undefined;}}
function idsOf(p){
  var o=[];
  if(p&&typeof p==="object")["id","_dbId","_localId"].forEach(function(f){if(p[f]!=null)o.push(String(p[f]));});
  return o;
}
function covered(legacyList,scopedLists){
  var seen={};
  scopedLists.forEach(function(list){list.forEach(function(p){idsOf(p).forEach(function(i){seen[i]=1;});});});
  return legacyList.every(function(p){var a=idsOf(p);return a.length>0&&a.some(function(i){return seen[i];});});
}
function listOf(v){var x=parse(v);return Array.isArray(x)?x:(x&&Array.isArray(x.projects)?x.projects:undefined);}

/* Removes dead unscoped copies. The primary owner's scoped project list is the
   live cache; the unscoped list is a frozen pre-isolation copy and is never
   read again. Keep it only when the scoped list is absent or invalid. */
function cleanLegacy(){
  var out={ok:true,removed:[],kept:[],freedBytes:0};
  var u=us(),uid=currentUid();
  if(!u||!uid){out.ok=false;out.skipped="no_user";return out;}
  if(uid!==u.primaryOwnerId){out.skipped="not_primary_owner";return out;}
  var scopedProjects=listOf(rawGet(KEY_PROJECTS+MARK+uid));
  var scopedBackup=listOf(rawGet(KEY_BACKUP+MARK+uid))||[];
  [KEY_PROJECTS,KEY_BACKUP,KEY_CLOUD_CACHE,KEY_STATE].forEach(function(base){
    var legacy=rawGet(base),scoped=rawGet(base+MARK+uid);
    if(legacy==null||scoped==null)return;
    var safe=false;
    if(base===KEY_PROJECTS){
      var l=listOf(legacy);
      safe=Array.isArray(l)&&Array.isArray(scopedProjects)&&scopedProjects.length>0;
      if(safe&&!covered(l,[scopedProjects]))out.projectCoverage="cloud_cache_is_authoritative";
    }else if(base===KEY_BACKUP){
      var lb=listOf(legacy);
      safe=Array.isArray(lb)&&Array.isArray(scopedProjects)&&covered(lb,[scopedProjects,scopedBackup]);
    }else if(base===KEY_STATE){
      safe=String(scoped).length>2;
    }else safe=true;
    if(!safe){out.kept.push(base);return;}
    var b=sizeOf(base);
    if(rawRemove(base)){out.removed.push(base);out.freedBytes+=b;}
  });
  root().StorageCleanupLast=out;
  try{if(out.removed.length&&window.console)console.info("[A·CEIL] storage cleanup: removed dead copies "+out.removed.join(", ")+", freed "+Math.round(out.freedBytes/1024)+" KB");}catch(_){}
  return out;
}

/* A·CEIL_cloud_cache_v330 was written on every change but never read by any code. Remove leftovers
   (current user's scoped copy and the unscoped legacy copy). Safe for every account. */
function removeDeadCache(){
  var freed=0,removed=[];
  try{
    var uid=currentUid(),keys=[KEY_CLOUD_CACHE];
    if(uid)keys.push(KEY_CLOUD_CACHE+MARK+uid);
    keys.forEach(function(k){if(rawGet(k)!=null){freed+=sizeOf(k);if(rawRemove(k))removed.push(k);}});
  }catch(_){}
  return {removed:removed,freedBytes:freed};
}

/* Shows the "memory almost full" toast at most once per session, naming the biggest keys. */
function warnIfFull(){
  var r=report();
  if(r.totalKB<=WARN_KB)return false;
  try{if(sessionStorage.getItem(WARN_FLAG))return false;sessionStorage.setItem(WARN_FLAG,"1");}catch(_){}
  var top=r.rows.slice(0,2).map(function(x){return label(x)+" "+x.kb+" КБ";}).join(", ");
  try{
    if(typeof showToast==="function"){showToast("\u26a0\ufe0f Пам'ять Safari майже повна: "+r.totalKB+" з ~"+QUOTA_KB+" КБ. Найбільше: "+top,7000);return true;}
  }catch(_){}
  return false;
}

root().StorageCleanup=Object.freeze({report:report,cleanLegacy:cleanLegacy,removeDeadCache:removeDeadCache,warnIfFull:warnIfFull,label:label});

window["A\u00b7CEILStorageAuditV340"]=function(){
  try{
    var r=report(),repo=root().ProjectRepository;
    return {
      ok:true,totalKB:r.totalKB,
      projectCache:repo&&repo.cacheInfo?repo.cacheInfo():null,
      biggest:r.rows.slice(0,12).map(function(x){return {key:x.key,kb:x.kb,legacy:x.legacy,foreign:x.foreign};}),
      lastCleanup:root().StorageCleanupLast||null
    };
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
};

try{
  var u=us();
  if(u&&typeof u.onChange==="function")u.onChange(function(){setTimeout(function(){removeDeadCache();cleanLegacy();},800);});
  setTimeout(function(){try{removeDeadCache();cleanLegacy();warnIfFull();}catch(_){}},2500);
}catch(_){}
})();
