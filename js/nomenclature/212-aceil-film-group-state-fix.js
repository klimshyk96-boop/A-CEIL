(function () {
  "use strict";
  if (window.__A_CEIL_FILM_GROUP_STATE_FIX_V1) return;
  window.__A_CEIL_FILM_GROUP_STATE_FIX_V1 = true;

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
  function scoreFilmGroup(group, allItems) {
    var own = allItems.filter(function (item) { return item && String(item.groupId) === String(group.id); });
    var managed = own.filter(function (item) { return item.filmPickerManaged === true; });
    var active = managed.some(function (item) { return Number(item.qty) > 0; });
    return (active ? 1000 : 0) + managed.length * 100 +
      (group.roomScopedKind === "film-color" ? 20 : 0) + (group.roomScoped === true ? 10 : 0);
  }

  function filmIdentity(item, allGroups) {
    if(!item||!(item.filmPickerManaged===true||Number(item.filmWidth)>0))return null;
    var named=String(item.name||'').toUpperCase().match(/\b[MLS]\d{3}\b/);
    var code=named?named[0]:String(item.colorCode||'').toUpperCase();
    if(!/^[MLS]\d{3}$/.test(code))return null;
    var group=allGroups.find(function(g){return g&&String(g.id)===String(item.groupId);});
    var series=item.filmSeriesId||item.seriesId||group&&group.filmSeriesId||'premium';
    return {code:code,series:series,texture:code[0]==='S'?'satin':code[0]==='L'?'lak':'mat',key:series+':'+code};
  }

  function normalizeFilmGroups(options) {
    if(normalizing)return false;
    normalizing=true;
    try{
      var allGroups=groups(),allItems=items(),changed=false,buckets=new Map(),assigned=new Set();
      allItems.forEach(function(item){if(window.A_CEILColorPicker&&window.A_CEILColorPicker.prepareItem&&window.A_CEILColorPicker.prepareItem(item))changed=true;var identity=filmIdentity(item,allGroups);if(!identity)return;
        if(!buckets.has(identity.key))buckets.set(identity.key,{identity:identity,rows:[]});
        buckets.get(identity.key).rows.push(item);
      });
      // Reserve an existing group for its own code before repairing orphan rows.
      // A generic film group follows its active managed film, never another
      // manually added texture that happens to use the same roll width.
      var preferred=new Map();
      allGroups.forEach(function(group){
        if(!group)return;
        var own=allItems.filter(function(item){return item&&String(item.groupId)===String(group.id)&&filmIdentity(item,allGroups);});
        var explicit=String(group.filmCode||'').toUpperCase();
        var row=own.find(function(item){return filmIdentity(item,allGroups).code===explicit;})||
          own.find(function(item){return item.filmPickerManaged===true&&Number(item.qty)>0;})||own.find(function(item){return item.filmPickerManaged===true;})||own[0];
        if(row)preferred.set(group,filmIdentity(row,allGroups).key);
      });
      buckets.forEach(function(bucket){
        var identity=bucket.identity;
        var candidates=allGroups.filter(function(group){return !assigned.has(group)&&preferred.get(group)===identity.key;});
        candidates.sort(function(a,b){return scoreFilmGroup(b,allItems)-scoreFilmGroup(a,allItems);});
        var keep=candidates[0];
        if(!keep){
          var base='g_film_'+identity.series+'_'+identity.code,gid=base,suffix=1;
          while(allGroups.some(function(group){return group&&String(group.id)===gid;}))gid=base+'_'+suffix++;
          var meta=(window.ACEIL_FILM_SERIES||[]).find(function(entry){return entry.id===identity.series;});
          keep={id:gid,name:'Плівка '+(meta&&meta.name||identity.series)+' · '+identity.code,collapsed:false};
          allGroups.push(keep);changed=true;
        }
        assigned.add(keep);
        var meta=(window.ACEIL_FILM_SERIES||[]).find(function(entry){return entry.id===identity.series;});
        if(!String(keep.name||'').trim()){keep.name='Плівка '+(meta&&meta.name||identity.series.charAt(0).toUpperCase()+identity.series.slice(1));changed=true;}
        keep.filmSeriesId=identity.series;keep.filmCode=identity.code;keep.filmTexture=identity.texture;
        if(bucket.rows.some(function(item){return item.filmPickerManaged===true;})){keep.roomScoped=true;keep.roomScopedKind='film-color';}
        bucket.rows.forEach(function(item){
          if(String(item.groupId)!==String(keep.id)){item.groupId=keep.id;changed=true;}
          if(item.filmPickerManaged===true){item.colorCode=identity.code;item.colorTexture=identity.texture;item.seriesId=identity.series;item.filmSeriesId=identity.series;}
        });
        // Deduplicate only managed rows for this exact code, series and width.
        // Manual catalogue rows and widths are user data and are retained.
        var seen=new Map(),remove=new Set();
        bucket.rows.filter(function(item){return item.filmPickerManaged===true;}).forEach(function(item){
          var key=[Number(item.filmWidth)||0,Number(item.filmMaxWidth)||Number(item.filmWidth)||0].join('|'),previous=seen.get(key);
          if(!previous){seen.set(key,item);return;}
          var score=function(row){return (Number(row.qty)>0?100:0)+(row.manualQtyOverride===true?10:0);};
          if(score(item)>score(previous)){remove.add(previous);seen.set(key,item);}else remove.add(item);
        });
        if(remove.size){for(var i=allItems.length-1;i>=0;i--)if(remove.has(allItems[i]))allItems.splice(i,1);changed=true;}
        candidates.slice(1).forEach(function(group){
          if(!allItems.some(function(item){return item&&String(item.groupId)===String(group.id);})){allGroups.splice(allGroups.indexOf(group),1);changed=true;}
        });
      });
      var first=allGroups.filter(function(group){return assigned.has(group);}).sort(function(a,b){return scoreFilmGroup(b,allItems)-scoreFilmGroup(a,allItems);})[0];
      var index=allGroups.indexOf(first);if(index>0){allGroups.splice(index,1);allGroups.unshift(first);changed=true;}
      if(options&&options.expand)allGroups.filter(isFilmGroup).forEach(function(group){if(group.collapsed){group.collapsed=false;changed=true;}});
      return changed;
    }finally{normalizing=false;}
  }

  function install() {
    (function(p){if(p)p.stage("filmGroups",{around:function(next,args){
        normalizeFilmGroups();
        return next();
      }})})(window["A\u00b7CEIL"]&&window["A\u00b7CEIL"].pipeline&&window["A\u00b7CEIL"].pipeline.get("renderElemList"));

    // Group.collapsed is the single UI state. Retire the duplicate preference cache.
    try { localStorage.removeItem("A_CEIL_nomenclature_group_ui_v1"); } catch (_) {}

  }

  window.A_CEIL_NormalizeFilmGroups = normalizeFilmGroups;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
