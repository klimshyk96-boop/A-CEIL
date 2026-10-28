(function(){
"use strict";
if(window.__A_CEIL_CLOUD_FIRST_PASS1)return;
window.__A_CEIL_CLOUD_FIRST_PASS1=true;

var QUIET_MS=900,MAX_WAIT_MS=3500,timer=null,firstChangeAt=0,running=false,rerun=false,installed=false;
function root(){return window["A\u00b7CEIL"]||{}}
function repo(){return root().ProjectRepository||null}
function persistence(){return root().ProjectPersistence||null}
function clone(value){try{return JSON.parse(JSON.stringify(value))}catch(_){return value}}
function keys(project){return project?[project.id,project._dbId,project._localId].filter(function(v){return v!=null}).map(String):[]}
function same(project,id){return id!=null&&keys(project).indexOf(String(id))>=0}
function activeId(){
 try{if(typeof _activeObjectId!=="undefined"&&_activeObjectId!=null)return _activeObjectId}catch(_){}
 try{if(typeof _currentProjectId!=="undefined"&&_currentProjectId!=null)return _currentProjectId}catch(_){}
 return null
}
function activeRecord(){
 var r=repo(),id=activeId();if(!r||id==null)return null;
 var all=r.list({clone:true}),index=all.findIndex(function(p){return same(p,id)});
 return index<0?null:{all:all,index:index,project:all[index]}
}
function multi(project){var mode=window.A_CEIL_ProjectMode;return mode&&typeof mode.isMulti==="function"?mode.isMulti(project):!!(project&&(project.multiRoom||Array.isArray(project.rooms)))}
function canvasState(){
 try{var raw=localStorage.getItem("ceiling_v18"),state=raw?JSON.parse(raw):null;return state&&typeof state==="object"?state:null}catch(_){return null}
}
function text(id){var el=document.getElementById(id);return el?el.textContent||"":""}
function markLocal(rec){
 var p=rec.project,now=Date.now(),state=canvasState();
 if(!multi(p)&&state){
  p.state=JSON.stringify(state);p.area=text("area")||p.area;p.per=text("per")||p.per;
  p.inC=text("inCorners")||p.inC;p.outC=text("outCorners")||p.outC;
  try{if(typeof getCanvasThumb==="function")p.thumb=getCanvasThumb(.4)||p.thumb}catch(_){}
 }
 p._dirty=true;p._localUpdatedAt=now;p._syncStatus=p._dbId?"pending_update":"pending_create";
 rec.all[rec.index]=p;repo().replaceAll(rec.all,{reason:"cloud_first_autosave"});return p
}
async function syncNow(reason){
 if(running){rerun=true;return false}
 var rec=activeRecord(),sync=persistence();if(!rec||!sync||typeof sync.syncProject!=="function")return false;
 if(window.__A\u00b7CEILReportRendering||window.__A\u00b7CEILSessionSwitching)return false;
 running=true;
 try{
  if(multi(rec.project)&&typeof window.saveCurrentRoom==="function"){
   var saved=await window.saveCurrentRoom({silent:true,skipCloud:true});if(saved===false)return false;
   rec=activeRecord();if(!rec)return false;
  }
  var project=markLocal(rec),ok=await sync.syncProject(project);
  try{window.dispatchEvent(new CustomEvent("aceil:cloud-first-save",{detail:{ok:!!ok,reason:reason||"autosave",projectId:project.id||project._dbId||null}}))}catch(_){}
  return !!ok
 }catch(error){
  try{if(window.__diagSilent)window.__diagSilent(error,"cloud-first-autosave")}catch(_){}
  return false
 }finally{
  running=false;
  if(rerun){rerun=false;schedule("rerun",250)}
 }
}
function schedule(reason,delay){
 if(activeId()==null)return;
 var now=Date.now();if(!firstChangeAt)firstChangeAt=now;
 if(timer)clearTimeout(timer);
 var wait=Math.max(0,Math.min(delay==null?QUIET_MS:delay,MAX_WAIT_MS-(now-firstChangeAt)));
 timer=setTimeout(function(){timer=null;firstChangeAt=0;syncNow(reason||"change")},wait)
}
function wrapSaveState(){
 var previous=window.saveState||typeof saveState==="function"&&saveState;
 if(typeof previous!=="function"||previous.__cloudFirstPass1)return false;
 var wrapped=function(){var result=previous.apply(this,arguments);schedule("canvas_change");return result};
 wrapped.__cloudFirstPass1=true;window.saveState=wrapped;try{saveState=wrapped}catch(_){}return true
}
function unsynced(project){var status=String(project&&project._syncStatus||"");return !!(project&&(project._dirty||project._localUpdatedAt||status.indexOf("pending")===0||!project._dbId))}
async function migrateLocal(){
 var r=repo(),sync=persistence();if(!navigator.onLine||!r||!sync||typeof sync.syncProject!=="function")return;
 var list=r.list({clone:true}).filter(unsynced);
 for(var i=0;i<list.length;i++){try{await sync.syncProject(list[i])}catch(error){try{if(window.__diagSilent)window.__diagSilent(error,"cloud-first-migration")}catch(_){}}}
}
function retry(){
 try{if(typeof window.flushPendingQueue==="function")window.flushPendingQueue()}catch(_){}
 setTimeout(migrateLocal,100)
}
function install(){
 if(installed)return;installed=true;
 wrapSaveState();setTimeout(wrapSaveState,700);setTimeout(wrapSaveState,1800);
 window.addEventListener("online",retry);
 document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")retry();else if(timer){clearTimeout(timer);timer=null;firstChangeAt=0;syncNow("page_hidden")}});
 setTimeout(migrateLocal,1800);setTimeout(migrateLocal,6000)
}
window.A_CEIL_CloudFirst={schedule:schedule,syncNow:syncNow,migrateLocal:migrateLocal,status:function(){return{running:running,scheduled:!!timer,activeId:activeId()}}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install()
})();
