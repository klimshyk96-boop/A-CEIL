(function () {
  "use strict";
  if (window.__A_CEIL_FILM_GROUP_STATE_FIX_V1) return;
  window.__A_CEIL_FILM_GROUP_STATE_FIX_V1 = true;

  var UI_KEY = "A_CEIL_nomenclature_group_ui_v1";
  var normalizing = false;

  function norm(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }
  function groups() {
    try { if (typeof elemGroups !== "undefined" && Array.isArray(elemGroups)) return elemGroups; }
    catch (_) {}
    return Array.isArray(window.elemGroups) ? window.elemGroups : [];
  }
  function items() {
    try { if (typeof elemItems !== "undefined" && Array.isArray(elemItems)) return elemItems; }
    catch (_) {}
    return Array.isArray(window.elemItems) ? window.elemItems : [];
  }
  function isFilmGroup(group) {
    if (!group) return false;
    var name = norm(group.name);
    return group.roomScopedKind === "film-color" || !!group.filmSeriesId ||
      name.indexOf("плів") >= 0 || name.indexOf("полотно") >= 0 || name.indexOf("film") >= 0;
  }
  function stateKey(group) {
    if (isFilmGroup(group)) return "film:" + String(group.filmSeriesId || "premium");
    return "group:" + String(group && group.id || "");
  }
  function readUi() {
    try {
      var data = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch (_) { return {}; }
  }
  function saveUi(group) {
    if (!group) return;
    var data = readUi();
    data[stateKey(group)] = { collapsed: !!group.collapsed, savedAt: Date.now() };
    try { localStorage.setItem(UI_KEY, JSON.stringify(data)); } catch (_) {}
  }
  function applyUi(group) {
    if (!group) return;
    var saved = readUi()[stateKey(group)];
    if (saved && typeof saved.collapsed === "boolean") group.collapsed = saved.collapsed;
  }

  function scoreFilmGroup(group, allItems) {
    var own = allItems.filter(function (item) { return item && String(item.groupId) === String(group.id); });
    var managed = own.filter(function (item) { return item.filmPickerManaged === true; });
    var active = managed.some(function (item) { return Number(item.qty) > 0; });
    return (active ? 1000 : 0) + managed.length * 100 +
      (group.roomScopedKind === "film-color" ? 20 : 0) + (group.roomScoped === true ? 10 : 0);
  }

  function repairFilmReferences(allGroups, allItems) {
    var changed=false,managed=allItems.filter(function(item){return item&&item.filmPickerManaged===true;});
    var orphan=managed.filter(function(item){return !allGroups.some(function(group){return group&&String(group.id)===String(item.groupId);});});
    if(orphan.length){
      var group=allGroups.filter(isFilmGroup).sort(function(a,b){return scoreFilmGroup(b,allItems)-scoreFilmGroup(a,allItems);})[0];
      if(!group){
        var first=orphan.find(function(item){return Number(item.qty)>0;})||orphan[0];
        group={id:first.groupId||'g_film_'+Date.now(),name:'',collapsed:false,roomScoped:true,roomScopedKind:'film-color',filmSeriesId:first.filmSeriesId||first.seriesId||'premium'};
        allGroups.unshift(group);
      }
      orphan.forEach(function(item){item.groupId=group.id;});changed=true;
    }
    // A room snapshot can retain its managed rows while the catalogue replaces
    // group IDs. Recover the label from film metadata, never from an empty name.
    allGroups.forEach(function(group){
      if(!group)return;
      var own=managed.find(function(item){return String(item.groupId)===String(group.id);});
      if(!own)return;
      var series=group.filmSeriesId||own.filmSeriesId||own.seriesId||'premium';
      var meta=(window.ACEIL_FILM_SERIES||[]).find(function(entry){return entry.id===series;});
      if(!String(group.name||'').trim()){group.name='Плівка '+(meta&&meta.name||series.charAt(0).toUpperCase()+series.slice(1));changed=true;}
      group.roomScoped=true;group.roomScopedKind='film-color';group.filmSeriesId=series;
    });
    // Remove only duplicate managed widths of the same film. Prefer the row
    // carrying an actual room quantity/manual price over the zero default.
    var seen=new Map(),remove=new Set();
    managed.forEach(function(item){
      var key=[String(item.groupId),item.filmSeriesId||item.seriesId||'premium',String(item.colorCode||item.name||'').toUpperCase(),Number(item.filmWidth)||0,Number(item.filmMaxWidth)||Number(item.filmWidth)||0].join('|');
      var previous=seen.get(key);
      if(!previous){seen.set(key,item);return;}
      var score=function(row){return (Number(row.qty)>0?100:0)+(row.manualQtyOverride===true?10:0);};
      if(score(item)>score(previous)){remove.add(previous);seen.set(key,item);}else remove.add(item);
    });
    if(remove.size){for(var i=allItems.length-1;i>=0;i--)if(remove.has(allItems[i]))allItems.splice(i,1);changed=true;}
    return changed;
  }

  function normalizeFilmGroups() {
    if (normalizing) return false;
    normalizing = true;
    try {
      var allGroups = groups(), allItems = items();
      var repaired=repairFilmReferences(allGroups,allItems);
      var filmGroups = allGroups.filter(isFilmGroup);
      if (!filmGroups.length) return repaired;

      var keep = filmGroups.slice().sort(function (a, b) {
        return scoreFilmGroup(b, allItems) - scoreFilmGroup(a, allItems);
      })[0];
      var duplicateIds = filmGroups.filter(function (group) { return group !== keep; })
        .map(function (group) { return String(group.id); });
      var changed = repaired || duplicateIds.length > 0;

      if (duplicateIds.length) {
        for (var i = allItems.length - 1; i >= 0; i--) {
          if (allItems[i] && duplicateIds.indexOf(String(allItems[i].groupId)) >= 0) allItems.splice(i, 1);
        }
        for (var g = allGroups.length - 1; g >= 0; g--) {
          if (allGroups[g] !== keep && isFilmGroup(allGroups[g])) allGroups.splice(g, 1);
        }
      }

      var keepItems = allItems.filter(function (item) {
        return item && String(item.groupId) === String(keep.id);
      });
      if (keepItems.some(function (item) { return item.filmPickerManaged === true; })) {
        for (var j = allItems.length - 1; j >= 0; j--) {
          var item = allItems[j];
          if (item && String(item.groupId) === String(keep.id) &&
              Number(item.filmWidth) > 0 && item.filmPickerManaged !== true) {
            allItems.splice(j, 1);
            changed = true;
          }
        }
      }

      keep.roomScoped = true;
      keep.roomScopedKind = "film-color";
      keep.filmSeriesId = keep.filmSeriesId || "premium";
      applyUi(keep);

      var index = allGroups.indexOf(keep);
      if (index > 0) {
        allGroups.splice(index, 1);
        allGroups.unshift(keep);
        changed = true;
      }
      return changed;
    } finally { normalizing = false; }
  }

  function install() {
    (function(p){if(p)p.stage("filmGroups",{around:function(next,args){
        normalizeFilmGroups();
        groups().forEach(applyUi);
        return next();
      }})})(window["A\u00b7CEIL"]&&window["A\u00b7CEIL"].pipeline&&window["A\u00b7CEIL"].pipeline.get("renderElemList"));

    var oldToggle = window.toggleGroupCollapse ||
      (typeof toggleGroupCollapse === "function" ? toggleGroupCollapse : null);
    if (typeof oldToggle === "function" && !oldToggle.__filmGroupStateFixV1) {
      var toggleWrapped = function (id) {
        var before = groups().find(function (row) { return row && String(row.id) === String(id); });
        if (before) {
          var data = readUi();
          data[stateKey(before)] = { collapsed: !before.collapsed, savedAt: Date.now() };
          try { localStorage.setItem(UI_KEY, JSON.stringify(data)); } catch (_) {}
        }
        var result = oldToggle.apply(this, arguments);
        var group = groups().find(function (row) { return row && String(row.id) === String(id); });
        saveUi(group);
        return result;
      };
      toggleWrapped.__filmGroupStateFixV1 = true;
      window.toggleGroupCollapse = toggleWrapped;
      try { toggleGroupCollapse = toggleWrapped; } catch (_) {}
    }

    var oldOpen = window.openElementsModal || (typeof openElementsModal === "function" ? openElementsModal : null);
    if (typeof oldOpen === "function" && !oldOpen.__filmGroupStateFixV1) {
      var openWrapped = function () {
        normalizeFilmGroups();
        return oldOpen.apply(this, arguments);
      };
      openWrapped.__filmGroupStateFixV1 = true;
      window.openElementsModal = openWrapped;
      try { openElementsModal = openWrapped; } catch (_) {}
    }

    [0, 400, 1500, 3500].forEach(function (delay) {
      setTimeout(function () {
        var changed = normalizeFilmGroups();
        if (changed) {
          try { if (typeof renderElemList === "function" && document.getElementById("elementsModal")?.classList.contains("open")) renderElemList(); } catch (_) {}
          try { if (typeof saveState === "function") saveState(); } catch (_) {}
        }
      }, delay);
    });
  }

  window.A_CEIL_NormalizeFilmGroups = normalizeFilmGroups;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
