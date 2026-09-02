(function(){
  "use strict";
  if(window.__A_CEIL_OfflineNomenclatureV1)return;
  window.__A_CEIL_OfflineNomenclatureV1=true;

  var CACHE_KEY="A_CEIL_nomenclature_offline_v1";
  var captureTimer=null;

  function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}
  function user(){try{return (typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}catch(_){return window._sbUser||null}}
  function offline(){
    if(navigator.onLine===false||window.__A_CEIL_OFFLINE_ACTIVE===true)return true;
    var el=document.getElementById("cloudStatus"),text=String(el&&el.textContent||"").toLowerCase();
    return text.includes("офлайн");
  }
  function runtimeItems(){try{return typeof elemItems!=="undefined"&&Array.isArray(elemItems)?elemItems:(window.elemItems||[])}catch(_){return window.elemItems||[]}}
  function runtimeGroups(){try{return typeof elemGroups!=="undefined"&&Array.isArray(elemGroups)?elemGroups:(window.elemGroups||[])}catch(_){return window.elemGroups||[]}}
  function setRuntime(name,value){
    window[name]=value;
    try{if(name==="elemItems")elemItems=value;if(name==="elemGroups")elemGroups=value;if(name==="lightTypes")lightTypes=value}catch(_){}
  }
  function key(it){return it&&it.id!=null?"id:"+String(it.id):"n:"+String(it&&it.name||"").trim().toLowerCase()+"|g:"+String(it&&it.groupId==null?"":it.groupId)+"|u:"+String(it&&it.unit||"")}
  function mergeItems(catalog,current){
    var cur=Array.isArray(current)?current:[],scoped=cur.filter(function(it){return it&&it.filmPickerManaged===true&&it.roomScoped===true}),scopedGroups={},by={};
    scoped.forEach(function(it){scopedGroups[String(it.groupId)]=true});
    cur.forEach(function(it){by[key(it)]=it});
    var fields=["qty","manualQtyOverride","autoFilled","autoZero","price","filmSelected","insertSelected","optionalEstimateEnabled"];
    var out=(Array.isArray(catalog)?catalog:[]).filter(function(it){return !(scopedGroups[String(it&&it.groupId)]&&Number(it&&it.filmWidth)>0)}).map(function(src){
      var it=clone(src||{}),old=by[key(src)];
      if(old)fields.forEach(function(f){if(Object.prototype.hasOwnProperty.call(old,f))it[f]=clone(old[f])});
      return it;
    });
    return out.concat(clone(scoped));
  }
  function mergeGroups(catalog,current){
    var out=clone(Array.isArray(catalog)?catalog:[]),seen={};
    out.forEach(function(g){seen[String(g&&g.id)]=true});
    (Array.isArray(current)?current:[]).filter(function(g){return g&&g.roomScoped===true}).forEach(function(g){if(!seen[String(g.id)])out.unshift(clone(g))});
    return out;
  }
  function read(){
    try{
      var data=JSON.parse(localStorage.getItem(CACHE_KEY)||"null"),u=user();
      if(!data||!Array.isArray(data.items)||!data.items.length)return null;
      if(u&&data.userId&&String(data.userId)!==String(u.id))return null;
      return data;
    }catch(_){return null}
  }
  function capture(){
    if(offline())return false;
    var catalog=window.__A·CEILNomenCatalogV339||null;
    var items=catalog&&Array.isArray(catalog.items)&&catalog.items.length?catalog.items:runtimeItems().filter(function(it){return !(it&&it.roomScoped===true)});
    var groups=catalog&&Array.isArray(catalog.groups)&&catalog.groups.length?catalog.groups:runtimeGroups().filter(function(g){return !(g&&g.roomScoped===true)});
    if(!items.length||!groups.length)return false;
    var u=user(),light=[];
    try{light=typeof lightTypes!=="undefined"&&Array.isArray(lightTypes)?lightTypes:(window.lightTypes||[])}catch(_){light=window.lightTypes||[]}
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),userId:u&&u.id||null,items:clone(items),groups:clone(groups),lightTypes:clone(light)}));
      return true;
    }catch(_){return false}
  }
  function restore(){
    var data=read();if(!data)return false;
    setRuntime("elemGroups",mergeGroups(data.groups,runtimeGroups()));
    setRuntime("elemItems",mergeItems(data.items,runtimeItems()));
    if(Array.isArray(data.lightTypes)&&data.lightTypes.length)setRuntime("lightTypes",clone(data.lightTypes));
    window.__A·CEILNomenCatalogV339={items:clone(data.items),groups:clone(data.groups)};
    window._nomenCloudLoaded=true;window._nomenclatureLoading=false;window.__A_CEIL_NOMEN_OFFLINE_READY=true;
    try{_nomenclatureLoading=false}catch(_){}
    try{if(typeof renderElemList==="function")renderElemList()}catch(_){}
    try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){}
    try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){}
    return true;
  }
  function scheduleCapture(){clearTimeout(captureTimer);captureTimer=setTimeout(capture,700)}

  var oldRender=window.renderElemList;
  if(typeof oldRender==="function"&&!oldRender.__offlineNomV1){
    var wrappedRender=function(){if(offline()&&!runtimeItems().length)restore();return oldRender.apply(this,arguments)};
    wrappedRender.__offlineNomV1=true;window.renderElemList=wrappedRender;try{renderElemList=wrappedRender}catch(_){}
  }
  var oldOpen=window.openElementsModal;
  if(typeof oldOpen==="function"&&!oldOpen.__offlineNomV1){
    var wrappedOpen=function(){if(offline())restore();return oldOpen.apply(this,arguments)};
    wrappedOpen.__offlineNomV1=true;window.openElementsModal=wrappedOpen;try{openElementsModal=wrappedOpen}catch(_){}
  }
  [window.loadNomenclatureFromCloud,window.forceLoadNomenclature].forEach(function(fn){
    if(typeof fn!=="function"||fn.__offlineCaptureV1)return;
    var wrapped=async function(){if(offline())return restore();var result=await fn.apply(this,arguments);scheduleCapture();return result};
    wrapped.__offlineCaptureV1=true;
    if(fn===window.loadNomenclatureFromCloud){window.loadNomenclatureFromCloud=wrapped;try{loadNomenclatureFromCloud=wrapped}catch(_){}}
    if(fn===window.forceLoadNomenclature){window.forceLoadNomenclature=wrapped;try{forceLoadNomenclature=wrapped}catch(_){}}
  });

  if(offline())setTimeout(restore,0);
  else [1000,2500,5000,10000].forEach(function(ms){setTimeout(capture,ms)});
  window.addEventListener("online",function(){window.__A_CEIL_OFFLINE_ACTIVE=false;[1200,3500].forEach(function(ms){setTimeout(capture,ms)})});
  window.addEventListener("offline",function(){window.__A_CEIL_OFFLINE_ACTIVE=true;restore()});
  window.A_CEIL_OfflineNomenclature={capture:capture,restore:restore,hasCache:function(){return !!read()}};
})();
