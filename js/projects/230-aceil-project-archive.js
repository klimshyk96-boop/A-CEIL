(function(){
  "use strict";
  if(window.__A_CEIL_PROJECT_ARCHIVE_V1)return;
  window.__A_CEIL_PROJECT_ARCHIVE_V1=true;

  var view="active",baseRender=null,rendering=false,copyInFlight=new Set();
  // Project cards need only the archive date. Parse each unchanged JSON state
  // once, not several times per render. Invalidate on state replacement.
  var archiveDates=new WeakMap();
  function clone(value){try{return JSON.parse(JSON.stringify(value))}catch(_){return value}}
  function stateOf(project){
    try{return typeof project.state==="string"?JSON.parse(project.state||"{}"):clone(project.state||{})}
    catch(_){return {}}
  }
  function archivedAt(project){
    if(!project)return null;
    if(project.archivedAt)return project.archivedAt;
    if(typeof project.state==="string"){
      var cached=archiveDates.get(project);
      if(cached&&cached.source===project.state)return cached.value;
      var date=null;
      try{var parsed=JSON.parse(project.state||"{}");date=parsed&&parsed.archivedAt||null}
      catch(_){}
      archiveDates.set(project,{source:project.state,value:date});
      return date;
    }
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
  function cardProject(card,byId){
    var action=card.querySelector('[onclick*="editProject"]'),raw=action&&action.getAttribute("onclick")||"";
    var match=raw.match(/editProject\(['\"]([^'\"]+)['\"]\)/);return match&&byId.get(match[1])||null;
  }
  function decorate(){
    var all=list(),byId=new Map();
    all.forEach(function(project){
      [project&&project.id,project&&project._dbId,project&&project._localId].forEach(function(id){
        if(id!=null&&!byId.has(String(id)))byId.set(String(id),project);
      });
    });
    document.querySelectorAll("#projectsList .rp-project-card").forEach(function(card){
      var project=cardProject(card,byId),actions=card.querySelector(".rp-project-actions");if(!project||!actions||project._shared)return;
      var button=actions.querySelector("[data-project-archive]");if(!button){button=document.createElement("button");button.type="button";button.dataset.projectArchive="1";button.className="aceil-project-archive-action";var danger=actions.querySelector('[onclick*="deleteProject"]');actions.insertBefore(button,danger||null)}
      var isArchived=!!archivedAt(project);button.textContent=isArchived?"↩":"📦";button.title=isArchived?"Повернути з архіву":"Перенести в архів";button.setAttribute("aria-label",button.title);
      button.onclick=function(){window.A_CEIL_ProjectArchive.toggle(project.id,!isArchived)};
      // A second client quote must come from a new cloud project; never from
      // editing this original or reusing its published report token.
      var copyButton=actions.querySelector("[data-project-quote-copy]");
      if(!copyButton){
        copyButton=document.createElement("button");copyButton.type="button";
        copyButton.dataset.projectQuoteCopy="1";copyButton.className="aceil-project-archive-action";
        copyButton.style.cssText="background:#e0f2fe;color:#075985;font-weight:800;font-size:11px;";
        var trash=actions.querySelector('[onclick*="deleteProject"]');
        actions.insertBefore(copyButton,trash||null);
      }
      copyButton.textContent="⧉ 2 КП";copyButton.title="Створити окрему хмарну копію для іншого кошторису";
      copyButton.setAttribute("aria-label",copyButton.title);
      copyButton.disabled=copyInFlight.has(String(project.id));
      copyButton.onclick=function(){window.A_CEIL_ProjectArchive.copyForQuote(project.id)};
      if(project._comparisonSourceId){
        var pair=actions.querySelector("[data-project-quote-links]");
        if(!pair){
          pair=document.createElement("button");pair.type="button";pair.dataset.projectQuoteLinks="1";
          pair.className="aceil-project-archive-action";
          pair.style.cssText="background:#f0fdf4;color:#166534;font-weight:800;font-size:11px;";
          actions.insertBefore(pair,copyButton);
        }
        pair.textContent="🔗 2 звіти";pair.title="Посилання основного й альтернативного кошторисів";
        pair.onclick=function(){window.A_CEIL_ProjectArchive.showPair(project.id)};
      }
      if(isArchived){var head=card.querySelector(".rp-project-head"),main=card.querySelector(".rp-project-main");if(head&&main&&!card.querySelector(".aceil-project-archived-date")){var note=document.createElement("div");note.className="aceil-project-archived-date";note.textContent="В архіві з "+new Date(archivedAt(project)).toLocaleDateString("uk-UA");main.insertBefore(note,head.nextSibling)}}
    });
  }
  function render(){
    if(typeof baseRender!=="function"||rendering)return;
    var originalWindow=window.getProjects,originalBinding=null,all=originalWindow?originalWindow():[];
    try{originalBinding=getProjects}catch(_){originalBinding=originalWindow}
    var filteredOnce=null;
    var filtered=function(){
      if(!filteredOnce)filteredOnce=all.filter(function(project){return view==="archive"?!!archivedAt(project):!archivedAt(project)});
      return filteredOnce;
    };
    rendering=true;window.getProjects=filtered;try{getProjects=filtered}catch(_){}
    try{baseRender()}finally{window.getProjects=originalWindow;try{getProjects=originalBinding}catch(_){}rendering=false}
    ensureTabs();decorate();
    var listEl=document.getElementById("projectsList");
    if(listEl&&!filtered().length)listEl.innerHTML='<div class="aceil-project-archive-empty">'+(view==="archive"?"Архів поки порожній":"Активних проєктів немає")+'</div>';
  }

  function cloudId(project){return project&&String(project._dbId||"")}
  function projectBy(id){return list().find(function(project){return matches(project,id)})||null}
  function pending(project){
    var ids=[project.id,project._dbId,project._localId].filter(function(v){return v!=null}).map(String);
    try{return typeof window.getPendingQueue==="function"&&window.getPendingQueue().some(function(op){
      var data=op&&op.payload||{};
      return [data.localId,data.dbId].some(function(v){return v!=null&&ids.includes(String(v))});
    })}catch(_){return true}
  }
  function notify(message){if(typeof window.showToast==="function")window.showToast(message,4800)}
  function safeCopyName(name){return String(name||"Без назви").replace(/ — Безвставочний$/,"")+" — Безвставочний"}
  function quoteCopy(source,userId){
    // Deep copy preserves rooms, measurements, material prices and drawing.
    // All identity / publication state is new; never change the source record.
    var copy=clone(source),id="local_quote_"+(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
    var cloud=cloudId(source);
    copy.id=id;copy._localId=id;
    ["_dbId","_cloudRevision","_cloudSavedAt","_cloudBase","report_token",
     "report_published_at","report_expires_at","calcLinks","estimateVariants",
     "_activeEstimateVariantId","_roomRevision"].forEach(function(key){delete copy[key]});
    copy._ownerId=userId;copy._shared=false;copy._comparisonSourceId=cloud;
    copy.name=safeCopyName(source.name);
    copy.archivedAt=null;copy._dirty=true;copy._syncStatus="pending_create";copy._localUpdatedAt=Date.now();
    var state=stateOf(source);delete state.archivedAt;
    ["report_token","report_published_at","report_expires_at","calcLinks","estimateVariants","_activeEstimateVariantId"].forEach(function(key){delete state[key]});
    state.comparisonSourceId=cloud;
    if(Array.isArray(copy.rooms)){
      copy.rooms.forEach(function(room){if(room&&typeof room==="object")delete room._aceilVariantsShadow});
      state.schemaVersion=state.schemaVersion||3;state.projectType="apartment";
      state.multiRoom=true;state.rooms=copy.rooms;
    }
    copy.state=JSON.stringify(state);
    return copy;
  }
  function linkOf(project){
    if(!project||!project.report_token)return "";
    var api=window.A_CEIL_ReportLinks;
    return api&&typeof api.publicUrl==="function"?api.publicUrl(project.report_token):"";
  }
  function showPair(id){
    var copy=projectBy(id),source=copy&&projectBy(copy._comparisonSourceId);
    if(!copy||!source){notify("Основний проєкт не знайдено. Перевірте доступ до нього.");return false}
    var listElement=document.getElementById("projectsList"),parent=listElement&&listElement.parentNode;
    if(!parent)return false;
    var panel=document.getElementById("aceilQuotePairPanel");
    if(!panel){panel=document.createElement("section");panel.id="aceilQuotePairPanel";parent.insertBefore(panel,listElement)}
    panel.style.cssText="margin:10px 0 14px;padding:14px;background:#f8fafc;border:1px solid #bfdbfe;border-radius:16px;color:#0f172a;";
    panel.replaceChildren();
    var title=document.createElement("div");title.style.cssText="font-weight:900;margin-bottom:8px";
    title.textContent="Два незалежні кошториси";panel.appendChild(title);
    var description=document.createElement("p");description.style.cssText="font-size:12px;color:#475569;line-height:1.5;margin-bottom:10px";
    description.textContent="Спочатку сформуйте і опублікуйте звіт для кожного проєкту окремо. Кожне посилання веде до свого незмінного хмарного звіту.";
    panel.appendChild(description);
    var urls=[];
    [[source,"1. Основний проєкт"],[copy,"2. Безвставочний — копія"]].forEach(function(pair){
      var row=document.createElement("div");row.style.cssText="display:grid;gap:5px;margin-bottom:10px";
      var caption=document.createElement("strong");caption.style.fontSize="12px";
      caption.textContent=pair[1]+": "+String(pair[0].name||"");row.appendChild(caption);
      var url=linkOf(pair[0]);
      if(url){urls.push(url);var input=document.createElement("input");input.type="text";input.readOnly=true;input.value=url;
        input.style.cssText="box-sizing:border-box;width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:9px;font-size:12px";row.appendChild(input)}
      else{var missing=document.createElement("span");missing.style.cssText="font-size:12px;color:#b45309";
        missing.textContent="Ще не опубліковано — відкрийте цей проєкт і створіть звіт у хмарі";row.appendChild(missing)}
      panel.appendChild(row);
    });
    var copyBoth=document.createElement("button");copyBoth.type="button";
    copyBoth.style.cssText="padding:10px 14px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:800";
    copyBoth.textContent=urls.length===2&&urls[0]!==urls[1]?"📋 Скопіювати два посилання":"Потрібні два різні опубліковані звіти";
    copyBoth.disabled=urls.length!==2||urls[0]===urls[1];
    copyBoth.onclick=function(){
      var text=urls.join("\n");
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){notify("✅ Два посилання скопійовано")}).catch(function(){notify("Не вдалося скопіювати посилання")});
    };
    panel.appendChild(copyBoth);return urls.length===2&&urls[0]!==urls[1];
  }
  async function copyForQuote(id){
    var source=projectBy(id),sourceId=source&&String(source.id),repo=window.A·CEIL&&window.A·CEIL.ProjectRepository;
    if(!source||!repo)return false;
    if(copyInFlight.has(sourceId))return false;
    if(!navigator.onLine||!window._sb||!window._sbUser){notify("Для створення незалежної копії потрібна хмара");return false}
    if(source._shared||!cloudId(source)||source._dirty||source._localUpdatedAt||pending(source)){
      notify("Спочатку завершіть хмарне збереження вихідного проєкту");return false;
    }
    copyInFlight.add(sourceId);
    try{
      var userId=String(window._sbUser.id),copy=quoteCopy(source,userId),localId=copy.id;
      repo.upsert(copy,{append:true});render();
      if(typeof window.addToPendingQueue!=="function"||typeof window.flushPendingQueue!=="function")
        throw new Error("Черга збереження недоступна — копія збережена локально");
      window.addToPendingQueue({type:"save",payload:{localId:localId,dbId:null},addedAt:Date.now()});
      await window.flushPendingQueue();
      var saved=projectBy(localId);
      if(!saved||!cloudId(saved)||saved._dirty||pending(saved)){
        notify("Копію створено локально. Дочекайтеся хмарного збереження перед публікацією.");
        render();return false;
      }
      // Do not auto-publish an estimate without first opening the report;
      // report snapshots must show precisely what the client approved.
      render();showPair(saved.id);
      notify("✅ Окрему копію збережено у хмарі. Відкрийте її для іншого прорахунку.");
      return saved.id;
    }catch(error){
      notify("Копію не опубліковано: "+String(error&&error.message||error));
      return false;
    }finally{copyInFlight.delete(sourceId);render()}
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
  window.A_CEIL_ProjectArchive={toggle:toggle,copyForQuote:copyForQuote,showPair:showPair,setView:function(next){view=next==="archive"?"archive":"active";render()},count:function(){return totals().archive},isArchived:function(project){return !!archivedAt(project)}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
  [100,700,1800].forEach(function(delay){setTimeout(install,delay)});
})();
