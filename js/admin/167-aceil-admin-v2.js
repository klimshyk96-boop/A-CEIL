
(function(){
"use strict";
var profile=null,loading=false;

function sb(){try{return (typeof _sb!=="undefined"&&_sb)||window._sb||null}catch(e){return window._sb||null}}
function currentUser(){try{return (typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}catch(e){return window._sbUser||null}}
function esc(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]})}
function toast(t){try{if(typeof showToast==="function")showToast(t,3500)}catch(e){}}
function content(v){var e=document.getElementById("aceilAdminContent");if(e)e.innerHTML=v}

function removeLegacyMenuItem(){
  var btn=document.getElementById("A_CEIL_AdminMenuAction");
  var sep=document.getElementById("A_CEIL_AdminMenuSeparator");
  if(btn&&btn.parentNode)btn.parentNode.removeChild(btn);
  if(sep&&sep.parentNode)sep.parentNode.removeChild(sep);
}
function legacyTopAdminButton(){
  var dock=document.getElementById("A_CEIL_OwnerAdminDock");
  if(dock)return dock;
  var cockpit=document.getElementById("rpCockpit");
  if(!cockpit||!cockpit.parentNode)return null;
  dock=document.createElement("div");
  dock.id="A_CEIL_OwnerAdminDock";
  dock.className="aceil-owner-admin-dock";
  dock.style.cssText="width:100%;max-width:1200px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;";
  dock.innerHTML='<button type="button" id="A_CEIL_OwnerAdminButton" class="aceil-owner-admin-button" aria-label="Відкрити адміністрування"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 19 6v5.1c0 4.4-2.7 7.7-7 9.7-4.3-2-7-5.3-7-9.7V6l7-2.8Z"></path><circle cx="12" cy="10" r="2.1"></circle><path d="M8.8 16.1c.8-1.7 1.9-2.5 3.2-2.5s2.4.8 3.2 2.5"></path></svg><span>Адміністрування</span></button>';
  var button=dock.querySelector("button");
  button.style.cssText="width:auto;min-width:0;min-height:40px;height:40px;padding:0 15px;border:1px solid rgba(99,102,241,.20);border-radius:15px;background:rgba(255,255,255,.88);color:#334155;box-shadow:0 8px 22px rgba(15,23,42,.08);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:900;line-height:1;";
  var icon=button.querySelector("svg");
  icon.style.cssText="display:block;width:18px;height:18px;min-width:18px;fill:none;stroke:#4f46e5;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;";
  button.onclick=function(){window.A_CEIL_Admin.open()};
  cockpit.parentNode.insertBefore(dock,cockpit);
  return dock;
}
function removeTopAdminButton(){
  var dock=document.getElementById("A_CEIL_OwnerAdminDock");
  if(dock&&dock.parentNode)dock.parentNode.removeChild(dock);
  var button=document.getElementById("A_CEIL_OwnerAdminButton");
  if(button&&button.parentNode)button.parentNode.removeChild(button);
}
function ensureHeaderActions(){
  var top=document.querySelector("#rpCockpit .rpc-top");
  if(!top)return null;
  var actions=document.getElementById("A_CEIL_HeaderActions");
  if(!actions){actions=document.createElement("div");actions.id="A_CEIL_HeaderActions";actions.className="aceil-head-actions"}
  var right=top.querySelector(".rpc-head-right")||document.getElementById("rpcStatus");
  if(actions.parentNode!==top||actions.nextSibling!==right)top.insertBefore(actions,right||null);
  if(!document.getElementById("A_CEIL_HeaderLogout")){
    var logout=document.createElement("button");
    logout.type="button";logout.id="A_CEIL_HeaderLogout";logout.className="aceil-head-action aceil-head-logout";
    logout.title="Вийти з акаунта";logout.setAttribute("aria-label","Вийти з акаунта");
    logout.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M10 12h10m-4-4 4 4-4 4"/></svg>';
    logout.onclick=function(){if(typeof window.rpcLogout==="function")window.rpcLogout();else if(typeof window.signOut==="function")window.signOut()};
    actions.appendChild(logout);
  }
  var old=document.querySelector("#rpCockpit .rpc-tools .rpc-logout");
  if(old)old.remove();
  return actions;
}
function ensureCockpitAdminButton(){
  var actions=ensureHeaderActions();
  if(!actions)return null;
  var button=document.getElementById("A_CEIL_OwnerAdminButton");
  if(button)return button;
  button=document.createElement("button");
  button.type="button";button.id="A_CEIL_OwnerAdminButton";button.className="aceil-head-action aceil-head-admin";
  button.title="Адміністрування";button.setAttribute("aria-label","Адміністрування");
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 16h7M14 19h4M19 14v4"/></svg>';
  button.onclick=function(){window.A_CEIL_Admin.open()};
  actions.insertBefore(button,actions.firstChild);
  return button;
}
function visible(v){
  removeLegacyMenuItem();
  ensureHeaderActions();
  if(v)ensureCockpitAdminButton();else removeTopAdminButton();
}
async function refreshOwner(authUser){
  visible(false); profile=null;
  var c=sb(),u=authUser||currentUser();
  if(!c||!u||!u.id)return false;
  try{
    /* Server RPC is the authority for admin access. Avoid a second direct
       profiles SELECT here: RLS/read failures must not create a false
       client-side lockout before the protected RPC can decide. */
    var r=await c.rpc("admin_list_users");
    if(r.error)throw r.error;
    var rows=Array.isArray(r.data)?r.data:[];
    profile=rows.find(function(x){return String(x.user_id||x.id||"")===String(u.id)})||null;
    var ok=!!(profile&&profile.app_role==="owner"&&profile.is_active===true);
    visible(ok); return ok;
  }catch(e){
    window.__diagSilent&&window.__diagSilent(e);
    /* UI-only fail-safe for the known primary owner. Server RPCs still
       enforce real permissions and cannot be bypassed by this. */
    var ownerEmail=String(u.email||"").trim().toLowerCase();
    var fallback=ownerEmail==="klimshyk96@gmail.com";
    visible(fallback); return fallback;
  }
}
function reset(){profile=null;visible(false);close()}

function accessIcon(key){
  var p={
    nomenclature_access:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    projects_access:'<path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/>',
    projects_edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    report_publish:'<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    is_active:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  }; return '<span class="aceil-access-icon '+key+'"><svg viewBox="0 0 24 24">'+(p[key]||'')+'</svg></span>';
}
function foldIcon(kind){
  var icons={
    workspace:'<circle cx="12" cy="8" r="3"/><path d="M6 20a6 6 0 0 1 12 0"/><path d="M18 5h3v3"/>',
    walls:'<path d="M4 5h16v14H4z"/><path d="M4 11h16M10 5v6m5 0v8"/>',
    expiry:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    danger:'<path d="M3 6h18"/><path d="M8 6V4h8v2M19 6l-1 14H6L5 6"/>'
  };
  return '<span class="aceil-fold-icon '+esc(kind)+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[kind]||'')+'</svg></span>';
}
function foldSummary(kind,title,status,statusClass){
  return '<summary>'+foldIcon(kind)+'<span class="aceil-fold-copy"><span class="aceil-fold-title">'+esc(title)+'</span><small class="'+esc(statusClass||'')+'">'+esc(status)+'</small></span></summary>';
}
function toggle(uid,key,label,desc,val,disabled){
  return '<div class="aceil-admin-row">'+accessIcon(key)+'<div class="aceil-admin-row-text"><b>'+esc(label)+'</b><small>'+esc(desc)+'</small></div><label class="aceil-switch"><input type="checkbox" '+(val?'checked ':'')+(disabled?'disabled ':'')+'onchange="A_CEIL_Admin.setAccess(\''+esc(uid)+'\',\''+esc(key)+'\',this.checked,this)"><span class="aceil-slider"></span></label></div>';
}
function expiryValue(r){return r&&(r.access_until||r.access_expires_at||r.access_expiry||r.expires_at)||null}
function expiryInfo(r){
  var raw=expiryValue(r); if(!raw)return {active:false,text:"Без обмеження часу"};
  var d=new Date(raw); if(isNaN(d.getTime()))return {active:false,text:"Без обмеження часу"};
  var active=d.getTime()>Date.now(),txt;
  try{txt=new Intl.DateTimeFormat("uk-UA",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d)}catch(e){txt=d.toLocaleString()}
  return {active:active,text:(active?"Доступ до: ":"Термін минув: ")+txt};
}
function tempAccess(uid,r){
  var x=expiryInfo(r);
  return '<details class="aceil-admin-fold" data-admin-section="expiry">'+foldSummary('expiry','Тимчасовий доступ',x.text,x.active?'ready':'')+'<div class="aceil-temp-access"><div class="aceil-temp-buttons">'+
    [1,3,8,24].map(function(h){return '<button type="button" class="aceil-temp-btn" onclick="A_CEIL_Admin.setExpiry(\''+esc(uid)+'\','+h+',this)">'+h+' год</button>'}).join('')+
    '</div>'+(x.active?'<button type="button" class="aceil-temp-cancel" onclick="A_CEIL_Admin.clearExpiry(\''+esc(uid)+'\',this)">Скасувати тимчасовий доступ</button>':'')+'</div></details>';
}
function projectScope(uid,r){
  var scope=(r.projects_scope==='all'?'all':'selected');
  return '<div class="aceil-project-scope"><div class="aceil-project-scope-title">Проєкти</div><div class="aceil-scope-buttons">'+
    '<button type="button" class="aceil-scope-btn '+(scope==='selected'?'active':'')+'" onclick="A_CEIL_Admin.setScope(\''+esc(uid)+'\',\'selected\',this)">Вибрані</button>'+
    '<button type="button" class="aceil-scope-btn '+(scope==='all'?'active':'')+'" onclick="A_CEIL_Admin.setScope(\''+esc(uid)+'\',\'all\',this)">Усі мої</button></div>'+
    (scope==='selected'?'<button type="button" class="aceil-project-picker-btn" onclick="A_CEIL_Admin.toggleProjects(\''+esc(uid)+'\',this)">Вибрати проєкти</button><div id="aceilProjects_'+esc(uid)+'" class="aceil-project-list" style="display:none"></div>':'')+
    '</div>';
}
var adminRows=[],activityByUser={},workspaceByUser={};
function workspaceBox(uid,r){
  var ready=!!r.workspace_initialized,copied=!!r.workspace_copied;
  if(ready)return '<details class="aceil-admin-fold" data-admin-section="workspace">'+foldSummary('workspace','Особисті дані','✓ Ізольовано','ready')+'<div class="aceil-workspace-box ready"><div><small>'+(copied?'Незалежна копія твоєї номенклатури.':'Власний ізольований кабінет.')+'</small></div><div class="aceil-workspace-actions change"><button type="button" onclick="A_CEIL_Admin.initializeWorkspace(\''+esc(uid)+'\',false,this,true)">Очистити</button><button type="button" class="copy" onclick="A_CEIL_Admin.initializeWorkspace(\''+esc(uid)+'\',true,this,true)">Замінити копією</button></div></div></details>';
  return '<div class="aceil-workspace-box"><div><b>Початкові дані користувача</b><small>Після створення всі його зміни лишатимуться тільки в нього.</small></div><div class="aceil-workspace-actions"><button type="button" onclick="A_CEIL_Admin.initializeWorkspace(\''+esc(uid)+'\',false,this,false)">Порожній</button><button type="button" class="copy" onclick="A_CEIL_Admin.initializeWorkspace(\''+esc(uid)+'\',true,this,false)">Копія моїх даних</button></div></div>';
}
function wallCatalogBox(uid,r){
  if(!r.workspace_initialized)return '';
  return '<details class="aceil-admin-fold" data-admin-section="walls">'+foldSummary('walls','Заготовки та елементи стін','Копіювання','')+'<div class="aceil-wall-copy-box"><div><small>Зміни користувача залишаються тільки в його кабінеті.</small></div><div class="aceil-workspace-actions"><button type="button" onclick="A_CEIL_Admin.copyWallCatalog(\''+esc(uid)+'\',\'merge\',this)">Додати відсутні</button><button type="button" class="copy" onclick="A_CEIL_Admin.copyWallCatalog(\''+esc(uid)+'\',\'replace\',this)">Замінити всі</button></div></div></details>';
}
function initials(r){var x=String((r&&r.name)||r.email||'?').trim();return (x[0]||'?').toUpperCase()}
function durationText(sec){sec=Math.max(0,Number(sec)||0);var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);if(h)return h+' год '+m+' хв';if(m)return m+' хв';return sec?'< 1 хв':'—'}
function dateTimeText(v){if(!v)return 'Ще не заходив';var d=new Date(v);if(isNaN(d.getTime()))return 'Ще не заходив';try{return new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)}catch(e){return d.toLocaleString()}}
function renderActivity(){
  var ap=document.getElementById('aceilActivityPane');if(!ap)return;
  var rows=adminRows||[];
  ap.innerHTML='<div class="aceil-activity-head"><b>Активність користувачів</b><span>Онлайн — активність за останні 90 секунд. Час рахується лише поки A·CEIL відкритий на екрані.</span></div>'+rows.map(function(r){
    var uid=String(r.user_id||r.id||''),a=activityByUser[uid]||{},online=!!a.is_online;
    return '<div class="aceil-activity-card"><div class="aceil-activity-user"><span class="dot '+(online?'online':'')+'"></span><div><b>'+esc(r.name||r.email||'Користувач')+'</b><small>'+esc(r.email||'')+'</small></div><em>'+(online?'Онлайн':'Офлайн')+'</em></div><div class="aceil-activity-grid"><div><span>Останній вхід</span><b>'+esc(dateTimeText(a.last_started_at))+'</b></div><div><span>Остання активність</span><b>'+esc(dateTimeText(a.last_seen_at))+'</b></div><div><span>Остання сесія</span><b>'+durationText(a.last_session_seconds)+'</b></div><div><span>Сьогодні</span><b>'+durationText(a.today_seconds)+'</b></div><div><span>7 днів</span><b>'+durationText(a.week_seconds)+'</b></div><div><span>Всього</span><b>'+durationText(a.total_seconds)+'</b></div></div></div>';
  }).join('');
}
async function loadActivityData(){
  activityByUser={};var c=sb();if(!c)return;
  try{var r=await c.rpc('admin_user_activity');if(r.error)throw r.error;(Array.isArray(r.data)?r.data:[]).forEach(function(a){activityByUser[String(a.user_id||'')]=a})}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  renderActivity();
}
function renderSummary(rows){
  var box=document.getElementById('aceilAdminSummary');if(!box)return;
  var total=rows.length,active=rows.filter(function(r){return r.is_active!==false}).length,blocked=total-active;
  box.innerHTML='<div class="aceil-admin-dashboard"><div class="aceil-stat"><b>'+total+'</b><span>Користувачів</span></div><div class="aceil-stat good"><b>'+active+'</b><span>Активних</span></div><div class="aceil-stat bad"><b>'+blocked+'</b><span>Заблоковано</span></div></div>';
}
function render(rows){
  rows=(Array.isArray(rows)?rows:[]).filter(function(r){
  return String(r.app_role||'').toLowerCase()!=='owner';
});adminRows=rows.slice();renderSummary(rows);
  if(!rows.length){content('<div class="aceil-admin-empty">Користувачів не знайдено.</div>');return}
  content(rows.map(function(r){
      var uid=String(r.user_id||r.id||""), active=r.is_active!==false, approval=String(r.approval_status||'').toLowerCase(), pending=approval==='pending', rejected=approval==='rejected';
      var badge=active?'<span class="aceil-admin-badge">Активний</span>':pending?'<span class="aceil-admin-badge pending">Очікує</span>':rejected?'<span class="aceil-admin-badge off">Відхилено</span>':'<span class="aceil-admin-badge off">Заблоковано</span>';
      var quick='<div class="aceil-quick-rights"><span class="aceil-quick-pill '+(r.workspace_initialized?'on':'')+'">Власний кабінет</span><span class="aceil-quick-pill '+(r.workspace_copied?'on':'')+'">'+(r.workspace_copied?'Копія надана':'Без копії')+'</span><span class="aceil-quick-pill edit '+(r.projects_access?'on':'')+'">Спільні проєкти</span></div>';
      var displayName=String(r.name||r.email||'Користувач').trim(),email=String(r.email||'').trim();
      var mail=email&&displayName.toLowerCase()!==email.toLowerCase()?'<span class="aceil-admin-mail">'+esc(email)+'</span>':'';
      return '<div class="aceil-admin-user" data-uid="'+esc(uid)+'" data-search="'+esc(String(r.name||'')+' '+String(r.email||''))+'"><button type="button" class="aceil-admin-user-top" aria-expanded="false" onclick="A_CEIL_Admin.toggleCard(this)"><span class="aceil-user-avatar">'+esc(initials(r))+'</span><span class="aceil-user-ident"><span class="aceil-admin-name">'+esc(displayName)+'</span>'+mail+'</span>'+badge+'<span class="aceil-user-chevron">⌄</span></button>'+quick+'<div class="aceil-admin-controls">'+(pending?'<div class="aceil-approval-box"><div><b>Нова реєстрація</b><small>Обери початкові дані користувача.</small></div><div class="aceil-approval-actions"><button onclick="A_CEIL_Admin.approve(\''+esc(uid)+'\',this,false)" type="button" class="approve empty">✓ Порожній</button><button onclick="A_CEIL_Admin.approve(\''+esc(uid)+'\',this,true)" type="button" class="approve">✓ Дати копію</button><button onclick="A_CEIL_Admin.reject(\''+esc(uid)+'\',this)" type="button" class="reject">× Відхилити</button></div></div>':workspaceBox(uid,r))+
        (!pending?wallCatalogBox(uid,r):'')+
        toggle(uid,"projects_access","Доступ до моїх проєктів","Окремий спільний доступ до проєктів головного власника",!!r.projects_access,false)+
        (r.projects_access?projectScope(uid,r):'')+
        toggle(uid,"projects_edit","Редагування проєктів","Може змінювати доступні проєкти",!!r.projects_edit,!r.projects_access)+
        toggle(uid,"report_publish","Створення хмарних звітів","Може створювати й відкликати посилання без права редагувати проєкт",!!r.report_publish,!r.projects_access)+
        tempAccess(uid,r)+
        toggle(uid,"is_active","Активний користувач","Повне блокування доступу до A·CEIL",active,false)+
        '<details class="aceil-danger-zone">'+foldSummary('danger','Небезпечні дії','Видалення','')+'<div class="aceil-delete-user-box"><div><b>Видалити користувача назавжди</b><small>Обліковий запис буде видалено без можливості відновлення.</small></div><button type="button" class="aceil-delete-user-btn" onclick="A_CEIL_Admin.deleteUser(\''+esc(uid)+'\',\''+esc(r.email||r.name||'Користувач')+'\',this)"><svg class="aceil-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg><span>Видалити назавжди</span></button></div></details>'+
      '</div></div>';
    }).join(""));
}
function toggleCard(head){var card=head&&head.closest('.aceil-admin-user');if(card)head.setAttribute('aria-expanded',String(card.classList.toggle('expanded')))}
function filterUsers(q){q=String(q||'').trim().toLowerCase();document.querySelectorAll('#aceilAdminContent .aceil-admin-user').forEach(function(card){card.style.display=!q||String(card.getAttribute('data-search')||'').toLowerCase().includes(q)?'':'none'})}
function adminViewState(){
  var body=document.querySelector('#aceilAdminModal .aceil-admin-body');
  var expanded=Array.prototype.map.call(
    document.querySelectorAll('#aceilAdminContent .aceil-admin-user.expanded'),
    function(card){return card.getAttribute('data-uid')||''}
  ).filter(Boolean);
  var folds=Array.prototype.map.call(document.querySelectorAll('#aceilAdminContent details[open]'),function(fold){return {uid:fold.closest('.aceil-admin-user').getAttribute('data-uid'),section:fold.getAttribute('data-admin-section')||'danger'}});
  return {scrollTop:body?body.scrollTop:0,expanded:expanded,folds:folds};
}
function restoreAdminViewState(state){
  if(!state)return;
  var cards=document.querySelectorAll('#aceilAdminContent .aceil-admin-user');
  cards.forEach(function(card){card.classList.remove('expanded')});
  state.expanded.forEach(function(uid){
    var card=document.querySelector('#aceilAdminContent .aceil-admin-user[data-uid="'+CSS.escape(uid)+'"]');
    if(card){card.classList.add('expanded');card.querySelector('.aceil-admin-user-top').setAttribute('aria-expanded','true')}
  });
  (state.folds||[]).forEach(function(item){
    var card=document.querySelector('#aceilAdminContent .aceil-admin-user[data-uid="'+CSS.escape(item.uid)+'"]');
    var fold=card&&card.querySelector(item.section==='danger'?'.aceil-danger-zone':'details[data-admin-section="'+CSS.escape(item.section)+'"]');
    if(fold)fold.open=true;
  });
  var body=document.querySelector('#aceilAdminModal .aceil-admin-body');
  if(body){
    var y=Number(state.scrollTop)||0;
    requestAnimationFrame(function(){
      body.scrollTop=y;
      requestAnimationFrame(function(){body.scrollTop=y});
    });
  }
}
async function load(){
  if(loading)return;
  var hasCards=!!document.querySelector('#aceilAdminContent .aceil-admin-user');
  var view=hasCards?adminViewState():null;
  loading=true;
  if(!hasCards)content('<div class="aceil-admin-note">Завантажуємо користувачів…</div>');
  try{
    var c=sb();if(!c)throw new Error("Supabase client недоступний.");
    var results=await Promise.all([c.rpc("admin_list_users"),c.rpc("admin_list_workspace_status")]);
    var r=results[0],wr=results[1];if(r.error)throw r.error;if(wr.error)throw wr.error;
    workspaceByUser={};(Array.isArray(wr.data)?wr.data:[]).forEach(function(x){workspaceByUser[String(x.user_id||'')]=x});
    var rows=(Array.isArray(r.data)?r.data:[]).map(function(x){return Object.assign({},x,workspaceByUser[String(x.user_id||x.id||'')]||{})});
    render(rows);
    await loadActivityData();
    if(view)restoreAdminViewState(view);
  }
  catch(e){
    window.__diagSilent&&window.__diagSilent(e);
    if(!hasCards)content('<div class="aceil-admin-error"><b>Не вдалося відкрити дані адмінки.</b><br><br>'+esc(e.message||e)+'</div>');
    else toast("Не вдалося оновити дані адмінки");
  }
  finally{loading=false}
}
async function setApproval(uid,status,button){
  if(button)button.disabled=true;
  try{var c=sb();if(!c)throw new Error("Supabase client недоступний.");var r=await c.rpc("admin_set_registration_status",{p_user_id:uid,p_status:status});if(r.error)throw r.error;toast(status==='approved'?"✓ Реєстрацію схвалено":"✓ Реєстрацію відхилено");if(status!=='approved')await load();return true}
  catch(e){if(button)button.disabled=false;toast("Не вдалося змінити статус: "+String(e&&e.message?e.message:e));return false}
}
async function initializeWorkspace(uid,copy,button,overwrite){
  overwrite=!!overwrite;
  if(overwrite){
    var warning=copy
      ?'Повністю замінити номенклатуру та налаштування цього користувача твоєю копією?\n\nЙого проєкти не видаляються. Цю заміну не можна скасувати.'
      :'Очистити номенклатуру, типи світла та заготовки стін цього користувача?\n\nЙого проєкти не видаляються. Цю дію не можна скасувати.';
    if(!confirm(warning))return false;
  }
  if(button)button.disabled=true;
  try{var c=sb();if(!c)throw new Error("Supabase client недоступний.");var rpcName=overwrite?'admin_reinitialize_user_workspace':'admin_initialize_user_workspace';var rpcArgs=overwrite?{p_user_id:uid,p_copy_template:!!copy}:{p_user_id:uid,p_copy_template:!!copy,p_overwrite:false};var r=await c.rpc(rpcName,rpcArgs);if(r.error)throw r.error;toast(copy?'✓ Незалежну копію створено':'✓ Кабінет очищено');await load();return true}
  catch(e){if(button)button.disabled=false;toast('Не вдалося змінити кабінет: '+String(e&&e.message?e.message:e));return false}
}
async function approve(uid,b,copy){var ok=await setApproval(uid,'approved',b);if(ok)return initializeWorkspace(uid,!!copy,b);return false}
function reject(uid,b){if(!confirm('Відхилити реєстрацію цього користувача?'))return;return setApproval(uid,'rejected',b)}

async function deleteUser(uid,label,button){
  label=String(label||'Користувач');
  if(!confirm('Повністю видалити користувача '+label+'?\n\nЦю дію не можна скасувати.'))return;
  if(button)button.disabled=true;
  try{
    var c=sb();
    if(!c)throw new Error("Supabase client недоступний.");
    var r=await c.rpc("admin_delete_user",{p_user_id:uid});
    if(r.error)throw r.error;
    if(r.data!==true)throw new Error("Сервер не підтвердив видалення.");
    toast("✓ Користувача видалено");
    await load();
  }catch(e){
    if(button)button.disabled=false;
    window.__diagSilent&&window.__diagSilent(e);
    toast("Не вдалося видалити користувача: "+String(e&&e.message?e.message:e));
  }
}

async function setAccess(uid,key,val,input){
  if(input)input.disabled=true;
  try{
    var c=sb();if(!c)throw new Error("Supabase client недоступний.");
    var rpcName=key==='report_publish'?'admin_set_report_publish':'admin_set_user_access';
    var rpcArgs=key==='report_publish'?{p_user_id:uid,p_value:!!val}:{p_user_id:uid,p_field:key,p_value:!!val};
    var r=await c.rpc(rpcName,rpcArgs);
    if(r.error)throw r.error;
    if(r.data!==true)throw new Error("RPC не підтвердила зміну доступу.");
    if(key==='projects_access'&&val===true){
      var sr=await c.rpc('admin_set_projects_scope',{p_user_id:uid,p_scope:'all'});
      if(sr.error)throw sr.error
    }
    if(key==='is_active'&&val===true){
      try{
        var ar=await c.rpc("admin_set_registration_status",{p_user_id:uid,p_status:"approved"});
        if(ar.error)throw ar.error
      }catch(syncErr){window.__diagSilent&&window.__diagSilent(syncErr)}
    }
    toast("✓ Доступ оновлено");
    await load()
  }
  catch(e){
    if(input){input.checked=!val;input.disabled=false}
    window.__diagSilent&&window.__diagSilent(e);
    toast("Не вдалося змінити доступ: "+String(e&&e.message?e.message:e))
  }
}
async function copyWallCatalog(uid,mode,button){
  mode=mode==='replace'?'replace':'merge';
  if(mode==='replace'&&!confirm('Повністю замінити заготовки та меню елементів стін цього користувача твоєю копією?\n\nІнші дані та проєкти не зміняться.'))return false;
  if(button)button.disabled=true;
  try{
    var c=sb();if(!c)throw new Error("Supabase client недоступний.");
    var r=await c.rpc('admin_copy_wall_catalog',{p_user_id:uid,p_mode:mode});
    if(r.error)throw r.error;
    var count=r.data&&Number(r.data.count);
    toast(mode==='replace'?'✓ Заготовки повністю замінено':'✓ Відсутні заготовки додано'+(isFinite(count)?' · '+count:''));
    await load();return true;
  }catch(e){if(button)button.disabled=false;toast('Не вдалося скопіювати заготовки: '+String(e&&e.message?e.message:e));return false}
}
async function setScope(uid,scope,button){
  if(button)button.disabled=true;
  try{var c=sb();var r=await c.rpc("admin_set_projects_scope",{p_user_id:uid,p_scope:scope});if(r.error)throw r.error;toast(scope==='all'?"✓ Доступ до всіх проєктів":"✓ Доступ до вибраних проєктів");await load()}
  catch(e){if(button)button.disabled=false;toast("Не вдалося змінити режим проєктів: "+String(e&&e.message?e.message:e))}
}
async function toggleProjects(uid,button){
  var box=document.getElementById('aceilProjects_'+uid);if(!box)return;
  if(box.style.display!=='none'){box.style.display='none';button.textContent='Вибрати проєкти';return}
  box.style.display='block';button.textContent='Сховати проєкти';box.innerHTML='<div class="aceil-project-loading">Завантаження…</div>';
  try{var c=sb();var r=await c.rpc('admin_list_user_projects',{p_user_id:uid});if(r.error)throw r.error;var rows=Array.isArray(r.data)?r.data:[];
    if(!rows.length){box.innerHTML='<div class="aceil-project-empty">У вас ще немає проєктів.</div>';return}
    box.innerHTML=rows.map(function(p){return '<div class="aceil-project-item"><div class="aceil-project-name">'+esc(p.project_name||'Без назви')+'</div><label class="aceil-switch"><input type="checkbox" '+(p.selected?'checked ':'')+'onchange="A_CEIL_Admin.setProject(\''+esc(uid)+'\',\''+esc(p.project_id)+'\',this.checked,this)"><span class="aceil-slider"></span></label></div>'}).join('');
  }catch(e){box.innerHTML='<div class="aceil-project-error">'+esc(e.message||e)+'</div>'}
}
async function setProject(uid,pid,val,input){
  if(input)input.disabled=true;
  try{var c=sb();var r=await c.rpc('admin_set_user_project_access',{p_user_id:uid,p_project_id:pid,p_value:!!val});if(r.error)throw r.error;toast(val?'✓ Проєкт надано':'✓ Доступ до проєкту забрано');input.disabled=false}
  catch(e){input.checked=!val;input.disabled=false;toast('Не вдалося змінити проєкт: '+String(e&&e.message?e.message:e))}
}
async function setExpiry(uid,hours,button){
  if(button)button.disabled=true;
  try{var c=sb();var r=await c.rpc("admin_set_access_expiry",{p_user_id:uid,p_hours:Number(hours)});if(r.error)throw r.error;toast("✓ Тимчасовий доступ: "+hours+" год");await load()}
  catch(e){if(button)button.disabled=false;toast("Не вдалося змінити термін доступу: "+String(e&&e.message?e.message:e))}
}
async function clearExpiry(uid,button){
  if(button)button.disabled=true;
  try{var c=sb();var r=await c.rpc('admin_clear_access_expiry',{p_user_id:uid});if(r.error)throw r.error;toast('✓ Тимчасовий доступ скасовано');await load()}
  catch(e){if(button)button.disabled=false;toast('Не вдалося скасувати термін: '+String(e&&e.message?e.message:e))}
}
function showTab(name,btn){
  document.querySelectorAll('.aceil-admin-tabs button').forEach(function(b){b.classList.toggle('active',b===btn)});
  var up=document.getElementById('aceilUsersPane'),ap=document.getElementById('aceilActivityPane'),sp=document.getElementById('aceilSettingsPane');
  if(up)up.style.display=name==='users'?'block':'none'; if(ap)ap.style.display=name==='activity'?'block':'none'; if(sp)sp.style.display=name==='settings'?'block':'none';
  if(name==='activity'&&ap)renderActivity();
}
function open(){var m=document.getElementById("aceilAdminModal");if(!m)return;m.classList.add("open");m.setAttribute("aria-hidden","false");load()}
function close(){var m=document.getElementById("aceilAdminModal");if(!m)return;m.classList.remove("open");m.setAttribute("aria-hidden","true")}

window.A_CEIL_Admin={open:open,close:close,load:load,setAccess:setAccess,approve:approve,reject:reject,initializeWorkspace:initializeWorkspace,copyWallCatalog:copyWallCatalog,deleteUser:deleteUser,setScope:setScope,toggleProjects:toggleProjects,setProject:setProject,setExpiry:setExpiry,clearExpiry:clearExpiry,refreshOwner:refreshOwner,reset:reset,toggleCard:toggleCard,filterUsers:filterUsers,showTab:showTab};

function boot(){
  removeLegacyMenuItem();
  try{if(currentUser())refreshOwner(currentUser())}catch(e){}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
document.addEventListener("visibilitychange",function(){var m=document.getElementById("aceilAdminModal");if(document.visibilityState==="visible"&&currentUser()&&m&&m.classList.contains("open"))setTimeout(function(){refreshOwner(currentUser())},250)});
})();
