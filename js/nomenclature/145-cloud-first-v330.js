
(function(){
"use strict";
if(window.__rmCloudFirstV330)return;
window.__rmCloudFirstV330=true;

var timer=null,busy=false,again=false,lastOk=0;

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
function cacheState(){
  try{
    localStorage.setItem("A·CEIL_cloud_cache_v330",JSON.stringify({
      savedAt:Date.now(),
      projectId:typeof _currentProjectId!=="undefined"?_currentProjectId:null,
      objectId:typeof _activeObjectId!=="undefined"?_activeObjectId:null,
      roomId:window._activeRoomId||null,
      state:currentState()
    }));
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
function cloudReady(){return !!(sb()&&sbUser())}

async function syncSingleProject(){
  var client=sb(),user=sbUser();
  if(!client||!user)return false;

  var st=currentState();
  if(!meaningful(st))return false;

  var id=typeof _currentProjectId!=="undefined"?_currentProjectId:null;
  var arr=projects();
  var idx=id!=null?arr.findIndex(function(p){return match(p,id)}):-1;
  var p=idx>=0?arr[idx]:null;

  /* v3.38: якщо Supabase id вже є, він авторитетний.
     Навіть якщо localStorage переповнений і ProjectRepository не запам'ятав рядок,
     не робимо новий INSERT — відновлюємо мінімальний запис і UPDATE тієї ж чернетки. */
  var idText=id==null?"":String(id);
  var hasCloudId=!!idText&&!idText.startsWith("local_")&&!idText.startsWith("obj_")&&!idText.startsWith("room_");
  if(!p&&hasCloudId){
    p={
      id:idText,_dbId:idText,
      name:(typeof _currentProjName!=="undefined"&&_currentProjName)||"Чернетка",
      addr:(typeof _currentProjAddr!=="undefined"&&_currentProjAddr)||"",
      phone:(typeof _currentProjPhone!=="undefined"&&_currentProjPhone)||"",
      comment:(typeof _currentProjComment!=="undefined"&&_currentProjComment)||"Автоматична чернетка A·CEIL",
      area:document.getElementById("area")?.textContent||"",
      per:document.getElementById("per")?.textContent||"",
      inC:document.getElementById("inCorners")?.textContent||"",
      outC:document.getElementById("outCorners")?.textContent||"",
      thumb:"",
      state:JSON.stringify(st)
    };
  }

  if(!p){
    var now=new Date();
    var pad=function(v){return String(v).padStart(2,"0")};
    var draftName="Чернетка "+pad(now.getDate())+"."+pad(now.getMonth()+1)+" "+pad(now.getHours())+":"+pad(now.getMinutes());
    var payload={
      user_id:user.id,
      name:draftName,
      addr:"",
      phone:"",
      comment:"Автоматична чернетка A·CEIL",
      area:document.getElementById("area")?.textContent||"",
      per:document.getElementById("per")?.textContent||"",
      in_corners:document.getElementById("inCorners")?.textContent||"",
      out_corners:document.getElementById("outCorners")?.textContent||"",
      thumb:typeof getCanvasThumb==="function"?getCanvasThumb(.35):"",
      state:st
    };
    var created=await client.from("projects").insert(payload).select().single();
    if(created.error)throw created.error;
    if(!created.data)return false;

    p={
      id:created.data.id,_dbId:created.data.id,
      name:created.data.name||draftName,
      addr:created.data.addr||"",phone:created.data.phone||"",
      comment:created.data.comment||"",
      area:created.data.area||payload.area,per:created.data.per||payload.per,
      inC:created.data.in_corners||payload.in_corners,
      outC:created.data.out_corners||payload.out_corners,
      thumb:created.data.thumb||payload.thumb,
      date:created.data.created_at?new Date(created.data.created_at).toLocaleDateString("uk-UA"):now.toLocaleDateString("uk-UA"),
      state:JSON.stringify(st)
    };
    arr.unshift(p);
    try{window.A·CEIL.ProjectRepository.replaceAll(arr)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{_currentProjectId=created.data.id}catch(_){window._currentProjectId=created.data.id}
    try{_currentProjName=p.name}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{_currentProjAddr=p.addr}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{_currentProjPhone=p.phone}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{_currentProjComment=p.comment}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    var cs=document.getElementById("cloudStatus");
    if(cs)cs.textContent="☁️ чернетка в хмарі";
    return true;
  }

  if(p.multiRoom||p.projectType==="apartment")return false;

  var dbId=p._dbId||(!String(p.id||"").startsWith("local_")?p.id:null);
  if(!dbId)return false;

  var payload2={
    user_id:user.id,
    name:p.name||"Чернетка",
    addr:p.addr||"",phone:p.phone||"",comment:p.comment||"",
    area:document.getElementById("area")?.textContent||p.area||"",
    per:document.getElementById("per")?.textContent||p.per||"",
    in_corners:document.getElementById("inCorners")?.textContent||p.inC||"",
    out_corners:document.getElementById("outCorners")?.textContent||p.outC||"",
    thumb:typeof getCanvasThumb==="function"?getCanvasThumb(.35):(p.thumb||""),
    state:st
  };
  var updated=await client.from("projects").update(payload2).eq("id",dbId).select().single();
  if(updated.error)throw updated.error;

  p=Object.assign({},p,{
    id:dbId,_dbId:dbId,
    area:payload2.area,per:payload2.per,
    inC:payload2.in_corners,outC:payload2.out_corners,
    thumb:payload2.thumb,state:JSON.stringify(st)
  });
  delete p._dirty;delete p._syncStatus;delete p._localUpdatedAt;
  if(idx>=0)arr[idx]=p;
  else arr.unshift(p);
  try{window.A·CEIL.ProjectRepository.replaceAll(arr)}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  var cs2=document.getElementById("cloudStatus");
  if(cs2)cs2.textContent="☁️ синхронізовано";
  return true;
}

async function syncNow(){
  if(busy){again=true;return}
  if(window.__A·CEILReportRendering||window.__A·CEILSessionSwitching)return;
  busy=true;
  try{
    cacheState();
    var ok=false;
    var hasRoom=typeof _activeObjectId!=="undefined"&&_activeObjectId!=null&&
      typeof _activeRoomIdx!=="undefined"&&Number.isInteger(_activeRoomIdx)&&_activeRoomIdx>=0;

    if(hasRoom&&typeof window.saveCurrentRoom==="function"){
      ok=await window.saveCurrentRoom({silent:true});
    }else if(cloudReady()){
      ok=await syncSingleProject();
    }

    if(ok){
      lastOk=Date.now();
      window.__A·CEILCloudFirstStatusV330="saved";
    }else{
      window.__A·CEILCloudFirstStatusV330=cloudReady()?"cache_only":"offline_cache";
    }
  }catch(e){
    window.__A·CEILCloudFirstStatusV330="offline_cache";
    try{
      window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.warn(
        "cloud_first_save_failed_v330",
        {message:String(e&&e.message||e),stack:String(e&&e.stack||"")}
      )
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }finally{
    busy=false;
    if(again){again=false;schedule(120)}
  }
}
function schedule(ms){
  clearTimeout(timer);
  timer=setTimeout(syncNow,typeof ms==="number"?ms:450);
}
window.rmCloudFirstSaveV330=function(){schedule(120)};

var prevSave=window.saveState||(typeof saveState==="function"?saveState:null);
if(typeof prevSave==="function"){
  window.saveState=function(){
    var r=prevSave.apply(this,arguments);
    schedule(450);
    return r;
  };
  try{saveState=window.saveState}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* Safari: не запускаємо новий async Supabase-запит у pagehide.
   visibilitychange достатньо, а локальний аварійний кеш зберігається синхронно. */
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="hidden"){
    cacheState();
    schedule(0);
  }
});
window.addEventListener("pagehide",function(){cacheState()});

window.A·CEILCloudFirstV330={
  syncNow:syncNow,schedule:schedule,
  status:function(){
    return {state:window.__A·CEILCloudFirstStatusV330||"idle",lastOk:lastOk,cloudReady:cloudReady()}
  }
};
})();
