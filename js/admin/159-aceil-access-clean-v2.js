
(function(){
'use strict';
var busy=false, ACCESS=null, NOM_DENIED=false, lastAccessSig='', lastResumeRightsAt=0;
var ACCESS_CACHE_KEY='A_CEIL_access_snapshot_v1';
function accessSig(a){if(!a)return'';return [a.app_role,a.is_active,a.owner_id,a.nomenclature_access,a.projects_access,a.projects_edit,a.projects_scope,a.access_until].map(function(v){return String(v==null?'':v)}).join('|')}
function sb(){try{var c=(typeof _sb!=='undefined'&&_sb)||window._sb||null;if(c&&!window._sb)window._sb=c;return c}catch(e){return window._sb||null}}
function usr(){try{var u=(typeof _sbUser!=='undefined'&&_sbUser)||window._sbUser||null;if(u&&!window._sbUser)window._sbUser=u;return u}catch(e){return window._sbUser||null}}
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
function setGlobal(n,v){try{window[n]=v}catch(e){};try{if(n==='elemItems')elemItems=v;if(n==='elemGroups')elemGroups=v;if(n==='lightTypes')lightTypes=v}catch(e){}}
function refreshNomUI(){try{if(typeof renderElemList==='function')renderElemList()}catch(e){};try{if(typeof updateElemBadge==='function')updateElemBadge()}catch(e){};try{if(typeof recalcElemTotal==='function')recalcElemTotal()}catch(e){};try{if(typeof renderLightMenu==='function')renderLightMenu()}catch(e){}}
function clearNom(){setGlobal('elemItems',[]);setGlobal('elemGroups',[]);setGlobal('lightTypes',[]);refreshNomUI()}
function applyNomGate(a){var owner=String(a&&a.app_role||'').toLowerCase()==='owner';NOM_DENIED=!owner&&(!a||a.nomenclature_access!==true);window.A_CEIL_NOMENCLATURE_DENIED=NOM_DENIED;if(NOM_DENIED)clearNom();return NOM_DENIED}
function saveAccessSnapshot(a,u){if(!a||!u||!u.id)return;try{localStorage.setItem(ACCESS_CACHE_KEY,JSON.stringify({userId:String(u.id),savedAt:Date.now(),access:a}))}catch(e){}}
function offlineAccess(u){
  if(!u||!u.id)return null;
  if(String(u.email||'').toLowerCase()==='klimshyk96@gmail.com')return {app_role:'owner',is_active:true,owner_id:u.id,nomenclature_access:true,projects_access:true,projects_edit:true,projects_scope:'all'};
  try{var row=JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY)||'null');return row&&String(row.userId)===String(u.id)&&row.access?row.access:null}catch(e){return null}
}
function enterOffline(u){try{if(typeof window.A_CEIL_enterOfflineMode==='function')window.A_CEIL_enterOfflineMode(u)}catch(e){}var el=document.getElementById('cloudStatus');if(el)el.textContent='⚠️ офлайн · локальні дані'}
async function rights(){var c=sb(),u=usr();if(!u)return null;if(!navigator.onLine){var cached=offlineAccess(u);if(cached){ACCESS=cached;window.A_CEIL_MY_ACCESS=cached}return cached}if(!c)return offlineAccess(u);try{var r=await c.rpc('get_my_access');if(r.error)throw r.error;var a=Array.isArray(r.data)?r.data[0]:r.data;if(!a)return null;ACCESS=a;window.A_CEIL_MY_ACCESS=a;saveAccessSnapshot(a,u);applyNomGate(a);return a}catch(e){if(isTransientNetworkError(e)){var fallback=offlineAccess(u);if(fallback){ACCESS=fallback;window.A_CEIL_MY_ACCESS=fallback}return fallback}throw e}}
function nomItemKey(it){if(!it)return'';if(it.id!=null)return'id:'+String(it.id);return'n:'+String(it.name||'').trim().toLowerCase()+'|g:'+String(it.groupId==null?'':it.groupId)+'|u:'+String(it.unit||'')}
function currentNomItems(){try{return clone(typeof elemItems!=='undefined'&&Array.isArray(elemItems)?elemItems:(window.elemItems||[]))}catch(e){return clone(window.elemItems||[])}}
function mergeCatalogWithRoomResults(catalog,current){
  var cur=Array.isArray(current)?current:[],scoped=cur.filter(function(it){return it&&it.filmPickerManaged===true&&it.roomScoped===true}),scopedGroups={};
  scoped.forEach(function(it){scopedGroups[String(it.groupId)]=true});
  var by={};cur.forEach(function(it){var k=nomItemKey(it);if(k)by[k]=it});
  var roomFields=['qty','manualQtyOverride','autoFilled','autoZero','calculatedQty','autoQty','resultQty','computedQty','lineTotal','total','sum','amount','price'];
  var out=(Array.isArray(catalog)?catalog:[]).filter(function(it){return !(scopedGroups[String(it&&it.groupId)]&&Number(it&&it.filmWidth)>0)}).map(function(src){
    var it=clone(src||{}),old=by[nomItemKey(src)];
    if(!it.unit)it.unit='шт';
    if(it.groupId===undefined)it.groupId=null;
    if(it.price===undefined)it.price=0;
    if(!it.inputMode)it.inputMode='manual';
    if(!it.icon)it.icon='📦';
    it.qty=0;it.manualQtyOverride=false;
    if(old){
      roomFields.forEach(function(k){
        if(Object.prototype.hasOwnProperty.call(old,k))it[k]=clone(old[k]);
      });
    }
    return it;
  });
  return out.concat(scoped.map(clone));
}
function mergeCatalogGroupsWithRoom(catalog,current){var out=clone(Array.isArray(catalog)?catalog:[]),seen={};out.forEach(function(g){seen[String(g&&g.id)]=true});(Array.isArray(current)?current:[]).filter(function(g){return g&&g.roomScoped===true&&g.roomScopedKind==='film-color'}).forEach(function(g){if(!seen[String(g.id)])out.unshift(clone(g))});return out}
async function loadNom(a){var c=sb(),u=usr();if(!c||!u)return false;if(applyNomGate(a))return false;var owner=String(a&&a.app_role||'').toLowerCase()==='owner';var source=owner?u.id:a.owner_id;if(!source){clearNom();return false}var r=await c.from('nomenclature').select('user_id,items,groups,wall_presets,light_types').eq('user_id',source).maybeSingle();if(r.error)throw r.error;if(!r.data){clearNom();return false}var d=r.data,current=currentNomItems(),currentGroups=clone(typeof elemGroups!=='undefined'&&Array.isArray(elemGroups)?elemGroups:(window.elemGroups||[]));setGlobal('elemGroups',mergeCatalogGroupsWithRoom(d.groups,currentGroups));var items=mergeCatalogWithRoomResults(clone(Array.isArray(d.items)?d.items:[]),current);setGlobal('elemItems',items);try{window.__A·CEILNomenCatalogV339={items:clone(Array.isArray(d.items)?d.items:[]),groups:clone(Array.isArray(d.groups)?d.groups:[])}}catch(e){}if(Array.isArray(d.light_types))setGlobal('lightTypes',clone(d.light_types));refreshNomUI();return true}
function mapProject(p){var st={};try{st=typeof p.state==='string'?JSON.parse(p.state):p.state||{}}catch(e){};var multi=st.multiRoom===true;return {id:p.id,_dbId:p.id,name:p.name,addr:p.addr||'',phone:p.phone||'',comment:p.comment||'',area:p.area||'',per:p.per||'',inC:p.in_corners||'',outC:p.out_corners||'',thumb:p.thumb||'',date:p.created_at?new Date(p.created_at).toLocaleDateString('uk-UA'):'',multiRoom:multi,rooms:multi?(st.rooms||[]):undefined,state:multi?null:(typeof p.state==='string'?p.state:JSON.stringify(st))}}
function replaceProjects(rows){var mapped=(rows||[]).map(mapProject);try{if(window.A·CEIL&&window.A·CEIL.ProjectRepository)window.A·CEIL.ProjectRepository.replaceAll(mapped);else if(typeof setProjects==='function')setProjects(mapped)}catch(e){};try{if(typeof renderProjects==='function')renderProjects()}catch(e){}}
async function loadProjects(a){var c=sb(),u=usr();if(!c||!u)return false;var owner=String(a&&a.app_role||'').toLowerCase()==='owner';if(!owner&&(!a||a.projects_access!==true)){replaceProjects([]);return false}var r=await c.from('projects').select('*').order('created_at',{ascending:false});if(r.error)throw r.error;replaceProjects(r.data||[]);return true}
async function refresh(){if(busy)return false;var c=sb(),u=usr();if(!u)return false;if(!navigator.onLine){var cached=offlineAccess(u);if(cached){ACCESS=cached;applyNomGate(cached);lastAccessSig=accessSig(cached)}enterOffline(u);return true}if(!c)return false;busy=true;try{var a=await rights();if(!a)return false;await Promise.all([loadNom(a),loadProjects(a)]);applyNomGate(a);lastAccessSig=accessSig(a);return true}catch(e){if(isTransientNetworkError(e)){enterOffline(u);return true}console.error('[A·CEIL access]',e);try{if(typeof showToast==='function')showToast('Помилка доступу: '+(e.message||e),4500)}catch(_){};return false}finally{busy=false}}
async function refreshOnResume(){if(busy)return false;var now=Date.now();if(now-lastResumeRightsAt<1200)return true;lastResumeRightsAt=now;var c=sb(),u=usr();if(!u)return false;if(!navigator.onLine){enterOffline(u);return true}if(!c)return false;busy=true;try{var prev=lastAccessSig||accessSig(ACCESS),a=await rights();if(!a)return false;var sig=accessSig(a);if(sig!==prev){await Promise.all([loadNom(a),loadProjects(a)])}else{applyNomGate(a)}lastAccessSig=sig;return true}catch(e){if(isTransientNetworkError(e)){enterOffline(u);return true}console.error('[A·CEIL access resume]',e);return false}finally{busy=false}}
/* Nomenclature window remains available. OFF means its catalogue is empty for a non-owner. */
var oldElements=window.openElementsModal||(typeof openElementsModal==='function'?openElementsModal:null);if(typeof oldElements==='function'){var openElementsClean=async function(){var a=null;try{a=await rights();if(a)applyNomGate(a)}catch(e){}var r=oldElements.apply(this,arguments);if(a&&applyNomGate(a))setTimeout(clearNom,0);return r};window.openElementsModal=openElementsClean;try{openElementsModal=openElementsClean}catch(e){}}
/* Prevent room/project snapshots from resurrecting catalogue rows while access is OFF. */
var oldRoomLoad=window._loadRoomToCanvas||(typeof _loadRoomToCanvas==='function'?_loadRoomToCanvas:null);if(typeof oldRoomLoad==='function'){var roomLoadGated=function(){var r=oldRoomLoad.apply(this,arguments);if(NOM_DENIED){clearNom();setTimeout(clearNom,0)}return r};window._loadRoomToCanvas=roomLoadGated;try{_loadRoomToCanvas=roomLoadGated}catch(e){}}
/* If any older module adds an item later (lights, room restore, local state), purge it before nomenclature renders. */
var oldRender=window.renderElemList||(typeof renderElemList==='function'?renderElemList:null);if(typeof oldRender==='function'){var renderGated=function(){if(NOM_DENIED){setGlobal('elemItems',[]);setGlobal('elemGroups',[])}return oldRender.apply(this,arguments)};window.renderElemList=renderGated;try{renderElemList=renderGated}catch(e){}}
var oldProjects=window.openProjectsModal||(typeof openProjectsModal==='function'?openProjectsModal:null);if(typeof oldProjects==='function'){var openProjectsClean=async function(){if(navigator.onLine)try{var a=await rights();await loadProjects(a)}catch(e){if(!isTransientNetworkError(e))console.error('[A·CEIL projects]',e)}return oldProjects.apply(this,arguments)};window.openProjectsModal=openProjectsClean;try{openProjectsModal=openProjectsClean}catch(e){}}
window.forceLoadNomenclature=async function(){if(!navigator.onLine)return false;var a=await rights();return a?loadNom(a):false};try{forceLoadNomenclature=window.forceLoadNomenclature}catch(e){};try{loadNomenclatureFromCloud=window.forceLoadNomenclature}catch(e){}
window.A_CEIL_forceAccessRefresh=refresh;
function boot(n){if(n>20)return;setTimeout(async function(){if(await refresh())return;boot(n+1)},300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){boot(0)},{once:true});else boot(0);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(refreshOnResume,200)});

/* LIVE ACCESS — Supabase Realtime. Rights changes on another device are applied immediately. */
var liveChannel=null, liveTimer=null, liveUid=null, liveRetryCount=0;
function isTransientNetworkError(e){return !navigator.onLine||/load failed|failed to fetch|networkerror|network request failed|timeout|таймаут/i.test(String(e&&e.message||e||''))}
function scheduleLiveRefresh(){
  clearTimeout(liveTimer);
  liveTimer=setTimeout(async function(){
    try{
      var a=await rights();
      if(!a){ clearNom(); replaceProjects([]); return; }
      await Promise.all([loadNom(a),loadProjects(a)]);
      applyNomGate(a);lastAccessSig=accessSig(a);liveRetryCount=0;
    }catch(e){
      if(isTransientNetworkError(e)){
        if(navigator.onLine&&liveRetryCount<2){liveRetryCount++;setTimeout(scheduleLiveRefresh,1000*liveRetryCount);return;}
        try{var log=window.A·CEIL&&window.A·CEIL.DebugLog;if(log&&log.warn)log.warn('realtime_access_network_unavailable',{attempts:liveRetryCount+1,message:String(e&&e.message||e)})}catch(_){}
        liveRetryCount=0;return;
      }
      console.error('[A·CEIL realtime access]',e);
    }
  },60);
}
function safeRemoveLiveChannel(client,ch){
  if(!client||!ch)return;
  try{var p=client.removeChannel(ch);if(p&&typeof p.catch==='function')p.catch(function(){})}catch(e){}
}
function startLiveAccess(n){
  n=n||0;
  if(!navigator.onLine)return;
  var c=sb(),u=usr();
  if(!c||!u||!u.id){ if(n<30)setTimeout(function(){startLiveAccess(n+1)},300); return; }
  if(liveChannel && liveUid===u.id)return;
  if(liveChannel){var oldCh=liveChannel;liveChannel=null;safeRemoveLiveChannel(c,oldCh)}
  liveUid=u.id;
  var ch=c.channel('aceil-access-'+u.id+'-'+Date.now())
    .on('postgres_changes',{event:'*',schema:'public',table:'user_access',filter:'user_id=eq.'+u.id},scheduleLiveRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'project_access',filter:'user_id=eq.'+u.id},scheduleLiveRefresh)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:'id=eq.'+u.id},scheduleLiveRefresh);
  liveChannel=ch;
  ch.subscribe(function(status){
    if(status==='SUBSCRIBED')scheduleLiveRefresh();
    if((status==='CHANNEL_ERROR'||status==='TIMED_OUT')&&navigator.onLine)setTimeout(function(){
      if(liveChannel!==ch)return;
      liveChannel=null;
      safeRemoveLiveChannel(c,ch);
      startLiveAccess(0);
    },1000);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){startLiveAccess(0)},{once:true});else startLiveAccess(0);
window.addEventListener('online',function(){setTimeout(function(){refresh();startLiveAccess(0)},250)});
/* Session changes (login/logout/account switch) rebuild the live subscription. */
try{var _liveSb=sb();if(_liveSb&&_liveSb.auth&&_liveSb.auth.onAuthStateChange)_liveSb.auth.onAuthStateChange(function(){var ch=liveChannel;liveChannel=null;liveUid=null;safeRemoveLiveChannel(_liveSb,ch);setTimeout(function(){startLiveAccess(0)},100)})}catch(e){}
})();

/* Canonical post-password hydration is part of the access/auth authority. */
(function(){
  'use strict';

  var originalDoAuth = window.doAuth;
  if (typeof originalDoAuth !== 'function' || originalDoAuth.__aCeilHydrationWrapped) return;

  var state = window.A_CEIL_AuthHydrationStatus = window.A_CEIL_AuthHydrationStatus || {
    version: 'CLEAN-TEST10',
    attempts: 0,
    lastMethod: null,
    lastStartedAt: 0,
    lastFinishedAt: 0,
    sessionUser: null,
    projectsAfter: null,
    nomenclatureLoaded: null,
    ok: null,
    error: null
  };

  function sleep(ms){ return new Promise(function(resolve){ setTimeout(resolve, ms); }); }

  async function getSessionUser(){
    try{
      if (!window._sb || !window._sb.auth || typeof window._sb.auth.getSession !== 'function') return null;
      var r = await window._sb.auth.getSession();
      return r && r.data && r.data.session ? r.data.session.user : null;
    }catch(e){ return null; }
  }

  async function waitForSession(maxMs){
    var started = Date.now();
    var user = null;
    while (Date.now() - started < maxMs){
      user = await getSessionUser();
      if (user) return user;
      await sleep(180);
    }
    return null;
  }

  async function hydrateAfterPasswordLogin(){
    state.attempts += 1;
    state.lastStartedAt = Date.now();
    state.lastMethod = 'password';
    state.error = null;
    state.ok = false;

    try{
      var user = await waitForSession(5000);
      if (!user) return false;

      state.sessionUser = user.id || user.email || 'session';
      try{ window._sbUser = user; }catch(_e){}

      // Respect the same access gate as the original application.
      if (typeof window.A_CEIL_checkActive === 'function'){
        var allowed = await window.A_CEIL_checkActive(user);
        if (!allowed) return false;
      }

      try{ if (typeof window.hideAuthScreen === 'function') window.hideAuthScreen(); }catch(_e){}

      // Canonical existing loader: it fetches projects AND nomenclature.
      // Do not rely on SIGNED_IN timing after password auth.
      if (typeof window.loadProjectsFromCloud === 'function'){
        await window.loadProjectsFromCloud();
      } else {
        // Fallback only if the canonical loader is unavailable.
        if (typeof window.forceLoadNomenclature === 'function') await window.forceLoadNomenclature();
      }

      // A second read is harmless and closes a Safari/auth-event race where
      // the first call was coalesced with an older in-flight promise.
      await sleep(350);
      if (typeof window.getProjects === 'function'){
        var ps = window.getProjects();
        if ((!Array.isArray(ps) || ps.length === 0) && typeof window.loadProjectsFromCloud === 'function'){
          await window.loadProjectsFromCloud();
        }
      }

      state.projectsAfter = (typeof window.getProjects === 'function' && Array.isArray(window.getProjects()))
        ? window.getProjects().length : null;
      state.nomenclatureLoaded = !!window._nomenCloudLoaded;
      state.ok = true;
      state.lastFinishedAt = Date.now();
      return true;
    }catch(e){
      state.error = String(e && (e.message || e) || 'unknown');
      state.lastFinishedAt = Date.now();
      try{ if (window.__diagSilent) window.__diagSilent(e); }catch(_e){}
      return false;
    }
  }

  var wrapped = async function(){
    var wasLogin = true;
    try{ wasLogin = (typeof _authMode === 'undefined' || _authMode === 'login'); }catch(_e){}

    var result = await originalDoAuth.apply(this, arguments);
    if (wasLogin){
      // Explicit post-password hydration. The session check prevents this
      // from running after a failed login.
      await hydrateAfterPasswordLogin();
    }
    return result;
  };
  wrapped.__aCeilHydrationWrapped = true;
  wrapped.__original = originalDoAuth;

  window.doAuth = wrapped;
  try{ doAuth = wrapped; }catch(_e){}
  window.A_CEIL_HydrateAfterPasswordLogin = hydrateAfterPasswordLogin;
  window.A_CEIL_HydrateAfterAuth = hydrateAfterPasswordLogin;
  window.A_CEIL_Test5AuthStatus = state;
})();
