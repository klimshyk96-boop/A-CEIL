(function(){
"use strict";
if(window.__aceilFilmCatalogSync)return;
window.__aceilFilmCatalogSync=true;

/* Синхронізація каталогу плівок (ручні виробники/кольори/ширини + тарифи) із Supabase.
   Один JSON-документ на користувача: {v:1, custom:{...}, pricing:{seriesId:{rates,u}}}.
   Злиття двох копій (локальної й хмарної) іде по записах за мітками часу `u`,
   видалення передаються «надгробками» (custom.deleted). Без мережі зміни лишаються
   в черзі (dirty) і відправляються пізніше. Потрібна міграція
   supabase/migrations/20261024120000_film_catalog_sync.sql; доки її немає, застосунок
   працює локально як раніше. */

var STATE_KEY="aceil_film_sync_v1";
var DEBOUNCE_MS=1500,RETRY_MS=60000,MAX_BYTES=90000;

/* ---------- чисте злиття (без DOM/мережі) ---------- */
function num(v){v=Number(v);return Number.isFinite(v)?v:0}
function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
function canon(v){
  if(Array.isArray(v))return"["+v.map(canon).join(",")+"]";
  if(v&&typeof v==="object")return"{"+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+":"+canon(v[k])}).join(",")+"}";
  return JSON.stringify(v===undefined?null:v);
}
function emptyCustom(){return{v:1,series:[],colors:[],reserved:[],deleted:{},descorLabellImported:false}}
function normCustom(c){
  c=c&&typeof c==="object"?clone(c):emptyCustom();
  c.series=Array.isArray(c.series)?c.series:[];
  c.colors=Array.isArray(c.colors)?c.colors:[];
  c.reserved=Array.isArray(c.reserved)?c.reserved:[];
  c.deleted=c.deleted&&typeof c.deleted==="object"?c.deleted:{};
  c.descorLabellImported=c.descorLabellImported===true;
  return c;
}
function newer(a,b){return num(b&&b.u)>num(a&&a.u)}

function mergeCustom(local,remote){
  var a=normCustom(local),b=normCustom(remote),out=emptyCustom();
  out.descorLabellImported=a.descorLabellImported||b.descorLabellImported;
  var dead={};
  [a.deleted,b.deleted].forEach(function(d){Object.keys(d).forEach(function(k){dead[k]=Math.max(num(dead[k]),num(d[k]))})});
  out.deleted=dead;
  var series={};
  a.series.concat(b.series).forEach(function(s){
    if(!s||!s.id)return;
    var cur=series[s.id];
    if(!cur||newer(cur,s))series[s.id]=s;
  });
  Object.keys(series).forEach(function(id){
    if(num(dead["s:"+id])>=num(series[id].u)&&dead["s:"+id]!==undefined)return;
    out.series.push(series[id]);
  });
  var alive={};out.series.forEach(function(s){alive[s.id]=true});
  /* Кольори: ключ = серія + внутрішній код. Якщо два пристрої незалежно дали той самий код
     РІЗНИМ кольорам, переможець (раніший u) лишає код, інший отримує новий вільний. */
  var byKey={};
  a.colors.concat(b.colors).forEach(function(c){
    if(!c||!c.seriesId||!c.code)return;
    var k=c.seriesId+":"+c.code,id=c.cid||String(c.display||"").toLowerCase()+"|"+c.texture;
    var slot=byKey[k]||(byKey[k]={});
    if(!slot[id]||newer(slot[id],c))slot[id]=c;
  });
  var colors=[],usedCodes={};
  out.series.forEach(function(s){usedCodes[s.id]={}});
  a.reserved.concat(b.reserved).forEach(function(r){if(r&&usedCodes[r.seriesId])usedCodes[r.seriesId][r.code]=true});
  Object.keys(byKey).forEach(function(k){Object.keys(byKey[k]).forEach(function(id){var c=byKey[k][id];if(usedCodes[c.seriesId])usedCodes[c.seriesId][c.code]=true})});
  Object.keys(byKey).sort().forEach(function(k){
    var ids=Object.keys(byKey[k]),list=ids.map(function(id){return byKey[k][id]});
    list.sort(function(x,y){return num(x.u)-num(y.u)||(String(x.display)<String(y.display)?-1:1)});
    list.forEach(function(c,i){
      if(!alive[c.seriesId])return;
      var t=dead["c:"+k];
      if(i===0){
        if(t!==undefined&&num(t)>=num(c.u))return;
        colors.push(c);return;
      }
      var prefix=String(c.code).charAt(0),n=901,code;
      for(n=901;n<=999;n++)if(!usedCodes[c.seriesId][prefix+n]){code=prefix+n;break}
      if(!code)for(n=100;n<=900;n++)if(!usedCodes[c.seriesId][prefix+n]){code=prefix+n;break}
      if(!code)return;
      usedCodes[c.seriesId][code]=true;
      var moved=clone(c);moved.code=code;colors.push(moved);
    });
  });
  colors.forEach(function(c){out.colors.push(c)});
  var seen={};
  a.reserved.concat(b.reserved).forEach(function(r){
    if(!r||!alive[r.seriesId])return;
    var k=r.seriesId+":"+r.code;if(!seen[k]){seen[k]=true;out.reserved.push({seriesId:r.seriesId,code:r.code})}
  });
  out.colors.forEach(function(c){var k=c.seriesId+":"+c.code;if(!seen[k]){seen[k]=true;out.reserved.push({seriesId:c.seriesId,code:c.code})}});
  var order=function(x,y){return String(x.id||x.seriesId+x.code)<String(y.id||y.seriesId+y.code)?-1:1};
  out.series.sort(order);out.colors.sort(order);
  out.reserved.sort(function(x,y){return(x.seriesId+x.code)<(y.seriesId+y.code)?-1:1});
  return out;
}

function mergePricing(local,remote,dead){
  var out={},a=local||{},b=remote||{};
  Object.keys(a).concat(Object.keys(b)).forEach(function(id){
    if(out[id])return;
    var x=a[id],y=b[id],pick=x&&(!y||num(x.u)>=num(y.u))?x:y;
    /* ціни видаленої ручної серії не зберігаємо */
    if(dead&&dead["s:"+id]!==undefined)return;
    out[id]={rates:clone(pick.rates)||{},u:num(pick.u)};
  });
  return out;
}

function mergeDocs(local,remote){
  var l=local||{},r=remote||{};
  var custom=mergeCustom(l.custom,r.custom);
  return{v:1,custom:custom,pricing:mergePricing(l.pricing,r.pricing,custom.deleted)};
}

/* ---------- локальний стан ---------- */
function store(){return window.ACEILFilmCatalogStore||null}
function readLocalDoc(){
  var st=store();if(!st)return null;
  return{v:1,custom:st.readCustom(),pricing:st.readPricing()};
}
function readSyncState(){
  try{var v=JSON.parse(localStorage.getItem(STATE_KEY)||"null");if(v&&typeof v==="object")return v}catch(_){}
  return{dirty:false,uid:null,rev:0};
}
function writeSyncState(s){try{localStorage.setItem(STATE_KEY,JSON.stringify(s))}catch(_){}}
function applyDoc(doc){
  var st=store();if(!st)return false;
  var ok=st.writeCustom(doc.custom);
  return st.writePricing(doc.pricing)&&ok;
}
/* Робочий вигляд для порівняння: без службових полів, що розрізняються між пристроями. */
function comparable(doc){
  var d=clone(doc);if(d&&d.custom){delete d.custom.reserved}
  return canon(d);
}

/* ---------- мережа ---------- */
function client(){try{return(typeof _sb!=="undefined"&&_sb)||window._sb||null}catch(_){return window._sb||null}}
function user(){try{return(typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}catch(_){return window._sbUser||null}}
function diag(e){try{window.__diagSilent&&window.__diagSilent(e)}catch(_){}}
function toast(m){try{if(typeof showToast==="function")showToast(m,2600)}catch(_){}}

var running=false,again=false,timer=null,retryTimer=null,lastRun=0;
var status={state:"idle",error:null,at:0};
function setStatus(state,error){status={state:state,error:error||null,at:Date.now()};try{window.dispatchEvent(new CustomEvent("aceil:film-sync-status",{detail:status}))}catch(_){}}

async function rpc(name,args){
  var c=client();if(!c)throw new Error("no client");
  var r=await c.rpc(name,args||{});
  if(r.error)throw r.error;
  return r.data;
}
function isMissingBackend(e){
  var m=String(e&&(e.message||e.details||e.hint)||"");
  return(e&&(e.code==="PGRST202"||e.code==="42883"))||/could not find the function|does not exist/i.test(m);
}
function isConflict(e){return!!e&&(e.code==="40001"||/film_catalog_conflict/.test(String(e.message||"")))}

async function runOnce(){
  var u=user(),c=client();
  if(!u||!c||!store())return"skip";
  if(typeof navigator!=="undefined"&&navigator.onLine===false)return"offline";
  var st=readSyncState();
  var local=readLocalDoc();
  /* Інший обліковий запис у цьому ж браузері: чужий локальний каталог у хмару не вантажимо. */
  var foreign=st.uid&&st.uid!==u.id;
  var remoteRow=await rpc("aceil_get_film_catalog");
  var remote=remoteRow&&remoteRow.data?remoteRow.data:null,rev=num(remoteRow&&remoteRow.rev);
  var base=foreign?{v:1,custom:emptyCustom(),pricing:{}}:local;
  var merged=remote?mergeDocs(base,remote):base;
  if(foreign&&!remote)merged={v:1,custom:emptyCustom(),pricing:{}};
  var changedLocal=comparable(merged)!==comparable(local);
  if(changedLocal){applyDoc(merged);merged=readLocalDoc();}
  var needPush=!foreign&&(!remote||st.dirty||comparable(merged)!==comparable(remote));
  if(needPush){
    var body=canon(merged);
    if(body.length>MAX_BYTES)throw new Error("Каталог плівок завеликий для синхронізації.");
    try{
      var newRev=await rpc("aceil_save_film_catalog",{p_data:merged,p_base_rev:rev});
      rev=num(newRev);
    }catch(e){
      if(isConflict(e))return"conflict";
      throw e;
    }
  }
  writeSyncState({dirty:false,uid:u.id,rev:rev,at:Date.now()});
  return changedLocal&&remote?"pulled":"ok";
}

async function cycle(){
  lastRun=Date.now();
  try{
    setStatus("syncing");
    var result,tries=0;
    do{result=await runOnce();tries++}while(result==="conflict"&&tries<3);
    if(result==="skip"){setStatus("idle")}
    else if(result==="offline"){setStatus("offline");scheduleRetry()}
    else if(result==="conflict"){setStatus("error","conflict");scheduleRetry()}
    else{setStatus("ok");if(result==="pulled")toast("☁️ Каталог плівок оновлено з хмари")}
  }catch(e){
    if(isMissingBackend(e)){setStatus("unavailable",e.message)}
    else{diag(e);setStatus("error",e&&e.message||String(e));scheduleRetry()}
  }
}
var pending=null;
/* Один цикл за раз; виклик під час циклу дочекається поточного й запустить ще один. */
function sync(reason){
  if(running){again=true;return pending}
  running=true;
  pending=(async function(){
    try{do{again=false;await cycle()}while(again)}
    finally{running=false}
    return status;
  })();
  return pending;
}
function schedulePush(ms){
  clearTimeout(timer);
  timer=setTimeout(function(){sync("change")},ms==null?DEBOUNCE_MS:ms);
}
function scheduleRetry(){
  clearTimeout(retryTimer);
  retryTimer=setTimeout(function(){if(readSyncState().dirty||status.state==="error"||status.state==="offline")sync("retry")},RETRY_MS);
}

function markDirty(){
  var s=readSyncState();s.dirty=true;writeSyncState(s);
  schedulePush();
}

/* ---------- запуск ---------- */
window.addEventListener("aceil:film-catalog-changed",markDirty);
window.addEventListener("online",function(){sync("online")});
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible"&&Date.now()-lastRun>20000)sync("resume");
});
/* Вхід користувача може статися пізніше за завантаження скриптів: чекаємо на сесію. */
var lastUid=null,polls=0;
var poll=setInterval(function(){
  polls++;
  var u=user();
  if(u&&u.id!==lastUid&&client()){lastUid=u.id;sync("login")}
  else if(!u&&lastUid)lastUid=null;
  if(polls>600)clearInterval(poll);
},2000);

window.ACEILFilmCatalogSync={
  sync:function(){return sync("manual")},
  status:function(){return clone(status)},
  /* чисте злиття — для тестів */
  merge:mergeDocs,mergeCustom:mergeCustom,canon:canon
};
})();
