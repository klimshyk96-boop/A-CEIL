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
   працює локально як раніше.

   Правила безпеки (усе, що йде після await, перевіряється заново):
   - локальна копія читається ПІСЛЯ відповіді хмари і одразу, без await, зливається й записується,
     тому зміна, зроблена під час завантаження, не губиться;
   - прапорець «є зміни» скидається лише якщо за час запиту нових змін не було (лічильник changeSeq);
   - якщо за час запиту змінився акаунт — результат відкидається, нічого не пишеться ні локально,
     ні в хмару; сервер додатково звіряє uid у документі з auth.uid();
   - незавершені зміни іншого акаунта відкладаються в «схованку» й повертаються при його поверненні. */

var STATE_KEY="aceil_film_sync_v1",STASH_KEY="aceil_film_sync_stash_v1";
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
function emptyDoc(){return{v:1,custom:emptyCustom(),pricing:{}}}
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
function identity(c){return c.cid||(c.seriesId+"|"+String(c.display||"").toLowerCase()+"|"+c.texture+"|"+c.code)}

/* Той самий колір (за cid) міг потрапити під різні коди — після розв'язання колізії.
   Позицію (код, mv) бере копія з більшим mv, а вміст — найновіша за u. */
function collapseByIdentity(list){
  var groups={};
  list.forEach(function(c){
    if(!c||!c.seriesId||!c.code)return;
    var id=c.seriesId+"#"+identity(c);(groups[id]=groups[id]||[]).push(c);
  });
  return Object.keys(groups).sort().map(function(id){
    var g=groups[id];
    var place=g.slice().sort(function(x,y){return num(y.mv)-num(x.mv)||num(y.u)-num(x.u)||(String(x.code)<String(y.code)?-1:1)})[0];
    var content=g.slice().sort(function(x,y){return num(y.u)-num(x.u)||num(y.mv)-num(x.mv)})[0];
    var out=clone(content);out.code=place.code;
    if(num(place.mv)>0)out.mv=num(place.mv);else delete out.mv;
    return out;
  });
}

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
    if(dead["s:"+id]!==undefined&&num(dead["s:"+id])>=num(series[id].u))return;
    out.series.push(series[id]);
  });
  var alive={};out.series.forEach(function(s){alive[s.id]=true});

  /* Кольори. Спершу зводимо копії одного кольору (cid) в одну; потім, якщо два РІЗНІ кольори
     претендують на той самий код, переможець (раніший u) лишає код, інший отримує новий вільний
     і позначку mv — щоб застарілі копії на інших пристроях не воскресили старий код. */
  var unique=collapseByIdentity(a.colors.concat(b.colors)).filter(function(c){return alive[c.seriesId]});
  var usedCodes={};
  out.series.forEach(function(s){usedCodes[s.id]={}});
  a.reserved.concat(b.reserved).forEach(function(r){if(r&&usedCodes[r.seriesId])usedCodes[r.seriesId][r.code]=true});
  unique.forEach(function(c){usedCodes[c.seriesId][c.code]=true});
  /* Видалений колір не повертається зі старою копією: надгробок діє і за cid, і за кодом. */
  unique=unique.filter(function(c){
    var byCid=c.cid&&dead["k:"+c.cid]!==undefined,byCode=dead["c:"+c.seriesId+":"+c.code]!==undefined;
    if(!byCid&&!byCode)return true;
    return num(Math.max(byCid?num(dead["k:"+c.cid]):0,byCode?num(dead["c:"+c.seriesId+":"+c.code]):0))<num(c.u);
  });
  var byKey={};
  unique.forEach(function(c){(byKey[c.seriesId+":"+c.code]=byKey[c.seriesId+":"+c.code]||[]).push(c)});
  Object.keys(byKey).sort().forEach(function(k){
    var list=byKey[k].sort(function(x,y){return num(x.u)-num(y.u)||(String(identity(x))<String(identity(y))?-1:1)});
    list.forEach(function(c,i){
      if(i===0){out.colors.push(c);return}
      var prefix=String(c.code).charAt(0),code,n;
      for(n=901;n<=999&&!code;n++)if(!usedCodes[c.seriesId][prefix+n])code=prefix+n;
      for(n=100;n<=900&&!code;n++)if(!usedCodes[c.seriesId][prefix+n])code=prefix+n;
      if(!code)return;
      usedCodes[c.seriesId][code]=true;
      var moved=clone(c);moved.code=code;moved.mv=num(c.mv)+1;out.colors.push(moved);
    });
  });
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
function readJson(key,fallback){
  try{var v=JSON.parse(localStorage.getItem(key)||"null");if(v&&typeof v==="object")return v}catch(_){}
  return fallback;
}
function writeJson(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch(_){}}
function readSyncState(){return readJson(STATE_KEY,{dirty:false,uid:null,rev:0})}
function writeSyncState(s){writeJson(STATE_KEY,s)}
function applyDoc(doc){
  var st=store();if(!st)return false;
  var ok=st.writeCustom(doc.custom);
  return st.writePricing(doc.pricing)&&ok;
}
/* Робочий вигляд для порівняння: без службових полів, що розрізняються між пристроями. */
function comparable(doc){
  var d=clone(doc);if(d){delete d.uid;if(d.custom)delete d.custom.reserved}
  return canon(d);
}

/* ---------- мережа ---------- */
function client(){try{return(typeof _sb!=="undefined"&&_sb)||window._sb||null}catch(_){return window._sb||null}}
function user(){try{return(typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}catch(_){return window._sbUser||null}}
function diag(e){try{window.__diagSilent&&window.__diagSilent(e)}catch(_){}}
function toast(m){try{if(typeof showToast==="function")showToast(m,2600)}catch(_){}}

var running=false,again=false,timer=null,retryTimer=null,lastRun=0,changeSeq=0;
var status={state:"idle",error:null,at:0};
function setStatus(state,error){status={state:state,error:error||null,at:Date.now()};try{window.dispatchEvent(new CustomEvent("aceil:film-sync-status",{detail:status}))}catch(_){}}

async function rpc(c,name,args){
  var r=await c.rpc(name,args||{});
  if(r.error)throw r.error;
  return r.data;
}
function isMissingBackend(e){
  var m=String(e&&(e.message||e.details||e.hint)||"");
  return(e&&(e.code==="PGRST202"||e.code==="42883"))||/could not find the function|does not exist/i.test(m);
}
function isConflict(e){return!!e&&(e.code==="40001"||/film_catalog_conflict/.test(String(e.message||"")))}
function isUserChanged(e){return/film_catalog_user_changed/.test(String(e&&e.message||""))}
/* Після застосування каталогу позиції у відкритій кімнаті звіряються з кольорами за cid
   (код кольору міг змінитися): колір не підміняється, кількість зберігається. */
function healLive(){
  try{
    if(typeof window.A_CEIL_NormalizeFilmGroups==="function"&&window.A_CEIL_NormalizeFilmGroups()){
      if(typeof renderElemList==="function")renderElemList();
      if(typeof recalcElemTotal==="function")recalcElemTotal();
      if(typeof saveState==="function")saveState();
    }
  }catch(e){diag(e)}
}
/* Той самий акаунт і той самий клієнт, що були на початку циклу? */
function same(u,c){var cu=user();return!!cu&&cu.id===u.id&&client()===c}

/* Схованка: незавершена робота акаунта, який на цьому пристрої перестав бути активним. */
function stashRead(uid){var s=readJson(STASH_KEY,{});return s[uid]||null}
function stashWrite(uid,entry){var s=readJson(STASH_KEY,{});if(entry)s[uid]=entry;else delete s[uid];writeJson(STASH_KEY,s)}

async function runOnce(){
  var u=user(),c=client();
  if(!u||!c||!store())return"skip";
  if(typeof navigator!=="undefined"&&navigator.onLine===false)return"offline";

  var remoteRow=await rpc(c,"aceil_get_film_catalog");
  if(!same(u,c))return"switched";
  if(remoteRow&&remoteRow.uid&&remoteRow.uid!==u.id)return"switched";

  /* ---- далі БЕЗ await до запису локальних даних: ніхто не встигне змінити каталог між читанням і записом ---- */
  var st=readSyncState(),seq0=changeSeq;
  var remote=remoteRow&&remoteRow.data?remoteRow.data:null,rev=num(remoteRow&&remoteRow.rev);
  var local=readLocalDoc();
  var foreign=!!st.uid&&st.uid!==u.id,dirty=!!st.dirty,base=local;
  if(foreign){
    stashWrite(st.uid,{doc:local,dirty:dirty,at:Date.now()});
    var mine=stashRead(u.id);
    base=mine&&mine.doc?mine.doc:emptyDoc();dirty=!!(mine&&mine.dirty);
    stashWrite(u.id,null);
    st={dirty:dirty,uid:u.id,rev:0};writeSyncState(st);
    applyDoc(base);
  }
  var merged=remote?mergeDocs(base,remote):base;
  var changedLocal=comparable(merged)!==comparable(readLocalDoc());
  if(changedLocal){applyDoc(merged);merged=readLocalDoc();healLive();}
  var needPush=!remote||dirty||comparable(merged)!==comparable(remote);
  var pushed=false;
  if(needPush){
    var body=canon(merged);
    if(body.length>MAX_BYTES)throw new Error("Каталог плівок завеликий для синхронізації.");
    var doc=clone(merged);doc.uid=u.id;
    try{
      rev=num(await rpc(c,"aceil_save_film_catalog",{p_data:doc,p_base_rev:rev}));
      pushed=true;
    }catch(e){
      if(isConflict(e))return"conflict";
      if(isUserChanged(e))return"switched";
      throw e;
    }
  }
  if(!same(u,c))return"switched";
  /* Зміни, зроблені за час запиту, не відправлені — лишаємо dirty і запускаємо ще цикл. */
  var late=changeSeq!==seq0;
  writeSyncState({dirty:late,uid:u.id,rev:rev,at:Date.now()});
  if(late)again=true;
  return changedLocal&&remote?"pulled":(pushed?"ok":"ok");
}

async function cycle(){
  lastRun=Date.now();
  try{
    setStatus("syncing");
    var result,tries=0;
    do{result=await runOnce();tries++}while((result==="conflict"||result==="switched")&&tries<3);
    if(result==="skip"){setStatus("idle")}
    else if(result==="offline"){setStatus("offline");scheduleRetry()}
    else if(result==="conflict"||result==="switched"){setStatus("error",result);scheduleRetry()}
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
  changeSeq++;
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
