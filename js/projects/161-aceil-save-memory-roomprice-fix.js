
(function(){
"use strict";
if(window.__A_CEIL_SaveMemoryRoomPriceFixV1)return;
window.__A_CEIL_SaveMemoryRoomPriceFixV1=true;

var MEM_PENDING=[];

function clone(v){
  try{return typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));}
  catch(_){try{return JSON.parse(JSON.stringify(v));}catch(__){return v;}}
}
function repo(){
  try{return window.A·CEIL&&window.A·CEIL.ProjectRepository||null;}catch(_){return null;}
}
function projects(){
  try{
    var r=repo();
    return r&&typeof r.list==="function"?r.list({clone:true}):(typeof getProjects==="function"?clone(getProjects()):[]);
  }catch(_){return [];}
}
function sameProject(p,id){
  return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){
    return v!=null&&String(v)===String(id);
  });
}
function projectForPayload(p){
  var list=projects(), hit=null;
  if(p&&p.localId!=null)hit=list.find(function(x){return sameProject(x,p.localId);})||null;
  if(!hit&&p&&p.dbId!=null)hit=list.find(function(x){return sameProject(x,p.dbId);})||null;
  return hit;
}
function parseState(raw){
  try{return typeof raw==="string"?JSON.parse(raw||"{}"):(raw&&typeof raw==="object"?clone(raw):{});}
  catch(_){return {};}
}
function stripQueueSave(op){
  op=clone(op)||{};
  if(op.type!=="save"||!op.payload)return op;
  var p=op.payload;
  /* Do not duplicate the heavy project state and thumbnail in localStorage.
     The ProjectRepository already keeps the unsynced project locally. */
  delete p.thumb;
  delete p.stateObj;
  return op;
}
function normalizeQueue(q){
  var out=[];
  (Array.isArray(q)?q:[]).forEach(function(op){
    if(!op||!op.type)return;
    op=stripQueueSave(op);
    if(op.type==="save"&&op.payload){
      var p=op.payload, idx=out.findIndex(function(x){
        return x&&x.type==="save"&&x.payload&&(
          p.localId!=null&&x.payload.localId!=null&&String(p.localId)===String(x.payload.localId)||
          p.dbId!=null&&x.payload.dbId!=null&&String(p.dbId)===String(x.payload.dbId)
        );
      });
      if(idx>=0){out[idx]=op;return;}
    }
    out.push(op);
  });
  return out.slice(-30);
}
function readPending(){
  var disk=[];
  try{disk=JSON.parse(localStorage.getItem("ceiling_pendingSync")||"[]");}catch(_){disk=[];}
  return normalizeQueue((Array.isArray(disk)?disk:[]).concat(MEM_PENDING));
}
function writePending(q){
  q=normalizeQueue(q);
  MEM_PENDING=q;
  var raw=JSON.stringify(q);
  try{
    var repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
    if(repair&&typeof repair.retrySetItem==="function"){
      if(repair.retrySetItem("ceiling_pendingSync",raw)){MEM_PENDING=[];return true;}
    }else{
      localStorage.setItem("ceiling_pendingSync",raw);MEM_PENDING=[];return true;
    }
  }catch(_){}
  /* If Safari quota is exhausted, keep the small queue in RAM.
     The project itself remains in ProjectRepository and can still sync now. */
  return false;
}
function pendingBadge(){
  try{
    var n=readPending().length, el=document.getElementById("cloudStatus");
    if(el&&n>0){el.textContent="⏳ "+n+" не збережено";el.title="Є зміни, які очікують синхронізації.";}
  }catch(_){}
}

window.getPendingQueue=readPending;
window.setPendingQueue=writePending;
window.addToPendingQueue=function(op){
  var q=readPending();
  q.push(stripQueueSave(op));
  writePending(q);pendingBadge();
};
window.removeFromPendingQueue=function(id){
  writePending(readPending().filter(function(x){
    var p=x&&x.payload||{};
    return !(String(p.localId)==String(id)||String(p.dbId)==String(id));
  }));
  pendingBadge();
};
try{
  getPendingQueue=window.getPendingQueue;
  setPendingQueue=window.setPendingQueue;
  addToPendingQueue=window.addToPendingQueue;
  removeFromPendingQueue=window.removeFromPendingQueue;
}catch(_){}

window.flushPendingQueue=async function(){
  if(!window._sb||!window._sbUser)return false;
  var q=readPending();
  if(!q.length)return true;
  var remaining=[], success=0;
  for(var i=0;i<q.length;i++){
    var op=q[i];
    try{
      if(op.type==="save"){
        var p=op.payload||{}, local=projectForPayload(p);
        if(!local)continue;
        var stateObj=parseState(local.state);
        var payload={
          user_id:window._sbUser.id,
          name:local.name||p.name||"",
          addr:local.addr||p.addr||"",
          phone:local.phone||p.phone||"",
          comment:local.comment||p.comment||"",
          area:local.area||p.area||"",
          per:local.per||p.per||"",
          in_corners:local.inC||p.inC||"",
          out_corners:local.outC||p.outC||"",
          thumb:"",
          state:stateObj
        };
        var dbId=local._dbId||p.dbId||null, res;
        if(dbId)res=await window._sb.from("projects").update(payload).eq("id",dbId).select().single();
        else res=await window._sb.from("projects").insert(payload).select().single();
        if(res.error)throw res.error;
        if(res.data){
          var arr=projects(),ix=arr.findIndex(function(x){
            return sameProject(x,local.id)||sameProject(x,local._dbId);
          });
          if(ix>=0){
            arr[ix].id=res.data.id;arr[ix]._dbId=res.data.id;
            delete arr[ix]._syncStatus;delete arr[ix]._dirty;delete arr[ix]._localUpdatedAt;
            var r=repo();if(r)r.replaceAll(arr);
          }
        }
        success++;
      }else if(op.type==="delete"){
        var did=op.payload&&op.payload.dbId;
        if(did){
          var del=await window._sb.from("projects").delete().eq("id",did);
          if(del.error)throw del.error;
        }
        success++;
      }
    }catch(e){remaining.push(op);}
  }
  writePending(remaining);
  try{
    var el=document.getElementById("cloudStatus");
    if(el)el.textContent=remaining.length?"⏳ "+remaining.length+" не збережено":"☁️ синхронізовано";
    if(typeof hideSync==="function")hideSync();
  }catch(_){}
  return remaining.length===0;
};
try{flushPendingQueue=window.flushPendingQueue;}catch(_){}

/* ProjectPersistence is canonical in project-repository.js. */

/* Refresh the current room's own nomenclature total AFTER room state has been installed.
   This prevents the previous room's price from remaining in the cockpit/header. */
function refreshRoomPrice(){
  try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(_){}
  try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(_){}
  try{if(typeof rpcUpdate==="function")rpcUpdate();}catch(_){}
  try{if(typeof rpUpdateHome==="function")rpUpdateHome();}catch(_){}
}
var prevLoad=window._loadRoomToCanvas;
if(typeof prevLoad==="function"&&!prevLoad.__roomPriceFinalFix){
  var wrappedLoad=function(){
    var r=prevLoad.apply(this,arguments);
    refreshRoomPrice();
    setTimeout(refreshRoomPrice,0);
    setTimeout(refreshRoomPrice,80);
    return r;
  };
  wrappedLoad.__roomPriceFinalFix=true;
  window._loadRoomToCanvas=wrappedLoad;
  try{_loadRoomToCanvas=wrappedLoad;}catch(_){}
}

/* Keep Safari storage from slowly growing during a long measuring session. */
function housekeeping(force){
  try{
    var repair=window.A·CEIL&&window.A·CEIL.StorageRepair;
    if(!repair)return;
    var bytes=typeof repair.storageBytes==="function"?repair.storageBytes():0;
    if(force||bytes>2300000){
      if(typeof repair.freeSpace==="function")repair.freeSpace({aggressive:true});
      if(typeof repair.trimDiagnostics==="function")repair.trimDiagnostics(8);
      writePending(readPending());
    }
  }catch(_){}
}
housekeeping(true);
setInterval(function(){housekeeping(false);},120000);
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="hidden")housekeeping(false);
});

/* Before either single-room or multi-room save, make a little headroom.
   This is intentionally silent: no false "memory full" toast if cloud/local repo save succeeds. */
var prevSaveProject=window.saveProject;
if(typeof prevSaveProject==="function"&&!prevSaveProject.__memoryHeadroomFix){
  var wrappedSave=async function(){
    housekeeping(true);
    return await prevSaveProject.apply(this,arguments);
  };
  wrappedSave.__memoryHeadroomFix=true;
  window.saveProject=wrappedSave;
  try{saveProject=wrappedSave;}catch(_){}
}

})();
