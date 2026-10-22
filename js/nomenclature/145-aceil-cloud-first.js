
(function(){
"use strict";
if(window.__rmCloudFirstV330)return;
window.__rmCloudFirstV330=true;

var timer=null,busy=false,again=false,lastOk=0;
var lastSavedSignature=null;

function stateSignature(){
  try{return JSON.stringify(currentState())}catch(_){return ""}
}

function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}
function sb(){
  try{if(typeof _sb!=="undefined"&&_sb)return _sb}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return window._sb||null;
}
function sbUser(){
  try{if(typeof _sbUser!=="undefined"&&_sbUser)return _sbUser}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return window._sbUser||null;
}
function currentState(){
  return {
    schemaVersion:window.A·CEILProjectSchema?window.A·CEILProjectSchema.CURRENT_VERSION:3,
    projectType:"room",
    pts:clone(typeof pts!=="undefined"?pts:[]),
    lengths:clone(typeof lengths!=="undefined"?lengths:[]),
    realPts:clone(typeof realPts!=="undefined"?realPts:[]),
    closed:typeof closed!=="undefined"?!!closed:false,
    diagonals:clone(typeof diagonals!=="undefined"?diagonals:[]),
    circleMode:typeof circleMode!=="undefined"?!!circleMode:false,
    circleDiamCm:typeof circleDiamCm!=="undefined"?circleDiamCm:0,
    diagonalOverrides:clone(typeof diagonalOverrides!=="undefined"?diagonalOverrides:{}),
    notes:clone(typeof notes!=="undefined"?notes:[]),
    elemItems:clone(typeof elemItems!=="undefined"?elemItems:[]),
    elemGroups:clone(typeof elemGroups!=="undefined"?elemGroups:[]),
    lightMarks:clone(typeof lightMarks!=="undefined"?lightMarks:[]),
    wallMarks:clone(typeof wallMarks!=="undefined"?wallMarks:[]),
    linearElements:clone(typeof linearElements!=="undefined"?linearElements:[]),
    wallTypes:clone(typeof wallTypes!=="undefined"?wallTypes:[]),
    arcPoints:clone(typeof arcPoints!=="undefined"?arcPoints:[])
  };
}
function meaningful(st){
  return !!(
    (Array.isArray(st.pts)&&st.pts.length) ||
    st.circleMode ||
    (Array.isArray(st.lightMarks)&&st.lightMarks.length) ||
    (Array.isArray(st.wallMarks)&&st.wallMarks.length) ||
    (Array.isArray(st.linearElements)&&st.linearElements.length)
  );
}
function projects(){
  try{return window.A·CEIL&&window.A·CEIL.ProjectRepository?window.A·CEIL.ProjectRepository.list():[]}
  catch(_){return []}
}
function match(p,id){
  return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){
    return v!=null&&String(v)===String(id)
  });
}
function cloudReady(){return !!(sb()&&sbUser())}
function isAutomaticDraft(p){
  return !!p&&String(p.comment||"")==="Автоматична чернетка A·CEIL";
}
function projectFromCloud(row,st){
  return {
    id:row.id,_dbId:row.id,
    name:row.name||"Чернетка",addr:row.addr||"",phone:row.phone||"",
    comment:row.comment||"Автоматична чернетка A·CEIL",
    area:row.area||"",per:row.per||"",
    inC:row.in_corners||"",outC:row.out_corners||"",
    thumb:row.thumb||"",
    date:row.created_at?new Date(row.created_at).toLocaleDateString("uk-UA"):new Date().toLocaleDateString("uk-UA"),
    state:JSON.stringify(st||row.state||{})
  };
}

function context(){
  return {user:String(sbUser()&&sbUser().id||""),client:sb(),
    project:typeof _currentProjectId!=="undefined"?_currentProjectId:null,
    object:typeof _activeObjectId!=="undefined"?_activeObjectId:null,
    room:window._activeRoomId||null,index:typeof _activeRoomIdx!=="undefined"?_activeRoomIdx:null};
}
function sameContext(before){
  var after=context();
  function sameId(a,b){return a===b||a!=null&&b!=null&&projects().some(function(p){return match(p,a)&&match(p,b)});}
  return before.user===after.user&&before.client===after.client&&sameId(before.project,after.project)&&sameId(before.object,after.object)&&before.room===after.room&&before.index===after.index;
}
function contextKey(){var c=context();return JSON.stringify([c.user,c.project,c.object,c.room,c.index]);}
var lastSavedContext=null;
async function syncSingleProject(){
  var before=context(),client=before.client,user=sbUser(),st=currentState();
  if(!client||!user||!meaningful(st))return false;
  var repo=window.A·CEIL.ProjectRepository;
  var arr=repo.list({clone:true}),id=before.project;
  var p=arr.find(function(item){return match(item,id)})||null;
  var cloudId=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(id||""));
  if(!p&&cloudId){
    p={id:String(id),_dbId:String(id),name:_currentProjName||"Чернетка",addr:_currentProjAddr||"",phone:_currentProjPhone||"",comment:_currentProjComment||"Автоматична чернетка A·CEIL"};
  }
  if(!p&&!cloudId){
    // Read-only discovery preserves the existing automatic draft across reloads.
    var found=await client.from("projects").select("*").eq("user_id",user.id)
      .eq("comment","Автоматична чернетка A·CEIL").order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(!sameContext(before))return false;
    if(found.error)throw found.error;
    if(found.data&&isAutomaticDraft(found.data))p=projectFromCloud(found.data,st);
    // Refresh after the request: do not replace another project's newer local edit.
    arr=repo.list({clone:true});
    if(p)p=arr.find(function(item){return match(item,p.id)})||p;
    st=currentState();
    if(!meaningful(st))return false;
  }
  if(p&&(p.multiRoom||p.projectType==="apartment"))return false;
  if(!p){
    var now=new Date(),pad=function(v){return String(v).padStart(2,"0")};
    p={id:"local_draft_"+Date.now()+"_"+Math.random().toString(36).slice(2),
      name:"Чернетка "+pad(now.getDate())+"."+pad(now.getMonth()+1)+" "+pad(now.getHours())+":"+pad(now.getMinutes()),
      addr:"",phone:"",comment:"Автоматична чернетка A·CEIL",date:now.toLocaleDateString("uk-UA")};
  }
  p=Object.assign({},p,{state:JSON.stringify(st),
    area:document.getElementById("area")?.textContent||p.area||"",
    per:document.getElementById("per")?.textContent||p.per||"",
    inC:document.getElementById("inCorners")?.textContent||p.inC||"",
    outC:document.getElementById("outCorners")?.textContent||p.outC||"",
    thumb:typeof getCanvasThumb==="function"?getCanvasThumb(.35):(p.thumb||""),
    _dirty:true,_localUpdatedAt:Date.now(),_syncStatus:p._dbId?"pending_update":"pending_create"});
  var idx=arr.findIndex(function(item){return match(item,p.id)});
  if(idx>=0)arr[idx]=p;else arr.unshift(p);
  repo.replaceAll(arr);
  _currentProjectId=p.id;
  _currentProjName=p.name;_currentProjAddr=p.addr;_currentProjPhone=p.phone;_currentProjComment=p.comment;
  return window.A·CEIL.ProjectPersistence.syncProject(p);
}

async function syncNow(){
  if(busy){again=true;return}
  if(window.__A·CEILReportRendering||window.__A·CEILSessionSwitching)return;
  busy=true;
  var savingSignature=stateSignature(),before=context();
  try{
    var ok=false;
    var hasRoom=typeof _activeObjectId!=="undefined"&&_activeObjectId!=null&&
      typeof _activeRoomIdx!=="undefined"&&Number.isInteger(_activeRoomIdx)&&_activeRoomIdx>=0;

    if(hasRoom&&typeof window.saveCurrentRoom==="function"){
      var target=before.object;
      var saved=await window.saveCurrentRoom({silent:true,skipCloud:true});
      var project=projects().find(function(item){return match(item,target)});
      if(saved&&project)ok=await window._updateObjectInCloud(project);
    }else if(cloudReady()){
      ok=await syncSingleProject();
    }

    if(ok&&sameContext(before)&&savingSignature===stateSignature()){
      lastOk=Date.now();
      lastSavedSignature=savingSignature;lastSavedContext=contextKey();
      window.__A·CEILCloudFirstStatusV330="saved";
    }else{
      if(before.user===context().user)window.__A·CEILCloudFirstStatusV330=cloudReady()?"cache_only":"offline_cache";
    }
  }catch(e){
    if(before.user===context().user)window.__A·CEILCloudFirstStatusV330="offline_cache";
    try{
      window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.warn(
        "cloud_first_save_failed_v330",
        {message:String(e&&e.message||e),stack:String(e&&e.stack||"")}
      )
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }finally{
    busy=false;
    if(before.user===context().user&&(savingSignature!==stateSignature()||!sameContext(before)))again=true;
    if(again){again=false;if(before.user===context().user&&meaningful(currentState()))schedule(120)}
  }
}
function schedule(ms){
  clearTimeout(timer);
  timer=setTimeout(syncNow,typeof ms==="number"?ms:450);
}
window.rmCloudFirstSaveV330=function(){schedule(600)};

/* Надійне автозбереження: раз на хвилину перевіряємо сам стан макета.
   Це працює навіть для дій, які не викликали saveState(). Якщо змін немає,
   Supabase і список проєктів взагалі не чіпаємо. */
setInterval(function(){
  var st=currentState();
  if(!meaningful(st))return;
  var signature=stateSignature();
  if(signature&&(signature!==lastSavedSignature||contextKey()!==lastSavedContext))syncNow();
},60000);

/* Safari: не запускаємо новий async Supabase-запит у pagehide.
   visibilitychange достатньо, а локальний аварійний кеш зберігається синхронно. */
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="hidden"){
    schedule(0);
  }
});


window.A·CEILCloudFirstV330={
  syncNow:syncNow,schedule:schedule,
  status:function(){
    return {state:window.__A·CEILCloudFirstStatusV330||"idle",lastOk:lastOk,cloudReady:cloudReady()}
  }
};
})();
