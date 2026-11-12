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
  // Keep the original and its independent copies visible as two compact
  // report options. Never invent a report URL for an unpublished copy.
  function reportStatusFor(project){
    var api=window.A_CEIL_ReportLinks,record=null;
    try{if(api&&typeof api.status==="function")record=api.status(project&&project.id)}catch(_){}
    if(!record)return {status:"none",url:""};
    var url=String(record.url||"");
    if(record.status==="active"&&/^https:\/\/a-ceil\.pp\.ua\/r\/[a-f0-9]{20,64}$/i.test(url))
      return {status:"active",url:url};
    return {status:record.status==="expired"?"expired":"none",url:""};
  }
  function pairReports(project,all){
    if(!project||project._comparisonSourceId)return [];
    var sourceId=cloudId(project);
    if(!sourceId)return [];
    var copies=(Array.isArray(all)?all:[]).filter(function(p){
      return p&&p!==project&&String(p._comparisonSourceId||"")===sourceId;
    });
    if(!copies.length)return [];
    return [project].concat(copies).map(function(p,index){
      var report=reportStatusFor(p);
      return {projectId:p.id,name:String(p.name||"Без назви"),number:index+1,
        status:report.status,url:report.url};
    });
  }
  function decoratePairReports(card,project,all){
    var variants=pairReports(project,all),old=card.querySelector(".aceil-quote-reports");
    if(variants.length<2){if(old)old.remove();return}
    var group=old||document.createElement("section");
    group.className="aceil-quote-reports";
    group.setAttribute("aria-label","Незалежні звіти за об'єктом");
    group.style.cssText="margin-top:9px;padding:9px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff;";
    group.replaceChildren();
    var title=document.createElement("div");
    title.style.cssText="font-weight:800;font-size:12px;color:#1e40af;margin-bottom:7px;";
    title.textContent="📄 Звіти за об'єктом · "+variants.length+" варіанти";
    if(variants.length!==2)title.textContent="📄 Звіти за об'єктом · "+variants.length+" варіантів";
    group.appendChild(title);
    var grid=document.createElement("div");
    grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:7px;";
    variants.forEach(function(variant){
      var tile=document.createElement("div");
      tile.className="aceil-quote-report-option";
      tile.style.cssText="min-width:0;padding:9px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;display:flex;flex-direction:column;gap:5px;";
      var heading=document.createElement("strong");
      heading.style.cssText="font-size:12px;line-height:1.3;color:#0f172a;overflow-wrap:anywhere;";
      heading.textContent=(variant.number===1?"① Основний":"② Варіант "+variant.number);
      tile.appendChild(heading);
      var name=document.createElement("span");
      name.style.cssText="color:#64748b;font-size:11px;line-height:1.35;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;";
      name.textContent=variant.name;
      name.title=variant.name;tile.appendChild(name);
      var status=document.createElement("span");
      status.style.cssText="font-size:11px;font-weight:750;color:"+(variant.status==="active"?"#15803d":variant.status==="expired"?"#b45309":"#64748b")+";";
      status.textContent=variant.status==="active"?"● Звіт опубліковано":variant.status==="expired"?"● Посилання прострочене":"○ Звіт ще не сформовано";
      tile.appendChild(status);
      var actions=document.createElement("div");
      actions.style.cssText="display:flex;gap:5px;flex-wrap:wrap;margin-top:2px;";
      if(variant.status==="active"){
        var open=document.createElement("a");
        open.href=variant.url;open.target="_blank";open.rel="noopener noreferrer";
        open.textContent="Відкрити ↗";
        open.style.cssText="display:inline-flex;align-items:center;padding:7px 9px;border-radius:8px;background:#2563eb;color:white;font-size:11px;font-weight:800;text-decoration:none;";
        actions.appendChild(open);
        var copy=document.createElement("button");copy.type="button";copy.textContent="Копіювати";
        copy.style.cssText="border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#334155;padding:7px 9px;font-size:11px;font-weight:800;";
        copy.onclick=function(){
          if(navigator.clipboard&&typeof navigator.clipboard.writeText==="function"){
            navigator.clipboard.writeText(variant.url).then(function(){notify("✓ Посилання скопійовано")},function(){notify("Не вдалося скопіювати посилання")});
          }else if(typeof window.prompt==="function")window.prompt("Скопіюйте посилання на звіт:",variant.url);
          else notify("Копіювання недоступне. Відкрийте звіт.");
        };
        actions.appendChild(copy);
      }else{
        var go=document.createElement("button");go.type="button";
        go.textContent="До проєкту";go.title="Перейти до проєкту, щоб сформувати звіт";
        go.style.cssText="border:1px solid #cbd5e1;border-radius:8px;background:#f1f5f9;color:#334155;padding:7px 9px;font-size:11px;font-weight:800;";
        go.onclick=function(){
          jumpToProject(variant.projectId);
          if(typeof window.editProject==="function")window.editProject(variant.projectId);
        };
        actions.appendChild(go);
      }
      tile.appendChild(actions);grid.appendChild(tile);
    });
    group.appendChild(grid);
    if(!old)card.appendChild(group);
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
      // One action only: original → independent copy, shown directly in list.
      // A copy is already editable; never offer to copy it again here.
      if(!project._comparisonSourceId){
        var copyButton=actions.querySelector("[data-project-quote-copy]");
        if(!copyButton){
          copyButton=document.createElement("button");copyButton.type="button";
          copyButton.dataset.projectQuoteCopy="1";copyButton.className="aceil-project-archive-action";
          copyButton.style.cssText="background:#e0f2fe;color:#075985;font-weight:800;font-size:11px;";
          var trash=actions.querySelector('[onclick*="deleteProject"]');
          actions.insertBefore(copyButton,trash||null);
        }
        var alreadyCopied=list().some(function(p){return p&&p._comparisonSourceId===cloudId(project)});
        copyButton.textContent=alreadyCopied?"⧉ Копія":"⧉ Копіювати";
        copyButton.title=alreadyCopied?"Показати наявну копію":"Створити окрему копію проєкту";
        copyButton.setAttribute("aria-label",copyButton.title);
        copyButton.disabled=copyInFlight.has(String(project.id));
        copyButton.onclick=function(){window.A_CEIL_ProjectArchive.copyForQuote(project.id)};
      }
      decoratePairReports(card,project,all);
      // The generic "Локально" badge must expose the real failure on mobile.
      // A tap opens the non-destructive retry/recovery options for this record.
      var syncChip=card.querySelector(".rp-project-head span[title]");
      if(syncChip&&(project._dirty||project._localUpdatedAt||pending(project)||!project._dbId)){
        var issue=syncIssue(project);
        syncChip.textContent=issue.label;
        syncChip.title=issue.description+" Торкніться для перевірки.";
        syncChip.style.cursor="pointer";
        syncChip.style.background=issue.blocked?"#fee2e2":issue.failed?"#fef3c7":"#fef3c7";
        syncChip.style.color=issue.blocked?"#b91c1c":"#92400e";
        syncChip.setAttribute("role","button");
        syncChip.setAttribute("tabindex","0");
        syncChip.setAttribute("aria-label","Перевірити синхронізацію: "+issue.description);
        syncChip.onclick=function(){window.A_CEIL_ProjectArchive.syncHelp(project.id)};
        syncChip.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();syncChip.click()}};
      }
      if(isArchived){var head=card.querySelector(".rp-project-head"),main=card.querySelector(".rp-project-main");if(head&&main&&!card.querySelector(".aceil-project-archived-date")){var note=document.createElement("div");note.className="aceil-project-archived-date";note.textContent="В архіві з "+new Date(archivedAt(project)).toLocaleDateString("uk-UA");main.insertBefore(note,head.nextSibling)}}
    });
  }
  // Keep each comparison copy next to its source in the visible project list.
  // Only presentation order changes; do not rewrite the local cache or cloud.
  function arrangeQuotePairs(projects){
    var all=Array.isArray(projects)?projects:[],byId=new Map(),children=new Map(),seen=new Set(),ordered=[];
    all.forEach(function(p){
      if(!p)return;
      [p.id,p._dbId,p._localId].forEach(function(id){if(id!=null)byId.set(String(id),p)});
    });
    all.forEach(function(p){
      if(!p||!p._comparisonSourceId)return;
      var key=String(p._comparisonSourceId),parent=byId.get(key);
      if(!parent||parent===p)return;
      var group=children.get(parent)||[];
      group.push(p);children.set(parent,group);
    });
    function append(p){
      if(!p||seen.has(p))return;
      seen.add(p);ordered.push(p);
      (children.get(p)||[]).forEach(append);
    }
    all.forEach(function(p){
      var parent=p&&p._comparisonSourceId?byId.get(String(p._comparisonSourceId)):null;
      if(!parent||parent===p)append(p);
    });
    all.forEach(append);
    return ordered;
  }
  function render(){
    if(typeof baseRender!=="function"||rendering)return;
    var originalWindow=window.getProjects,originalBinding=null,all=arrangeQuotePairs(originalWindow?originalWindow():[]);
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
  function jumpToProject(id){
    if(view!=="active"){view="active";render()}
    var project=projectBy(id),cards=typeof document.querySelectorAll==="function"?document.querySelectorAll("#projectsList .rp-project-card"):[];
    for(var i=0;i<cards.length;i++){
      var action=cards[i].querySelector('[onclick*="editProject"]'),
          raw=action&&action.getAttribute("onclick")||"",
          match=raw.match(/editProject\(['"]([^'"]+)['"]\)/);
      if(project&&match&&matches(project,match[1])){
        if(typeof cards[i].scrollIntoView==="function")cards[i].scrollIntoView({behavior:"smooth",block:"center"});
        return true;
      }
    }
    notify("Копія збережена. Зніміть фільтр пошуку або прокрутіть список проєктів.");
    return false;
  }
  function pending(project){
    var ids=[project.id,project._dbId,project._localId].filter(function(v){return v!=null}).map(String);
    try{return typeof window.getPendingQueue==="function"&&window.getPendingQueue().some(function(op){
      var data=op&&op.payload||{};
      return [data.localId,data.dbId].some(function(v){return v!=null&&ids.includes(String(v))});
    })}catch(_){return true}
  }
  function notify(message){if(typeof window.showToast==="function")window.showToast(message,4800)}

  function queuedSave(project){
    if(!project)return null;
    var ids=[project.id,project._dbId,project._localId].filter(function(x){return x!=null}).map(String);
    try{
      return typeof window.getPendingQueue==="function"&&window.getPendingQueue().find(function(op){
        if(!op||op.type!=="save")return false;
        var data=op.payload||{};
        return [data.localId,data.dbId].some(function(x){return x!=null&&ids.includes(String(x))});
      })||null;
    }catch(_){return null}
  }
  function syncIssue(project){
    var op=queuedSave(project),error=String(op&&op._lastError||"").slice(0,220),failed=!!(op&&op._failures);
    if(op&&op._manualRestoreRequired)return {blocked:true,failed:true,label:"⚠️ Відновлення",description:"Хмарний проєкт видалено або доступ відкликано. Локальні правки не видалено."};
    if(op&&op._manualConflictRequired)return {blocked:true,failed:true,label:"⚠️ Конфлікт",description:error||"Інша версія змінилася в хмарі. Потрібне ручне узгодження."};
    if(project&&project._dbId&&!project._cloudRevision)return {blocked:true,failed:true,label:"⚠️ Перевірка",description:"Немає перевіреної серверної ревізії. Автоматичний запис заборонено, щоб не затерти креслення."};
    if(failed)return {blocked:false,failed:true,label:"⚠️ Хмара",description:error||"Попередня спроба синхронізації не вдалася."};
    return {blocked:false,failed:false,label:"⏳ Локально",description:op?"Збережено на пристрої, очікує синхронізації.":"Немає підтвердження хмарного збереження."};
  }
  function syncHelp(id){
    var project=projectBy(id);if(!project)return false;
    var target=document.getElementById("projectsList"),parent=target&&target.parentNode;
    if(!parent)return false;
    var panel=document.getElementById("aceilSyncRescuePanel");
    if(!panel){panel=document.createElement("section");panel.id="aceilSyncRescuePanel";parent.insertBefore(panel,target)}
    panel.replaceChildren();
    panel.style.cssText="margin:10px 0 14px;padding:14px;border:1px solid #fbbf24;border-radius:14px;background:#fffbeb;color:#78350f;";
    var heading=document.createElement("strong");heading.textContent="☁️ Синхронізація: "+String(project.name||"Проєкт");
    panel.appendChild(heading);
    var issue=syncIssue(project),detail=document.createElement("p");
    detail.style.cssText="font-size:13px;line-height:1.5;margin:8px 0 12px";
    detail.textContent=issue.description+" Не очищуйте дані браузера і не видаляйте цей проєкт, доки зміни не опиняться у хмарі.";
    panel.appendChild(detail);
    var actions=document.createElement("div");actions.style.cssText="display:flex;gap:8px;flex-wrap:wrap";
    var retry=document.createElement("button");retry.type="button";retry.textContent="↻ Повторити синхронізацію";
    retry.style.cssText="border:0;border-radius:9px;padding:10px 12px;background:#2563eb;color:#fff;font-weight:800";
    retry.disabled=issue.blocked;
    retry.onclick=function(){retryCloudSave(project.id)};
    actions.appendChild(retry);
    var rescue=document.createElement("button");rescue.type="button";rescue.textContent="☁️ Зберегти окрему копію";
    rescue.style.cssText="border:1px solid #fdba74;border-radius:9px;padding:10px 12px;background:#fff;color:#9a3412;font-weight:800";
    rescue.onclick=function(){rescueCloudCopy(project.id)};
    actions.appendChild(rescue);panel.appendChild(actions);
    return true;
  }
  async function retryCloudSave(id){
    var project=projectBy(id),op=queuedSave(project);
    if(!project)return false;
    if(!navigator.onLine||!window._sb||!window._sbUser){notify("Немає підключення до хмари");return false}
    if(op&&(op._manualRestoreRequired||op._manualConflictRequired)||project._dbId&&!project._cloudRevision){
      notify("Автоматичний запис заблокований для захисту хмарної версії. Створіть окрему резервну копію.");syncHelp(id);return false;
    }
    try{
      notify("Спроба синхронізації…");
      if(!op){
        var persistence=window.A·CEIL&&window.A·CEIL.ProjectPersistence;
        if(!persistence||typeof persistence.syncProject!=="function")throw new Error("Модуль хмарного збереження недоступний");
        await persistence.syncProject(project);
      }else{
        if(typeof window.flushPendingQueue!=="function")throw new Error("Черга збереження недоступна");
        await window.flushPendingQueue();
      }
      var updated=projectBy(id),waiting=updated&&queuedSave(updated);
      render();
      if(updated&&!waiting&&!updated._dirty&&!updated._localUpdatedAt&&updated._dbId){
        notify("✅ Останні зміни підтверджено в хмарі");return true;
      }
      notify("Ще не збережено. Перевірте причину в панелі синхронізації.");
      syncHelp(updated?updated.id:id);return false;
    }catch(error){
      notify("Не вдалося синхронізувати: "+String(error&&error.message||error).slice(0,140));
      syncHelp(id);return false;
    }
  }
  async function rescueCloudCopy(id){
    var source=projectBy(id),repo=window.A·CEIL&&window.A·CEIL.ProjectRepository;
    if(!source||!repo||!window._sb||!window._sbUser||!navigator.onLine){notify("Для створення хмарної копії потрібні інтернет і вхід у акаунт");return false}
    if(source._shared){notify("Редагування цього проєкту обмежено власником");return false}
    var sourceKey=String(source._dbId||source.id);
    var existing=list().find(function(p){return p&&p._recoverySourceId===sourceKey});
    if(existing){notify("Резервна копія вже створена: "+String(existing.name||""));return false}
    if(copyInFlight.has(sourceKey))return false;
    if(typeof window.confirm==="function"&&!window.confirm("Створити окрему хмарну копію поточного локального креслення? Оригінал залишиться незмінним."))return false;
    copyInFlight.add(sourceKey);
    try{
      var uid=String(window._sbUser.id),client=window._sb,copy=quoteCopy(source,uid),localId=copy.id;
      copy.name=String(source.name||"Проєкт")+" — Резервна копія";
      delete copy._comparisonSourceId;
      copy._recoverySourceId=sourceKey;
      var st=stateOf(copy);
      delete st.comparisonSourceId;st.recoverySourceId=sourceKey;
      copy.state=JSON.stringify(st);
      repo.upsert(copy,{append:true});
      if(typeof window.addToPendingQueue!=="function"||typeof window.flushPendingQueue!=="function")
        throw new Error("Черга збереження недоступна; копія залишилась локально");
      window.addToPendingQueue({type:"save",payload:{localId:localId},addedAt:Date.now()});
      await window.flushPendingQueue();
      if(!window._sbUser||String(window._sbUser.id)!==uid||window._sb!==client)return false;
      var saved=projectBy(localId);
      render();
      if(saved&&saved._dbId&&!saved._dirty&&!queuedSave(saved)){
        notify("✅ Резервну копію збережено в хмарі. Оригінал не змінювали.");return saved.id;
      }
      notify("Копія збережена локально, але сервер ще не підтвердив її. Не видаляйте її.");return false;
    }catch(error){
      notify("Не вдалося створити хмарну копію: "+String(error&&error.message||error).slice(0,140));return false;
    }finally{copyInFlight.delete(sourceKey);render()}
  }

  function safeCopyName(name){return String(name||"Без назви").replace(/ — Копія$/,"")+" — Копія"}
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
  async function copyForQuote(id){
    var source=projectBy(id),sourceId=source&&String(source.id),repo=window.A·CEIL&&window.A·CEIL.ProjectRepository;
    if(!source||!repo)return false;
    if(source._comparisonSourceId){
      jumpToProject(source.id);
      notify("Копія вже є у списку. Відкрийте її для змін.");
      return source.id;
    }
    var prior=list().find(function(p){return p&&p._comparisonSourceId===cloudId(source)});
    if(prior){
      jumpToProject(prior.id);
      notify("Копія вже є у списку, нову не створювали.");
      return prior.id;
    }
    if(copyInFlight.has(sourceId))return false;
    if(!navigator.onLine||!window._sb||!window._sbUser){notify("Для створення незалежної копії потрібна хмара");return false}
    if(source._shared||!cloudId(source)||source._dirty||source._localUpdatedAt||pending(source)){
      notify("Спочатку завершіть хмарне збереження вихідного проєкту");return false;
    }
    copyInFlight.add(sourceId);
    try{
      var userId=String(window._sbUser.id),client=window._sb,copy=quoteCopy(source,userId),localId=copy.id;
      repo.upsert(copy,{append:true});
      render();jumpToProject(localId);
      if(typeof window.addToPendingQueue!=="function"||typeof window.flushPendingQueue!=="function")
        throw new Error("Черга збереження недоступна — копія збережена локально");
      window.addToPendingQueue({type:"save",payload:{localId:localId,dbId:null},addedAt:Date.now()});
      await window.flushPendingQueue();
      // Never expose another account's quote links after a sign-in switch.
      if(!window._sbUser||String(window._sbUser.id)!==userId||window._sb!==client)return false;
      var saved=projectBy(localId);
      if(!saved||!cloudId(saved)||saved._dirty||pending(saved)){
        notify("Копію створено локально. Дочекайтеся хмарного збереження перед публікацією.");
        render();return false;
      }
      // Do not auto-publish an estimate without first opening the report;
      // report snapshots must show precisely what the client approved.
      render();jumpToProject(saved.id);
      notify("✅ Копія у списку. Відкрийте її для редагування.");
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
  window.A_CEIL_ProjectArchive={toggle:toggle,copyForQuote:copyForQuote,syncHelp:syncHelp,retryCloudSave:retryCloudSave,rescueCloudCopy:rescueCloudCopy,syncIssue:syncIssue,arrangeQuotePairs:arrangeQuotePairs,pairReports:pairReports,jumpToProject:jumpToProject,setView:function(next){view=next==="archive"?"archive":"active";render()},count:function(){return totals().archive},isArchived:function(project){return !!archivedAt(project)}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
  [100,700,1800].forEach(function(delay){setTimeout(install,delay)});
})();
