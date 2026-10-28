/* A·CEIL CLEAN: estimate variants engine + UI */

/* === consolidated from js/reports/183-aceil-estimate-variants-v1.js === */

(function(){
'use strict';
if(window.__ACEIL_ESTIMATE_VARIANTS_V1) return;
window.__ACEIL_ESTIMATE_VARIANTS_V1 = true;

/* ============================================================
   A-CEIL estimate variants - data engine (no DOM here).
   Adds alternative estimate variants on top of a project without
   ever touching project.rooms (the protected "Main" estimate).

   Storage:
   - project.estimateVariants        : array of variant records
   - project._activeEstimateVariantId: id of active variant, null = Main

   IMPORTANT ADAPTATION NOTE (see chat reply for full explanation):
   the existing cloud sync path (_updateObjectInCloud / apartmentState)
   only forwards {schemaVersion, projectType, multiRoom, rooms} to the
   cloud - unknown top-level project fields are NOT uploaded. To make
   variants survive cloud round-trips, this module mirrors the variant
   list/active id onto every room object as room._aceilVariantsShadow
   (rooms are forwarded verbatim). On read, if the top-level field is
   missing/empty but a shadow copy exists on a room, it is restored
   from there automatically. This is an additive convention only; it
   does not change project-repository.js, cloud sync, or room schema
   migration files.
   ============================================================ */

function clone(v){
  try{ return typeof structuredClone==='function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)); }
  catch(_){ try{ return JSON.parse(JSON.stringify(v)); }catch(__){ return v; } }
}
function parseMaybeJSON(v){
  if(v && typeof v==='object') return clone(v);
  if(typeof v!=='string' || !v.trim()) return {};
  try{ return JSON.parse(v); }catch(_){ return {}; }
}
function num(v){ var n=parseFloat(v); return isFinite(n)?n:0; }
function money(v){ return '\u20B4' + num(v).toFixed(2); }

function repo(){
  try{ return window['A\u00B7CEIL'] && window['A\u00B7CEIL'].ProjectRepository; }catch(_){ return null; }
}

function itemKey(it){
  if(!it) return '';
  if(it.id!=null) return 'id:'+String(it.id);
  return 'n:'+String(it.name||'').trim().toLowerCase()+'|g:'+String(it.groupId==null?'':it.groupId);
}
function norm(v){ return String(v==null?'':v).trim().toLowerCase(); }

/* ---------- autofill-source detection (mirrors NOMENCLATURE_SOURCES / the
   insert-choice-guard so variant bulk-changes touch exactly the same single
   item the live nomenclature editor would touch - never a whole named
   group). ---------- */

/* Sources that drive lighting quantities via autoFillNomenclature. Linear
   lighting-line sources are included. ventilation is intentionally NOT a
   lighting source - it must never be swept by a "remove/replace lighting"
   bulk change, even though it lives in the same NOMENCLATURE_SOURCES table
   and often sits in the same nomenclature group as fixtures. */
var LIGHT_SOURCE_KEYS = ['spot_light','chandelier','linear_length','linear_corner','linear_break'];

function colorWordOf(it){
  if(it && (it.sourceVariant==='white'||it.sourceVariant==='black')) return it.sourceVariant;
  var n=norm(it && it.name);
  if(/\u0431\u0456\u043B/.test(n)) return 'white';   /* біл... */
  if(/\u0447\u043E\u0440\u043D/.test(n)) return 'black'; /* чорн... */
  return '';
}

/* The "main profile" is the single item whose autofill source is
   main_profile (the current source-of-truth used by autoFillNomenclature).
   Never the sum of every item in a group named "Профіль" - that group can
   also contain the insert, floating profile, etc. */
function findMainProfileItem(baseItems, assumptions){
  var candidates=(baseItems||[]).filter(function(it){ return norm(it&&it.source)==='main_profile'; });
  if(!candidates.length) return null;
  if(candidates.length===1) return candidates[0];
  var withQty=candidates.filter(function(it){ return num(it.qty)>0; });
  if(withQty.length===1) return withQty[0];
  if(assumptions) assumptions.push('\u0417\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043A\u0456\u043B\u044C\u043A\u0430 \u043F\u043E\u0437\u0438\u0446\u0456\u0439 \u0437 \u0434\u0436\u0435\u0440\u0435\u043B\u043E\u043C \u00AB\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439 \u043F\u0440\u043E\u0444\u0456\u043B\u00BB \u2014 \u043E\u0431\u0440\u0430\u043D\u043E \u0430\u043A\u0442\u0438\u0432\u043D\u0443 (\u0437 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044E > 0).');
  return withQty[0] || candidates[0];
}

/* The "insert" is white_insert's actual selected candidate - mirrors
   179-aceil-insert-choice-guard.js: prefer the explicitly chosen one
   (insertSelected), then the only one currently carrying quantity, then the
   only candidate at all. Never every item merely named "вставка". */
function findInsertItem(baseItems, assumptions){
  var candidates=(baseItems||[]).filter(function(it){
    if(norm(it&&it.source)==='white_insert') return true;
    var n=norm(it&&it.name);
    return /\u0432\u0441\u0442\u0430\u0432\u043A|insert/.test(n) && !!colorWordOf(it);
  });
  if(!candidates.length) return null;
  var selected=candidates.filter(function(it){ return it.insertSelected===true; });
  if(selected.length===1) return selected[0];
  var withQty=candidates.filter(function(it){ return num(it.qty)>0; });
  if(withQty.length===1) return withQty[0];
  if(candidates.length===1) return candidates[0];
  if(assumptions) assumptions.push('\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u043E\u0434\u043D\u043E\u0437\u043D\u0430\u0447\u043D\u043E \u0432\u0438\u0437\u043D\u0430\u0447\u0438\u0442\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u0443 \u0432\u0441\u0442\u0430\u0432\u043A\u0443 (white_insert) \u2014 \u043E\u0431\u0440\u0430\u043D\u043E \u043D\u0430\u0439\u0431\u0456\u043B\u044C\u0448 \u0439\u043C\u043E\u0432\u0456\u0440\u043D\u0443.');
  return withQty[0] || candidates[0];
}

/* Every item whose autofill source is a lighting source - used so bulk
   lighting changes never clear third-party positions that merely sit in a
   similarly-named group. */
function lightingSourceItems(baseItems){
  return (baseItems||[]).filter(function(it){ return LIGHT_SOURCE_KEYS.indexOf(norm(it&&it.source))>=0; });
}

/* ---------- film / canvas (plivka) helpers ----------
   Film color items are NOT shared catalog items like profile/insert/
   lighting - 167-aceil-color-picker.js synthesizes a fresh, room-scoped
   pair of elemItems (roomScopedKind:'film-color') the moment a color is
   chosen for THAT room, with ids unique to that click. So a variant film
   override never targets an existing item id; it stores which series+code
   to show instead, and the actual item(s) - width, qty, price - are
   synthesized fresh from ACEIL_COLOR_CATALOG_BY_SERIES / _PRICING_BY_SERIES
   every time computeRoomItems() runs, using that room's OWN current area
   and required width (so geometry edits are picked up automatically,
   exactly like the Main estimate's own color choice already is). */

function hasWord(name, words){
  var n=String(name||'').toLowerCase();
  return words.some(function(w){ return n.indexOf(w)>=0; });
}
var FILM_GROUP_WORDS=['\u043F\u043B\u0456\u0432','\u043F\u043E\u043B\u043E\u0442\u043D\u043E','film'];
var FILM_WIDTH_NARROW={nominal:3.6, max:3.6, priceKey:'narrow'};
var FILM_WIDTH_WIDE={nominal:5.1, max:5.6, priceKey:'wide'};

function filmDispCode(seriesId,code){ return typeof window.ACEILFilmDisplayCode==='function' ? window.ACEILFilmDisplayCode(seriesId,code) : code; }
function filmSeriesRegistry(){ return Array.isArray(window.ACEIL_FILM_SERIES) ? window.ACEIL_FILM_SERIES : []; }
function filmSeriesMeta(seriesId){ return filmSeriesRegistry().find(function(s){ return s && s.id===seriesId; }) || null; }
function filmCatalogForSeries(seriesId){
  var bySeries=window.ACEIL_COLOR_CATALOG_BY_SERIES || {};
  if(Array.isArray(bySeries[seriesId])) return bySeries[seriesId];
  if(seriesId==='premium' && Array.isArray(window.ACEIL_COLOR_CATALOG)) return window.ACEIL_COLOR_CATALOG;
  return [];
}
function filmPricingForSeries(seriesId){
  if(typeof window.ACEILGetFilmPricing==='function') return window.ACEILGetFilmPricing(seriesId);
  var bySeries=window.ACEIL_FILM_PRICING_BY_SERIES || {};
  if(bySeries[seriesId]) return bySeries[seriesId];
  if(seriesId==='premium' && window.ACEIL_FILM_PRICING) return window.ACEIL_FILM_PRICING;
  return {};
}
function filmTextureLabels(){ return window.ACEIL_TEXTURE_LABELS || {}; }
function findFilmColorEntry(seriesId, code){
  return filmCatalogForSeries(seriesId).find(function(c){ return c && c.code===code; }) || null;
}

function findFilmGroupId(items, groups){
  var managed=(items||[]).find(function(it){ return it && it.roomScopedKind==='film-color'; });
  if(managed && managed.groupId!=null) return String(managed.groupId);
  var g=(groups||[]).find(function(g){ return hasWord(g && g.name, FILM_GROUP_WORDS); });
  return g ? String(g.id) : null;
}

/* Mirrors getRoomBoundingBoxMeters()/getRequiredFilmWidthMeters() from
   167-aceil-color-picker.js, but reads STORED room.state geometry
   instead of the live canvas globals, since this runs with no canvas
   attached. Same rule: the room's smaller bounding-box dimension is the
   width the roll must cover. */
function requiredFilmWidthMetersFromRoom(room){
  try{
    var st=parseMaybeJSON(room && room.state);
    if(st && st.circleMode && num(st.circleDiamCm)>0) return num(st.circleDiamCm)/100;
    var pts=st && Array.isArray(st.realPts) ? st.realPts : [];
    if(pts.length>=2){
      var xs=pts.map(function(p){ return num(p&&p.x); });
      var ys=pts.map(function(p){ return num(p&&p.y); });
      var w=(Math.max.apply(null,xs)-Math.min.apply(null,xs))/100;
      var h=(Math.max.apply(null,ys)-Math.min.apply(null,ys))/100;
      if(w>0 && h>0) return Math.min(w,h);
      return w||h||0;
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return 0;
}
/* room.area is the same value already displayed/saved for the room
   (m^2, canonical). Only falls back to the shoelace formula on stored
   realPts if that field is somehow missing. */
function roomAreaM2(room){
  var a=num(room && room.area);
  if(a>0) return a;
  try{
    var st=parseMaybeJSON(room && room.state);
    if(st && st.circleMode && num(st.circleDiamCm)>0){ var r=num(st.circleDiamCm)/200; return Math.PI*r*r; }
    var pts=st && Array.isArray(st.realPts) ? st.realPts : [];
    if(pts.length>=3){
      var sum=0;
      for(var i=0;i<pts.length;i++){ var p=pts[i], q=pts[(i+1)%pts.length]; sum+=num(p&&p.x)*num(q&&q.y)-num(q&&q.x)*num(p&&p.y); }
      return Math.abs(sum)/2/10000;
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return 0;
}

/* Same "smallest sufficient roll" rule the live picker's autoFillNomenclature
   already applies to filmMaxWidth candidates: 320-360cm range -> the 3.6m/360cm
   roll, 500-560cm range -> the 5.1m/560cm roll (only when the color actually
   has a wide510 product), 400cm is never returned. Returns null when nothing
   fits, so the caller can warn instead of pricing the wrong width. */
function filmWidthCandidates(entry){
  if(entry && Array.isArray(entry.filmWidths) && entry.filmWidths.length){
    return entry.filmWidths.map(function(w){ return {
      nominal:num(w.nominal), max:num(w.max)||num(w.nominal), priceKey:w.priceKey||'narrow'
    }; }).filter(function(w){ return w.nominal>0 && w.max>0; });
  }
  var out=[Object.assign({},FILM_WIDTH_NARROW)];
  if(entry && entry.wide510) out.push(Object.assign({},FILM_WIDTH_WIDE));
  return out;
}
function pickFilmWidthCandidate(entry, neededWidthM){
  var candidates=filmWidthCandidates(entry);
  if(!(neededWidthM>0)) return candidates[0];
  var fitting=candidates.filter(function(c){ return c.max+1e-6>=neededWidthM; });
  if(!fitting.length) return null;
  fitting.sort(function(a,b){ return a.nominal-b.nominal || a.max-b.max; });
  return fitting[0];
}

function filmDisplayWidthLabel(nominal){
  var n=Number(nominal)||0;
  var s=n.toFixed(1);
  if(s.slice(-2)==='.0') s=s.slice(0,-2);
  return s;
}

/* Applies one room's film override on top of the working items/groups
   arrays for THIS computeRoomItems() call - splicing out whichever film
   block is currently showing (Premium from Main, or an earlier link in
   the variant chain) and, for 'replace', synthesizing the new series'
   block fresh from geometry so two film blocks are never shown/counted
   at once and nothing here ever freezes a stale area. */
function applyFilmChange(items, groups, change, room, warnings){
  if(!change) return;
  var groupId=findFilmGroupId(items, groups);
  var existing=items.filter(function(it){
    return it && (it.roomScopedKind==='film-color' || it.filmPickerManaged===true || num(it.filmWidth)>0);
  });

  if(change.mode==='remove'){
    existing.forEach(function(it){ it.qty=0; });
    return;
  }
  if(change.mode!=='replace') return;

  var seriesMeta=filmSeriesMeta(change.seriesId);
  var seriesName=seriesMeta ? seriesMeta.name : change.seriesId;
  var entry=findFilmColorEntry(change.seriesId, change.code);
  var cdisp=filmDispCode(change.seriesId, change.code);
  var roomName=(room && room.name) || '\u041A\u0456\u043C\u043D\u0430\u0442\u0430';
  if(!entry){
    if(warnings) warnings.push('\u041A\u043E\u043B\u0456\u0440 '+cdisp+' ('+seriesName+') \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0437\u0456 \u2014 \u0431\u043B\u043E\u043A \u043F\u043B\u0456\u0432\u043A\u0438 \u0434\u043B\u044F \u00AB'+roomName+'\u00BB \u043D\u0435 \u0437\u043C\u0456\u043D\u0435\u043D\u043E.');
    return;
  }
  var neededWidthM=requiredFilmWidthMetersFromRoom(room);
  var candidate=pickFilmWidthCandidate(entry, neededWidthM);
  if(!candidate){
    existing.forEach(function(it){ it.qty=0; });
    if(warnings) warnings.push('\u00AB'+roomName+'\u00BB: \u0434\u043B\u044F '+seriesName+' '+cdisp+' \u043D\u0435\u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0430\u0442\u043D\u044C\u043E\u0457 \u0440\u043E\u0431\u043E\u0447\u043E\u0457 \u0448\u0438\u0440\u0438\u043D\u0438 \u2014 \u0446\u0456\u043D\u0430 \u043D\u0435 \u0440\u043E\u0437\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u0430.');
    return;
  }
  var pricing=filmPricingForSeries(change.seriesId)[entry.texture] || {narrow:0,wide:0};
  var selectedPrice=num(pricing[candidate.priceKey]);
  if(!(selectedPrice>0) && warnings) warnings.push('\u00AB'+roomName+'\u00BB: для '+seriesName+' '+cdisp+' не задано ціну за ширину '+filmDisplayWidthLabel(candidate.nominal)+' м. Відкрийте «Ціни плівки».');
  var areaM2=roomAreaM2(room);

  for(var i=items.length-1;i>=0;i--){ if(existing.indexOf(items[i])>=0) items.splice(i,1); }

  var gid=groupId;
  var groupLabel='\u041F\u043B\u0456\u0432\u043A\u0430'+(seriesMeta?(' '+seriesMeta.name):'');
  if(gid==null){
    gid='g_film_virtual_'+String(room && room.id || 'r');
    groups.push({id:gid, name:groupLabel, roomScoped:true, roomScopedKind:'film-color'});
  }else{
    var g=groups.find(function(g){ return String(g.id)===String(gid); });
    if(g) g.name=groupLabel;
  }
  var available=filmWidthCandidates(entry);
  available.forEach(function(width){
    var selected=Math.abs(width.nominal-candidate.nominal)<1e-6;
    items.push({
      id:'filmv_'+String(room && room.id || 'r')+'_'+change.seriesId+'_'+change.code+'_'+String(width.nominal).replace('.','_'),
      groupId:gid, icon:'\uD83C\uDFA8',
      name:filmDispCode(change.seriesId,change.code)+' '+filmDisplayWidthLabel(width.nominal)+'\u043C',
      qty:selected&&areaM2>0 ? Math.round(areaM2*100)/100 : 0,
      unit:'\u043C\u00B2', price:num(pricing[width.priceKey]),
      filmSwatch:entry.swatch, filmSeriesName:seriesName,
      filmWidth:width.nominal, filmMaxWidth:width.max, filmSelected:selected,
      colorCode:change.code, filmDisplayCode:(entry.displayCode&&entry.displayCode!==change.code?entry.displayCode:undefined), colorTexture:entry.texture, seriesId:change.seriesId,
      filmPickerManaged:true, roomScoped:true, roomScopedKind:'film-color'
    });
  });
}

/* Pure summary of whichever film item(s) are currently active (qty>0) in
   an already-computed items array - used by the UI/report to show series
   name, texture+code, width, price/m^2, area and total without it having
   to know anything about elemItems shape. */
function getRoomFilmInfoFromItems(items, requiredWidthM){
  var filmItems=(items||[]).filter(function(it){ return it && (it.roomScopedKind==='film-color'||it.filmPickerManaged===true) && num(it.qty)>0; });
  if(!filmItems.length) return null;
  var total=0; filmItems.forEach(function(it){ total+=num(it.qty)*num(it.price); });
  var first=filmItems[0];
  var seriesId=first.seriesId || 'premium';
  var seriesMeta=filmSeriesMeta(seriesId);
  return {
    seriesId:seriesId,
    seriesName: seriesMeta ? seriesMeta.name : seriesId,
    code:filmDispCode(seriesId,first.colorCode||''),
    texture:first.colorTexture||'',
    textureLabel: filmTextureLabels()[first.colorTexture] || first.colorTexture || '',
    widthM:num(requiredWidthM)||num(first.displayFilmWidth)||num(first.filmWidth),
    availableWidthM:num(first.filmMaxWidth)||num(first.filmWidth),
    pricePerM2:num(first.price),
    areaM2: filmItems.reduce(function(s,it){ return s+num(it.qty); },0),
    total:total
  };
}
function getRoomFilmInfo(project, room, variantId){
  return getRoomFilmInfoFromItems(computeRoomItems(project, room, variantId).items, requiredFilmWidthMetersFromRoom(room));
}
function computeFilmBreakdown(project, variantId){
  var warnings=[];
  var rooms=(project.rooms||[]).map(function(room){
    var ri=computeRoomItems(project, room, variantId);
    if(ri.warnings && ri.warnings.length) warnings=warnings.concat(ri.warnings);
    return {room:room, info:getRoomFilmInfoFromItems(ri.items, requiredFilmWidthMetersFromRoom(room))};
  });
  return {rooms:rooms, warnings:warnings};
}

/* ---------- persistence ---------- */

function findProjectRaw(projectId){
  var r=repo(); if(!r || projectId==null) return null;
  try{
    var list=r.list({clone:true});
    return list.find(function(p){
      return p && [p.id,p._dbId,p._localId].some(function(v){ return v!=null && String(v)===String(projectId); });
    }) || null;
  }catch(_){ return null; }
}

function ensure(project){
  if(!project || typeof project!=='object') return project;
  /* Only a genuinely MISSING field (the array key never existed - e.g. this
     project just came back from a cloud round-trip that doesn't forward
     unknown top-level keys) should ever be restored from the per-room
     shadow copy. Once estimateVariants exists as a real array, an empty
     array is a legitimate, deliberate state (the person deleted the last
     variant) and must never be resurrected from a stale shadow. */
  var fieldWasMissing = !Array.isArray(project.estimateVariants);
  if(fieldWasMissing) project.estimateVariants=[];
  if(project._activeEstimateVariantId===undefined) project._activeEstimateVariantId=null;
  if(fieldWasMissing && !project.estimateVariants.length && Array.isArray(project.rooms)){
    for(var i=0;i<project.rooms.length;i++){
      var sh=project.rooms[i] && project.rooms[i]._aceilVariantsShadow;
      if(sh && Array.isArray(sh.variants) && sh.variants.length){
        project.estimateVariants = clone(sh.variants);
        if(project._activeEstimateVariantId==null && sh.activeId!=null) project._activeEstimateVariantId = sh.activeId;
        break;
      }
    }
  }
  if(!Array.isArray(project.calcLinks)){
    project.calcLinks=[];
    if(Array.isArray(project.rooms)){
      for(var j=0;j<project.rooms.length;j++){
        var sh2=project.rooms[j] && project.rooms[j]._aceilVariantsShadow;
        if(sh2 && Array.isArray(sh2.links) && sh2.links.length){ project.calcLinks=clone(sh2.links); break; }
      }
    }
  }
  return project;
}

function syncShadow(project){
  if(!Array.isArray(project.rooms) || !project.rooms.length) return;
  var payload = {
    variants: clone(project.estimateVariants||[]),
    activeId: project._activeEstimateVariantId!=null ? project._activeEstimateVariantId : null,
    links: clone(project.calcLinks||[]),
    savedAt: Date.now()
  };
  project.rooms.forEach(function(r){ if(r && typeof r==='object') r._aceilVariantsShadow = payload; });
}

function persistProject(project){
  ensure(project);
  syncShadow(project);
  var r=repo(); if(!r) return false;
  try{
    var list=r.list({clone:true});
    var idx=list.findIndex(function(p){
      return p && [p.id,p._dbId,p._localId].some(function(v){
        return v!=null && [project.id,project._dbId,project._localId].some(function(v2){
          return v2!=null && String(v)===String(v2);
        });
      });
    });
    if(idx<0) return false;
    list[idx]=clone(project);
    r.replaceAll(list);
    try{
      if(typeof window._updateObjectInCloud==='function'){
        Promise.resolve(window._updateObjectInCloud(clone(project))).catch(function(){});
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return true;
  }catch(_){ return false; }
}

/* ---------- variant list / lookup ---------- */

function list(project){
  ensure(project);
  var out=[{id:null,name:'\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439',isMain:true,createdAt:null,baseVariantId:null}];
  (project.estimateVariants||[]).forEach(function(v){ out.push(v); });
  return out;
}
function findVariant(project, id){
  if(id==null) return {id:null,name:'\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439',isMain:true,createdAt:null,baseVariantId:null};
  ensure(project);
  return (project.estimateVariants||[]).find(function(v){ return String(v.id)===String(id); }) || null;
}
function getActiveId(project){ ensure(project); return project._activeEstimateVariantId!=null ? project._activeEstimateVariantId : null; }
function setActiveId(project, id){ ensure(project); project._activeEstimateVariantId = id!=null ? id : null; return project; }

function resolveChain(project, variantId){
  var chain=[], seen={}, cur=variantId;
  while(cur!=null){
    if(seen[cur]) break; seen[cur]=true;
    var v=findVariant(project, cur);
    if(!v || v.isMain) break;
    chain.unshift(v);
    cur = v.baseVariantId!=null ? v.baseVariantId : null;
  }
  return chain;
}

/* ---------- semantic override application (live, geometry-aware) ----------
   Overrides never store a frozen qty for a geometry/autofill-driven source
   (main_profile, white_insert, spot/chandelier/linear lighting). Instead a
   room's override for a category is a small semantic descriptor:
     {mode:'remove'}
     {mode:'replace', targetItemId}                    - qty inherited live
     {mode:'qty', targetItemId, qty}                    - explicit, fixed
   At every computeRoomItems() call the CURRENT source item is re-resolved
   from the room's live base items (which already reflect the latest
   geometry/autofill run) and its up-to-date qty is what gets moved onto the
   target. So after the room's perimeter changes and autoFillNomenclature
   runs again, every variant built on top of it - Main included - picks up
   the new length automatically without ever being re-created. ---------- */

function applySingleSourceChange(items, change, sourceItem){
  if(!change) return;
  if(change.mode==='remove'){
    if(sourceItem) sourceItem.qty=0;
    return;
  }
  if(change.mode==='replace' || change.mode==='qty'){
    var target=items.find(function(x){ return change.targetItemId!=null && String(x.id)===String(change.targetItemId); });
    if(!target) return;
    if(sourceItem && String(target.id)===String(sourceItem.id)) return;
    var qty = change.mode==='qty' ? Math.max(0,num(change.qty)) : (sourceItem ? num(sourceItem.qty) : 0);
    if(sourceItem) sourceItem.qty=0;
    target.qty=qty;
  }
}

function applyLightingChange(items, change, forcedItems){
  if(!change) return;
  /* forcedItems, when given, is the previous variant's actual active
     lighting position(s) in this chain - used instead of rescanning the
     original source-tagged items, so a second "replace lighting" override
     moves qty out of where the qty ACTUALLY is now, not out of the
     original (already-zeroed) source item(s). */
  var lightItems = forcedItems || lightingSourceItems(items);
  if(change.mode==='remove'){
    lightItems.forEach(function(it){ it.qty=0; });
    return;
  }
  if(change.mode==='qty'){
    var t=items.find(function(x){ return change.targetItemId!=null && String(x.id)===String(change.targetItemId); });
    if(t) t.qty=Math.max(0,num(change.qty));
    return;
  }
  if(change.mode==='replace'){
    var target=items.find(function(x){ return change.targetItemId!=null && String(x.id)===String(change.targetItemId); });
    if(!target) return;
    var moved=0;
    lightItems.forEach(function(it){
      if(String(it.id)===String(target.id)) return;
      moved+=num(it.qty);
      it.qty=0;
    });
    target.qty=moved;
  }
}

/* tracker is a small per-computeRoomItems-call object, shared across every
   link of the chain: {profile:null, insert:null, lighting:null}. It records
   the id of the item that currently HOLDS the quantity for that category,
   once a previous link in the chain has moved it somewhere. Until the first
   replace/qty override for a category fires, tracker[cat] stays null and
   the source is resolved the original way (findMainProfileItem /
   findInsertItem / lightingSourceItems), exactly as before - so a single
   variant built directly on Main is unaffected. From the second link
   onward, the tracked id - not a fresh geometry lookup - is used as the
   source, which is what makes p1→p2→p3 chains carry the real quantity
   forward instead of re-reading the original (now zeroed) main_profile
   item at every step. */
function applySemanticCategoryChange(cat, items, change, tracker){
  if(!change) return;
  if(cat==='profile' || cat==='insert'){
    var activeId = tracker ? tracker[cat] : null;
    var sourceItem = activeId!=null
      ? items.find(function(x){ return String(x.id)===String(activeId); })
      : (cat==='profile' ? findMainProfileItem(items) : findInsertItem(items));
    applySingleSourceChange(items, change, sourceItem);
    if(tracker && (change.mode==='replace' || change.mode==='qty') && change.targetItemId!=null){
      tracker[cat] = change.targetItemId;
    }
    return;
  }
  if(cat==='lighting'){
    var activeLightId = tracker ? tracker.lighting : null;
    var forcedItems = null;
    if(activeLightId!=null){
      var found=items.find(function(x){ return String(x.id)===String(activeLightId); });
      forcedItems = found ? [found] : [];
    }
    applyLightingChange(items, change, forcedItems);
    if(tracker && (change.mode==='replace' || change.mode==='qty') && change.targetItemId!=null){
      tracker.lighting = change.targetItemId;
    }
    return;
  }
}

/* ---------- room item computation ---------- */

function baseItemsForRoom(room){
  var st=parseMaybeJSON(room && room.state);
  var items = Array.isArray(st.elemItems) ? clone(st.elemItems) : (Array.isArray(room && room.elemItems) ? clone(room.elemItems) : []);
  var groups = Array.isArray(st.elemGroups) ? clone(st.elemGroups) : (Array.isArray(room && room.elemGroups) ? clone(room.elemGroups) : []);
  return {items:items, groups:groups};
}

function computeRoomItems(project, room, variantId){
  var base=baseItemsForRoom(room);
  if(variantId==null) return {items:base.items, groups:base.groups, warnings:[]};
  var chain=resolveChain(project, variantId);
  var items=clone(base.items);
  var groups=base.groups;
  var tracker={profile:null, insert:null, lighting:null};
  var warnings=[];
  chain.forEach(function(v){
    var catChanges = v.overrides && room && v.overrides[room.id];
    if(!catChanges) return;
    ['profile','insert','lighting'].forEach(function(cat){
      applySemanticCategoryChange(cat, items, catChanges[cat], tracker);
    });
    if(catChanges.film) applyFilmChange(items, groups, catChanges.film, room, warnings);
  });
  return {items:items, groups:groups, warnings:warnings};
}

function groupsForState(state){
  if(typeof window._modernGetNomenclatureGroupsFromState==='function'){
    try{ var g=window._modernGetNomenclatureGroupsFromState(state); if(Array.isArray(g)) return g; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  /* Fallback only - mirrors the canonical grouping so nothing here
     duplicates the price formula itself. Used only if the canonical
     helper is ever unavailable at call time. */
  var items=(state && Array.isArray(state.elemItems))?state.elemItems:[];
  var groups=(state && Array.isArray(state.elemGroups))?state.elemGroups:[];
  var active=items.filter(function(i){ return num(i.qty)>0; });
  var used={}, out=[];
  groups.forEach(function(g){
    var arr=active.filter(function(i){ return String(i.groupId||'')===String(g.id||''); });
    if(arr.length){ arr.forEach(function(i){ used[i.id]=true; }); out.push({id:g.id,name:g.name||'\u0413\u0440\u0443\u043F\u0430',items:arr}); }
  });
  var rest=active.filter(function(i){ return !used[i.id]; });
  if(rest.length) out.push({id:'__other',name:'\u0406\u043D\u0448\u0435',items:rest});
  return out;
}
function totalForGroups(groups){
  if(typeof window._modernGroupsTotal==='function'){
    try{ return num(window._modernGroupsTotal(groups)); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  var t=0;
  (groups||[]).forEach(function(g){ (g.items||[]).forEach(function(it){ t+=num(it.qty)*num(it.price); }); });
  return t;
}

function computeRoomTotal(project, room, variantId){
  var ri=computeRoomItems(project, room, variantId);
  return totalForGroups(groupsForState({elemItems:ri.items, elemGroups:ri.groups}));
}

/* One client-facing category per kind of work. Film groups carry the colour in
   their name ("Плівка Premium · M303"), so without this a colour change would
   show up as two unrelated rows instead of one changed line. */
function categoryLabel(name){
  name=String(name||'').trim();
  if(!name) return '\u0406\u043D\u0448\u0435';
  if(/^\u041F\u043B\u0456\u0432\u043A\u0430(\s|$)/i.test(name)) return '\u041F\u043E\u043B\u043E\u0442\u043D\u043E (\u043F\u043B\u0456\u0432\u043A\u0430)';
  return name;
}

function computeProjectBreakdown(project, variantId){
  var rooms=(project.rooms||[]).map(function(room){
    var ri=computeRoomItems(project, room, variantId);
    var groups=groupsForState({elemItems:ri.items, elemGroups:ri.groups});
    return {room:room, groups:groups, total:totalForGroups(groups)};
  });
  var grandTotal=rooms.reduce(function(s,r){ return s+r.total; },0);
  var byName={}, order=[];
  rooms.forEach(function(r){
    r.groups.forEach(function(g){
      var name=categoryLabel(g.name);
      if(!Object.prototype.hasOwnProperty.call(byName,name)){ byName[name]=0; order.push(name); }
      byName[name]+=totalForGroups([g]);
    });
  });
  var categories=order.map(function(name){ return {name:name, total:byName[name]}; });
  return {rooms:rooms, grandTotal:grandTotal, categories:categories};
}

/* ---------- catalog helpers (real data only, nothing hardcoded) ---------- */

function catalogItemsUnion(project){
  var byKey={}, order=[];
  (project.rooms||[]).forEach(function(room){
    var b=baseItemsForRoom(room);
    b.items.forEach(function(it){
      var k=itemKey(it);
      if(!Object.prototype.hasOwnProperty.call(byKey,k)){ byKey[k]=it; order.push(k); }
    });
  });
  return order.map(function(k){ return byKey[k]; });
}
function catalogGroupsUnion(project){
  var byId={}, order=[];
  (project.rooms||[]).forEach(function(room){
    var b=baseItemsForRoom(room);
    b.groups.forEach(function(g){
      var id=String(g && g.id!=null ? g.id : '');
      if(id && !Object.prototype.hasOwnProperty.call(byId,id)){ byId[id]=g; order.push(id); }
    });
  });
  return order.map(function(id){ return byId[id]; });
}
function detectCategoryGroups(project){
  var groups=catalogGroupsUnion(project);
  function has(name, words){ var n=String(name||'').toLowerCase(); return words.some(function(w){ return n.indexOf(w)>=0; }); }
  var profile=[], insert=[], lighting=[];
  groups.forEach(function(g){
    var id=String(g.id);
    if(has(g.name,['\u043F\u0440\u043E\u0444\u0456\u043B'])) profile.push(id);
    if(has(g.name,['\u0432\u0441\u0442\u0430\u0432\u043A','\u0432\u043A\u043B\u0430\u0434'])) insert.push(id);
    if(has(g.name,['\u0441\u0432\u0456\u0442','\u043E\u0441\u0432\u0456\u0442\u043B','\u043B\u044E\u0441\u0442\u0440'])) lighting.push(id);
  });
  var items=catalogItemsUnion(project);
  var profileFound=items.some(function(it){ return norm(it&&it.source)==='main_profile'; });
  var insertFound=items.some(function(it){
    if(norm(it&&it.source)==='white_insert') return true;
    var n=norm(it&&it.name);
    return /\u0432\u0441\u0442\u0430\u0432\u043A|insert/.test(n) && !!colorWordOf(it);
  });
  var lightingFound=lightingSourceItems(items).length>0;
  var filmFound = groups.some(function(g){ return hasWord(g&&g.name, FILM_GROUP_WORDS); })
    || items.some(function(it){ return it && it.roomScopedKind==='film-color'; });
  return {
    profile:profile, insert:insert, lighting:lighting,
    profileFound:profileFound, insertFound:insertFound, lightingFound:lightingFound, filmFound:filmFound,
    profileSourceKey:'main_profile', insertSourceKey:'white_insert', lightingSourceKeys:LIGHT_SOURCE_KEYS.slice(),
    allGroups:groups.map(function(g){ return {id:String(g.id),name:g.name||''}; })
  };
}

/* ---------- bulk change → semantic descriptor (creation time only) ----------
   Turns what the person picked in the UI into the small stored descriptor
   consumed by applySemanticCategoryChange above. Never bakes in a computed
   quantity for a geometry/autofill-driven source - only mode + target id
   are persisted, so the real number is always resolved live later. */

function buildSemanticChange(cat, baseItems, catBulk, assumptions){
  if(!catBulk || catBulk.mode==='keep') return null;

  if(cat==='film'){
    if(catBulk.mode==='remove') return {mode:'remove'};
    if(catBulk.mode==='replace'){
      if(!catBulk.seriesId || !catBulk.code){
        if(assumptions) assumptions.push('\u041D\u0435 \u043E\u0431\u0440\u0430\u043D\u043E \u0441\u0435\u0440\u0456\u044E \u0430\u0431\u043E \u043A\u043E\u043B\u0456\u0440 \u043F\u043B\u0456\u0432\u043A\u0438.');
        return null;
      }
      var seriesMeta=filmSeriesMeta(catBulk.seriesId);
      if(!seriesMeta || seriesMeta.active===false){
        if(assumptions) assumptions.push('\u0421\u0435\u0440\u0456\u044F "'+(seriesMeta?seriesMeta.name:catBulk.seriesId)+'" \u0449\u0435 \u043D\u0435 \u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445 \u0443 \u043A\u0430\u0442\u0430\u043B\u043E\u0437\u0456 \u2014 \u0434\u043E\u0434\u0430\u0439\u0442\u0435 \u043A\u043E\u043B\u044C\u043E\u0440\u0438/\u0446\u0456\u043D\u0438 \u0432 ACEIL_COLOR_CATALOG_BY_SERIES / ACEIL_FILM_PRICING_BY_SERIES.');
        return null;
      }
      var entry=findFilmColorEntry(catBulk.seriesId, catBulk.code);
      if(!entry){
        if(assumptions) assumptions.push('\u041A\u043E\u043B\u0456\u0440 '+catBulk.code+' \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0437\u0456 \u0441\u0435\u0440\u0456\u0457 "'+seriesMeta.name+'".');
        return null;
      }
      return {mode:'replace', seriesId:catBulk.seriesId, code:catBulk.code};
    }
    return null;
  }

  if(cat==='lighting'){
    if(catBulk.mode==='remove') return {mode:'remove'};
    if(catBulk.mode==='qty'){
      if(catBulk.targetItemId==null){ if(assumptions) assumptions.push('\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u043D\u0430\u0439\u0442\u0438 \u043F\u043E\u0437\u0438\u0446\u0456\u044E \u043E\u0441\u0432\u0456\u0442\u043B\u0435\u043D\u043D\u044F \u0434\u043B\u044F \u0437\u043C\u0456\u043D\u0438 \u043A\u0456\u043B\u044C\u043A\u043E\u0441\u0442\u0456.'); return null; }
      return {mode:'qty', targetItemId:catBulk.targetItemId, qty:Math.max(0,num(catBulk.qty))};
    }
    if(catBulk.mode==='item'){
      if(catBulk.targetItemId==null){ if(assumptions) assumptions.push('\u0426\u0456\u043B\u044C\u043E\u0432\u0443 \u043F\u043E\u0437\u0438\u0446\u0456\u044E \u043E\u0441\u0432\u0456\u0442\u043B\u0435\u043D\u043D\u044F \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.'); return null; }
      var activeLight=lightingSourceItems(baseItems).filter(function(it){ return num(it.qty)>0; });
      if(!activeLight.length && assumptions) assumptions.push('\u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u043F\u043E\u0437\u0438\u0446\u0456\u0439 \u043E\u0441\u0432\u0456\u0442\u043B\u0435\u043D\u043D\u044F (\u0437 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u043E\u0432\u043D\u0435\u043D\u043D\u044F) \u0437\u0430\u0440\u0430\u0437 \u043D\u0435\u043C\u0430\u0454 \u2014 \u043D\u043E\u0432\u0443 \u043F\u043E\u0437\u0438\u0446\u0456\u044E \u0432\u0430\u0440\u0456\u0430\u043D\u0442 \u043F\u0456\u0434\u0445\u043E\u043F\u0438\u0442\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E, \u043A\u043E\u043B\u0438 \u0432\u043E\u043D\u0438 \u0437\u0430\u0301\u044F\u0432\u043B\u044F\u0442\u044C\u0441\u044F.');
      return {mode:'replace', targetItemId:catBulk.targetItemId};
    }
    return null;
  }

  /* profile / insert - single geometry/autofill-driven source item */
  var finder = cat==='profile' ? findMainProfileItem : findInsertItem;
  var notFoundMsg = cat==='profile'
    ? '\u0426\u0456\u043B\u044C\u043E\u0432\u0443 \u043F\u043E\u0437\u0438\u0446\u0456\u044E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u2014 \u0437\u0430\u043C\u0456\u043D\u0443 \u043F\u0440\u043E\u0444\u0456\u043B\u044E \u043D\u0435 \u0437\u0430\u0441\u0442\u043E\u0441\u043E\u0432\u0430\u043D\u043E.'
    : '\u0426\u0456\u043B\u044C\u043E\u0432\u0443 \u043F\u043E\u0437\u0438\u0446\u0456\u044E \u0434\u043B\u044F \u0432\u0441\u0442\u0430\u0432\u043A\u0438 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.';
  var noSourceMsg = cat==='profile'
    ? '\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439 \u043F\u0440\u043E\u0444\u0456\u043B\u044C (\u0434\u0436\u0435\u0440\u0435\u043B\u043E main_profile) \u0443 \u043A\u0456\u043C\u043D\u0430\u0442\u0456 \u0437\u0430\u0440\u0430\u0437 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u2014 \u043D\u043E\u0432\u0430 \u043F\u043E\u0437\u0438\u0446\u0456\u044F \u043F\u0456\u0434\u0445\u043E\u043F\u0438\u0442\u044C \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E, \u043A\u043E\u043B\u0438 \u0432\u0456\u043D \u0437\u0301\u044F\u0432\u0438\u0442\u044C\u0441\u044F.'
    : '\u0410\u043A\u0442\u0438\u0432\u043D\u0443 \u0432\u0441\u0442\u0430\u0432\u043A\u0443 (white_insert) \u0443 \u043A\u0456\u043C\u043D\u0430\u0442\u0456 \u0437\u0430\u0440\u0430\u0437 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u2014 \u043D\u043E\u0432\u0430 \u043F\u043E\u0437\u0438\u0446\u0456\u044F \u043F\u0456\u0434\u0445\u043E\u043F\u0438\u0442\u044C \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E, \u043A\u043E\u043B\u0438 \u0432\u043E\u043D\u0430 \u0437\u0301\u044F\u0432\u0438\u0442\u044C\u0441\u044F.';

  if(catBulk.mode==='remove') return {mode:'remove'};
  if(catBulk.mode==='item'){
    if(catBulk.targetItemId==null){ if(assumptions) assumptions.push(notFoundMsg); return null; }
    var src=finder(baseItems, assumptions);
    if(!src && assumptions) assumptions.push(noSourceMsg);
    return {mode:'replace', targetItemId:catBulk.targetItemId};
  }
  if(catBulk.mode==='qty'){
    if(catBulk.targetItemId==null){ if(assumptions) assumptions.push(notFoundMsg); return null; }
    return {mode:'qty', targetItemId:catBulk.targetItemId, qty:Math.max(0,num(catBulk.qty))};
  }
  return null;
}

function createVariant(project, opts){
  ensure(project);
  opts = opts || {};
  var baseId = opts.baseVariantId!=null ? opts.baseVariantId : null;
  var allIds = (project.rooms||[]).map(function(r){ return r.id; });
  var scopeIds = opts.scope==='all' ? allIds : (Array.isArray(opts.roomIds) ? opts.roomIds : []);
  var assumptions = [];
  var overrides = {};

  scopeIds.forEach(function(rid){
    var room=(project.rooms||[]).find(function(r){ return String(r.id)===String(rid); });
    if(!room) return;
    /* Resolved against the base chain's CURRENT (live) items only to decide
       what "the" main_profile / white_insert / active lighting item is
       right now and to produce creation-time assumption messages. Only
       mode + targetItemId (never a computed qty) end up in roomChanges. */
    var baseItems = computeRoomItems(project, room, baseId).items;
    var roomChanges = {};
    ['profile','insert','lighting','film'].forEach(function(cat){
      var catBulk = opts.changes && opts.changes[cat];
      var change = buildSemanticChange(cat, baseItems, catBulk, assumptions);
      if(change) roomChanges[cat]=change;
    });
    if(Object.keys(roomChanges).length) overrides[rid]=roomChanges;
  });

  var variant = {
    id: 'ev_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    name: (opts.name && String(opts.name).trim()) || ('\u0412\u0430\u0440\u0456\u0430\u043D\u0442 '+(list(project).length)),
    createdAt: Date.now(),
    baseVariantId: baseId,
    overrides: overrides
  };
  project.estimateVariants = project.estimateVariants||[];
  project.estimateVariants.push(variant);
  project._activeEstimateVariantId = variant.id;
  return {variant:variant, assumptions:assumptions};
}

function renameVariant(project, id, name){
  var v=findVariant(project, id);
  if(!v || v.isMain) return false;
  v.name = String(name||'').trim() || v.name;
  return true;
}
function deleteVariant(project, id){
  if(id==null) return false;
  ensure(project);
  var idx=(project.estimateVariants||[]).findIndex(function(v){ return String(v.id)===String(id); });
  if(idx<0) return false;
  var removed=project.estimateVariants[idx];
  project.estimateVariants.splice(idx,1);
  project.estimateVariants.forEach(function(v){
    if(v.baseVariantId!=null && String(v.baseVariantId)===String(id)) v.baseVariantId = removed.baseVariantId!=null ? removed.baseVariantId : null;
  });
  if(project._activeEstimateVariantId!=null && String(project._activeEstimateVariantId)===String(id)){
    project._activeEstimateVariantId = removed.baseVariantId!=null ? removed.baseVariantId : null;
  }
  return true;
}

/* ---------- render-time virtualization ----------
   Produces a CLONE of the project where every room's state.elemItems /
   state.elemGroups have been swapped for the active variant's computed
   items. Never mutates the real project and never gets persisted - this is
   only meant to be handed to display/report code so the whole interface
   and generated reports show the selected variant's configuration and
   totals, while project.rooms (the Main estimate) stays byte-for-byte the
   same on disk. */
function virtualizeProjectForRender(project){
  if(!project || typeof project!=='object' || !Array.isArray(project.rooms) || !project.rooms.length) return project;
  var activeId = getActiveId(project);
  if(activeId==null) return project;
  var out = clone(project);
  out.rooms = (project.rooms||[]).map(function(room){
    var rc = clone(room) || {};
    var ri = computeRoomItems(project, room, activeId);
    var wasString = typeof room.state === 'string';
    var st = parseMaybeJSON(room.state);
    st.elemItems = clone(ri.items) || [];
    st.elemGroups = clone(ri.groups) || [];
    rc.state = wasString ? JSON.stringify(st) : st;
    return rc;
  });
  return out;
}

/* ---------- published calculations registry ----------
   Every cloud link the person creates is an immutable snapshot, so the app
   keeps a small list of what was sent: which calculation, its total at that
   moment, and when the link was created / expires. */
function linkState(link){
  if(!link) return 'none';
  if(link.revokedAt) return 'revoked';
  var exp=link.expiresAt ? new Date(link.expiresAt).getTime() : NaN;
  if(isFinite(exp) && exp<=Date.now()) return 'expired';
  return 'active';
}
function calcLinks(project){
  ensure(project);
  return (project.calcLinks||[]).slice().sort(function(a,b){ return String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')); });
}
/* The latest still-active link of every distinct estimate calculation. */
function activeCalculations(project){
  var seen={}, out=[];
  calcLinks(project).forEach(function(l){
    if(l.kind!=='estimate' || linkState(l)!=='active') return;
    var key=String(l.variantId==null?'main':l.variantId);
    if(seen[key]) return;
    seen[key]=true; out.push(l);
  });
  return out;
}
function recordPublication(project, info){
  if(!project || !info || !info.token) return null;
  ensure(project);
  var kind = info.kind==='comparison' ? 'comparison' : 'estimate';
  var vid = info.variantId!==undefined ? info.variantId : getActiveId(project);
  if(vid!=null && !findVariant(project, vid)) vid=null;
  var variant=findVariant(project, vid)||findVariant(project, null);
  var total=0;
  try{ total=computeProjectBreakdown(project, vid).grandTotal; }catch(_){ total=0; }
  var entry={
    token:String(info.token),
    kind:kind,
    variantId:vid,
    name: kind==='comparison' ? ('\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u043D\u043D\u044F: \u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439 \u0456 '+variant.name) : variant.name,
    total:Math.round(total*100)/100,
    publishedAt:info.publishedAt||new Date().toISOString(),
    expiresAt:info.expiresAt||null,
    revokedAt:null
  };
  project.calcLinks=(project.calcLinks||[]).filter(function(l){ return l.token!==entry.token; });
  project.calcLinks.push(entry);
  if(project.calcLinks.length>30) project.calcLinks=calcLinks(project).slice(0,30);
  if(info.persist!==false) persistProject(project);
  return entry;
}
function markLinkRevoked(project, token, persist){
  ensure(project);
  var changed=false;
  (project.calcLinks||[]).forEach(function(l){ if(l.token===String(token) && !l.revokedAt){ l.revokedAt=new Date().toISOString(); changed=true; } });
  if(changed && persist!==false) persistProject(project);
  return changed;
}

window.A_CEIL_EstimateVariants = {
  calcLinks: calcLinks,
  activeCalculations: activeCalculations,
  linkState: linkState,
  recordPublication: recordPublication,
  markLinkRevoked: markLinkRevoked,
  categoryLabel: categoryLabel,
  money: money,
  clone: clone,
  itemKey: itemKey,
  findProjectRaw: findProjectRaw,
  ensure: ensure,
  persistProject: persistProject,
  list: list,
  findVariant: findVariant,
  getActiveId: getActiveId,
  setActiveId: setActiveId,
  computeRoomItems: computeRoomItems,
  computeRoomTotal: computeRoomTotal,
  computeProjectBreakdown: computeProjectBreakdown,
  catalogItemsUnion: catalogItemsUnion,
  catalogGroupsUnion: catalogGroupsUnion,
  detectCategoryGroups: detectCategoryGroups,
  createVariant: createVariant,
  renameVariant: renameVariant,
  deleteVariant: deleteVariant,
  virtualizeProjectForRender: virtualizeProjectForRender,
  LIGHT_SOURCE_KEYS: LIGHT_SOURCE_KEYS.slice(),
  filmSeriesRegistry: filmSeriesRegistry,
  filmCatalogForSeries: filmCatalogForSeries,
  filmPricingForSeries: filmPricingForSeries,
  filmWidthCandidates: filmWidthCandidates,
  filmTextureLabels: filmTextureLabels,
  pickFilmWidthCandidate: pickFilmWidthCandidate,
  requiredFilmWidthMetersFromRoom: requiredFilmWidthMetersFromRoom,
  roomAreaM2: roomAreaM2,
  getRoomFilmInfo: getRoomFilmInfo,
  getRoomFilmInfoFromItems: getRoomFilmInfoFromItems,
  computeFilmBreakdown: computeFilmBreakdown
};
})();


/* === consolidated from js/reports/184-aceil-estimate-variants-ui.js === */

(function(){
'use strict';
if(window.__ACEIL_ESTIMATE_VARIANTS_UI_V1) return;
window.__ACEIL_ESTIMATE_VARIANTS_UI_V1 = true;

var ENGINE = window.A_CEIL_EstimateVariants;
if(!ENGINE){ return; } /* engine module (183) must load first */

function esc(s){
  if(typeof window.escapeHtml==='function') return window.escapeHtml(s);
  return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}
function toast(msg){ try{ if(typeof window.showToast==='function') window.showToast(msg); }catch(_){window.__diagSilent&&window.__diagSilent(_)} }
function money(v){ return ENGINE.money(v); }
function activeProjectId(){
  try{ return typeof _activeObjectId!=='undefined' ? _activeObjectId : null; }catch(_){ return null; }
}
function findActiveProject(){
  var id=activeProjectId();
  if(id==null) return null;
  return ENGINE.findProjectRaw(id);
}

/* ---------------------------------------------------------------
   Render-time variant virtualization.

   Switching the active variant must change the configuration and totals
   everywhere - the object's room list, the report, the cloud/manager
   report data - not just the tabs bar below the totals. To do that without
   ever touching the persisted Main estimate, every known "generate a
   report" entry point below is wrapped so that, only for the duration of
   that one call, it operates on a virtualized clone of the object where
   each room's state.elemItems/elemGroups reflect the active variant. Real
   storage (project-repository.js, cloud sync) is never touched: read paths
   used elsewhere in the app (editing, saving, deleting rooms, etc.) call
   getProjects() with the flag off and get the real, untouched data.
   --------------------------------------------------------------- */

window.__ACEIL_VAR_RENDER__ = false;

function withVariantRenderFlag(fn){
  return function(){
    var self=this, args=arguments;
    window.__ACEIL_VAR_RENDER__ = true;
    var finished=false;
    function done(){ if(!finished){ finished=true; window.__ACEIL_VAR_RENDER__=false; } }
    try{
      var r = fn.apply(self, args);
      if(r && typeof r.then==='function'){ return r.then(function(v){ done(); return v; }, function(e){ done(); throw e; }); }
      done();
      return r;
    }catch(e){ done(); throw e; }
  };
}

function virtualizeObjArg(obj){
  if(!obj || typeof obj!=='object') return obj;
  var id = obj.id!=null ? obj.id : (obj._dbId!=null ? obj._dbId : obj._localId);
  var proj = id!=null ? ENGINE.findProjectRaw(id) : null;
  return ENGINE.virtualizeProjectForRender(proj || obj);
}

(function installGetProjectsVirtualization(){
  var oldGetProjects = window.getProjects;
  if(typeof oldGetProjects!=='function' || oldGetProjects.__aceilVariantsRenderWrap) return;
  var wrapped = function(){
    var list = oldGetProjects.apply(this, arguments);
    if(!window.__ACEIL_VAR_RENDER__ || !Array.isArray(list)) return list;
    try{
      return list.map(function(p){
        if(!p || !Array.isArray(p.rooms) || !p.rooms.length) return p;
        try{ ENGINE.ensure(p); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        if(p._activeEstimateVariantId==null) return p;
        return ENGINE.virtualizeProjectForRender(p);
      });
    }catch(_){ return list; }
  };
  wrapped.__aceilVariantsRenderWrap = true;
  window.getProjects = wrapped;
  try{ getProjects = wrapped; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
})();

function makeObjArgWrapper(old){
  return withVariantRenderFlag(function(obj){
    var args = Array.prototype.slice.call(arguments);
    args[0] = virtualizeObjArg(obj);
    return old.apply(this, args);
  });
}
function makeNoArgWrapper(old){
  return withVariantRenderFlag(function(){ return old.apply(this, arguments); });
}

var oldGenerateObjectReport=window.generateObjectReport;
if(typeof oldGenerateObjectReport==='function' && !oldGenerateObjectReport.__aceilVariantsV1){
  var wrappedGenerateObjectReport=makeObjArgWrapper(oldGenerateObjectReport);
  wrappedGenerateObjectReport.__aceilVariantsV1=true;
  window.generateObjectReport=wrappedGenerateObjectReport;
  try{ generateObjectReport=wrappedGenerateObjectReport; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

var oldGenerateModernObjectReport=window.generateModernObjectReport;
if(typeof oldGenerateModernObjectReport==='function' && !oldGenerateModernObjectReport.__aceilVariantsV1){
  var wrappedGenerateModernObjectReport=makeObjArgWrapper(oldGenerateModernObjectReport);
  wrappedGenerateModernObjectReport.__aceilVariantsV1=true;
  window.generateModernObjectReport=wrappedGenerateModernObjectReport;
  try{ generateModernObjectReport=wrappedGenerateModernObjectReport; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

var oldBuildCloudStructuredReport=window.A_CEIL_buildCloudStructuredReport;
if(typeof oldBuildCloudStructuredReport==='function' && !oldBuildCloudStructuredReport.__aceilVariantsV1){
  var wrappedBuildCloudStructuredReport=makeNoArgWrapper(oldBuildCloudStructuredReport);
  wrappedBuildCloudStructuredReport.__aceilVariantsV1=true;
  window.A_CEIL_buildCloudStructuredReport=wrappedBuildCloudStructuredReport;
  try{ A_CEIL_buildCloudStructuredReport=wrappedBuildCloudStructuredReport; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

var oldPublishManagerReport=window.A_CEIL_PublishManagerReport;
if(typeof oldPublishManagerReport==='function' && !oldPublishManagerReport.__aceilVariantsV1){
  var wrappedPublishManagerReport=makeNoArgWrapper(oldPublishManagerReport);
  wrappedPublishManagerReport.__aceilVariantsV1=true;
  window.A_CEIL_PublishManagerReport=wrappedPublishManagerReport;
  try{ A_CEIL_PublishManagerReport=wrappedPublishManagerReport; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

var oldOpenManagerReport=window.A_CEIL_OpenManagerReport;
if(typeof oldOpenManagerReport==='function' && !oldOpenManagerReport.__aceilVariantsV1){
  var wrappedOpenManagerReport=makeNoArgWrapper(oldOpenManagerReport);
  wrappedOpenManagerReport.__aceilVariantsV1=true;
  window.A_CEIL_OpenManagerReport=wrappedOpenManagerReport;
  try{ A_CEIL_OpenManagerReport=wrappedOpenManagerReport; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* ---------------------------------------------------------------
   Room-editor guard.

   The canvas room editor has no notion of variants - it always reads and
   writes the real project.rooms (Main). That is correct, but silent: if an
   alternative variant is showing in the object's room list when the person
   taps "Замір" to edit a room, they could easily believe they are editing
   that variant. Any edit + save there always lands on Main (by design -
   Main is the single shared geometry/nomenclature source every variant
   recomputes from), so instead of a silent switch-and-edit we explicitly
   deactivate the variant first and say so, so the person always knows
   which estimate they are about to change.
   --------------------------------------------------------------- */
var oldLoadRoomToCanvas=window._loadRoomToCanvas;
if(typeof oldLoadRoomToCanvas==='function' && !oldLoadRoomToCanvas.__aceilVariantsV1){
  var wrappedLoadRoomToCanvas=function(obj, roomIdx){
    try{
      var id = obj && (obj.id!=null ? obj.id : (obj._dbId!=null ? obj._dbId : obj._localId));
      var proj = id!=null ? ENGINE.findProjectRaw(id) : null;
      if(proj && ENGINE.getActiveId(proj)!=null){
        /* Geometry remains shared and is loaded from the real Main room,
           while the active variant stays selected. Its nomenclature is
           exposed separately below as a safe read-only virtual view. */
        if(obj && proj.rooms) obj.rooms = proj.rooms;
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return oldLoadRoomToCanvas.apply(this, arguments);
  };
  wrappedLoadRoomToCanvas.__aceilVariantsV1=true;
  window._loadRoomToCanvas=wrappedLoadRoomToCanvas;
  try{ _loadRoomToCanvas=wrappedLoadRoomToCanvas; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* ---------------------------------------------------------------
   Styles (scoped, additive only)
   --------------------------------------------------------------- */
(function injectStyle(){
  if(document.getElementById('aceilVarStyle')) return;
  var st=document.createElement('style');
  st.id='aceilVarStyle';
  st.textContent =
    '#aceilVarBar{margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;}' +
    '.aceilv-tabs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}' +
    '.aceilv-tab{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:11px;background:#f1f5f9;color:#334155;font-size:12px;font-weight:800;cursor:pointer;border:1.5px solid transparent;}' +
    '.aceilv-tab.active{background:linear-gradient(135deg,#2563eb,#6366f1);color:#fff;}' +
    '.aceilv-tab .aceilv-x{opacity:.75;padding:0 2px;font-weight:900;}' +
    '.aceilv-tab-add{background:#eff6ff;color:#1d4ed8;border:1.5px dashed #93c5fd;}' +
    '.aceilv-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}' +
    '.aceilv-actions button{flex:1;min-width:140px;padding:10px;border-radius:12px;font-size:12.5px;font-weight:800;}' +
    '.aceilv-btn-secondary{background:#f1f5f9!important;color:#334155!important;box-shadow:none!important;}' +
    '.aceilv-plate{margin:0 0 10px;padding:9px 11px;border-radius:12px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;font-size:12.5px;font-weight:850;line-height:1.35;}' +
    '.aceilv-links{margin-top:12px;border-top:1px dashed #e2e8f0;padding-top:10px;}' +
    '.aceilv-links-title{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;}' +
    '.aceilv-link-row{display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid #f1f5f9;}' +
    '.aceilv-link-row.off{opacity:.55;}' +
    '.aceilv-link-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;}' +
    '.aceilv-link-main b{font-size:13px;color:#1e293b;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.aceilv-link-main small{font-size:11px;color:#64748b;font-weight:700;}' +
    '.aceilv-link-row button{flex:0 0 auto;padding:7px 10px;border-radius:10px;font-size:11.5px;font-weight:850;background:#eff6ff;color:#1d4ed8;box-shadow:none;}' +
    '.aceilv-link-row button.danger{background:#fee2e2;color:#b91c1c;}' +
    '.aceilv-links-note{margin-top:6px;font-size:11px;color:#94a3b8;font-weight:650;line-height:1.35;}' +
    '.aceilv-total{margin-top:10px;font-size:14px;font-weight:900;color:#1d4ed8;}' +
    '.aceilv-rooms{margin-top:8px;display:flex;flex-direction:column;gap:5px;}' +
    '.aceilv-room-row{display:flex;justify-content:space-between;font-size:12.5px;color:#475569;font-weight:700;padding:4px 2px;border-bottom:1px dashed #eef2f7;}' +
    '.aceilv-modal-overlay{display:none;position:fixed;inset:0;z-index:9500;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:12px;}' +
    '.aceilv-modal-overlay.open{display:flex;}' +
    '.aceilv-modal{background:#fff;border-radius:22px;padding:18px;width:min(96vw,480px);max-height:88vh;overflow:auto;box-shadow:0 24px 60px rgba(0,0,0,.22);}' +
    '.aceilv-modal h3{margin:0 0 12px;font-size:1.02rem;font-weight:900;color:#1e293b;}' +
    '.aceilv-field{margin-bottom:12px;}' +
    '.aceilv-field label{display:block;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;}' +
    '.aceilv-field input[type=text],.aceilv-field input[type=number],.aceilv-field select{width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;font-weight:700;background:#fff;}' +
    '.aceilv-room-list{max-height:130px;overflow:auto;border:1px solid #f1f5f9;border-radius:12px;padding:8px;}' +
    '.aceilv-room-list label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#334155;padding:3px 0;text-transform:none;letter-spacing:0;}' +
    '.aceilv-cat{border:1px solid #eef2f7;border-radius:14px;padding:10px;margin-bottom:10px;}' +
    '.aceilv-cat-title{font-weight:900;font-size:13px;color:#1e293b;margin-bottom:8px;}' +
    '.aceilv-mode-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}' +
    '.aceilv-mode-btn{padding:6px 10px;border-radius:9px;background:#f1f5f9;color:#475569;font-size:11.5px;font-weight:800;cursor:pointer;border:1.5px solid transparent;}' +
    '.aceilv-mode-btn.active{background:#dbeafe;color:#1d4ed8;border-color:#93c5fd;}' +
    '.aceilv-preview{background:#eff6ff;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:800;color:#1d4ed8;margin:10px 0;}' +
    '.aceilv-note{font-size:11px;color:#c2410c;background:#fff7ed;border-radius:10px;padding:8px 10px;margin-top:6px;}' +
    '.aceilv-modal-btns{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}' +
    '.aceilv-modal-btns button{flex:1;padding:12px;border-radius:12px;font-weight:900;font-size:14px;}' +
    '.aceilv-cmp-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px;}' +
    '.aceilv-cmp-table th,.aceilv-cmp-table td{padding:8px 6px;border-bottom:1px solid #f1f5f9;text-align:left;}' +
    '.aceilv-cmp-table th{color:#64748b;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;}' +
    '.aceilv-cmp-table td.num{text-align:right;font-weight:800;}' +
    '.aceilv-cmp-table tr.total td{font-weight:950;color:#0f172a;border-top:2px solid #e2e8f0;}' +
    '.aceilv-cmp-table tr.save td{color:#15803d;font-weight:900;}' +
    '.aceilv-film-chip{display:flex!important;flex-direction:column!important;align-items:center;justify-content:center;gap:2px;line-height:1.15;min-width:82px!important;max-width:120px;overflow:hidden;padding:8px 4px!important;}' +
    '#aceilvFilmGrid .aceilv-film-chip{min-width:0!important;width:100%;max-width:100%;}' +
    '.aceilv-film-chip small{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.68;font-size:9px;font-weight:800;}' +
    '.aceilv-film-series-disabled{opacity:.45;cursor:not-allowed;}' +
    '.aceilv-cmp-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;}' +
    '.aceilv-cmp-card{border:1.5px solid #bfdbfe;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0;}' +
    '.aceilv-cmp-card.alt{border-color:#bbf7d0;}' +
    '.aceilv-cmp-card small{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.05em;}' +
    '.aceilv-cmp-card b{font-size:13px;color:#0f172a;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.aceilv-cmp-card span{font-size:17px;font-weight:950;color:#1e3a8a;}' +
    '.aceilv-cmp-card.alt span{color:#166534;}' +
    '.aceilv-cmp-verdict{margin-top:8px;padding:9px 12px;border-radius:12px;font-size:13.5px;font-weight:900;text-align:center;background:#f1f5f9;color:#334155;}' +
    '.aceilv-cmp-verdict.good{background:#dcfce7;color:#166534;}' +
    '.aceilv-cmp-verdict.bad{background:#ffedd5;color:#9a3412;}' +
    '.aceilv-cmp-table td.num.good{color:#15803d;}' +
    '.aceilv-cmp-table td.num.bad{color:#c2410c;}' +
    '.aceilv-cmp-same{margin-top:8px;padding:9px 11px;border-radius:11px;background:#f8fafc;color:#475569;font-size:12px;font-weight:700;line-height:1.4;}' +
    '.aceilv-cmp-linkbox{display:flex;gap:6px;margin-top:10px;}' +
    '.aceilv-cmp-linkbox input{flex:1;min-width:0;padding:9px 10px;border:1.5px solid #bfdbfe;border-radius:10px;font-size:12.5px;font-weight:700;color:#1e293b;}' +
    '.aceilv-cmp-linkbox button{flex:0 0 auto;padding:9px 12px;border-radius:10px;font-size:12px;font-weight:900;background:#eff6ff;color:#1d4ed8;box-shadow:none;}' +
    '.aceilv-cmp-subtitle{font-weight:900;font-size:13px;color:#1e293b;margin:14px 0 4px;}' +
    '.aceilv-nom-banner{margin:8px 10px 2px;padding:9px 11px;border-radius:11px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:800;}' +
    '.aceilv-ro-group{margin:10px 8px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#fff;}' +
    '.aceilv-ro-head{padding:11px 13px;background:#f8fafc;color:#4338ca;font-size:14px;font-weight:900;}' +
    '.aceilv-ro-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:10px 13px;border-top:1px solid #f1f5f9;}' +
    '.aceilv-ro-name{min-width:0;color:#1e293b;font-size:13px;font-weight:750;}' +
    '.aceilv-ro-qty{color:#475569;font-size:12px;font-weight:800;white-space:nowrap;}' +
    '.aceilv-ro-sum{color:#15803d;font-size:12px;font-weight:900;white-space:nowrap;}';
  document.head.appendChild(st);
})();

/* ---------------------------------------------------------------
   Tabs bar
   --------------------------------------------------------------- */

/* Updates the real interface the person already looks at - the "Всього"
   summary chips and the per-room cards in the object's room list - so a
   variant switch changes what's shown there too, not only inside the
   separate tabs bar below it. Purely additive DOM (no change to
   renderObjectRooms itself), safe to re-run on every render/switch. */
function injectInterfaceTotals(project, breakdown){
  try{
    var totalsEl=document.getElementById('objRoomsTotals');
    if(totalsEl){
      var chip=totalsEl.querySelector('.aceilv-totals-chip');
      if(!chip){
        chip=document.createElement('span');
        chip.className='aceilv-totals-chip';
        chip.style.cssText='background:#eef2ff;color:#4338ca;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;';
        totalsEl.appendChild(chip);
      }
      chip.textContent='\u041A\u043E\u0448\u0442\u043E\u0440\u0438\u0441: '+money(breakdown.grandTotal);
    }
    var listEl=document.getElementById('objRoomsList');
    if(listEl && listEl.children && listEl.children.length===breakdown.rooms.length){
      for(var i=0;i<breakdown.rooms.length;i++){
        var row=listEl.children[i];
        if(!row || !row.children || row.children.length<2) continue;
        var infoDiv=row.children[1];
        if(!infoDiv || !infoDiv.children || infoDiv.children.length<2) continue;
        var badgesDiv=infoDiv.children[1];
        var badge=badgesDiv.querySelector('.aceilv-room-total-badge');
        if(!badge){
          badge=document.createElement('span');
          badge.className='aceilv-room-total-badge';
          badge.style.cssText='background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:2px 7px;font-size:11px;font-weight:700;';
          badgesDiv.appendChild(badge);
        }
        badge.textContent=money(breakdown.rooms[i].total);
      }
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

function pluralCalc(n){
  var a=n%100,b=n%10;
  return (a>=11&&a<=14)||b===0||b>=5 ? '\u043F\u0440\u043E\u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432' : (b===1 ? '\u043F\u0440\u043E\u0440\u0430\u0445\u0443\u043D\u043E\u043A' : '\u043F\u0440\u043E\u0440\u0430\u0445\u0443\u043D\u043A\u0438');
}
function shortDate(iso){
  try{ var d=new Date(iso); if(isNaN(d.getTime())) return ''; return d.toLocaleDateString('uk-UA',{day:'2-digit',month:'2-digit'}); }catch(_){ return ''; }
}
/* "What has the client been sent" - one row per cloud link. */
function calcPlateHtml(project){
  var active=ENGINE.activeCalculations(project);
  if(active.length<2) return '';
  return '<div class="aceilv-plate" data-aceilv-plate="1">\uD83D\uDD17 \u0423 \u0446\u044C\u043E\u043C\u0443 \u043E\u0431\u02BC\u0454\u043A\u0442\u0456 '+active.length+' '+pluralCalc(active.length)+' \u0434\u043B\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0430 \u2014 \u0443 \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0441\u0432\u043E\u0454 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F</div>';
}
function calcLinksHtml(project){
  var all=ENGINE.calcLinks(project);
  if(!all.length) return '';
  var rows=all.map(function(l){
    var st=ENGINE.linkState(l);
    var stText = st==='active' ? ('\u0434\u0456\u0454 \u0434\u043E '+shortDate(l.expiresAt)) : (st==='revoked' ? '\u0437\u0430\u043A\u0440\u0438\u0442\u043E' : '\u0442\u0435\u0440\u043C\u0456\u043D \u0432\u0438\u0439\u0448\u043E\u0432');
    return '<div class="aceilv-link-row'+(st==='active'?'':' off')+'" data-aceilv-link="'+esc(l.token)+'">'+
      '<div class="aceilv-link-main"><b>'+(l.kind==='comparison'?'\u2696\uFE0F ':'\uD83D\uDCC4 ')+esc(l.name)+'</b>'+
      '<small>'+money(l.total)+' \u00B7 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E '+esc(shortDate(l.publishedAt))+' \u00B7 '+stText+'</small></div>'+
      (st==='active' ? '<button type="button" data-aceilv-copy="'+esc(l.token)+'">\u041A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438</button><button type="button" class="danger" data-aceilv-revoke-link="'+esc(l.token)+'">\u0417\u0430\u043A\u0440\u0438\u0442\u0438</button>' : '')+
    '</div>';
  }).join('');
  return '<div class="aceilv-links"><div class="aceilv-links-title">\u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u0456 \u043A\u043B\u0456\u0454\u043D\u0442\u0443 \u043F\u0440\u043E\u0440\u0430\u0445\u0443\u043D\u043A\u0438</div>'+rows+
    '<div class="aceilv-links-note">\u041A\u043E\u0436\u043D\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454 \u0446\u0438\u0444\u0440\u0438 \u043D\u0430 \u043C\u043E\u043C\u0435\u043D\u0442 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F. \u0429\u043E\u0431 \u043E\u043D\u043E\u0432\u0438\u0442\u0438 \u2014 \u0441\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u043D\u043E\u0432\u0435.</div></div>';
}
function copyText(text){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function(){ return true; }, function(){ return false; });
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Promise.resolve(false);
}

function renderVariantBar(project, explicitHost){
  var totalsEl=document.getElementById('objRoomsTotals');
  var homeOverlay=document.getElementById('aceilVarHomeModal');
  var homeHost=document.getElementById('aceilVarHomeHost');
  var host=explicitHost || (homeOverlay && homeOverlay.classList.contains('open') ? homeHost : null);
  if(!host && (!totalsEl || !totalsEl.parentNode)) return;
  var bar=document.getElementById('aceilVarBar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='aceilVarBar';
  }
  if(host){
    if(bar.parentNode!==host) host.appendChild(bar);
  }else if(bar.parentNode!==totalsEl.parentNode || bar.previousSibling!==totalsEl){
    totalsEl.parentNode.insertBefore(bar, totalsEl.nextSibling);
  }

  ENGINE.ensure(project);
  var variants=ENGINE.list(project);
  var activeId=ENGINE.getActiveId(project);

  var tabsHtml=variants.map(function(v){
    var isActive = String(v.id)===String(activeId) || (v.id==null && activeId==null);
    var closeBtn = v.isMain ? '' : '<span class="aceilv-x" data-aceilv-del="'+esc(v.id)+'" title="\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438">\u00D7</span>';
    return '<span class="aceilv-tab'+(isActive?' active':'')+'" data-aceilv-tab="'+esc(v.id==null?'':v.id)+'">'+
      '<span data-aceilv-select="'+esc(v.id==null?'':v.id)+'">'+esc(v.name)+'</span>'+
      (v.isMain?'':'<span data-aceilv-rename="'+esc(v.id)+'" title="\u041F\u0435\u0440\u0435\u0439\u043C\u0435\u043D\u0443\u0432\u0430\u0442\u0438">\u270F\uFE0F</span>')+
      closeBtn+
    '</span>';
  }).join('') + '<span class="aceilv-tab aceilv-tab-add" data-aceilv-new="1">+ \u041D\u043E\u0432\u0438\u0439 \u0432\u0430\u0440\u0456\u0430\u043D\u0442</span>';

  var breakdown=ENGINE.computeProjectBreakdown(project, activeId);
  var roomsHtml=breakdown.rooms.map(function(r){
    return '<div class="aceilv-room-row"><span>'+esc(r.room && r.room.name || '\u041A\u0456\u043C\u043D\u0430\u0442\u0430')+'</span><span>'+money(r.total)+'</span></div>';
  }).join('');
  injectInterfaceTotals(project, breakdown);

  bar.innerHTML =
    calcPlateHtml(project)+
    '<div class="aceilv-tabs">'+tabsHtml+'</div>'+
    '<div class="aceilv-total">'+money(breakdown.grandTotal)+'</div>'+
    '<div class="aceilv-rooms">'+roomsHtml+'</div>'+
    '<div class="aceilv-actions">'+
      '<button type="button" class="aceilv-btn-secondary" data-aceilv-bulk="1">\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0434\u043B\u044F \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0443</button>'+
      '<button type="button" class="aceilv-btn-secondary" data-aceilv-compare="1">\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0437 \u041E\u0441\u043D\u043E\u0432\u043D\u0438\u043C</button>'+
    '</div>'+
    calcLinksHtml(project);

  bar.querySelectorAll('[data-aceilv-copy]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var url=window.A_CEIL_ReportLinks && window.A_CEIL_ReportLinks.publicUrl ? window.A_CEIL_ReportLinks.publicUrl(btn.getAttribute('data-aceilv-copy')) : '';
      if(!url) return;
      copyText(url).then(function(ok){ if(ok) toast('\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0441\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E'); else { try{ window.prompt('\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F:', url); }catch(_){window.__diagSilent&&window.__diagSilent(_)} } });
    });
  });
  bar.querySelectorAll('[data-aceilv-revoke-link]').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(!confirm('\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0446\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F? \u041A\u043B\u0456\u0454\u043D\u0442 \u0431\u0456\u043B\u044C\u0448\u0435 \u043D\u0435 \u0437\u043C\u043E\u0436\u0435 \u0439\u043E\u0433\u043E \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438. \u0406\u043D\u0448\u0456 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043D\u0435 \u0437\u0430\u0447\u0435\u043F\u0438\u0442\u044C.')) return;
      var tokenValue=btn.getAttribute('data-aceilv-revoke-link');
      var api=window.A_CEIL_ReportLinks;
      if(!api || !api.revokeToken){ toast('\u0417\u0430\u043A\u0440\u0438\u0442\u0442\u044F \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0435'); return; }
      btn.disabled=true;
      Promise.resolve(api.revokeToken(tokenValue, project.id!=null?project.id:project._dbId)).then(function(){
        toast('\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0437\u0430\u043A\u0440\u0438\u0442\u043E');
        var fresh=findActiveProject(); if(fresh) renderVariantBar(fresh, host);
      }).catch(function(e){ btn.disabled=false; toast('\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u043A\u0440\u0438\u0442\u0438: '+(e&&e.message||e)); });
    });
  });

  bar.querySelectorAll('[data-aceilv-select]').forEach(function(el){
    el.addEventListener('click', function(){
      var id=el.getAttribute('data-aceilv-select')||null;
      var proj=findActiveProject(); if(!proj) return;
      ENGINE.setActiveId(proj, id===''?null:id);
      ENGINE.persistProject(proj);
      renderVariantBar(proj);
    });
  });
  bar.querySelectorAll('[data-aceilv-rename]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var id=el.getAttribute('data-aceilv-rename');
      var proj=findActiveProject(); if(!proj) return;
      var v=ENGINE.findVariant(proj, id); if(!v) return;
      var name=prompt('\u041D\u0430\u0437\u0432\u0430 \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0430:', v.name);
      if(name==null) return;
      ENGINE.renameVariant(proj, id, name);
      ENGINE.persistProject(proj);
      renderVariantBar(proj);
    });
  });
  bar.querySelectorAll('[data-aceilv-del]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var id=el.getAttribute('data-aceilv-del');
      if(!confirm('\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0446\u0435\u0439 \u0432\u0430\u0440\u0456\u0430\u043D\u0442?')) return;
      var proj=findActiveProject(); if(!proj) return;
      ENGINE.deleteVariant(proj, id);
      ENGINE.persistProject(proj);
      renderVariantBar(proj);
    });
  });
  var newBtn=bar.querySelector('[data-aceilv-new]');
  if(newBtn) newBtn.addEventListener('click', function(){
    var proj=findActiveProject(); if(!proj) return;
    openBulkModal(proj, ENGINE.getActiveId(proj));
  });
  var bulkBtn=bar.querySelector('[data-aceilv-bulk]');
  if(bulkBtn) bulkBtn.addEventListener('click', function(){
    var proj=findActiveProject(); if(!proj) return;
    openBulkModal(proj, ENGINE.getActiveId(proj));
  });
  var cmpBtn=bar.querySelector('[data-aceilv-compare]');
  if(cmpBtn) cmpBtn.addEventListener('click', function(){
    var proj=findActiveProject(); if(!proj) return;
    openCompareModal(proj);
  });
}

/* ---------------------------------------------------------------
   Visible entry point in the canvas three-dots menu.

   The legacy objectRoomsModal is skipped by the current project flow, so
   the variants UI must be reachable directly from the room menu.
   --------------------------------------------------------------- */

function ensureHomeVariantsModal(){
  var overlay=document.getElementById('aceilVarHomeModal');
  if(overlay) return overlay;
  overlay=document.createElement('div');
  overlay.id='aceilVarHomeModal';
  overlay.className='aceilv-modal-overlay';
  overlay.style.zIndex='9400';
  overlay.innerHTML=
    '<div class="aceilv-modal" style="width:min(96vw,560px)">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">'+
        '<h3 style="margin:0">Варіанти кошторису</h3>'+
        '<button type="button" id="aceilVarHomeClose" aria-label="Закрити" style="background:#f1f5f9;color:#64748b;box-shadow:none;border-radius:10px;padding:5px 10px;font-size:20px;line-height:1">×</button>'+
      '</div>'+
      '<div id="aceilVarHomeHost"></div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#aceilVarHomeClose').addEventListener('click', function(){ overlay.classList.remove('open'); });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.classList.remove('open'); });
  return overlay;
}

async function openVariantsFromRoomScreen(){
  var id=activeProjectId();
  if(id==null){ toast('Спочатку відкрийте або збережіть об’єкт'); return; }
  try{
    if(typeof window.saveCurrentRoom==='function' && typeof _activeRoomIdx!=='undefined' && _activeRoomIdx!=null){
      await Promise.resolve(window.saveCurrentRoom({silent:true}));
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var project=findActiveProject();
  if(!project){ toast('Об’єкт не знайдено'); return; }
  var overlay=ensureHomeVariantsModal();
  overlay.classList.add('open');
  renderVariantBar(project, document.getElementById('aceilVarHomeHost'));
}

function ensureVisibleVariantsMenuAction(){
  if(document.getElementById('aceilVariantsMenuAction')) return;
  var menu=document.getElementById('A·CEILRoomMenuPopup');
  if(!menu) return;

  /* Keep the popup attached to the existing three-dots control, but
     position it against the viewport. This prevents the canvas container
     from clipping the top and gives iPhone Safari a real scroll area. */
  function positionMenuForViewport(){
    var toggle=document.getElementById('A·CEILRoomMenuToggle');
    if(!toggle) return;
    var rect=toggle.getBoundingClientRect();
    var viewportH=window.innerHeight || document.documentElement.clientHeight || 700;
    var bottom=Math.max(12, viewportH-rect.top+8);
    var available=Math.max(190, rect.top-18);
    menu.style.setProperty('position','fixed','important');
    menu.style.setProperty('top','auto','important');
    menu.style.setProperty('right','12px','important');
    menu.style.setProperty('left','auto','important');
    menu.style.setProperty('bottom',bottom+'px','important');
    menu.style.setProperty('width','min(330px, calc(100vw - 24px))','important');
    menu.style.setProperty('max-height',available+'px','important');
    menu.style.setProperty('overflow-y','auto','important');
    menu.style.setProperty('-webkit-overflow-scrolling','touch','important');
    menu.style.setProperty('overscroll-behavior','contain','important');
    menu.style.setProperty('touch-action','pan-y','important');
    menu.style.setProperty('z-index','10020','important');
  }
  var toggle=document.getElementById('A·CEILRoomMenuToggle');
  if(toggle){
    toggle.addEventListener('click', function(){ requestAnimationFrame(positionMenuForViewport); });
  }
  menu.addEventListener('touchstart', function(e){ e.stopPropagation(); }, {passive:true});
  menu.addEventListener('touchmove', function(e){ e.stopPropagation(); }, {passive:true});
  menu.addEventListener('wheel', function(e){ e.stopPropagation(); }, {passive:true});
  window.addEventListener('resize', function(){ if(!menu.hidden) positionMenuForViewport(); });
  window.addEventListener('orientationchange', function(){ setTimeout(positionMenuForViewport,80); });

  var button=document.createElement('button');
  button.type='button';
  button.id='aceilVariantsMenuAction';
  button.className='rm-room-menu-action';
  button.innerHTML=
    '<svg viewBox="0 0 24 24" aria-hidden="true">'+
      '<path d="M20 7h-7M20 7l-3-3M20 7l-3 3M4 17h7M4 17l3-3M4 17l3 3"/>'+
      '<path d="M7 7a7 7 0 0 0 10 10"/>'+
    '</svg>'+
    '<span><b>Варіанти кошторису</b><small>Основний, економ і порівняння</small></span>';
  button.addEventListener('click', function(){
    try{
      var closeFn=window['closeA\u00B7CEILRoomMenu'];
      if(typeof closeFn==='function') closeFn();
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    openVariantsFromRoomScreen();
  });
  var separator=menu.querySelector('.rm-room-menu-separator');
  menu.insertBefore(button, separator || menu.firstChild);
  positionMenuForViewport();
}

window.A_CEIL_OpenEstimateVariants=openVariantsFromRoomScreen;
ensureVisibleVariantsMenuAction();
document.addEventListener('DOMContentLoaded', ensureVisibleVariantsMenuAction, {once:true});

/* Read-only nomenclature for an active estimate variant. It renders the
   computed clone directly into the existing modal and never swaps or saves
   the editor's real elemItems/elemGroups (Main stays untouched). */
function currentRoomForVariantProject(project){
  var rooms=project&&Array.isArray(project.rooms)?project.rooms:[];
  var rid=window._activeRoomId;
  var room=rooms.find(function(r){ return rid!=null&&r&&String(r.id)===String(rid); });
  if(room) return room;
  try{ if(typeof _activeRoomIdx!=='undefined'&&Number.isInteger(_activeRoomIdx)) return rooms[_activeRoomIdx]||null; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return rooms[0]||null;
}
function restoreNormalNomenclatureChrome(){
  var modal=document.getElementById('elementsModal'); if(!modal) return;
  var banner=modal.querySelector('.aceilv-nom-banner'); if(banner) banner.remove();
  modal.removeAttribute('data-aceilv-readonly');
  modal.querySelectorAll('[data-aceilv-hidden]').forEach(function(el){ el.style.display=el.getAttribute('data-aceilv-hidden')||''; el.removeAttribute('data-aceilv-hidden'); });
}
function renderActiveVariantNomenclature(){
  var project=findActiveProject(); if(!project) return;
  var activeId=ENGINE.getActiveId(project); if(activeId==null) return;
  var room=currentRoomForVariantProject(project); if(!room) return;
  var result=ENGINE.computeRoomItems(project,room,activeId), items=result.items||[], groups=result.groups||[];
  var variant=ENGINE.findVariant(project,activeId), modal=document.getElementById('elementsModal'), list=document.getElementById('elemList');
  if(!modal||!list) return;
  modal.setAttribute('data-aceilv-readonly','1');
  var banner=document.createElement('div'); banner.className='aceilv-nom-banner';
  banner.textContent='Перегляд варіанта «'+((variant&&variant.name)||'Варіант')+'» · редагування лише в Основному';
  var header=modal.firstElementChild&&modal.firstElementChild.firstElementChild;
  if(header&&header.parentNode) header.parentNode.insertBefore(banner,header.nextSibling); else modal.insertBefore(banner,list);
  var groupIds={}; groups.forEach(function(g){ groupIds[String(g&&g.id)]=true; });
  function rowsFor(groupId){ return items.filter(function(it){ return String(it&&it.groupId!=null?it.groupId:'')===String(groupId); }); }
  function rowHtml(it){
    var qty=num(it&&it.qty),price=num(it&&it.price),sum=qty*price;
    return '<div class="aceilv-ro-row"><div class="aceilv-ro-name">'+esc((it&&it.icon?it.icon+' ':'')+(it&&it.name||'Позиція'))+'</div><div class="aceilv-ro-qty">'+qty.toLocaleString('uk-UA')+' '+esc(it&&it.unit||'шт')+' × '+money(price)+'</div><div class="aceilv-ro-sum">'+(sum>0?money(sum):'—')+'</div></div>';
  }
  var html=groups.map(function(g){ var rows=rowsFor(g.id); return '<section class="aceilv-ro-group"><div class="aceilv-ro-head">📁 '+esc(g.name||'Група')+'</div>'+rows.map(rowHtml).join('')+'</section>'; }).join('');
  var other=items.filter(function(it){ return !groupIds[String(it&&it.groupId)]; });
  if(other.length) html+='<section class="aceilv-ro-group"><div class="aceilv-ro-head">📁 Інше</div>'+other.map(rowHtml).join('')+'</section>';
  list.innerHTML=html||'<div style="padding:24px;text-align:center;color:#94a3b8">Номенклатура порожня</div>';
  var total=items.reduce(function(s,it){ return s+num(it&&it.qty)*num(it&&it.price); },0), totalEl=document.getElementById('elemTotalValue');
  if(totalEl) totalEl.textContent=money(total);
  var gear=modal.querySelector('button[onclick*="toggleElemMenu"]');
  var editButtons=modal.querySelectorAll('#elemBottomBar button:not([onclick*="closeModal"])');
  var hide=[]; if(gear) hide.push(gear); editButtons.forEach(function(b){ hide.push(b); });
  hide.forEach(function(el){ el.setAttribute('data-aceilv-hidden',el.style.display||''); el.style.display='none'; });
}
var oldOpenElementsModal=window.openElementsModal;
if(typeof oldOpenElementsModal==='function'&&!oldOpenElementsModal.__aceilVariantReadonly){
  var openElementsVariantAware=function(){
    restoreNormalNomenclatureChrome();
    var out=oldOpenElementsModal.apply(this,arguments);
    var finish=function(){ setTimeout(renderActiveVariantNomenclature,0); };
    if(out&&typeof out.then==='function') return out.then(function(v){ finish(); return v; });
    finish(); return out;
  };
  openElementsVariantAware.__aceilVariantReadonly=true;
  window.openElementsModal=openElementsVariantAware;
  try{ openElementsModal=openElementsVariantAware; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* ---------------------------------------------------------------
   Bulk change modal
   --------------------------------------------------------------- */

var CAT_DEFS=[
  {key:'profile', label:'\u041F\u0440\u043E\u0444\u0456\u043B'},
  {key:'insert', label:'\u0412\u0441\u0442\u0430\u0432\u043A\u0430'},
  {key:'lighting', label:'\u041E\u0441\u0432\u0456\u0442\u043B\u0435\u043D\u043D\u044F'}
];

function ensureBulkModal(){
  var overlay=document.getElementById('aceilVarBulkModal');
  if(overlay) return overlay;
  overlay=document.createElement('div');
  overlay.id='aceilVarBulkModal';
  overlay.className='aceilv-modal-overlay';
  overlay.innerHTML =
    '<div class="aceilv-modal">'+
      '<h3>\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0434\u043B\u044F \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0443</h3>'+
      '<div class="aceilv-field"><label>\u041D\u0430\u0437\u0432\u0430 \u043D\u043E\u0432\u043E\u0433\u043E \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0430</label><input type="text" id="aceilvName" placeholder="\u041D\u0430\u043F\u0440. \u0415\u043A\u043E\u043D\u043E\u043C"></div>'+
      '<div class="aceilv-field"><label>\u041E\u0431\u043B\u0430\u0441\u0442\u044C \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u0432\u0430\u043D\u043D\u044F</label>'+
        '<div class="aceilv-mode-row" id="aceilvScopeRow">'+
          '<span class="aceilv-mode-btn active" data-scope="all">\u0423\u0441\u0456 \u043A\u0456\u043C\u043D\u0430\u0442\u0438</span>'+
          '<span class="aceilv-mode-btn" data-scope="rooms">\u041E\u0431\u0440\u0430\u043D\u0456 \u043A\u0456\u043C\u043D\u0430\u0442\u0438</span>'+
        '</div>'+
        '<div class="aceilv-room-list" id="aceilvRoomList" style="display:none"></div>'+
      '</div>'+
      '<div id="aceilvCats"></div>'+
      '<div id="aceilvFilmCat"></div>'+
      '<div class="aceilv-preview" id="aceilvPreview">\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u044F \u0441\u0443\u043C\u0430: \u2014</div>'+
      '<div id="aceilvNotes"></div>'+
      '<div class="aceilv-modal-btns">'+
        '<button type="button" class="aceilv-btn-secondary" id="aceilvCancel">\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button>'+
        '<button type="button" id="aceilvSubmit">\u2713 \u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u043D\u043E\u0432\u0438\u0439 \u0432\u0430\u0440\u0456\u0430\u043D\u0442</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#aceilvCancel').addEventListener('click', function(){ overlay.classList.remove('open'); });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.classList.remove('open'); });
  return overlay;
}

function itemOptionsHtml(items, selectedId){
  return items.map(function(it){
    var label=(it.icon?it.icon+' ':'')+(it.name||'?')+(num(it.price)>0?(' \u2014 '+money(it.price)):'');
    return '<option value="'+esc(it.id)+'"'+(String(it.id)===String(selectedId)?' selected':'')+'>'+esc(label)+'</option>';
  }).join('');
}
function num(v){ var n=parseFloat(v); return isFinite(n)?n:0; }

function openBulkModal(project, baseVariantId){
  var overlay=ensureBulkModal();
  var catalogItems=ENGINE.catalogItemsUnion(project);
  var cats=ENGINE.detectCategoryGroups(project);
  var rooms=project.rooms||[];

  document.getElementById('aceilvName').value='';
  var scopeRow=document.getElementById('aceilvScopeRow');
  var scopeState={mode:'all'};
  scopeRow.querySelectorAll('.aceilv-mode-btn').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-scope')===scopeState.mode);
  });
  var roomListEl=document.getElementById('aceilvRoomList');
  roomListEl.style.display='none';
  roomListEl.innerHTML = rooms.map(function(r){
    return '<label><input type="checkbox" class="aceilv-room-chk" value="'+esc(r.id)+'" checked> '+esc(r.name||'\u041A\u0456\u043C\u043D\u0430\u0442\u0430')+'</label>';
  }).join('');
  scopeRow.querySelectorAll('.aceilv-mode-btn').forEach(function(btn){
    btn.onclick=function(){
      scopeState.mode=btn.getAttribute('data-scope');
      scopeRow.querySelectorAll('.aceilv-mode-btn').forEach(function(b){ b.classList.toggle('active', b===btn); });
      roomListEl.style.display = scopeState.mode==='rooms' ? 'block' : 'none';
      updatePreview();
    };
  });

  var CAT_SOURCE_KEYS={
    profile:[cats.profileSourceKey||'main_profile'],
    insert:[cats.insertSourceKey||'white_insert'],
    lighting:cats.lightingSourceKeys||ENGINE.LIGHT_SOURCE_KEYS||[]
  };
  var CAT_FOUND={ profile:cats.profileFound, insert:cats.insertFound, lighting:cats.lightingFound };
  var CAT_NOT_FOUND_NOTE={
    profile:'\u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u044E \u0437 \u0434\u0436\u0435\u0440\u0435\u043B\u043E\u043C \u00ABmain_profile\u00BB \u2014 \u0437\u0430\u043C\u0456\u043D\u0438\u0442\u0438 \u0431\u0443\u0434\u0435 \u043D\u0435\u043C\u0430 \u0447\u043E\u0433\u043E',
    insert:'\u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0457 \u0432\u0441\u0442\u0430\u0432\u043A\u0438 (white_insert)',
    lighting:'\u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u0439 \u0437 \u0434\u0436\u0435\u0440\u0435\u043B\u043E\u043C \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u043E\u0432\u043D\u0435\u043D\u043D\u044F \u0441\u0432\u0456\u0442\u043B\u0430'
  };

  var catState={};
  var catsEl=document.getElementById('aceilvCats');
  catsEl.innerHTML = CAT_DEFS.map(function(def){
    var groupIds = cats[def.key] && cats[def.key].length ? cats[def.key] : null;
    var sourceKeys = CAT_SOURCE_KEYS[def.key]||[];
    var options = catalogItems.filter(function(it){
      var inGroup = groupIds && groupIds.indexOf(String(it.groupId||''))>=0;
      var hasSource = sourceKeys.indexOf(String(it.source||''))>=0;
      return inGroup || hasSource || !groupIds;
    });
    var showQty = def.key==='lighting';
    var found = CAT_FOUND[def.key];
    return '<div class="aceilv-cat" data-cat="'+def.key+'">'+
      '<div class="aceilv-cat-title">'+def.label+(found?'':' <span style="font-weight:600;color:#94a3b8;font-size:11px">('+CAT_NOT_FOUND_NOTE[def.key]+')</span>')+'</div>'+
      '<div class="aceilv-mode-row" data-mode-row>'+
        '<span class="aceilv-mode-btn active" data-mode="keep">\u041F\u043E\u0442\u043E\u0447\u043D\u0435</span>'+
        '<span class="aceilv-mode-btn" data-mode="item">\u0406\u043D\u0448\u0430 \u043F\u043E\u0437\u0438\u0446\u0456\u044F</span>'+
        (showQty?'<span class="aceilv-mode-btn" data-mode="qty">\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C</span>':'')+
        '<span class="aceilv-mode-btn" data-mode="remove">\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438</span>'+
      '</div>'+
      '<select class="aceilv-item-select" style="display:none">'+itemOptionsHtml(options,null)+'</select>'+
      (showQty?'<input type="number" class="aceilv-qty-input" min="0" step="1" placeholder="\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C" style="display:none;margin-top:8px">':'')+
    '</div>';
  }).join('');

  CAT_DEFS.forEach(function(def){
    catState[def.key]={mode:'keep', targetItemId:null, qty:0};
    var catEl=catsEl.querySelector('[data-cat="'+def.key+'"]');
    var sel=catEl.querySelector('.aceilv-item-select');
    var qtyInp=catEl.querySelector('.aceilv-qty-input');
    catEl.querySelectorAll('[data-mode]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var mode=btn.getAttribute('data-mode');
        catState[def.key].mode=mode;
        catEl.querySelectorAll('[data-mode]').forEach(function(b){ b.classList.toggle('active', b===btn); });
        sel.style.display = (mode==='item'||mode==='qty') ? 'block' : 'none';
        if(qtyInp) qtyInp.style.display = mode==='qty' ? 'block' : 'none';
        if(sel.value) catState[def.key].targetItemId=sel.value;
        updatePreview();
      });
    });
    sel.addEventListener('change', function(){ catState[def.key].targetItemId=sel.value; updatePreview(); });
    if(qtyInp) qtyInp.addEventListener('input', function(){ catState[def.key].qty=num(qtyInp.value); updatePreview(); });
  });

  /* ---- Film / canvas (plivka) block: series -> texture -> color, with
     search and popular codes, mirroring 167-aceil-color-picker.js's UX
     but reading the shared series registry so Classic/Kralton light up the
     moment real data is added to it - no separate color catalog here. */
  var filmState={mode:'keep', seriesId:null, code:null};
  var filmCatEl=document.getElementById('aceilvFilmCat');
  var filmSeriesList=ENGINE.filmSeriesRegistry();
  var filmActiveSeriesList=filmSeriesList.filter(function(s){ return s && s.active; });
  var filmInactiveSeriesList=filmSeriesList.filter(function(s){ return s && s.active===false; });
  filmCatEl.innerHTML =
    '<div class="aceilv-cat" data-cat="film">'+
      '<div class="aceilv-cat-title" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>\u041F\u043B\u0456\u0432\u043A\u0430 / \u043F\u043E\u043B\u043E\u0442\u043D\u043E'+(cats.filmFound?'':' <span style="font-weight:600;color:#94a3b8;font-size:11px">(\u0433\u0440\u0443\u043F\u0443 \u043F\u043B\u0456\u0432\u043A\u0438 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u2014 \u0431\u0443\u0434\u0435 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E \u043D\u043E\u0432\u0443)</span>')+'</span><button type="button" id="aceilvFilmPricesBtn" class="aceilv-btn-secondary" style="padding:7px 10px;font-size:11px;white-space:nowrap">\u270F\uFE0F \u0426\u0456\u043D\u0438</button></div>'+
      '<div class="aceilv-mode-row" data-mode-row>'+
        '<span class="aceilv-mode-btn active" data-mode="keep">\u0411\u0435\u0437 \u0437\u043C\u0456\u043D</span>'+
        '<span class="aceilv-mode-btn" data-mode="replace">\u0417\u0430\u043C\u0456\u043D\u0438\u0442\u0438 \u043F\u043B\u0456\u0432\u043A\u0443</span>'+
        '<span class="aceilv-mode-btn" data-mode="remove">\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438</span>'+
      '</div>'+
      '<div id="aceilvFilmPicker" style="display:none">'+
        '<label style="display:block;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:6px 0 5px">\u0421\u0435\u0440\u0456\u044F / \u0442\u0438\u043F</label>'+
        '<div class="aceilv-mode-row" id="aceilvFilmSeriesRow">'+
          filmActiveSeriesList.map(function(s){ return '<span class="aceilv-mode-btn" data-series="'+esc(s.id)+'">'+esc(s.name)+(s.manufacturer?(' <small style="opacity:.6">'+esc(s.manufacturer)+'</small>'):'')+'</span>'; }).join('')+
          filmInactiveSeriesList.map(function(s){ return '<span class="aceilv-mode-btn aceilv-film-series-disabled" title="\u041D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445 \u0443 \u043A\u0430\u0442\u0430\u043B\u043E\u0437\u0456">'+esc(s.name)+' (\u043D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445)</span>'; }).join('')+
        '</div>'+
        '<div id="aceilvFilmPriceEditor" style="display:none;margin:8px 0;padding:10px;border:1px solid #dbe4f0;border-radius:12px;background:#f8fafc"></div>'+
        '<div class="aceilv-field" style="margin:8px 0 0"><label>\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456</label><div class="aceilv-mode-row" id="aceilvFilmPopular"></div></div>'+
        '<div class="aceilv-field" style="margin-bottom:0"><label>\u041F\u043E\u0448\u0443\u043A</label><input id="aceilvFilmSearch" type="text" placeholder="\u041D\u0430\u043F\u0440. 402, \u0433\u043B\u044F\u043D\u0435\u0446\u044C, \u043C\u0430\u0442\u2026"></div>'+
        '<div class="aceilv-mode-row" id="aceilvFilmTextureRow" style="margin-top:8px"></div>'+
        '<div id="aceilvFilmGrid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-height:220px;overflow:auto;margin-top:6px"></div>'+
        '<div id="aceilvFilmInfo" style="margin-top:8px;font-size:12px;font-weight:700;color:#475569;display:flex;flex-direction:column;gap:2px"></div>'+
      '</div>'+
    '</div>';

  var filmModeButtons=filmCatEl.querySelectorAll('[data-mode]');
  var filmPickerEl=document.getElementById('aceilvFilmPicker');
  filmModeButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      filmState.mode=btn.getAttribute('data-mode');
      if(filmState.mode==='replace' && !filmState.code){
        var firstFilm=filmState.seriesId && ENGINE.filmCatalogForSeries(filmState.seriesId)[0];
        if(firstFilm){ filmState.code=firstFilm.code; filmActiveTexture=firstFilm.texture; renderFilmPopular(); renderFilmTextures(); renderFilmGrid(); }
      }
      filmModeButtons.forEach(function(b){ b.classList.toggle('active', b===btn); });
      filmPickerEl.style.display = filmState.mode==='replace' ? 'block' : 'none';
      updatePreview();
    });
  });

  var filmSeriesRow=document.getElementById('aceilvFilmSeriesRow');
  var filmTextureRow=document.getElementById('aceilvFilmTextureRow');
  var filmGrid=document.getElementById('aceilvFilmGrid');
  var filmSearchInp=document.getElementById('aceilvFilmSearch');
  var filmPopularEl=document.getElementById('aceilvFilmPopular');
  var filmPriceEditor=document.getElementById('aceilvFilmPriceEditor');
  var filmActiveTexture='';

  function filmColorsForCurrentSeries(){ return filmState.seriesId ? ENGINE.filmCatalogForSeries(filmState.seriesId) : []; }
  function renderFilmPriceEditor(){
    if(!filmState.seriesId){ filmPriceEditor.innerHTML=''; return; }
    var colors=filmColorsForCurrentSeries(),selected=colors.find(function(c){return c.code===filmState.code;});
    if(selected&&selected.texture==='fabric')colors=[selected];
    var textures=[]; colors.forEach(function(c){ if(c&&textures.indexOf(c.texture)<0) textures.push(c.texture); });
    var pricing=ENGINE.filmPricingForSeries(filmState.seriesId);
    var keys=[];
    colors.forEach(function(c){ ENGINE.filmWidthCandidates(c).forEach(function(w){ if(!keys.some(function(x){return x.priceKey===w.priceKey;})) keys.push(w); }); });
    keys.sort(function(a,b){return a.max-b.max;});
    var rows='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(74px,1fr));gap:6px;margin-bottom:9px">'+keys.map(function(w){
      var value=0; for(var i=0;i<textures.length;i++){ value=num(pricing[textures[i]]&&pricing[textures[i]][w.priceKey]); if(value>0) break; }
      return '<label style="font-size:10px;font-weight:800;color:#64748b">до '+esc(String(w.max))+' м<input type="number" min="0" step="1" value="'+value+'" data-price-key="'+esc(w.priceKey)+'" style="width:100%;margin-top:3px;padding:8px;border:1px solid #cbd5e1;border-radius:9px;font-weight:800"> грн/м\u00B2</label>';
    }).join('')+'</div>';
    filmPriceEditor.innerHTML='<div style="font-size:12px;font-weight:900;margin-bottom:8px">\u0426\u0456\u043D\u0438 '+esc((ENGINE.filmSeriesRegistry().find(function(s){return s.id===filmState.seriesId;})||{}).name||filmState.seriesId)+'</div>'+rows+'<button type="button" id="aceilvFilmPricesSave" style="width:100%;padding:9px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:900">\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0446\u0456\u043D\u0438</button><div style="font-size:10px;color:#64748b;margin-top:6px">\u0417\u0431\u0435\u0440\u0456\u0433\u0430\u044E\u0442\u044C\u0441\u044F \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457.</div>';
    var saveBtn=document.getElementById('aceilvFilmPricesSave');
    if(saveBtn) saveBtn.onclick=function(){
      var next=JSON.parse(JSON.stringify(ENGINE.filmPricingForSeries(filmState.seriesId)));
      textures.forEach(function(t){ next[t]=next[t]||{}; });
      filmPriceEditor.querySelectorAll('[data-price-key]').forEach(function(inp){
        var k=inp.getAttribute('data-price-key'),value=Math.max(0,num(inp.value));
        textures.forEach(function(t){ next[t][k]=value; });
      });
      if(typeof window.ACEILSetFilmPricing==='function') window.ACEILSetFilmPricing(filmState.seriesId,next);
      toast('\u2713 \u0426\u0456\u043D\u0438 \u043F\u043B\u0456\u0432\u043A\u0438 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E');
      filmPriceEditor.style.display='none'; updatePreview();
    };
  }
  document.getElementById('aceilvFilmPricesBtn').addEventListener('click',function(){
    var opening=filmPriceEditor.style.display==='none';
    renderFilmPriceEditor();
    filmPriceEditor.style.display=opening?'block':'none';
    if(opening) filmPickerEl.style.display='block';
    else if(filmState.mode!=='replace') filmPickerEl.style.display='none';
  });
  function filmPopularCodes(){
    try{
      var saved=JSON.parse(localStorage.getItem('aceil_film_popular_codes_v1')||'null');
      if(Array.isArray(saved) && saved.length) return saved;
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return Array.isArray(window.ACEIL_POPULAR_CODES) ? window.ACEIL_POPULAR_CODES : [];
  }
  function filmChipHtml(c){
    var marks=ENGINE.filmWidthCandidates(c).map(function(w){return Math.round(w.max*100);});
    var title=c.colorName?(' title="'+esc(c.colorName)+'"'):'';
    return '<button type="button" class="aceilv-mode-btn aceilv-film-chip'+(c.code===filmState.code?' active':'')+'" data-code="'+esc(c.code)+'"'+title+'>'+esc(c.displayCode||c.code)+(c.colorName?('<small style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.colorName)+'</small>'):'')+'<small>'+marks.join('/')+'</small></button>';
  }
  function bindFilmChips(host){
    host.querySelectorAll('[data-code]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var code=btn.getAttribute('data-code');
        var entry=filmColorsForCurrentSeries().find(function(c){ return c.code===code; });
        filmState.code=code;
        if(entry) filmActiveTexture=entry.texture;
        renderFilmPopular(); renderFilmTextures(); renderFilmGrid();
        updatePreview();
      });
    });
  }
  function renderFilmPopular(){
    var colors=filmColorsForCurrentSeries();
    var codes=filmPopularCodes().filter(function(code){ return colors.some(function(c){ return c.code===code; }); });
    if(!codes.length){ filmPopularEl.innerHTML='<span style="font-size:11px;color:#94a3b8;font-weight:700">\u043D\u0435\u043C\u0430\u0454</span>'; return; }
    filmPopularEl.innerHTML=codes.map(function(code){
      var c=colors.find(function(x){ return x.code===code; });
      return c ? filmChipHtml(c) : '';
    }).join('');
    bindFilmChips(filmPopularEl);
  }
  function renderFilmTextures(){
    var colors=filmColorsForCurrentSeries();
    var textures=[]; colors.forEach(function(c){ if(c && textures.indexOf(c.texture)<0) textures.push(c.texture); });
    var labels=ENGINE.filmTextureLabels();
    filmTextureRow.innerHTML=textures.map(function(t){
      return '<span class="aceilv-mode-btn'+(t===filmActiveTexture?' active':'')+'" data-texture="'+esc(t)+'">'+esc(labels[t]||t)+'</span>';
    }).join('');
    filmTextureRow.querySelectorAll('[data-texture]').forEach(function(btn){
      btn.addEventListener('click', function(){
        filmActiveTexture=btn.getAttribute('data-texture');
        var firstOfTexture=colors.find(function(c){return c.texture===filmActiveTexture;});
        if(firstOfTexture) filmState.code=firstOfTexture.code;
        filmSearchInp.value='';
        filmTextureRow.querySelectorAll('[data-texture]').forEach(function(b){ b.classList.toggle('active', b===btn); });
        renderFilmGrid();
        renderFilmPopular();
        updatePreview();
      });
    });
  }
  function renderFilmGrid(){
    var colors=filmColorsForCurrentSeries();
    var q=(filmSearchInp.value||'').trim().toLowerCase();
    var list;
    if(q) list=colors.filter(function(c){ return c.code.toLowerCase().indexOf(q)>=0 || String(c.displayCode||'').toLowerCase().indexOf(q)>=0 || String(c.colorName||'').toLowerCase().indexOf(q)>=0; });
    else if(filmActiveTexture) list=colors.filter(function(c){ return c.texture===filmActiveTexture; });
    else list=[];
    if(!list.length){
      filmGrid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px;padding:10px">'+(q?'\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E':'\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0444\u0430\u043A\u0442\u0443\u0440\u0443 \u0430\u0431\u043E \u0441\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435\u0441\u044C \u043F\u043E\u0448\u0443\u043A\u043E\u043C')+'</div>';
      return;
    }
    filmGrid.innerHTML=list.map(filmChipHtml).join('');
    bindFilmChips(filmGrid);
  }
  filmSearchInp.addEventListener('input', function(){
    filmActiveTexture='';
    filmTextureRow.querySelectorAll('[data-texture]').forEach(function(b){ b.classList.remove('active'); });
    renderFilmGrid();
  });
  filmSeriesRow.querySelectorAll('[data-series]').forEach(function(btn){
    btn.addEventListener('click', function(){
      filmState.seriesId=btn.getAttribute('data-series');
      var firstSeriesColor=ENGINE.filmCatalogForSeries(filmState.seriesId)[0]||null;
      filmState.code=firstSeriesColor?firstSeriesColor.code:null;
      filmActiveTexture=firstSeriesColor?firstSeriesColor.texture:''; filmSearchInp.value='';
      filmPriceEditor.style.display='none';
      if(filmState.mode!=='replace') filmPickerEl.style.display='none';
      filmSeriesRow.querySelectorAll('[data-series]').forEach(function(b){ b.classList.toggle('active', b===btn); });
      renderFilmPopular(); renderFilmTextures(); renderFilmGrid();
      updatePreview();
    });
  });
  if(filmActiveSeriesList.length){
    filmState.seriesId=filmActiveSeriesList[0].id;
    var firstSeriesBtn=filmSeriesRow.querySelector('[data-series="'+filmActiveSeriesList[0].id+'"]');
    if(firstSeriesBtn) firstSeriesBtn.classList.add('active');
    renderFilmPopular(); renderFilmTextures();
  }

  function currentScopeIds(){
    if(scopeState.mode==='all') return rooms.map(function(r){ return r.id; });
    return Array.from(roomListEl.querySelectorAll('.aceilv-room-chk:checked')).map(function(c){ return c.value; });
  }
  function buildOptsForPreview(){
    var changes={};
    CAT_DEFS.forEach(function(def){ changes[def.key]=Object.assign({}, catState[def.key]); });
    changes.film = filmState.mode==='keep' ? {mode:'keep'}
      : filmState.mode==='remove' ? {mode:'remove'}
      : {mode:'replace', seriesId:filmState.seriesId, code:filmState.code};
    return {
      scope: scopeState.mode==='all' ? 'all' : 'rooms',
      roomIds: currentScopeIds(),
      baseVariantId: baseVariantId,
      categoryGroups: cats,
      changes: changes
    };
  }
  function updatePreview(){
    try{
      var opts=buildOptsForPreview();
      var probe=ENGINE.clone(project);
      var res=ENGINE.createVariant(probe, Object.assign({}, opts, {name:'__preview__'}));
      var breakdown=ENGINE.computeProjectBreakdown(probe, res.variant.id);
      document.getElementById('aceilvPreview').textContent='\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u044F \u0441\u0443\u043C\u0430: '+money(breakdown.grandTotal);
      var allNotes=res.assumptions.slice();
      var filmInfoEl=document.getElementById('aceilvFilmInfo');
      if(opts.changes.film.mode==='replace'){
        var filmBd=ENGINE.computeFilmBreakdown(probe, res.variant.id);
        allNotes=allNotes.concat(filmBd.warnings);
        if(filmInfoEl){
          var lines=filmBd.rooms.filter(function(r){ return !!r.info; }).map(function(r){
            return (r.room && r.room.name || '')+': '+r.info.code+' '+r.info.widthM+'\u043C \u00B7 '+money(r.info.pricePerM2)+'/\u043C\u00B2 \u00B7 '+r.info.areaM2.toFixed(2)+' \u043C\u00B2 = '+money(r.info.total);
          });
          filmInfoEl.innerHTML=lines.map(function(l){ return '<div>'+esc(l)+'</div>'; }).join('');
        }
      }else if(filmInfoEl){
        filmInfoEl.innerHTML='';
      }
      allNotes=allNotes.filter(function(v,i,a){return v&&a.indexOf(v)===i;});
      var notesEl=document.getElementById('aceilvNotes');
      notesEl.innerHTML = allNotes.length ? allNotes.map(function(a){ return '<div class="aceilv-note">'+esc(a)+'</div>'; }).join('') : '';
    }catch(e){
      document.getElementById('aceilvPreview').textContent='\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u044F \u0441\u0443\u043C\u0430: \u2014';
    }
  }
  roomListEl.querySelectorAll('.aceilv-room-chk').forEach(function(chk){ chk.addEventListener('change', updatePreview); });
  updatePreview();

  var submitBtn=document.getElementById('aceilvSubmit');
  submitBtn.onclick=function(){
    var opts=buildOptsForPreview();
    opts.name=document.getElementById('aceilvName').value;
    if(!opts.roomIds.length){ toast('\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0445\u043E\u0447\u0430 \u0431 \u043E\u0434\u043D\u0443 \u043A\u0456\u043C\u043D\u0430\u0442\u0443'); return; }
    if(opts.changes.film.mode==='replace' && !opts.changes.film.code){ toast('\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u043A\u043E\u043B\u0456\u0440 \u043F\u043B\u0456\u0432\u043A\u0438'); return; }
    if(opts.changes.film.mode==='replace'){
      var priceEntry=ENGINE.filmCatalogForSeries(opts.changes.film.seriesId).find(function(c){return c.code===opts.changes.film.code;});
      var texturePrices=ENGINE.filmPricingForSeries(opts.changes.film.seriesId)[priceEntry&&priceEntry.texture]||{};
      var missingPrice=!priceEntry || ENGINE.filmWidthCandidates(priceEntry).some(function(w){return !(num(texturePrices[w.priceKey])>0);});
      if(missingPrice){ toast('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u0446\u0456\u043D\u0438 \u0434\u043B\u044F \u0446\u0456\u0454\u0457 \u043F\u043B\u0456\u0432\u043A\u0438'); return; }
    }
    var hasChange=CAT_DEFS.some(function(def){ return opts.changes[def.key].mode!=='keep'; }) || opts.changes.film.mode!=='keep';
    if(!hasChange){ toast('\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0445\u043E\u0447\u0430 \u043E\u0434\u043D\u0443 \u0437\u043C\u0456\u043D\u0443'); return; }
    var proj=findActiveProject(); if(!proj) return;
    var result=ENGINE.createVariant(proj, opts);
    ENGINE.persistProject(proj);
    overlay.classList.remove('open');
    toast('\u2713 \u0412\u0430\u0440\u0456\u0430\u043D\u0442 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E');
    renderVariantBar(proj);
    if(result.assumptions.length){
      result.assumptions.forEach(function(a){ toast(a); });
    }
  };

  overlay.classList.add('open');
}

/* ---------------------------------------------------------------
   Compare modal
   --------------------------------------------------------------- */

function ensureCompareModal(){
  var overlay=document.getElementById('aceilVarCompareModal');
  if(overlay) return overlay;
  overlay=document.createElement('div');
  overlay.id='aceilVarCompareModal';
  overlay.className='aceilv-modal-overlay';
  overlay.innerHTML =
    '<div class="aceilv-modal">'+
      '<h3>\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u043D\u043D\u044F \u0437 \u041E\u0441\u043D\u043E\u0432\u043D\u0438\u043C</h3>'+
      '<div class="aceilv-field"><label>\u0412\u0430\u0440\u0456\u0430\u043D\u0442</label><select id="aceilvCmpSelect"></select></div>'+
      '<div id="aceilvCmpTableWrap"></div>'+
      '<div id="aceilvCmpLink" hidden></div>'+
      '<div class="aceilv-modal-btns">'+
        '<button type="button" id="aceilvCmpPublish">\uD83D\uDD17 \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0443</button>'+
        '<button type="button" id="aceilvCmpReport">\uD83D\uDCE4 \u0417\u0432\u0456\u0442 / \u043F\u043E\u0434\u0456\u043B\u0438\u0442\u0438\u0441\u044F</button>'+
        '<button type="button" class="aceilv-btn-secondary" id="aceilvCmpClose">\u0417\u0430\u043A\u0440\u0438\u0442\u0438</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#aceilvCmpClose').addEventListener('click', function(){ overlay.classList.remove('open'); });
  overlay.querySelector('#aceilvCmpPublish').addEventListener('click', function(){
    var project=overlay._aceilCompareProject;
    var select=document.getElementById('aceilvCmpSelect');
    if(project && select && select.value) publishComparisonLink(project, select.value, this);
  });
  overlay.querySelector('#aceilvCmpReport').addEventListener('click', function(){
    var project=overlay._aceilCompareProject;
    var select=document.getElementById('aceilvCmpSelect');
    if(project && select && select.value) generateComparisonReport(project, select.value);
  });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.classList.remove('open'); });
  return overlay;
}

function reportMoney(v){
  return Math.round(num(v)).toLocaleString('uk-UA')+' \u20B4';
}

function reportRoundRect(ctx,x,y,w,h,r,fill,stroke){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  if(fill){ ctx.fillStyle=fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=1.5; ctx.stroke(); }
}

function reportFitText(ctx,text,maxWidth){
  text=String(text||'');
  if(ctx.measureText(text).width<=maxWidth) return text;
  while(text.length>2 && ctx.measureText(text+'…').width>maxWidth) text=text.slice(0,-1);
  return text+'…';
}

function reportRoomState(room){
  var st=room&&room.state;
  if(typeof st==='string') try{ st=JSON.parse(st); }catch(_){ st={}; }
  return st&&typeof st==='object' ? st : {};
}

function drawComparisonRoomSketch(c,room,x,y,w,h){
  var st=reportRoomState(room), pts=Array.isArray(st.pts)?st.pts.filter(function(p){
    return p&&isFinite(Number(p.x))&&isFinite(Number(p.y));
  }):[];
  reportRoundRect(c,x,y,w,h,18,'#ffffff','#dbeafe');
  c.fillStyle='#0f172a'; c.font='900 19px Arial';
  c.fillText(reportFitText(c,(room&&room.name)||'Кімната',w-38),x+18,y+29);
  var area=room&&room.area!=null?room.area:st.area, per=room&&room.per!=null?room.per:st.per;
  var sub=[]; if(area!=null&&area!=='') sub.push(area+' м²'); if(per!=null&&per!=='') sub.push(per+' м');
  c.fillStyle='#64748b'; c.font='700 13px Arial'; c.fillText(sub.join('  •  '),x+18,y+50);
  var bx=x+20,by=y+64,bw=w-40,bh=h-82;
  c.fillStyle='#f8fafc'; c.fillRect(bx,by,bw,bh);
  if(st.circleMode){
    var radius=Math.min(bw,bh)*0.36,cx=bx+bw/2,cy=by+bh/2;
    c.strokeStyle='#172554'; c.lineWidth=3; c.beginPath(); c.arc(cx,cy,radius,0,Math.PI*2); c.stroke();
    var diam=Number(st.circleDiamCm)||0;
    if(diam){ c.fillStyle='#475569'; c.font='800 12px Arial'; c.textAlign='center'; c.fillText('Ø '+Math.round(diam)+' см',cx,cy+4); c.textAlign='left'; }
    return;
  }
  if(pts.length<3){
    c.fillStyle='#94a3b8'; c.font='700 15px Arial'; c.textAlign='center'; c.fillText('Ескіз не збережено',bx+bw/2,by+bh/2); c.textAlign='left';
    return;
  }
  var xs=pts.map(function(p){return Number(p.x);}),ys=pts.map(function(p){return Number(p.y);});
  var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
  var pad=34,scale=Math.min((bw-pad*2)/Math.max(1,maxX-minX),(bh-pad*2)/Math.max(1,maxY-minY));
  var ox=bx+(bw-(maxX-minX)*scale)/2-minX*scale,oy=by+(bh-(maxY-minY)*scale)/2-minY*scale;
  function px(v){return Number(v)*scale+ox;} function py(v){return Number(v)*scale+oy;}
  c.fillStyle='#ffffff'; c.strokeStyle='#172554'; c.lineWidth=3; c.lineJoin='round'; c.beginPath();
  pts.forEach(function(p,i){ if(i)c.lineTo(px(p.x),py(p.y)); else c.moveTo(px(p.x),py(p.y)); }); c.closePath(); c.fill(); c.stroke();
  var lens=Array.isArray(st.lengths)?st.lengths:[];
  pts.forEach(function(p,i){
    var q=pts[(i+1)%pts.length],mx=(px(p.x)+px(q.x))/2,my=(py(p.y)+py(q.y))/2,len=Number(lens[i])||0;
    if(len){ c.fillStyle='rgba(255,255,255,.94)'; reportRoundRect(c,mx-28,my-10,56,20,7,'rgba(255,255,255,.94)','#cbd5e1'); c.fillStyle='#475569'; c.font='800 10px Arial'; c.textAlign='center'; c.fillText(Math.round(len)+' см',mx,my+4); }
    c.fillStyle='#2563eb'; c.font='900 11px Arial'; c.textAlign='center'; c.fillText(String.fromCharCode(65+i),px(p.x),py(p.y)-10);
  }); c.textAlign='left';
  (Array.isArray(st.wallMarks)?st.wallMarks:[]).forEach(function(m,i){
    var si=Math.max(0,Math.min(pts.length-1,Number(m&&m.sideIndex)||0)),a=pts[si],b=pts[(si+1)%pts.length]; if(!a||!b)return;
    var side=Number(lens[si])||Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y))||1;
    var allowOverhang=/карниз/i.test(String(m.type||'')),offset=Number(m.offsetCm)||0,markLen=Number(m.lenCm)||side;
    var t1=allowOverhang?offset/side:Math.max(0,Math.min(1,offset/side));
    var t2=allowOverhang?(offset+markLen)/side:Math.max(t1,Math.min(1,(offset+markLen)/side));
    c.strokeStyle=m.color||['#f97316','#7c3aed','#16a34a','#dc2626'][i%4]; c.lineWidth=6; c.lineCap='round'; c.beginPath();
    c.moveTo(px(Number(a.x)+(Number(b.x)-Number(a.x))*t1),py(Number(a.y)+(Number(b.y)-Number(a.y))*t1));
    c.lineTo(px(Number(a.x)+(Number(b.x)-Number(a.x))*t2),py(Number(a.y)+(Number(b.y)-Number(a.y))*t2)); c.stroke();
  });
  (Array.isArray(st.lightMarks)?st.lightMarks:[]).forEach(function(m){
    if(!m||!isFinite(Number(m.x))||!isFinite(Number(m.y)))return; var lx=px(m.x),ly=py(m.y),type=String(m.type||'').toLowerCase();
    c.fillStyle=/vent|exhaust/.test(type)?'#ecfeff':'#fef3c7'; c.strokeStyle=/vent|exhaust/.test(type)?'#0891b2':'#d69e00'; c.lineWidth=2;
    c.beginPath(); c.arc(lx,ly,6,0,Math.PI*2); c.fill(); c.stroke();
  });
}

function reportWrapLines(c,text,maxWidth){
  var words=String(text||'').split(/\s+/).filter(Boolean),lines=[],cur='';
  words.forEach(function(w){
    var test=cur?cur+' '+w:w;
    if(c.measureText(test).width>maxWidth && cur){ lines.push(cur); cur=w; } else cur=test;
  });
  if(cur) lines.push(cur);
  return lines;
}
function reportSigned(v){
  var n=Math.round(num(v));
  if(n===0) return '0 ₴';
  return (n>0?'+':'−')+Math.abs(n).toLocaleString('uk-UA')+' ₴';
}

/* Plain-language data behind the comparison: used by both the modal table and
   the client report so the two can never disagree. */
function comparisonModel(project,variantId){
  var mainBd=ENGINE.computeProjectBreakdown(project,null);
  var varBd=ENGINE.computeProjectBreakdown(project,variantId);
  var variant=ENGINE.findVariant(project,variantId);
  var names=[],seen={};
  mainBd.categories.concat(varBd.categories).forEach(function(row){
    if(!seen[row.name]){ seen[row.name]=true; names.push(row.name); }
  });
  function totalOf(bd,name){
    var found=bd.categories.find(function(row){ return row.name===name; });
    return found ? found.total : 0;
  }
  var rows=names.map(function(name){
    var m=totalOf(mainBd,name), v=totalOf(varBd,name);
    return {name:name,main:m,variant:v,diff:v-m};
  });
  var changed=rows.filter(function(r){ return Math.abs(r.diff)>=0.5; });
  var same=rows.filter(function(r){ return Math.abs(r.diff)<0.5 && (r.main>0||r.variant>0); });
  var diff=varBd.grandTotal-mainBd.grandTotal;
  return {
    mainBd:mainBd, varBd:varBd,
    variantName:(variant&&variant.name)?variant.name:'Варіант',
    rows:rows, changed:changed, same:same,
    sameTotal:same.reduce(function(s,r){ return s+r.main; },0),
    mainTotal:mainBd.grandTotal, varTotal:varBd.grandTotal,
    diff:diff,
    percent: mainBd.grandTotal>0 ? Math.abs(diff)/mainBd.grandTotal*100 : 0
  };
}
function comparisonVerdict(model){
  var amount=reportMoney(Math.abs(model.diff));
  if(Math.abs(model.diff)<0.5) return 'Варіанти коштують однаково';
  var pct=model.percent>=1 ? ' ('+Math.round(model.percent)+'%)' : '';
  return model.diff<0
    ? 'Варіант 2 дешевший на '+amount+pct
    : 'Варіант 2 дорожчий на '+amount+pct;
}

function buildComparisonReportCanvas(project,variantId){
  var model=comparisonModel(project,variantId);
  var mainFilmBd=ENGINE.computeFilmBreakdown(project,null);
  var varFilmBd=ENGINE.computeFilmBreakdown(project,variantId);
  var rooms=project.rooms||[];
  var nameV=model.variantName;

  function paint(c,withSketches){
    var W=1080,y=0;
    var grad=c.createLinearGradient(0,0,W,150);
    grad.addColorStop(0,'#0f172a'); grad.addColorStop(1,'#2563eb');
    c.fillStyle=grad; c.fillRect(0,0,W,150);
    reportRoundRect(c,42,32,78,78,20,'#ffffff');
    c.fillStyle='#2563eb'; c.font='900 48px Arial'; c.textAlign='center'; c.fillText('A',81,88);
    c.textAlign='left'; c.fillStyle='#ffffff'; c.font='900 30px Arial'; c.fillText('A·CEIL',144,68);
    c.fillStyle='#bfdbfe'; c.font='700 18px Arial'; c.fillText('Порівняння двох варіантів кошторису',144,100);

    y=198;
    c.fillStyle='#0f172a'; c.font='900 34px Arial';
    c.fillText(reportFitText(c,project.name||'Проєкт',960),48,y);
    y+=31;
    var meta=[project.addr,project.phone].filter(Boolean).join('  •  ');
    if(meta){ c.fillStyle='#64748b'; c.font='600 17px Arial'; c.fillText(reportFitText(c,meta,970),48,y); y+=26; }

    c.font='600 18px Arial'; c.fillStyle='#334155';
    reportWrapLines(c,'Ми підготували два варіанти робіт на одному і тому ж обʼєкті. Роботи, які не змінюються, однакові в обох. Нижче — лише те, що відрізняється.',984).forEach(function(line){ y+=26; c.fillText(line,48,y); });
    y+=30;

    // two total cards
    reportRoundRect(c,48,y,476,130,20,'#ffffff','#bfdbfe');
    reportRoundRect(c,556,y,476,130,20,'#ffffff','#bbf7d0');
    c.fillStyle='#2563eb'; c.font='900 15px Arial'; c.fillText('ВАРІАНТ 1',72,y+32);
    c.fillStyle='#16a34a'; c.fillText('ВАРІАНТ 2',580,y+32);
    c.fillStyle='#0f172a'; c.font='800 19px Arial';
    c.fillText(reportFitText(c,'Основний',420),72,y+60);
    c.fillText(reportFitText(c,nameV,420),580,y+60);
    c.font='900 36px Arial'; c.fillStyle='#1e3a8a'; c.fillText(reportMoney(model.mainTotal),72,y+108);
    c.fillStyle='#166534'; c.fillText(reportMoney(model.varTotal),580,y+108);
    y+=150;

    var good=model.diff<-0.5, equal=Math.abs(model.diff)<0.5;
    reportRoundRect(c,48,y,984,70,18,equal?'#f1f5f9':(good?'#dcfce7':'#ffedd5'),equal?'#cbd5e1':(good?'#86efac':'#fdba74'));
    c.fillStyle=equal?'#334155':(good?'#166534':'#9a3412'); c.font='900 25px Arial'; c.textAlign='center';
    c.fillText(comparisonVerdict(model),540,y+44); c.textAlign='left';
    y+=118;

    // what differs
    c.fillStyle='#0f172a'; c.font='900 24px Arial'; c.fillText('Що відрізняється',48,y); y+=22;
    function head(first){
      reportRoundRect(c,48,y,984,44,12,'#e2e8f0');
      c.fillStyle='#475569'; c.font='800 13px Arial'; c.fillText(first,68,y+28); c.textAlign='right';
      c.fillText('ВАРІАНТ 1',590,y+28); c.fillText('ВАРІАНТ 2',790,y+28); c.fillText('РІЗНИЦЯ',1012,y+28); c.textAlign='left'; y+=48;
    }
    head('ПОЗИЦІЯ');
    if(!model.changed.length){
      c.fillStyle='#64748b'; c.font='700 17px Arial'; c.fillText('У сумах позицій різниці немає.',68,y+30); y+=48;
    }
    model.changed.forEach(function(r,i){
      if(i%2===0){ c.fillStyle='#ffffff'; c.fillRect(48,y,984,54); }
      c.fillStyle='#334155'; c.font='700 18px Arial'; c.fillText(reportFitText(c,r.name,320),68,y+34);
      c.textAlign='right'; c.font='800 18px Arial';
      c.fillStyle='#1e3a8a'; c.fillText(reportMoney(r.main),590,y+34);
      c.fillStyle='#166534'; c.fillText(reportMoney(r.variant),790,y+34);
      c.fillStyle=r.diff<0?'#15803d':'#c2410c'; c.fillText(reportSigned(r.diff),1012,y+34);
      c.textAlign='left'; y+=54;
    });

    // film per room
    var filmRooms=rooms.filter(function(room,i){
      return (mainFilmBd.rooms[i]&&mainFilmBd.rooms[i].info)||(varFilmBd.rooms[i]&&varFilmBd.rooms[i].info);
    });
    if(filmRooms.length){
      y+=34; c.fillStyle='#0f172a'; c.font='900 22px Arial'; c.fillText('Полотно по кімнатах',48,y); y+=20;
      function filmText(info){ return info ? (info.seriesName+' '+info.code+' · '+(info.textureLabel?info.textureLabel+' · ':'')+info.widthM+' м · '+info.areaM2.toFixed(1)+' м²') : '—'; }
      rooms.forEach(function(room,i){
        var mInfo=mainFilmBd.rooms[i]&&mainFilmBd.rooms[i].info, vInfo=varFilmBd.rooms[i]&&varFilmBd.rooms[i].info;
        if(!mInfo&&!vInfo) return;
        reportRoundRect(c,48,y,984,104,16,'#ffffff','#e2e8f0');
        c.fillStyle='#0f172a'; c.font='800 18px Arial'; c.fillText(reportFitText(c,room.name||('Кімната '+(i+1)),900),68,y+30);
        c.font='700 15px Arial';
        c.fillStyle='#2563eb'; c.fillText('Варіант 1',68,y+60); c.fillStyle='#334155'; c.fillText(reportFitText(c,filmText(mInfo),600),170,y+60);
        c.fillStyle='#16a34a'; c.fillText('Варіант 2',68,y+86); c.fillStyle='#334155'; c.fillText(reportFitText(c,filmText(vInfo),600),170,y+86);
        c.textAlign='right'; c.font='800 16px Arial';
        c.fillStyle='#1e3a8a'; c.fillText(reportMoney(mInfo?mInfo.total:0),1012,y+60);
        c.fillStyle='#166534'; c.fillText(reportMoney(vInfo?vInfo.total:0),1012,y+86); c.textAlign='left';
        y+=116;
      });
      if(varFilmBd.warnings.length){
        c.font='700 14px Arial'; c.fillStyle='#c2410c';
        varFilmBd.warnings.forEach(function(w){ c.fillText(reportFitText(c,'⚠ '+w,940),68,y+14); y+=24; });
      }
    }

    // unchanged work
    if(model.same.length){
      y+=34;
      c.font='700 16px Arial';
      var sameText='Без змін в обох варіантах: '+model.same.map(function(r){ return r.name; }).join(', ')+' — разом '+reportMoney(model.sameTotal)+'.';
      var lines=reportWrapLines(c,sameText,930);
      var h=34+lines.length*24;
      reportRoundRect(c,48,y,984,h,16,'#f8fafc','#e2e8f0');
      c.fillStyle='#475569';
      lines.forEach(function(line,i){ c.fillText(line,68,y+32+i*24); });
      y+=h;
    }

    // totals
    y+=34;
    reportRoundRect(c,48,y,984,70,16,'#0f172a');
    c.fillStyle='#ffffff'; c.font='900 22px Arial'; c.fillText('Разом',72,y+44);
    c.textAlign='right'; c.font='900 24px Arial'; c.fillText(reportMoney(model.mainTotal),590,y+44); c.fillText(reportMoney(model.varTotal),790,y+44);
    c.fillStyle=model.diff<0?'#86efac':(model.diff>0?'#fdba74':'#cbd5e1'); c.fillText(reportSigned(model.diff),1012,y+44); c.textAlign='left';
    y+=70;

    if(withSketches && rooms.length){
      y+=44; c.fillStyle='#0f172a'; c.font='900 24px Arial'; c.fillText('Ескізи кімнат',48,y); y+=22;
      rooms.forEach(function(room,i){
        drawComparisonRoomSketch(c,room,48+(i%2)*508,y+Math.floor(i/2)*300,476,276);
      });
    } else if(!withSketches && rooms.length){
      y+=44+22+Math.ceil(rooms.length/2)*300;
    }
    y+=66;
    return y;
  }

  var probe=document.createElement('canvas'); probe.width=1080; probe.height=10;
  var height=Math.max(900,Math.ceil(paint(probe.getContext('2d'),false)));
  var canvas=document.createElement('canvas');
  canvas.width=1080; canvas.height=height;
  var c=canvas.getContext('2d');
  c.fillStyle='#f8fafc'; c.fillRect(0,0,canvas.width,canvas.height);
  paint(c,true);
  c.fillStyle='#94a3b8'; c.font='600 14px Arial'; c.textAlign='center';
  c.fillText('A·CEIL  •  Порівняльний кошторис',540,canvas.height-30); c.textAlign='left';
  return canvas;
}

function generateComparisonReport(project,variantId){
  try{
    var canvas=buildComparisonReportCanvas(project,variantId);
    var variant=ENGINE.findVariant(project,variantId);
    var safe=String((variant&&variant.name)||'variant').replace(/[^a-zA-Z0-9\u0400-\u04FF_-]+/g,'_');
    var fileName='A-CEIL_porivnyannya_'+safe+'.png';
    if(typeof window._modernOpenPreview==='function'){
      window._modernOpenPreview(canvas,fileName);
      return;
    }
    var link=document.createElement('a');
    link.href=canvas.toDataURL('image/png'); link.download=fileName; link.click();
  }catch(e){
    toast('\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0441\u0444\u043E\u0440\u043C\u0443\u0432\u0430\u0442\u0438 \u043F\u043E\u0440\u0456\u0432\u043D\u044F\u043B\u044C\u043D\u0438\u0439 \u0437\u0432\u0456\u0442');
  }
}

function renderCompareTable(project, variantId){
  var model=comparisonModel(project, variantId);
  var good=model.diff<-0.5, equal=Math.abs(model.diff)<0.5;
  var rows=model.changed.map(function(r){
    return '<tr><td>'+esc(r.name)+'</td><td class="num">'+esc(reportMoney(r.main))+'</td><td class="num">'+esc(reportMoney(r.variant))+'</td><td class="num '+(r.diff<0?'good':'bad')+'">'+esc(reportSigned(r.diff))+'</td></tr>';
  }).join('') || '<tr><td colspan="4" style="color:#64748b">У сумах позицій різниці немає</td></tr>';
  var html=
    '<div class="aceilv-cmp-cards">'+
      '<div class="aceilv-cmp-card"><small>Варіант 1</small><b>Основний</b><span>'+esc(reportMoney(model.mainTotal))+'</span></div>'+
      '<div class="aceilv-cmp-card alt"><small>Варіант 2</small><b>'+esc(model.variantName)+'</b><span>'+esc(reportMoney(model.varTotal))+'</span></div>'+
    '</div>'+
    '<div class="aceilv-cmp-verdict '+(equal?'eq':(good?'good':'bad'))+'">'+esc(comparisonVerdict(model))+'</div>'+
    '<div class="aceilv-cmp-subtitle">Що відрізняється</div>'+
    '<table class="aceilv-cmp-table"><thead><tr><th>Позиція</th><th class="num">Вар. 1</th><th class="num">Вар. 2</th><th class="num">Різниця</th></tr></thead><tbody>'+
    rows+
    '<tr class="total"><td>Разом</td><td class="num">'+esc(reportMoney(model.mainTotal))+'</td><td class="num">'+esc(reportMoney(model.varTotal))+'</td><td class="num">'+esc(reportSigned(model.diff))+'</td></tr>'+
    '</tbody></table>'+
    (model.same.length ? '<div class="aceilv-cmp-same">Без змін в обох: '+esc(model.same.map(function(r){ return r.name; }).join(', '))+' — разом '+esc(reportMoney(model.sameTotal))+'</div>' : '');

  var mainFilm=ENGINE.computeFilmBreakdown(project, null);
  var varFilm=ENGINE.computeFilmBreakdown(project, variantId);
  function filmCell(info){
    if(!info) return '—';
    return esc(info.seriesName)+' '+esc(info.code)+'<br><span style="color:#64748b;font-weight:600">'+esc(info.textureLabel)+' · '+info.widthM+'м · '+esc(reportMoney(info.total))+'</span>';
  }
  var filmRows=(project.rooms||[]).map(function(room,i){
    var mInfo=mainFilm.rooms[i]&&mainFilm.rooms[i].info, vInfo=varFilm.rooms[i]&&varFilm.rooms[i].info;
    if(!mInfo&&!vInfo) return '';
    return '<tr><td>'+esc(room.name||'')+'</td><td>'+filmCell(mInfo)+'</td><td>'+filmCell(vInfo)+'</td></tr>';
  }).join('');
  var filmHtml = filmRows
    ? '<div class="aceilv-cmp-subtitle">Полотно по кімнатах</div>'+
      '<table class="aceilv-cmp-table"><thead><tr><th>Кімната</th><th>Вар. 1</th><th>Вар. 2</th></tr></thead><tbody>'+filmRows+'</tbody></table>'+
      (varFilm.warnings.length ? varFilm.warnings.map(function(w){ return '<div class="aceilv-note">'+esc(w)+'</div>'; }).join('') : '')
    : '';

  document.getElementById('aceilvCmpTableWrap').innerHTML=html+filmHtml;
  var linkBox=document.getElementById('aceilvCmpLink');
  if(linkBox){ linkBox.hidden=true; linkBox.innerHTML=''; }
}

/* Publish the comparison as its own client link (an immutable snapshot of the
   picture the client sees), without touching any other link of the object. */
async function publishComparisonLink(project, variantId, button){
  var api=window.A_CEIL_ReportLinks;
  var box=document.getElementById('aceilvCmpLink');
  if(!api || typeof api.publishPayload!=='function'){ toast('Публікація посилання недоступна'); return; }
  var original=button?button.textContent:'';
  try{
    if(button){ button.disabled=true; button.textContent='⏳ Створюється…'; }
    var canvas=buildComparisonReportCanvas(project, variantId);
    var payload={
      version:2,
      createdAt:new Date().toISOString(),
      meta:{name:String(project.name||'Порівняння кошторисів'),address:String(project.addr||''),phone:String(project.phone||'')},
      presentation:'generated-report',
      image:canvas.toDataURL('image/png')
    };
    var url=await api.publishPayload(payload,{projectId:project._dbId||project.id,kind:'comparison',variantId:variantId});
    if(box){
      box.hidden=false;
      box.innerHTML='<div class="aceilv-cmp-linkbox"><input type="text" readonly value="'+esc(url)+'"><button type="button" data-copy-cmp="1">Копіювати</button></div>';
      var input=box.querySelector('input'); var copyBtn=box.querySelector('[data-copy-cmp]');
      if(copyBtn) copyBtn.addEventListener('click', function(){ copyText(url).then(function(ok){ if(ok) toast('Посилання скопійовано'); else if(input){ input.focus(); input.select(); } }); });
    }
    toast('Посилання на порівняння готове');
  }catch(e){
    toast('Не вдалося створити посилання: '+(e&&e.message||e));
  }finally{
    if(button){ button.disabled=false; button.textContent=original; }
  }
}

function openCompareModal(project){
  var alts=(project.estimateVariants||[]);
  if(!alts.length){ toast('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0441\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u0438\u0439 \u0432\u0430\u0440\u0456\u0430\u043D\u0442'); return; }
  var overlay=ensureCompareModal();
  overlay._aceilCompareProject=project;
  var activeId=ENGINE.getActiveId(project);
  var defaultId = (activeId!=null && alts.some(function(v){ return String(v.id)===String(activeId); })) ? activeId : alts[0].id;
  var sel=document.getElementById('aceilvCmpSelect');
  sel.innerHTML=alts.map(function(v){ return '<option value="'+esc(v.id)+'"'+(String(v.id)===String(defaultId)?' selected':'')+'>'+esc(v.name)+'</option>'; }).join('');
  sel.onchange=function(){ renderCompareTable(project, sel.value); };
  renderCompareTable(project, defaultId);
  overlay.classList.add('open');
}

/* ---------------------------------------------------------------
   Wiring: refresh the bar whenever the rooms list of an object renders
   --------------------------------------------------------------- */

var oldRenderObjectRooms=window.renderObjectRooms;
if(typeof oldRenderObjectRooms==='function' && !oldRenderObjectRooms.__aceilVariantsV1){
  var wrapped=function(obj){
    var result=oldRenderObjectRooms.apply(this, arguments);
    try{
      var project=obj || findActiveProject();
      if(project) renderVariantBar(project);
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return result;
  };
  wrapped.__aceilVariantsV1=true;
  window.renderObjectRooms=wrapped;
  try{ renderObjectRooms=wrapped; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

var oldCloseObjectRooms=window.closeObjectRooms;
if(typeof oldCloseObjectRooms==='function' && !oldCloseObjectRooms.__aceilVariantsV1){
  var wrappedClose=function(){
    var bar=document.getElementById('aceilVarBar');
    if(bar) bar.remove();
    return oldCloseObjectRooms.apply(this, arguments);
  };
  wrappedClose.__aceilVariantsV1=true;
  window.closeObjectRooms=wrappedClose;
  try{ closeObjectRooms=wrappedClose; }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

window.A_CEIL_EstimateVariantsUI={buildComparisonReportCanvas:buildComparisonReportCanvas,comparisonModel:comparisonModel,comparisonVerdict:comparisonVerdict,renderVariantBar:renderVariantBar,openCompareModal:openCompareModal};
window.addEventListener('aceil:report-link-change', function(){
  try{
    var project=findActiveProject();
    if(!project) return;
    var overlay=document.getElementById('aceilVarHomeModal');
    var host=document.getElementById('aceilVarHomeHost');
    if(overlay && overlay.classList.contains('open') && host) renderVariantBar(project, host);
    else if(document.getElementById('aceilVarBar')) renderVariantBar(project);
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
});
})();

