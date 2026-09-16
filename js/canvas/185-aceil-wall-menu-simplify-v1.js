(function(){
  "use strict";

  var STORAGE_KEY = "A·CEIL_wallMenuAdvanced_v2";

  function byId(id){ return document.getElementById(id); }

  function isAdvancedOn(){
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch(e){ return false; }
  }
  function setAdvanced(on){
    try { localStorage.setItem(STORAGE_KEY, on ? "1" : "0"); } catch(e){}
  }

  // The real modal has plain <label> tags with no class/id, so we match
  // by their text content instead of a hypothetical .rwe2-label class.
  function findLabelByText(root, text){
    var labels = root.querySelectorAll("label");
    for (var i = 0; i < labels.length; i++){
      if (labels[i].textContent.trim() === text) return labels[i];
    }
    return null;
  }

  // Tags a label AND the field element right after it (input / color row)
  // so both can be hidden together via CSS.
  function tagField(modal, labelText){
    var label = findLabelByText(modal, labelText);
    if (!label) return;
    label.classList.add("rwe2-only-adv");
    var sib = label.nextElementSibling;
    if (sib) sib.classList.add("rwe2-only-adv");
  }

  function tagHiddenFields(modal){
    tagField(modal, "Назва на макеті"); // label + #wallEditType
    tagField(modal, "Колір на макеті"); // label + color-row div (#wallEditColor + swatches)

    var identityHint = byId("rmCurtainIdHint");
    if (identityHint) identityHint.classList.add("rwe2-only-adv");
    modal.querySelectorAll(".rwe-preset-edit,.rwe-preset-del").forEach(function(btn){
      btn.classList.add("rwe2-only-adv");
    });
  }

  function presetColor(name){
    var list=[];
    try{
      if(typeof window.rwe2WallPresetRead==="function") list=window.rwe2WallPresetRead()||[];
      else list=JSON.parse(localStorage.getItem("A·CEIL_wall_presets_v32")||"[]");
    }catch(e){ list=[]; }
    var wanted=String(name||"").trim().toLowerCase();
    var found=list.find(function(p){
      var n=typeof p==="string"?p:(p&&p.name);
      return String(n||"").trim().toLowerCase()===wanted;
    });
    return found&&typeof found==="object"&&found.color ? found.color : "";
  }

  function syncPresetColorDot(){
    var select=byId("rwe2Preset");
    if(!select||!select.parentElement)return;
    var toolbar=select.closest(".rwe-preset-toolbar")||select.parentElement;
    var dot=toolbar.querySelector(".rwe2-preset-color-dot");
    if(!dot){
      dot=document.createElement("span");
      dot.className="rwe2-preset-color-dot";
      dot.setAttribute("aria-hidden","true");
      toolbar.insertBefore(dot,select);
    }
    var color=presetColor(select.value);
    dot.style.display=color?"block":"none";
    if(color)dot.style.backgroundColor=color;
    if(select.dataset.colorDotReady!=="1"){
      select.dataset.colorDotReady="1";
      select.addEventListener("change",function(){setTimeout(syncPresetColorDot,0);});
    }
  }

  function currentMark(){
    var markId=window._rwe2CurrentWallId||window._wallEditId||null;
    var list=[];
    try{list=Array.isArray(window.wallMarks)?window.wallMarks:(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks)?wallMarks:[]);}catch(e){list=[];}
    return list.find(function(mark){return mark&&String(mark.id)===String(markId);})||null;
  }

  function ensureWallDistanceUi(){
    var modal=byId("wallEditModal"),lengthGrid=modal&&modal.querySelector(".rwe2-grid2");
    if(!lengthGrid)return null;
    var input=byId("rwe2WallDistance");
    if(input)return input;
    var field=document.createElement("div");
    field.className="rwe2-wall-distance-field";
    field.innerHTML='<label class="rwe2-label" for="rwe2WallDistance">Відступ від стіни, см</label><input id="rwe2WallDistance" class="rwe2-input" type="number" inputmode="decimal" min="0" step="1" value="0"><div class="rwe2-hint">0 — елемент на стіні. Інше значення ставить його паралельно всередині кімнати.</div>';
    lengthGrid.insertAdjacentElement("afterend",field);
    return byId("rwe2WallDistance");
  }

  function syncWallDistanceUi(){
    var input=ensureWallDistanceUi(),mark=currentMark();
    if(input&&mark)input.value=Math.max(0,Math.round(Number(mark.wallDistanceCm)||0));
  }

  function selectedPresetName(){
    var select=byId("rwe2Preset"),name=byId("rwe2Name");
    return String(select&&select.value||name&&name.value||"").trim();
  }

  function selectedDrawingColor(){
    var value=byId("rwe2ColorValue");
    return String(value&&value.value||"#f97316");
  }

  function savePresetColor(){
    var name=selectedPresetName(),color=selectedDrawingColor();
    if(!name){
      if(typeof window.showToast==="function")window.showToast("Оберіть заготовку");
      return false;
    }
    try{
      if(typeof window.rwe2WallPresetUpsert==="function"){
        window.rwe2WallPresetUpsert(name,color);
      }else{
        var list=typeof window.rwe2WallPresetRead==="function"?(window.rwe2WallPresetRead()||[]):[];
        var found=list.find(function(item){return item&&String(item.name||"").toLowerCase()===name.toLowerCase();});
        if(found)found.color=color;else list.push({name:name,color:color});
        if(typeof window.rwe2WallPresetWrite==="function")window.rwe2WallPresetWrite(list);
        else localStorage.setItem("A·CEIL_wall_presets_v32",JSON.stringify(list));
      }
      var mark=currentMark();
      if(mark){mark.type=name;mark.color=color;}
      if(typeof window.saveState==="function")window.saveState();
      if(typeof window.requestDraw==="function")window.requestDraw();else if(typeof window.draw==="function")window.draw();
      syncPresetColorDot();
      if(typeof window.showToast==="function")window.showToast("✓ Колір збережено для «"+name+"»");
      return true;
    }catch(e){
      window.__diagSilent&&window.__diagSilent(e);
      if(typeof window.showToast==="function")window.showToast("Не вдалося зберегти колір");
      return false;
    }
  }

  function ensurePresetColorSave(){
    var colors=byId("rwe2Colors");
    if(!colors||byId("rwe2SavePresetColor"))return;
    var button=document.createElement("button");
    button.type="button";
    button.id="rwe2SavePresetColor";
    button.className="rwe2-save-preset-color rwe2-only-adv";
    button.textContent="💾 Зберегти колір для заготовки";
    button.onclick=function(event){event.preventDefault();savePresetColor();};
    colors.insertAdjacentElement("afterend",button);
  }

  function simplifyVisibleLayout(modal){
    var preview = byId("rwe2LivePreview");
    if (preview) preview.classList.add("rwe2-always-hidden");

    var labels = modal.querySelectorAll("label");
    for (var i=0;i<labels.length;i++){
      if (labels[i].id !== "rwe2PositionTitle" && labels[i].textContent.trim() === "Розташування"){
        labels[i].classList.add("rwe2-always-hidden");
      }
    }

    var cancel = modal.querySelector(".rwe2-footer .rwe2-cancel");
    if (cancel) cancel.classList.add("rwe2-always-hidden");
    var del = modal.querySelector(".rwe2-footer .rwe2-del");
    if (del && del.dataset.compact !== "2"){
      del.dataset.compact = "2";
      del.setAttribute("aria-label", "Видалити елемент");
      del.title = "Видалити елемент";
      del.textContent = "🗑 Видалити елемент";
    }
  }

  function ensureBreakModeUi(){
    var row=byId("rwe2ForceBreaksRow"), checkbox=byId("rwe2ForceBreaks");
    if(!row||!checkbox)return;
    row.classList.add("rwe2-break-mode","rwe2-only-adv");
    var oldText=row.querySelector("span");
    if(oldText)oldText.classList.add("rwe2-always-hidden");
    checkbox.classList.add("rwe2-always-hidden");
    var controls=byId("rwe2BreakModeControls");
    if(!controls){
      controls=document.createElement("div");
      controls.id="rwe2BreakModeControls";
      controls.innerHTML='<div class="rwe2-break-title">Обриви карниза</div><div class="rwe2-break-buttons"><button type="button" data-break-mode="auto">Автоматично</button><button type="button" data-break-mode="two">Завжди 2</button></div>';
      controls.querySelectorAll("button").forEach(function(btn){
        btn.onclick=function(e){
          e.preventDefault();
          checkbox.checked=btn.dataset.breakMode==="two";
          syncBreakModeUi();
        };
      });
      row.appendChild(controls);
    }
    syncBreakModeUi();
  }

  function syncBreakModeUi(){
    var checkbox=byId("rwe2ForceBreaks"), controls=byId("rwe2BreakModeControls");
    if(!checkbox||!controls)return;
    controls.querySelectorAll("button").forEach(function(btn){
      btn.classList.toggle("active",checkbox.checked ? btn.dataset.breakMode==="two" : btn.dataset.breakMode==="auto");
    });
  }

  var GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="3"></circle>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
    '</svg>';

  function ensureToggleBtn(box){
    var btn = byId("rwe2AdvToggle");
    if (!btn){
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "rwe2AdvToggle";
      btn.className = "rwe2-adv-toggle";
      btn.title = "Назва і колір елемента";
      btn.setAttribute("aria-label", "Назва і колір елемента");
      btn.innerHTML = GEAR_SVG;
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        setAdvanced(!isAdvancedOn());
        applyState();
      };
    }
    var head = box.querySelector(".rwe2-head");
    var close = head && head.querySelector(".rwe2-x");
    if (head && btn.parentNode !== head) head.insertBefore(btn, close || null);
    else if (!head && btn.parentNode !== box) box.appendChild(btn);
    return btn;
  }

  function applyState(){
    var modal = byId("wallEditModal");
    if (!modal) return;
    var box = modal.querySelector(".modal");
    if (!box) return;

    tagHiddenFields(box);
    simplifyVisibleLayout(box);
    ensureBreakModeUi();
    ensurePresetColorSave();
    ensureWallDistanceUi();
    syncPresetColorDot();
    var btn = ensureToggleBtn(box);

    var on = isAdvancedOn();
    box.classList.toggle("rwe2-advanced-open", on);
    if (btn) btn.classList.toggle("active", on);
  }

  // Re-apply whenever the modal is opened, and shortly after (other
  // scripts build parts of this modal asynchronously via setTimeout).
  var prevOpen = window.openWallEditModal;
  if (typeof prevOpen === "function" && !prevOpen.__menuSimplify){
    var wrapped = function(){
      var result = prevOpen.apply(this, arguments);
      applyState();
      syncWallDistanceUi();
      setTimeout(function(){applyState();syncWallDistanceUi();}, 30);
      setTimeout(function(){applyState();syncWallDistanceUi();}, 120);
      setTimeout(applyState, 300);
      setTimeout(applyState, 520);
      return result;
    };
    wrapped.__menuSimplify = true;
    window.openWallEditModal = wrapped;
    try { openWallEditModal = wrapped; } catch(e){ window.__diagSilent && window.__diagSilent(e); }
  }

  function saveWallDistance(){
    var mark=currentMark(),input=byId("rwe2WallDistance");
    if(mark&&input)mark.wallDistanceCm=Math.max(0,Math.round(Number(String(input.value||"0").replace(",","."))||0));
  }
  var prevRweSave=window.rwe2Save;
  if(typeof prevRweSave==="function"&&!prevRweSave.__wallDistanceV1){
    var rweSaveWrapped=function(){saveWallDistance();return prevRweSave.apply(this,arguments);};
    rweSaveWrapped.__wallDistanceV1=true;window.rwe2Save=rweSaveWrapped;
    try{rwe2Save=rweSaveWrapped;}catch(e){window.__diagSilent&&window.__diagSilent(e);}
  }
  var prevLegacySave=window.saveWallEdit;
  if(typeof prevLegacySave==="function"&&!prevLegacySave.__wallDistanceV1){
    var legacySaveWrapped=function(){saveWallDistance();return prevLegacySave.apply(this,arguments);};
    legacySaveWrapped.__wallDistanceV1=true;window.saveWallEdit=legacySaveWrapped;
    try{saveWallEdit=legacySaveWrapped;}catch(e){window.__diagSilent&&window.__diagSilent(e);}
  }

  var prevWallCoordLines=window.getWallCoordLines||(typeof getWallCoordLines==="function"?getWallCoordLines:null);
  if(typeof prevWallCoordLines==="function"&&!prevWallCoordLines.__wallDistanceV1){
    var wallCoordLinesWrapped=function(state){
      var lines=prevWallCoordLines.apply(this,arguments),marks=state&&Array.isArray(state.wallMarks)?state.wallMarks:(Array.isArray(window.wallMarks)?window.wallMarks:[]);
      return Array.isArray(lines)?lines.map(function(line,index){
        var distance=Math.max(0,Math.round(Number(marks[index]&&marks[index].wallDistanceCm)||0));
        return distance>0?line+" · від стіни "+distance+" см":line;
      }):lines;
    };
    wallCoordLinesWrapped.__wallDistanceV1=true;window.getWallCoordLines=wallCoordLinesWrapped;
    try{getWallCoordLines=wallCoordLinesWrapped;}catch(e){window.__diagSilent&&window.__diagSilent(e);}
  }

  // Also keep state correct if other scripts rebuild bits of the modal
  // while it's already open (e.g. preset toolbar, preset select).
  document.addEventListener("click", function(e){
    if (e.target && e.target.closest && e.target.closest("#wallEditModal") && e.target.id !== "rwe2AdvToggle"){
      setTimeout(applyState, 0);
    }
  }, true);

  function watchModal(){
    var modal=byId("wallEditModal");
    if(!modal||modal.dataset.simplifyObserved==="1"||typeof MutationObserver!=="function")return;
    modal.dataset.simplifyObserved="1";
    var queued=false;
    new MutationObserver(function(){
      if(queued)return;
      queued=true;
      setTimeout(function(){queued=false;applyState();},0);
    }).observe(modal,{childList:true,subtree:true});
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ watchModal(); setTimeout(applyState, 300); }, { once: true });
  } else {
    watchModal();
    setTimeout(applyState, 300);
  }
})();
