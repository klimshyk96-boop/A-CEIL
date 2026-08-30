
(function(){
"use strict";
var profile=null,loading=false;

function sb(){try{return (typeof _sb!=="undefined"&&_sb)||window._sb||null}catch(e){return window._sb||null}}
function currentUser(){try{return (typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}catch(e){return window._sbUser||null}}
function esc(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]})}
function toast(t){try{if(typeof showToast==="function")showToast(t,3500)}catch(e){}}
function content(v){var e=document.getElementById("aceilAdminContent");if(e)e.innerHTML=v}

function ensureMenuItem(){
  var btn=document.getElementById("A_CEIL_AdminMenuAction");
  if(btn)return btn;
  var popup=document.getElementById("A·CEILRoomMenuPopup");
  if(!popup)return null;
  var sep=document.createElement("div");
  sep.id="A_CEIL_AdminMenuSeparator"; sep.className="rm-room-menu-separator"; sep.style.display="none";
  btn=document.createElement("button");
  btn.type="button"; btn.id="A_CEIL_AdminMenuAction"; btn.className="rm-room-menu-action"; btn.style.display="none";
  btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.38.55.72 1 .9.34.15.72.22 1.1.2h.1v4h-.1a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-1 1z"></path></svg><span><b>Адміністрування</b><small>Користувачі та права доступу</small></span>';
  btn.onclick=function(){window.A_CEIL_Admin.open()};
  var danger=popup.querySelector(".rm-room-menu-action.danger");
  if(danger){popup.insertBefore(sep,danger);popup.insertBefore(btn,danger)}else{popup.appendChild(sep);popup.appendChild(btn)}
  return btn;
}
function visible(v){
  var b=ensureMenuItem(),sep=document.getElementById("A_CEIL_AdminMenuSeparator");
  if(b)b.style.display=v?"":"none"; if(sep)sep.style.display=v?"":"none";
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
    is_active:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  }; return '<span class="aceil-access-icon '+key+'"><svg viewBox="0 0 24 24">'+(p[key]||'')+'</svg></span>';
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
  return '<div class="aceil-temp-access"><div class="aceil-temp-head"><div><div class="aceil-temp-title">Тимчасовий доступ</div><div class="aceil-temp-status '+(x.active?'active':'')+'">'+esc(x.text)+'</div></div></div><div class="aceil-temp-buttons">'+
    [1,3,8,24].map(function(h){return '<button type="button" class="aceil-temp-btn" onclick="A_CEIL_Admin.setExpiry(\''+esc(uid)+'\','+h+',this)">'+h+' год</button>'}).join('')+
    '</div>'+(x.active?'<button type="button" class="aceil-temp-cancel" onclick="A_CEIL_Admin.clearExpiry(\''+esc(uid)+'\',this)">Скасувати тимчасовий доступ</button>':'')+'</div>';
}
function projectScope(uid,r){
  var scope=(r.projects_scope==='all'?'all':'selected');
  return '<div class="aceil-project-scope"><div class="aceil-project-scope-title">Проєкти</div><div class="aceil-scope-buttons">'+
    '<button type="button" class="aceil-scope-btn '+(scope==='selected'?'active':'')+'" onclick="A_CEIL_Admin.setScope(\''+esc(uid)+'\',\'selected\',this)">Вибрані</button>'+
    '<button type="button" class="aceil-scope-btn '+(scope==='all'?'active':'')+'" onclick="A_CEIL_Admin.setScope(\''+esc(uid)+'\',\'all\',this)">Усі мої</button></div>'+
    (scope==='selected'?'<button type="button" class="aceil-project-picker-btn" onclick="A_CEIL_Admin.toggleProjects(\''+esc(uid)+'\',this)">Вибрати проєкти</button><div id="aceilProjects_'+esc(uid)+'" class="aceil-project-list" style="display:none"></div>':'')+
    '</div>';
}
var adminRows=[],activityByUser={};
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
  box.innerHTML='<div class="aceil-admin-dashboard"><div class="aceil-stat"><i><svg class="aceil-svg" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></i><b>'+total+'</b><span>Користувачів</span><small>Всього</small></div><div class="aceil-stat good"><i><svg class="aceil-svg" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></i><b>'+active+'</b><span>Активних</span><small>'+(total?Math.round(active*100/total):0)+'%</small></div><div class="aceil-stat bad"><i><svg class="aceil-svg" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></i><b>'+blocked+'</b><span>Заблоковано</span><small>'+(total?Math.round(blocked*100/total):0)+'%</small></div></div>';
}
function render(rows){
  rows=(Array.isArray(rows)?rows:[]).filter(function(r){
  return String(r.app_role||'').toLowerCase()!=='owner';
});adminRows=rows.slice();renderSummary(rows);
  if(!rows.length){content('<div class="aceil-admin-empty">Користувачів не знайдено.</div>');return}
  content(rows.map(function(r,i){
      var uid=String(r.user_id||r.id||""), active=r.is_active!==false, approval=String(r.approval_status||'').toLowerCase(), pending=approval==='pending', rejected=approval==='rejected';
      var badge=active?'<span class="aceil-admin-badge">Активний</span>':pending?'<span class="aceil-admin-badge pending">Очікує</span>':rejected?'<span class="aceil-admin-badge off">Відхилено</span>':'<span class="aceil-admin-badge off">Заблоковано</span>';
      var quick='<div class="aceil-quick-rights"><span class="aceil-quick-pill '+(r.nomenclature_access?'on':'')+'">Номенклатура</span><span class="aceil-quick-pill '+(r.projects_access?'on':'')+'">Проєкти</span><span class="aceil-quick-pill edit '+(r.projects_edit?'on':'')+'">Редагування</span></div>';
      return '<div class="aceil-admin-user '+(i===0?'expanded':'')+'" data-uid="'+esc(uid)+'" data-search="'+esc(String(r.name||'')+' '+String(r.email||''))+'"><div class="aceil-admin-user-top" onclick="A_CEIL_Admin.toggleCard(this)"><div class="aceil-user-avatar">'+esc(initials(r))+'</div><div class="aceil-user-ident"><div class="aceil-admin-name">'+esc(r.name||r.email||"Користувач")+'</div><div class="aceil-admin-mail">'+esc(r.email||"")+'</div></div>'+badge+'<span class="aceil-user-chevron">⌄</span></div>'+quick+'<div class="aceil-admin-controls">'+(pending?'<div class="aceil-approval-box"><div><b>Нова реєстрація</b><small>Користувач ще не має доступу до A·CEIL</small></div><div class="aceil-approval-actions"><button onclick="A_CEIL_Admin.approve(\''+esc(uid)+'\',this)" type="button" class="approve">✓ Схвалити</button><button onclick="A_CEIL_Admin.reject(\''+esc(uid)+'\',this)" type="button" class="reject">× Відхилити</button></div></div>':'')+
        toggle(uid,"nomenclature_access","Моя номенклатура","Використовувати номенклатуру owner",!!r.nomenclature_access,false)+
        toggle(uid,"projects_access","Мої проєкти","Доступ до проєктів owner",!!r.projects_access,false)+
        (r.projects_access?projectScope(uid,r):'')+
        toggle(uid,"projects_edit","Редагування проєктів","Може змінювати доступні проєкти",!!r.projects_edit,!r.projects_access)+
        tempAccess(uid,r)+
        toggle(uid,"is_active","Активний користувач","Повне блокування доступу до A·CEIL",active,false)+
        '<details class="aceil-danger-zone"><summary><span>Небезпечні дії</span><small>Видалення</small></summary><div class="aceil-delete-user-box"><div><b>Видалити користувача назавжди</b><small>Обліковий запис буде видалено без можливості відновлення.</small></div><button type="button" class="aceil-delete-user-btn" onclick="A_CEIL_Admin.deleteUser(\''+esc(uid)+'\',\''+esc(r.email||r.name||'Користувач')+'\',this)"><svg class="aceil-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg><span>Видалити назавжди</span></button></div></details>'+
      '</div></div>';
    }).join(""));
}
function toggleCard(head){var card=head&&head.closest('.aceil-admin-user');if(card)card.classList.toggle('expanded')}
function filterUsers(q){q=String(q||'').trim().toLowerCase();document.querySelectorAll('#aceilAdminContent .aceil-admin-user').forEach(function(card){card.style.display=!q||String(card.getAttribute('data-search')||'').toLowerCase().includes(q)?'':'none'})}
function adminViewState(){
  var body=document.querySelector('#aceilAdminModal .aceil-admin-body');
  var expanded=Array.prototype.map.call(
    document.querySelectorAll('#aceilAdminContent .aceil-admin-user.expanded'),
    function(card){return card.getAttribute('data-uid')||''}
  ).filter(Boolean);
  return {scrollTop:body?body.scrollTop:0,expanded:expanded};
}
function restoreAdminViewState(state){
  if(!state)return;
  var cards=document.querySelectorAll('#aceilAdminContent .aceil-admin-user');
  cards.forEach(function(card){card.classList.remove('expanded')});
  state.expanded.forEach(function(uid){
    var card=document.querySelector('#aceilAdminContent .aceil-admin-user[data-uid="'+CSS.escape(uid)+'"]');
    if(card)card.classList.add('expanded');
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
    var r=await c.rpc("admin_list_users");if(r.error)throw r.error;
    render(r.data);
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
  try{var c=sb();if(!c)throw new Error("Supabase client недоступний.");var r=await c.rpc("admin_set_registration_status",{p_user_id:uid,p_status:status});if(r.error)throw r.error;toast(status==='approved'?"✓ Реєстрацію схвалено":"✓ Реєстрацію відхилено");await load()}
  catch(e){if(button)button.disabled=false;toast("Не вдалося змінити статус: "+String(e&&e.message?e.message:e))}
}
function approve(uid,b){return setApproval(uid,'approved',b)}
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
    var r=await c.rpc("admin_set_user_access",{p_user_id:uid,p_field:key,p_value:!!val});
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

window.A_CEIL_Admin={open:open,close:close,load:load,setAccess:setAccess,approve:approve,reject:reject,deleteUser:deleteUser,setScope:setScope,toggleProjects:toggleProjects,setProject:setProject,setExpiry:setExpiry,clearExpiry:clearExpiry,refreshOwner:refreshOwner,reset:reset,toggleCard:toggleCard,filterUsers:filterUsers,showTab:showTab};

function boot(){
  ensureMenuItem();
  try{if(currentUser())refreshOwner(currentUser())}catch(e){}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
document.addEventListener("visibilitychange",function(){var m=document.getElementById("aceilAdminModal");if(document.visibilityState==="visible"&&currentUser()&&m&&m.classList.contains("open"))setTimeout(function(){refreshOwner(currentUser())},250)});
})();

