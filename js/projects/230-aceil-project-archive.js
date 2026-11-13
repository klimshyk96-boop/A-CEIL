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
  function isRecovery(project){
    if(!project)return false;
    if(project._recoverySourceId)return true;
    // Older backup records sometimes lack the normalized recovery field, but
    // the explicit name remains. Keep them available in the recovery tab.
    return /(?:^| — )Резервна копія(?:$| — )/i.test(String(project.name||""));
  }
  function comparisonParent(project){
    if(!project||isRecovery(project))return "";
    return String(project._comparisonSourceId||"");
  }
  function alternativesFor(source,all){
    var key=cloudId(source);
    if(!key||isRecovery(source))return [];
    return (all||list()).filter(function(p){
      return p&&p!==source&&comparisonParent(p)===key;
    }).sort(function(a,b){
      // Keep a dirty/conflicted alternative visible rather than hiding work.
      var editingA=(a._dirty||a._localUpdatedAt||queuedSave(a))?1:0,
          editingB=(b._dirty||b._localUpdatedAt||queuedSave(b))?1:0;
      if(editingA!==editingB)return editingB-editingA;
      var activeA=archivedAt(a)?0:1,activeB=archivedAt(b)?0:1;
      if(activeA!==activeB)return activeB-activeA;
      var revA=Number(a._cloudRevision)||0,revB=Number(b._cloudRevision)||0;
      if(revA!==revB)return revB-revA;
      return (Number(b._cloudSavedAt)||0)-(Number(a._cloudSavedAt)||0);
    });
  }
  function activeAlternative(source,all){return alternativesFor(source,all)[0]||null}

  function isCurrentAlternative(project,all){
    var parentId=comparisonParent(project);
    if(!parentId)return false;
    var parent=(all||list()).find(function(p){return cloudId(p)===parentId});
    return !!(parent&&activeAlternative(parent,all)===project);
  }
  function isHistory(project,all){
    if(isRecovery(project))return true;
    var parentId=comparisonParent(project);
    if(!parentId)return false;
    var source=(all||list()).find(function(p){return cloudId(p)===parentId});
    return !!(source&&activeAlternative(source,all)!==project);
  }
  function projectsForView(all,selected){
    return all.filter(function(p){
      if(selected==="archive")return !!archivedAt(p);
      if(archivedAt(p))return false;
      return selected==="history"?isHistory(p,all):!isHistory(p,all)&&!isCurrentAlternative(p,all);
    });
  }
  function totals(){
    var all=list();
    return {active:projectsForView(all,"active").length,
      history:projectsForView(all,"history").length,
      archive:projectsForView(all,"archive").length};
  }
  function ensureTabs(){
    var projectsList=document.getElementById("projectsList");if(!projectsList)return;
    var tabs=document.getElementById("aceilProjectArchiveTabs");
    if(!tabs){tabs=document.createElement("div");tabs.id="aceilProjectArchiveTabs";tabs.className="aceil-project-archive-tabs";projectsList.parentNode.insertBefore(tabs,projectsList)}
    var count=totals();
    var needsHelp=list().some(function(p){return !archivedAt(p)&&isHistory(p,list())&&(p._dirty||pending(p)||!p._dbId)});
    tabs.innerHTML='<button type="button" data-project-view="active" class="'+(view==="active"?"active":"")+'"><span>Проєкти</span><b>'+count.active+'</b></button>'
      +'<button type="button" data-project-view="history" class="'+(view==="history"?"active":"")+'"><span>'+(needsHelp?'⚠️ ':'')+'Резервні</span><b>'+count.history+'</b></button>'
      +'<button type="button" data-project-view="archive" class="'+(view==="archive"?"active":"")+'"><span>Архів</span><b>'+count.archive+'</b></button>';
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
    if(!project||comparisonParent(project)||isRecovery(project))return [];
    var alt=activeAlternative(project,Array.isArray(all)?all:list());
    if(!alt)return [];
    return [project,alt].map(function(p,index){
      var report=reportStatusFor(p);
      return {projectId:p.id,name:String(p.name||"Без назви"),number:index+1,
        status:report.status,url:report.url};
    });
  }

  // One card represents one physical object. It opens a small chooser; the
  // alternative is still a distinct cloud project, never a second list card.
  var activePicker=null;
  function closeVariantPicker(){
    if(!activePicker)return;
    activePicker.remove();
    activePicker=null;
  }
  function openVariantProject(project,edit){
    closeVariantPicker();
    if(!project)return false;
    if(edit){
      if(typeof window.editProject==="function")return window.editProject(project.id);
      notify("Редагування картки недоступне.");return false;
    }
    var multi=window.A_CEIL_ProjectMode&&typeof window.A_CEIL_ProjectMode.isMulti==="function"
      ?window.A_CEIL_ProjectMode.isMulti(project)
      :!!(project.multiRoom||Array.isArray(project.rooms)&&project.rooms.length);
    if(multi&&typeof window.openObjectRooms==="function")return window.openObjectRooms(project.id);
    if(typeof window.loadProject==="function")return window.loadProject(project.id);
    notify("Не вдалося відкрити креслення. Оновіть сторінку.");return false;
  }
  function variantName(project,primary){
    return primary?"① Основний — H":"② Безвставочний";
  }
  function openVariantPicker(id){
    var source=projectBy(id);
    if(!source)return false;
    if(comparisonParent(source)){
      var parent=list().find(function(p){return cloudId(p)===comparisonParent(source)});
      if(parent)source=parent;
    }
    if(isRecovery(source)){return openVariantProject(source,false)}
    closeVariantPicker();
    var variants=[source],alt=activeAlternative(source,list());
    if(alt)variants.push(alt);
    var overlay=document.createElement("div");overlay.className="aceil-variant-picker-backdrop";
    overlay.setAttribute("role","presentation");
    overlay.style.cssText="position:fixed;inset:0;z-index:2147483450;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;";
    var dialog=document.createElement("section");dialog.className="aceil-variant-picker";
    dialog.setAttribute("role","dialog");
    dialog.setAttribute("aria-modal","true");
    dialog.setAttribute("aria-label","Виберіть варіант розрахунку");
    dialog.style.cssText="width:min(100%,470px);max-height:calc(100dvh - 28px);overflow-y:auto;box-sizing:border-box;border-radius:20px;padding:16px 14px max(16px,env(safe-area-inset-bottom));background:white;color:#0f172a;box-shadow:0 20px 55px rgba(0,0,0,.25);display:grid;gap:12px;";
    var head=document.createElement("div");head.style.cssText="display:flex;align-items:flex-start;gap:12px;";
    var headText=document.createElement("div");headText.style.cssText="flex:1;min-width:0;";
    var title=document.createElement("strong");title.textContent=String(source.name||"Об'єкт");
    title.style.cssText="font-size:18px;line-height:1.25;display:block;overflow-wrap:anywhere;";
    var subtitle=document.createElement("div");subtitle.textContent="Оберіть розрахунок для цього об'єкта";
    subtitle.style.cssText="color:#64748b;font-size:12px;margin-top:5px;";
    headText.appendChild(title);headText.appendChild(subtitle);
    var dismiss=document.createElement("button");dismiss.type="button";dismiss.className="aceil-variant-picker-close";
    dismiss.textContent="✕";dismiss.setAttribute("aria-label","Закрити вибір");
    dismiss.style.cssText="border:0;border-radius:10px;background:#f1f5f9;color:#475569;width:40px;height:40px;font-size:19px;flex-shrink:0;";
    dismiss.onclick=closeVariantPicker;
    head.appendChild(headText);head.appendChild(dismiss);dialog.appendChild(head);
    variants.forEach(function(project,index){
      var main=index===0,report=reportStatusFor(project),sync=(project._dirty||project._localUpdatedAt||queuedSave(project))
        ?syncIssue(project):null;
      var box=document.createElement("div");box.className="aceil-variant-choice";
      box.style.cssText="min-width:0;border:1px solid "+(main?"#bfdbfe":"#ddd6fe")+";border-radius:14px;padding:10px;background:"+(main?"#f8fbff":"#faf8ff")+";display:grid;gap:7px;";
      var open=document.createElement("button");open.type="button";
      open.className="aceil-variant-choice-open";
      open.dataset.variantProject=String(project.id);
      open.style.cssText="display:flex;gap:10px;align-items:center;text-align:left;width:100%;padding:4px 0;border:0;background:transparent;color:#0f172a;cursor:pointer;";
      var label=document.createElement("span");label.style.cssText="flex:1;display:grid;gap:4px;min-width:0";
      var labelTitle=document.createElement("strong");labelTitle.textContent=variantName(project,main);
      labelTitle.style.cssText="font-size:15px;line-height:1.25;";
      var hint=document.createElement("small");hint.textContent=main?"Базове креслення та кошторис":"Окреме креслення і розрахунок";
      hint.style.cssText="font-size:11px;color:#64748b;line-height:1.3;";
      label.appendChild(labelTitle);label.appendChild(hint);open.appendChild(label);
      var chevron=document.createElement("span");chevron.textContent="Відкрити ›";
      chevron.style.cssText="color:#1d4ed8;font-size:12px;font-weight:850;white-space:nowrap;";
      open.appendChild(chevron);open.onclick=function(){openVariantProject(project,false)};
      box.appendChild(open);
      var status=document.createElement("div");status.className="aceil-variant-report-status";
      status.textContent=sync&&sync.blocked?"⚠️ "+sync.label+": перевірте зміни":report.status==="active"?"● Звіт опубліковано":report.status==="expired"?"● Посилання закінчилося":"○ Звіт ще не опубліковано";
      status.style.cssText="font-size:11px;font-weight:750;color:"+(sync&&sync.blocked?"#b91c1c":report.status==="active"?"#15803d":"#64748b")+";";
      box.appendChild(status);
      var actions=document.createElement("div");actions.style.cssText="display:flex;flex-wrap:wrap;gap:7px;align-items:center;";
      if(report.status==="active"){
        var reportLink=document.createElement("a");reportLink.href=report.url;reportLink.target="_blank";
        reportLink.rel="noopener noreferrer";reportLink.textContent="📄 Переглянути звіт";
        reportLink.style.cssText="font-size:12px;font-weight:800;background:#dcfce7;color:#15803d;padding:8px 10px;border-radius:9px;text-decoration:none;";
        actions.appendChild(reportLink);
        var copy=document.createElement("button");copy.type="button";copy.textContent="🔗 Копіювати";
        copy.style.cssText="font-size:11px;font-weight:800;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:8px 10px;color:#334155;";
        copy.onclick=function(){
          if(navigator.clipboard&&typeof navigator.clipboard.writeText==="function")
            navigator.clipboard.writeText(report.url).then(function(){notify("✓ Посилання скопійовано")},function(){notify("Не вдалося скопіювати посилання")});
          else if(typeof window.prompt==="function")window.prompt("Скопіюйте посилання:",report.url);
        };
        actions.appendChild(copy);
      }else{
        var noReport=document.createElement("span");noReport.textContent="Звіт можна створити після відкриття креслення";
        noReport.style.cssText="font-size:11px;color:#64748b;";
        actions.appendChild(noReport);
      }
      var edit=document.createElement("button");edit.type="button";edit.textContent="✎ Дані";
      edit.style.cssText="font-size:11px;font-weight:800;border:1px solid #cbd5e1;border-radius:9px;background:white;color:#475569;padding:8px 10px;margin-left:auto;";
      edit.onclick=function(){openVariantProject(project,true)};actions.appendChild(edit);
      box.appendChild(actions);dialog.appendChild(box);
    });
    if(!alt){
      var create=document.createElement("button");create.type="button";
      create.className="aceil-variant-create";
      create.textContent="＋ Додати прорахунок";
      create.style.cssText="padding:12px;border:1px dashed #93c5fd;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-weight:850;font-size:13px;";
      create.onclick=function(){closeVariantPicker();copyForQuote(source.id)};
      dialog.appendChild(create);
    }
    var older=Math.max(0,alternativesFor(source,list()).length-1);
    if(older){
      var history=document.createElement("button");history.type="button";
      history.className="aceil-variant-history";
      history.textContent="Попередні версії ("+older+") — у «Резервні»";
      history.style.cssText="border:0;background:transparent;padding:5px;color:#64748b;font-weight:750;font-size:12px;text-decoration:underline;";
      history.onclick=function(){closeVariantPicker();view="history";render()};
      dialog.appendChild(history);
    }
    overlay.appendChild(dialog);
    overlay.onclick=function(e){if(e.target===overlay)closeVariantPicker()};
    document.body.appendChild(overlay);activePicker=overlay;
    dismiss.focus();
    return true;
  }
  function decorateVariantBadge(card,project,all){
    if(comparisonParent(project)||isRecovery(project))return;
    var alt=activeAlternative(project,all),main=card.querySelector(".rp-project-main");
    if(!main)return;
    var badge=main.querySelector(".aceil-variants-badge");
    if(!badge){badge=document.createElement("button");badge.type="button";
      badge.className="aceil-variants-badge";main.appendChild(badge)}
    badge.textContent=alt?"◫ 2 варіанти · Обрати":"＋ Додати прорахунок";
    badge.style.cssText="align-self:flex-start;margin-top:8px;padding:7px 10px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:850;cursor:pointer;";
    badge.setAttribute("aria-label",alt?"Обрати основний або безвставочний розрахунок":"Відкрити вибір розрахунку");
    badge.onclick=function(e){e.stopPropagation();openVariantPicker(project.id)};
    if(alt&&(alt._dirty||alt._localUpdatedAt||queuedSave(alt))){
      badge.textContent+=" ⚠️";
      badge.title="Альтернативний кошторис має незбережені зміни.";
    }
    card.style.cursor="pointer";
    card.setAttribute("tabindex","0");
    card.setAttribute("aria-label","Картка об'єкта "+String(project.name||"")+" — вибір розрахунку");
    card.onclick=function(e){
      if(e.target&&e.target.closest&&e.target.closest("button,a,input,select,textarea,.rp-project-actions"))return;
      openVariantPicker(project.id);
    };
    card.onkeydown=function(e){
      if(e.target===card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openVariantPicker(project.id)}
    };
    var actions=card.querySelector(".rp-project-actions");
    if(actions){
      var mainOpen=actions.querySelector('button[onclick*="openObjectRooms"],button[onclick*="loadProject"]');
      if(mainOpen){mainOpen.onclick=function(e){e.stopPropagation();openVariantPicker(project.id)};mainOpen.title="Обрати варіант креслення";}
      var pen=actions.querySelector('button[onclick*="editProject"]');
      if(pen){pen.onclick=function(e){e.stopPropagation();openVariantPicker(project.id)};pen.title="Обрати варіант для редагування";}
    }
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
      decorateVariantBadge(card,project,all);
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
      if(!filteredOnce)filteredOnce=projectsForView(all,view);
      return filteredOnce;
    };
    rendering=true;window.getProjects=filtered;try{getProjects=filtered}catch(_){}
    try{baseRender()}finally{window.getProjects=originalWindow;try{getProjects=originalBinding}catch(_){}rendering=false}
    ensureTabs();decorate();
    var listEl=document.getElementById("projectsList");
    if(listEl&&!filtered().length)listEl.innerHTML='<div class="aceil-project-archive-empty">'+(view==="archive"?"Архів поки порожній":view==="history"?"Резервних і попередніх версій немає":"Активних проєктів немає")+'</div>';
  }

  function cloudId(project){return project&&String(project._dbId||"")}
  function projectBy(id){return list().find(function(project){return matches(project,id)})||null}
  function jumpToProject(id){
    var project=projectBy(id);
    if(!project){notify("Проєкт не знайдено в списку.");return false;}
    var parent=comparisonParent(project)&&list().find(function(p){return cloudId(p)===comparisonParent(project)});
    if(parent&&isCurrentAlternative(project,list())&&!archivedAt(project)&&!archivedAt(parent)){
      if(view!=="active"){view="active";render()}
      return openVariantPicker(parent.id);
    }
    var destination=archivedAt(project)?"archive":isHistory(project,list())?"history":"active";
    if(view!==destination){view=destination;render()}
    function scrollToCard(){
      var cards=typeof document.querySelectorAll==="function"?document.querySelectorAll("#projectsList .rp-project-card"):[];
      for(var i=0;i<cards.length;i++){
        var action=cards[i].querySelector('[onclick*="editProject"]'),
          raw=action&&action.getAttribute("onclick")||"",
          match=raw.match(/editProject\(['"]([^'"]+)['"]\)/);
        if(match&&matches(project,match[1])){
          if(typeof cards[i].scrollIntoView==="function")cards[i].scrollIntoView({behavior:"smooth",block:"center"});
          return true;
        }
      }
      return false;
    }
    if(scrollToCard())return true;
    // A parent/copy may be outside the current search. Clear only the visible
    // search filter, not the saved project or archive status.
    var search=document.getElementById("projSearch");
    if(search&&search.value){
      search.value="";render();
      if(scrollToCard())return true;
    }
    notify("Проєкт у списку не видно. Перевірте фільтр і архів.");
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
    panel.style.cssText="margin:8px 0 12px;padding:12px;border:1px solid #e7b96b;border-radius:13px;background:#fffcf5;color:#713f12;max-width:100%;box-sizing:border-box;";
    var heading=document.createElement("strong");heading.textContent="☁️ Збереження в хмарі · "+String(project.name||"Проєкт");
    panel.appendChild(heading);
    var issue=syncIssue(project),detail=document.createElement("p");
    detail.style.cssText="font-size:13px;line-height:1.5;margin:8px 0 12px";
    detail.textContent=issue.blocked
      ?"Локальне креслення збережено. Хмарну версію не перезаписано. Не очищуйте дані браузера. Можна безпечно порівняти обидві версії."
      :issue.description+" Не очищуйте дані браузера, доки зміни не збережуться у хмарі.";
    panel.appendChild(detail);
    var actions=document.createElement("div");actions.style.cssText="display:flex;gap:8px;flex-wrap:wrap";
    var retry=document.createElement("button");retry.type="button";retry.textContent="↻ Повторити синхронізацію";
    retry.style.cssText="border:0;border-radius:9px;padding:10px 12px;background:#2563eb;color:#fff;font-weight:800";
    retry.disabled=issue.blocked;
    retry.onclick=function(){retryCloudSave(project.id)};
    if(!issue.blocked)actions.appendChild(retry);
    else if(project._dbId){
      var reconcile=document.createElement("button");reconcile.type="button";
      reconcile.textContent="🔎 Перевірити відмінності";
      reconcile.style.cssText="border:0;border-radius:9px;padding:11px 13px;background:#2563eb;color:#fff;font-weight:850;";
      reconcile.onclick=function(){
        if(window.A_CEIL_ConflictResolver)window.A_CEIL_ConflictResolver.open(project.id);
        else notify("Модуль узгодження ще завантажується.");
      };
      actions.appendChild(reconcile);
    }
    var rescue=document.createElement("button");rescue.type="button";
    var existingRescue=list().find(function(p){return p&&p!==project&&String(p._recoverySourceId||"")===String(project._dbId||project.id)});
    rescue.textContent=existingRescue?"☁️ Відкрити збережену резервну":isRecovery(project)?"☁️ Резервна — повторення вимкнено":"☁️ Створити захисну копію";
    rescue.style.cssText="border:1px solid #fdba74;border-radius:9px;padding:10px 12px;background:#fff;color:#9a3412;font-weight:800";
    rescue.disabled=isRecovery(project)&&!existingRescue;
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
    var existing=list().find(function(p){return p&&p!==source&&String(p._recoverySourceId||"")===sourceKey});
    if(existing){
      jumpToProject(existing.id);
      notify("Резервна копія вже збережена. Відкрито наявну, нову не створювали.");
      return existing.id;
    }
    if(isRecovery(source)){
      notify("Це вже резервна копія. Не створюємо ланцюжок резервних копій. Збережіть локальний JSON перед вирішенням конфлікту.");
      return false;
    }
    if(copyInFlight.has(sourceKey))return false;
    if(typeof window.confirm==="function"&&!window.confirm("Створити окрему хмарну копію поточного локального креслення? Оригінал залишиться незмінним."))return false;
    copyInFlight.add(sourceKey);
    try{
      var uid=String(window._sbUser.id),client=window._sb,copy=quoteCopy(source,uid),localId=copy.id;
      copy.name=String(source.name||"Проєкт").replace(/(?: — (?:Копія|Резервна копія))+$/,"")+" — Резервна копія";
      delete copy._comparisonSourceId;
      delete copy._recoverySourceId;
      copy._recoverySourceId=sourceKey;
      var st=stateOf(copy);
      delete st.comparisonSourceId;delete st.recoverySourceId;st.recoverySourceId=sourceKey;
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

  function safeCopyName(name){return String(name||"Без назви").replace(/(?: — (?:Копія|Безвставочний))+$/,"")+" — Безвставочний"}
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
    delete copy._recoverySourceId;
    copy.archivedAt=null;copy._dirty=true;copy._syncStatus="pending_create";copy._localUpdatedAt=Date.now();
    var state=stateOf(source);delete state.archivedAt;
    ["report_token","report_published_at","report_expires_at","calcLinks","estimateVariants","_activeEstimateVariantId"].forEach(function(key){delete state[key]});
    delete state.recoverySourceId;
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
    if(comparisonParent(source)||isRecovery(source)){
      jumpToProject(source.id);
      notify("Це вже альтернативний або резервний проєкт. Створювати копію його копії не потрібно.");
      return source.id;
    }
    var prior=activeAlternative(source,list());
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
      var userId=String(window._sbUser.id),client=window._sb;
      // A stale/offline local list may not contain an alternative already saved
      // by the other device. Check cloud before creating another copy.
      if(typeof client.from==="function"){
        var check=await client.from("projects").select("id")
          .eq("user_id",userId).contains("state",{comparisonSourceId:cloudId(source)})
          .limit(1).maybeSingle();
        if(!window._sbUser||String(window._sbUser.id)!==userId||window._sb!==client)return false;
        if(check.error)throw new Error("Не вдалося перевірити наявні копії в хмарі. Нову не створювали.");
        if(check.data&&check.data.id){
          notify("Безвставочний варіант уже є в хмарі. Оновіть список проєктів; дубль не створено.");
          return false;
        }
      }
      var copy=quoteCopy(source,userId),localId=copy.id;
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
      notify("✅ Альтернативу збережено. Відкрийте її й налаштуйте безвставочний профіль; основний H не змінювався.");
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
  window.A_CEIL_ProjectArchive={toggle:toggle,copyForQuote:copyForQuote,syncHelp:syncHelp,retryCloudSave:retryCloudSave,rescueCloudCopy:rescueCloudCopy,syncIssue:syncIssue,arrangeQuotePairs:arrangeQuotePairs,pairReports:pairReports,projectsForView:projectsForView,openVariants:openVariantPicker,jumpToProject:jumpToProject,setView:function(next){view=next==="archive"?"archive":next==="history"?"history":"active";render()},count:function(){return totals().archive},isArchived:function(project){return !!archivedAt(project)}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
  [100,700,1800].forEach(function(delay){setTimeout(install,delay)});
})();
