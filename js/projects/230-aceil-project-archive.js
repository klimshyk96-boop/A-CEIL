(function(){
  "use strict";
  if(window.__A_CEIL_PROJECT_ARCHIVE_V1)return;
  window.__A_CEIL_PROJECT_ARCHIVE_V1=true;

  var view="active",baseRender=null,rendering=false;
  function clone(value){try{return JSON.parse(JSON.stringify(value))}catch(_){return value}}
  function stateOf(project){
    try{return typeof project.state==="string"?JSON.parse(project.state||"{}"):clone(project.state||{})}
    catch(_){return {}}
  }
  function archivedAt(project){
    if(!project)return null;
    if(project.archivedAt)return project.archivedAt;
    var state=stateOf(project);return state.archivedAt||null;
  }
  function setArchived(project,value){
    project.archivedAt=value||null;
    var state=stateOf(project);
    if(value)state.archivedAt=value;else delete state.archivedAt;
    if(project.multiRoom||project.projectType==="apartment"||Array.isArray(project.rooms)){
      state.schemaVersion=state.schemaVersion||3;state.projectType="apartment";state.multiRoom=true;
      state.rooms=clone(Array.isArray(project.rooms)?project.rooms:(state.rooms||[]));
    }
    project.state=JSON.stringify(state);
    project._dirty=true;project._localUpdatedAt=Date.now();
    project._syncStatus=project._dbId?"pending_update":"pending_create";
  }
  function list(){try{return typeof getProjects==="function"?getProjects():[]}catch(_){return []}}
  function matches(project,id){return project&&[project.id,project._dbId,project._localId].some(function(value){return value!=null&&String(value)===String(id)})}
  function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})}
  function totals(){var all=list();return {active:all.filter(function(p){return !archivedAt(p)}).length,archive:all.filter(archivedAt).length}}
  function ensureTabs(){
    var projectsList=document.getElementById("projectsList");if(!projectsList)return;
    var tabs=document.getElementById("aceilProjectArchiveTabs");
    if(!tabs){tabs=document.createElement("div");tabs.id="aceilProjectArchiveTabs";tabs.className="aceil-project-archive-tabs";projectsList.parentNode.insertBefore(tabs,projectsList)}
    var count=totals();
    tabs.innerHTML='<button type="button" data-project-view="active" class="'+(view==="active"?"active":"")+'"><span>Проєкти</span><b>'+count.active+'</b></button><button type="button" data-project-view="archive" class="'+(view==="archive"?"active":"")+'"><span>Архів</span><b>'+count.archive+'</b></button>';
    tabs.querySelectorAll("[data-project-view]").forEach(function(button){button.onclick=function(){view=button.dataset.projectView;render()}});
  }
  function cardProject(card,all){
    var action=card.querySelector('[onclick*="editProject"]'),raw=action&&action.getAttribute("onclick")||"";
    var match=raw.match(/editProject\(['\"]([^'\"]+)['\"]\)/);return match&&all.find(function(p){return matches(p,match[1])})||null;
  }
  function decorate(){
    var all=list();
    document.querySelectorAll("#projectsList .rp-project-card").forEach(function(card){
      var project=cardProject(card,all),actions=card.querySelector(".rp-project-actions");if(!project||!actions||project._shared)return;
      var button=actions.querySelector("[data-project-archive]");if(!button){button=document.createElement("button");button.type="button";button.dataset.projectArchive="1";button.className="aceil-project-archive-action";var danger=actions.querySelector('[onclick*="deleteProject"]');actions.insertBefore(button,danger||null)}
      var isArchived=!!archivedAt(project);button.textContent=isArchived?"↩":"📦";button.title=isArchived?"Повернути з архіву":"Перенести в архів";button.setAttribute("aria-label",button.title);
      button.onclick=function(){window.A_CEIL_ProjectArchive.toggle(project.id,!isArchived)};
      if(isArchived){var head=card.querySelector(".rp-project-head"),main=card.querySelector(".rp-project-main");if(head&&main&&!card.querySelector(".aceil-project-archived-date")){var note=document.createElement("div");note.className="aceil-project-archived-date";note.textContent="В архіві з "+new Date(archivedAt(project)).toLocaleDateString("uk-UA");main.insertBefore(note,head.nextSibling)}}
    });
  }
  function render(){
    if(typeof baseRender!=="function"||rendering)return;
    var originalWindow=window.getProjects,originalBinding=null,all=originalWindow?originalWindow():[];
    try{originalBinding=getProjects}catch(_){originalBinding=originalWindow}
    var filtered=function(){return all.filter(function(project){return view==="archive"?!!archivedAt(project):!archivedAt(project)})};
    rendering=true;window.getProjects=filtered;try{getProjects=filtered}catch(_){}
    try{baseRender()}finally{window.getProjects=originalWindow;try{getProjects=originalBinding}catch(_){}rendering=false}
    ensureTabs();decorate();
    var listEl=document.getElementById("projectsList");
    if(listEl&&!filtered().length)listEl.innerHTML='<div class="aceil-project-archive-empty">'+(view==="archive"?"Архів поки порожній":"Активних проєктів немає")+'</div>';
  }
  async function toggle(id,toArchive){
    var all=list(),index=all.findIndex(function(project){return matches(project,id)});if(index<0)return false;
    var project=all[index];setArchived(project,toArchive?new Date().toISOString():null);all[index]=project;
    if(typeof setProjects==="function")setProjects(all);render();
    if(typeof showToast==="function")showToast(toArchive?"📦 Проєкт перенесено в архів":"↩ Проєкт повернено з архіву",3200);
    try{var persistence=window.A·CEIL&&window.A·CEIL.ProjectPersistence;if(persistence&&typeof persistence.syncProject==="function")await persistence.syncProject(project)}catch(error){if(window.__diagSilent)window.__diagSilent(error,"project-archive-sync")}
    render();return true;
  }
  function install(){
    var current=window.renderProjects||(typeof renderProjects==="function"?renderProjects:null);if(typeof current!=="function"||current.__projectArchiveV1)return;
    baseRender=current;var wrapped=function(){return render()};wrapped.__projectArchiveV1=true;window.renderProjects=wrapped;try{renderProjects=wrapped}catch(_){}
    if(document.getElementById("projectsModal")&&document.getElementById("projectsModal").classList.contains("open"))render();
  }
  window.A_CEIL_ProjectArchive={toggle:toggle,setView:function(next){view=next==="archive"?"archive":"active";render()},count:function(){return totals().archive},isArchived:function(project){return !!archivedAt(project)}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
  [100,700,1800].forEach(function(delay){setTimeout(install,delay)});
})();
