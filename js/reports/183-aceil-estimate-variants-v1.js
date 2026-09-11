
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
   177-aceil-insert-choice-guard-v1.js: prefer the explicitly chosen one
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
   lighting - 167-aceil-color-picker-v3.js synthesizes a fresh, room-scoped
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

function filmSeriesRegistry(){ return Array.isArray(window.ACEIL_FILM_SERIES) ? window.ACEIL_FILM_SERIES : []; }
function filmSeriesMeta(seriesId){ return filmSeriesRegistry().find(function(s){ return s && s.id===seriesId; }) || null; }
function filmCatalogForSeries(seriesId){
  var bySeries=window.ACEIL_COLOR_CATALOG_BY_SERIES || {};
  if(Array.isArray(bySeries[seriesId])) return bySeries[seriesId];
  if(seriesId==='premium' && Array.isArray(window.ACEIL_COLOR_CATALOG)) return window.ACEIL_COLOR_CATALOG;
  return [];
}
function filmPricingForSeries(seriesId){
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
   167-aceil-color-picker-v3.js, but reads STORED room.state geometry
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
  }catch(_){}
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
  }catch(_){}
  return 0;
}

/* Same "smallest sufficient roll" rule the live picker's autoFillNomenclature
   already applies to filmMaxWidth candidates: 320-360cm range -> the 3.6m/360cm
   roll, 500-560cm range -> the 5.1m/560cm roll (only when the color actually
   has a wide510 product), 400cm is never returned. Returns null when nothing
   fits, so the caller can warn instead of pricing the wrong width. */
function pickFilmWidthCandidate(entry, neededWidthM){
  var candidates=[Object.assign({},FILM_WIDTH_NARROW)];
  if(entry && entry.wide510) candidates.push(Object.assign({},FILM_WIDTH_WIDE));
  if(!(neededWidthM>0)) return candidates[0];
  var fitting=candidates.filter(function(c){ return c.max+1e-6>=neededWidthM; });
  if(!fitting.length) return null;
  fitting.sort(function(a,b){ return a.max-b.max; });
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
  var existing=groupId!=null ? items.filter(function(it){
    return it && String(it.groupId)===String(groupId) && (it.filmPickerManaged===true || num(it.filmWidth)>0);
  }) : [];

  if(change.mode==='remove'){
    existing.forEach(function(it){ it.qty=0; });
    return;
  }
  if(change.mode!=='replace') return;

  var seriesMeta=filmSeriesMeta(change.seriesId);
  var seriesName=seriesMeta ? seriesMeta.name : change.seriesId;
  var entry=findFilmColorEntry(change.seriesId, change.code);
  var roomName=(room && room.name) || '\u041A\u0456\u043C\u043D\u0430\u0442\u0430';
  if(!entry){
    if(warnings) warnings.push('\u041A\u043E\u043B\u0456\u0440 '+change.code+' ('+seriesName+') \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0437\u0456 \u2014 \u0431\u043B\u043E\u043A \u043F\u043B\u0456\u0432\u043A\u0438 \u0434\u043B\u044F \u00AB'+roomName+'\u00BB \u043D\u0435 \u0437\u043C\u0456\u043D\u0435\u043D\u043E.');
    return;
  }
  var neededWidthM=requiredFilmWidthMetersFromRoom(room);
  var candidate=pickFilmWidthCandidate(entry, neededWidthM);
  if(!candidate){
    existing.forEach(function(it){ it.qty=0; });
    if(warnings) warnings.push('\u00AB'+roomName+'\u00BB: \u0434\u043B\u044F '+seriesName+' '+change.code+' \u043D\u0435\u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0430\u0442\u043D\u044C\u043E\u0457 \u0440\u043E\u0431\u043E\u0447\u043E\u0457 \u0448\u0438\u0440\u0438\u043D\u0438 \u2014 \u0446\u0456\u043D\u0430 \u043D\u0435 \u0440\u043E\u0437\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u0430.');
    return;
  }
  var pricing=filmPricingForSeries(change.seriesId)[entry.texture] || {narrow:0,wide:0};
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
  var available=[Object.assign({},FILM_WIDTH_NARROW)];
  if(entry.wide510) available.push(Object.assign({},FILM_WIDTH_WIDE));
  available.forEach(function(width){
    var selected=Math.abs(width.nominal-candidate.nominal)<1e-6;
    items.push({
      id:'filmv_'+String(room && room.id || 'r')+'_'+change.seriesId+'_'+change.code+'_'+String(width.nominal).replace('.','_'),
      groupId:gid, icon:'\uD83C\uDFA8',
      name:change.code+' '+filmDisplayWidthLabel(width.nominal)+'\u043C',
      qty:selected&&areaM2>0 ? Math.round(areaM2*100)/100 : 0,
      unit:'\u043C\u00B2', price:num(pricing[width.priceKey]),
      filmWidth:width.nominal, filmMaxWidth:width.max, filmSelected:selected,
      colorCode:change.code, colorTexture:entry.texture, seriesId:change.seriesId,
      filmPickerManaged:true, roomScoped:true, roomScopedKind:'film-color'
    });
  });
}

/* Pure summary of whichever film item(s) are currently active (qty>0) in
   an already-computed items array - used by the UI/report to show series
   name, texture+code, width, price/m^2, area and total without it having
   to know anything about elemItems shape. */
function getRoomFilmInfoFromItems(items){
  var filmItems=(items||[]).filter(function(it){ return it && (it.roomScopedKind==='film-color'||it.filmPickerManaged===true) && num(it.qty)>0; });
  if(!filmItems.length) return null;
  var total=0; filmItems.forEach(function(it){ total+=num(it.qty)*num(it.price); });
  var first=filmItems[0];
  var seriesId=first.seriesId || 'premium';
  var seriesMeta=filmSeriesMeta(seriesId);
  return {
    seriesId:seriesId,
    seriesName: seriesMeta ? seriesMeta.name : seriesId,
    code:first.colorCode||'',
    texture:first.colorTexture||'',
    textureLabel: filmTextureLabels()[first.colorTexture] || first.colorTexture || '',
    widthM:num(first.filmWidth),
    pricePerM2:num(first.price),
    areaM2: filmItems.reduce(function(s,it){ return s+num(it.qty); },0),
    total:total
  };
}
function getRoomFilmInfo(project, room, variantId){
  return getRoomFilmInfoFromItems(computeRoomItems(project, room, variantId).items);
}
function computeFilmBreakdown(project, variantId){
  var warnings=[];
  var rooms=(project.rooms||[]).map(function(room){
    var ri=computeRoomItems(project, room, variantId);
    if(ri.warnings && ri.warnings.length) warnings=warnings.concat(ri.warnings);
    return {room:room, info:getRoomFilmInfoFromItems(ri.items)};
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
  return project;
}

function syncShadow(project){
  if(!Array.isArray(project.rooms) || !project.rooms.length) return;
  var payload = {
    variants: clone(project.estimateVariants||[]),
    activeId: project._activeEstimateVariantId!=null ? project._activeEstimateVariantId : null,
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
    }catch(_){}
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
    try{ var g=window._modernGetNomenclatureGroupsFromState(state); if(Array.isArray(g)) return g; }catch(_){}
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
    try{ return num(window._modernGroupsTotal(groups)); }catch(_){}
  }
  var t=0;
  (groups||[]).forEach(function(g){ (g.items||[]).forEach(function(it){ t+=num(it.qty)*num(it.price); }); });
  return t;
}

function computeRoomTotal(project, room, variantId){
  var ri=computeRoomItems(project, room, variantId);
  return totalForGroups(groupsForState({elemItems:ri.items, elemGroups:ri.groups}));
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
      var name=g.name||'\u0406\u043D\u0448\u0435';
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

window.A_CEIL_EstimateVariants = {
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
  filmTextureLabels: filmTextureLabels,
  pickFilmWidthCandidate: pickFilmWidthCandidate,
  requiredFilmWidthMetersFromRoom: requiredFilmWidthMetersFromRoom,
  roomAreaM2: roomAreaM2,
  getRoomFilmInfo: getRoomFilmInfo,
  getRoomFilmInfoFromItems: getRoomFilmInfoFromItems,
  computeFilmBreakdown: computeFilmBreakdown
};
})();
