
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
function toast(msg){ try{ if(typeof window.showToast==='function') window.showToast(msg); }catch(_){} }
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
        try{ ENGINE.ensure(p); }catch(_){}
        if(p._activeEstimateVariantId==null) return p;
        return ENGINE.virtualizeProjectForRender(p);
      });
    }catch(_){ return list; }
  };
  wrapped.__aceilVariantsRenderWrap = true;
  window.getProjects = wrapped;
  try{ getProjects = wrapped; }catch(_){}
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
  try{ generateObjectReport=wrappedGenerateObjectReport; }catch(_){}
}

var oldGenerateModernObjectReport=window.generateModernObjectReport;
if(typeof oldGenerateModernObjectReport==='function' && !oldGenerateModernObjectReport.__aceilVariantsV1){
  var wrappedGenerateModernObjectReport=makeObjArgWrapper(oldGenerateModernObjectReport);
  wrappedGenerateModernObjectReport.__aceilVariantsV1=true;
  window.generateModernObjectReport=wrappedGenerateModernObjectReport;
  try{ generateModernObjectReport=wrappedGenerateModernObjectReport; }catch(_){}
}

var oldBuildCloudStructuredReport=window.A_CEIL_buildCloudStructuredReport;
if(typeof oldBuildCloudStructuredReport==='function' && !oldBuildCloudStructuredReport.__aceilVariantsV1){
  var wrappedBuildCloudStructuredReport=makeNoArgWrapper(oldBuildCloudStructuredReport);
  wrappedBuildCloudStructuredReport.__aceilVariantsV1=true;
  window.A_CEIL_buildCloudStructuredReport=wrappedBuildCloudStructuredReport;
  try{ A_CEIL_buildCloudStructuredReport=wrappedBuildCloudStructuredReport; }catch(_){}
}

var oldPublishManagerReport=window.A_CEIL_PublishManagerReport;
if(typeof oldPublishManagerReport==='function' && !oldPublishManagerReport.__aceilVariantsV1){
  var wrappedPublishManagerReport=makeNoArgWrapper(oldPublishManagerReport);
  wrappedPublishManagerReport.__aceilVariantsV1=true;
  window.A_CEIL_PublishManagerReport=wrappedPublishManagerReport;
  try{ A_CEIL_PublishManagerReport=wrappedPublishManagerReport; }catch(_){}
}

var oldOpenManagerReport=window.A_CEIL_OpenManagerReport;
if(typeof oldOpenManagerReport==='function' && !oldOpenManagerReport.__aceilVariantsV1){
  var wrappedOpenManagerReport=makeNoArgWrapper(oldOpenManagerReport);
  wrappedOpenManagerReport.__aceilVariantsV1=true;
  window.A_CEIL_OpenManagerReport=wrappedOpenManagerReport;
  try{ A_CEIL_OpenManagerReport=wrappedOpenManagerReport; }catch(_){}
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
    }catch(_){}
    return oldLoadRoomToCanvas.apply(this, arguments);
  };
  wrappedLoadRoomToCanvas.__aceilVariantsV1=true;
  window._loadRoomToCanvas=wrappedLoadRoomToCanvas;
  try{ _loadRoomToCanvas=wrappedLoadRoomToCanvas; }catch(_){}
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
    '.aceilv-modal-btns{display:flex;gap:10px;margin-top:14px;}' +
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
  }catch(_){}
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
    '<div class="aceilv-tabs">'+tabsHtml+'</div>'+
    '<div class="aceilv-total">'+money(breakdown.grandTotal)+'</div>'+
    '<div class="aceilv-rooms">'+roomsHtml+'</div>'+
    '<div class="aceilv-actions">'+
      '<button type="button" class="aceilv-btn-secondary" data-aceilv-bulk="1">\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0434\u043B\u044F \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0443</button>'+
      '<button type="button" class="aceilv-btn-secondary" data-aceilv-compare="1">\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0437 \u041E\u0441\u043D\u043E\u0432\u043D\u0438\u043C</button>'+
    '</div>';

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
  }catch(_){}
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
    }catch(_){}
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
  try{ if(typeof _activeRoomIdx!=='undefined'&&Number.isInteger(_activeRoomIdx)) return rooms[_activeRoomIdx]||null; }catch(_){}
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
  try{ openElementsModal=openElementsVariantAware; }catch(_){}
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
     search and popular codes, mirroring 167-aceil-color-picker-v3.js's UX
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
    var colors=filmColorsForCurrentSeries();
    var textures=[]; colors.forEach(function(c){ if(c&&textures.indexOf(c.texture)<0) textures.push(c.texture); });
    var pricing=ENGINE.filmPricingForSeries(filmState.seriesId);
    var keys=[];
    colors.forEach(function(c){ ENGINE.filmWidthCandidates(c).forEach(function(w){ if(!keys.some(function(x){return x.priceKey===w.priceKey;})) keys.push(w); }); });
    keys.sort(function(a,b){return a.max-b.max;});
    var rows='<div style="display:grid;grid-template-columns:repeat('+Math.max(1,keys.length)+',minmax(74px,1fr));gap:6px;margin-bottom:9px">'+keys.map(function(w){
      var value=0; for(var i=0;i<textures.length;i++){ value=num(pricing[textures[i]]&&pricing[textures[i]][w.priceKey]); if(value>0) break; }
      return '<label style="font-size:10px;font-weight:800;color:#64748b">до '+esc(String(w.max))+' м<input type="number" min="0" step="1" value="'+value+'" data-price-key="'+esc(w.priceKey)+'" style="width:100%;margin-top:3px;padding:8px;border:1px solid #cbd5e1;border-radius:9px;font-weight:800"> грн/м\u00B2</label>';
    }).join('')+'</div>';
    filmPriceEditor.innerHTML='<div style="font-size:12px;font-weight:900;margin-bottom:8px">\u0426\u0456\u043D\u0438 '+esc((ENGINE.filmSeriesRegistry().find(function(s){return s.id===filmState.seriesId;})||{}).name||filmState.seriesId)+'</div>'+rows+'<button type="button" id="aceilvFilmPricesSave" style="width:100%;padding:9px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:900">\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0446\u0456\u043D\u0438</button><div style="font-size:10px;color:#64748b;margin-top:6px">\u0417\u0431\u0435\u0440\u0456\u0433\u0430\u044E\u0442\u044C\u0441\u044F \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457.</div>';
    var saveBtn=document.getElementById('aceilvFilmPricesSave');
    if(saveBtn) saveBtn.onclick=function(){
      var next={};
      textures.forEach(function(t){ next[t]={}; });
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
    }catch(_){}
    return Array.isArray(window.ACEIL_POPULAR_CODES) ? window.ACEIL_POPULAR_CODES : [];
  }
  function filmChipHtml(c){
    var marks=ENGINE.filmWidthCandidates(c).map(function(w){return Math.round(w.max*100);});
    var title=c.colorName?(' title="'+esc(c.colorName)+'"'):'';
    return '<button type="button" class="aceilv-mode-btn aceilv-film-chip'+(c.code===filmState.code?' active':'')+'" data-code="'+esc(c.code)+'"'+title+'>'+esc(c.code)+(c.colorName?('<small style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.colorName)+'</small>'):'')+'<small>'+marks.join('/')+'</small></button>';
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
    if(q) list=colors.filter(function(c){ return c.code.toLowerCase().indexOf(q)>=0 || String(c.colorName||'').toLowerCase().indexOf(q)>=0; });
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
      '<div class="aceilv-modal-btns">'+
        '<button type="button" id="aceilvCmpReport">\uD83D\uDCE4 \u0417\u0432\u0456\u0442 / \u043F\u043E\u0434\u0456\u043B\u0438\u0442\u0438\u0441\u044F</button>'+
        '<button type="button" class="aceilv-btn-secondary" id="aceilvCmpClose">\u0417\u0430\u043A\u0440\u0438\u0442\u0438</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#aceilvCmpClose').addEventListener('click', function(){ overlay.classList.remove('open'); });
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
    var t1=Math.max(0,Math.min(1,(Number(m.offsetCm)||0)/side)),t2=Math.max(t1,Math.min(1,((Number(m.offsetCm)||0)+(Number(m.lenCm)||side))/side));
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

function buildComparisonReportCanvas(project,variantId){
  var mainBd=ENGINE.computeProjectBreakdown(project,null);
  var varBd=ENGINE.computeProjectBreakdown(project,variantId);
  var variant=ENGINE.findVariant(project,variantId);
  var variantName=variant&&variant.name ? variant.name : '\u0412\u0430\u0440\u0456\u0430\u043D\u0442';
  var names=[],seen={};
  mainBd.categories.concat(varBd.categories).forEach(function(row){
    if(!seen[row.name]){ seen[row.name]=true; names.push(row.name); }
  });
  function categoryTotal(bd,name){
    var found=bd.categories.find(function(row){ return row.name===name; });
    return found ? found.total : 0;
  }
  var roomCount=Math.max(mainBd.rooms.length,varBd.rooms.length);
  var mainFilmBd=ENGINE.computeFilmBreakdown(project,null);
  var varFilmBd=ENGINE.computeFilmBreakdown(project,variantId);
  var filmRoomCount=(project.rooms||[]).length;
  var sketchRows=Math.ceil((project.rooms||[]).length/2);
  var height=570+names.length*58+(roomCount?80+roomCount*54:0)+(filmRoomCount?90+filmRoomCount*70:0)+varFilmBd.warnings.length*24+170+(sketchRows?70+sketchRows*300:0);
  var canvas=document.createElement('canvas');
  canvas.width=1080; canvas.height=Math.max(1100,height);
  var c=canvas.getContext('2d');
  c.fillStyle='#f8fafc'; c.fillRect(0,0,canvas.width,canvas.height);

  var grad=c.createLinearGradient(0,0,1080,150);
  grad.addColorStop(0,'#0f172a'); grad.addColorStop(1,'#2563eb');
  c.fillStyle=grad; c.fillRect(0,0,1080,150);
  reportRoundRect(c,42,32,78,78,20,'#ffffff');
  c.fillStyle='#2563eb'; c.font='900 48px Arial'; c.textAlign='center'; c.fillText('A',81,88);
  c.textAlign='left'; c.fillStyle='#ffffff'; c.font='900 30px Arial'; c.fillText('A·CEIL',144,68);
  c.fillStyle='#bfdbfe'; c.font='700 17px Arial'; c.fillText('\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u043D\u043D\u044F \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0456\u0432 \u043A\u043E\u0448\u0442\u043E\u0440\u0438\u0441\u0443',144,98);

  var y=198;
  c.fillStyle='#0f172a'; c.font='900 34px Arial';
  c.fillText(reportFitText(c,project.name||'\u041F\u0440\u043E\u0454\u043A\u0442',900),48,y);
  y+=31;
  var meta=[project.addr,project.phone,(project.rooms||[]).length+' \u043A\u0456\u043C\u043D.'].filter(Boolean).join('  •  ');
  c.fillStyle='#64748b'; c.font='600 17px Arial'; c.fillText(reportFitText(c,meta,970),48,y);
  y+=38;

  reportRoundRect(c,48,y,476,116,20,'#ffffff','#dbeafe');
  reportRoundRect(c,556,y,476,116,20,'#ffffff','#bbf7d0');
  c.fillStyle='#64748b'; c.font='800 15px Arial'; c.fillText('\u041E\u0421\u041D\u041E\u0412\u041D\u0418\u0419',72,y+31);
  c.fillStyle='#1e3a8a'; c.font='900 34px Arial'; c.fillText(reportMoney(mainBd.grandTotal),72,y+78);
  c.fillStyle='#64748b'; c.font='800 15px Arial'; c.fillText(reportFitText(c,String(variantName).toUpperCase(),410),580,y+31);
  c.fillStyle='#166534'; c.font='900 34px Arial'; c.fillText(reportMoney(varBd.grandTotal),580,y+78);
  y+=156;

  c.fillStyle='#0f172a'; c.font='900 23px Arial'; c.fillText('\u041A\u043E\u0448\u0442\u043E\u0440\u0438\u0441 \u0437\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F\u043C\u0438',48,y); y+=24;
  reportRoundRect(c,48,y,984,46,12,'#e2e8f0');
  c.fillStyle='#475569'; c.font='800 14px Arial';
  c.fillText('\u041A\u0410\u0422\u0415\u0413\u041E\u0420\u0406\u042F',68,y+29); c.textAlign='right';
  c.fillText('\u041E\u0421\u041D\u041E\u0412\u041D\u0418\u0419',780,y+29); c.fillText(reportFitText(c,String(variantName).toUpperCase(),210),1008,y+29);
  c.textAlign='left'; y+=50;
  names.forEach(function(name,index){
    if(index%2===0){ c.fillStyle='#ffffff'; c.fillRect(48,y,984,54); }
    c.fillStyle='#334155'; c.font='700 18px Arial'; c.fillText(reportFitText(c,name,490),68,y+34);
    c.textAlign='right'; c.fillStyle='#334155'; c.font='800 18px Arial';
    c.fillText(reportMoney(categoryTotal(mainBd,name)),780,y+34);
    c.fillStyle='#166534'; c.fillText(reportMoney(categoryTotal(varBd,name)),1008,y+34);
    c.textAlign='left'; y+=54;
  });

  if(roomCount){
    y+=42; c.fillStyle='#0f172a'; c.font='900 23px Arial'; c.fillText('\u0421\u0443\u043C\u0430 \u043F\u043E \u043A\u0456\u043C\u043D\u0430\u0442\u0430\u0445',48,y); y+=24;
    reportRoundRect(c,48,y,984,46,12,'#e2e8f0');
    c.fillStyle='#475569'; c.font='800 14px Arial'; c.fillText('\u041A\u0406\u041C\u041D\u0410\u0422\u0410',68,y+29); c.textAlign='right';
    c.fillText('\u041E\u0421\u041D\u041E\u0412\u041D\u0418\u0419',780,y+29); c.fillText(reportFitText(c,String(variantName).toUpperCase(),210),1008,y+29); c.textAlign='left'; y+=50;
    for(var i=0;i<roomCount;i++){
      var mr=mainBd.rooms[i],vr=varBd.rooms[i];
      if(i%2===0){ c.fillStyle='#ffffff'; c.fillRect(48,y,984,50); }
      c.fillStyle='#334155'; c.font='700 17px Arial'; c.fillText(reportFitText(c,(mr&&mr.room&&mr.room.name)||(vr&&vr.room&&vr.room.name)||('\u041A\u0456\u043C\u043D\u0430\u0442\u0430 '+(i+1)),490),68,y+32);
      c.textAlign='right'; c.font='800 17px Arial'; c.fillText(reportMoney(mr?mr.total:0),780,y+32); c.fillStyle='#166534'; c.fillText(reportMoney(vr?vr.total:0),1008,y+32); c.textAlign='left'; y+=50;
    }
  }

  if(filmRoomCount){
    y+=42; c.fillStyle='#0f172a'; c.font='900 23px Arial'; c.fillText('\u041F\u043B\u0456\u0432\u043A\u0430 / \u043F\u043E\u043B\u043E\u0442\u043D\u043E',48,y); y+=24;
    reportRoundRect(c,48,y,984,46,12,'#e2e8f0');
    c.fillStyle='#475569'; c.font='800 14px Arial'; c.fillText('\u041A\u0406\u041C\u041D\u0410\u0422\u0410',68,y+29); c.textAlign='right';
    c.fillText('\u041E\u0421\u041D\u041E\u0412\u041D\u0418\u0419',780,y+29); c.fillText(reportFitText(c,String(variantName).toUpperCase(),210),1008,y+29); c.textAlign='left'; y+=50;
    (project.rooms||[]).forEach(function(room,i){
      var mInfo=mainFilmBd.rooms[i]&&mainFilmBd.rooms[i].info, vInfo=varFilmBd.rooms[i]&&varFilmBd.rooms[i].info;
      if(i%2===0){ c.fillStyle='#ffffff'; c.fillRect(48,y,984,66); }
      c.fillStyle='#334155'; c.font='700 17px Arial'; c.fillText(reportFitText(c,room.name||('\u041A\u0456\u043C\u043D\u0430\u0442\u0430 '+(i+1)),300),68,y+26);
      c.font='600 13px Arial'; c.fillStyle='#64748b';
      c.fillText(mInfo?(mInfo.seriesName+' '+mInfo.code+' \u00B7 '+mInfo.widthM+'\u043C \u00B7 '+mInfo.areaM2.toFixed(1)+'\u043C\u00B2'):'\u2014',380,y+22);
      c.fillText(vInfo?(vInfo.seriesName+' '+vInfo.code+' \u00B7 '+vInfo.widthM+'\u043C \u00B7 '+vInfo.areaM2.toFixed(1)+'\u043C\u00B2'):'\u2014',380,y+44);
      c.textAlign='right'; c.font='800 15px Arial';
      c.fillStyle='#1e3a8a'; c.fillText(reportMoney(mInfo?mInfo.total:0),1008,y+22);
      c.fillStyle='#166534'; c.fillText(reportMoney(vInfo?vInfo.total:0),1008,y+44);
      c.textAlign='left'; y+=70;
    });
    if(varFilmBd.warnings.length){
      c.font='700 13px Arial'; c.fillStyle='#c2410c';
      varFilmBd.warnings.forEach(function(w){ c.fillText(reportFitText(c,'\u26A0 '+w,940),68,y+14); y+=22; });
      y+=8;
    }
  }

  y+=46;
  var saving=mainBd.grandTotal-varBd.grandTotal;
  var savingGood=saving>=0;
  reportRoundRect(c,48,y,984,104,22,savingGood?'#dcfce7':'#fee2e2',savingGood?'#86efac':'#fecaca');
  c.fillStyle=savingGood?'#166534':'#991b1b'; c.font='900 22px Arial';
  c.fillText(savingGood?'\u0415\u043A\u043E\u043D\u043E\u043C\u0456\u044F':'\u041F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F',76,y+42);
  c.textAlign='right'; c.font='900 36px Arial'; c.fillText(reportMoney(Math.abs(saving)),1004,y+64); c.textAlign='left';

  if((project.rooms||[]).length){
    y+=148; c.fillStyle='#0f172a'; c.font='900 25px Arial'; c.fillText('Ескізи кімнат',48,y); y+=24;
    (project.rooms||[]).forEach(function(room,i){
      var col=i%2,row=Math.floor(i/2);
      drawComparisonRoomSketch(c,room,48+col*508,y+row*300,476,276);
    });
  }

  c.fillStyle='#94a3b8'; c.font='600 14px Arial'; c.textAlign='center';
  c.fillText('A·CEIL  •  \u041F\u043E\u0440\u0456\u0432\u043D\u044F\u043B\u044C\u043D\u0438\u0439 \u043A\u043E\u0448\u0442\u043E\u0440\u0438\u0441',540,canvas.height-38); c.textAlign='left';
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
  var mainBd=ENGINE.computeProjectBreakdown(project, null);
  var varBd=ENGINE.computeProjectBreakdown(project, variantId);
  var names=[]; var seen={};
  mainBd.categories.concat(varBd.categories).forEach(function(c){ if(!seen[c.name]){ seen[c.name]=1; names.push(c.name); } });
  function totalFor(bd,name){ var f=bd.categories.find(function(c){ return c.name===name; }); return f?f.total:0; }
  var rows=names.map(function(name){
    var m=totalFor(mainBd,name), v=totalFor(varBd,name);
    return '<tr><td>'+esc(name)+'</td><td class="num">'+money(m)+'</td><td class="num">'+money(v)+'</td></tr>';
  }).join('');
  var diff=mainBd.grandTotal-varBd.grandTotal;
  var diffLabel = diff>=0 ? '\u0415\u043A\u043E\u043D\u043E\u043C\u0456\u044F' : '\u041F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F';
  var html='<table class="aceilv-cmp-table"><thead><tr><th>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F</th><th class="num">\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439</th><th class="num">\u0412\u0430\u0440\u0456\u0430\u043D\u0442</th></tr></thead><tbody>'+
    rows+
    '<tr class="total"><td>\u0420\u0430\u0437\u043E\u043C</td><td class="num">'+money(mainBd.grandTotal)+'</td><td class="num">'+money(varBd.grandTotal)+'</td></tr>'+
    '<tr class="save"><td>'+diffLabel+'</td><td class="num" colspan="2">'+money(Math.abs(diff))+'</td></tr>'+
  '</tbody></table>';

  var mainFilm=ENGINE.computeFilmBreakdown(project, null);
  var varFilm=ENGINE.computeFilmBreakdown(project, variantId);
  function filmCell(info){
    if(!info) return '\u2014';
    return esc(info.seriesName)+' '+esc(info.code)+'<br><span style="color:#64748b;font-weight:600">'+esc(info.textureLabel)+' \u00B7 '+info.widthM+'\u043C \u00B7 '+money(info.pricePerM2)+'/\u043C\u00B2 \u00B7 '+info.areaM2.toFixed(2)+'\u043C\u00B2</span>';
  }
  var filmRows=(project.rooms||[]).map(function(room,i){
    var mInfo=mainFilm.rooms[i]&&mainFilm.rooms[i].info, vInfo=varFilm.rooms[i]&&varFilm.rooms[i].info;
    return '<tr><td>'+esc(room.name||'')+'</td><td>'+filmCell(mInfo)+'</td><td>'+filmCell(vInfo)+'</td>'+
      '<td class="num">'+money(mInfo?mInfo.total:0)+'</td><td class="num">'+money(vInfo?vInfo.total:0)+'</td></tr>';
  }).join('');
  var filmHtml = (project.rooms||[]).length
    ? '<div class="aceilv-cmp-subtitle">\u041F\u043B\u0456\u0432\u043A\u0430 / \u043F\u043E\u043B\u043E\u0442\u043D\u043E</div>'+
      '<table class="aceilv-cmp-table"><thead><tr><th>\u041A\u0456\u043C\u043D\u0430\u0442\u0430</th><th>\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439</th><th>\u0412\u0430\u0440\u0456\u0430\u043D\u0442</th><th class="num">\u0421\u0443\u043C\u0430 \u041E</th><th class="num">\u0421\u0443\u043C\u0430 \u0412</th></tr></thead><tbody>'+filmRows+'</tbody></table>'+
      (varFilm.warnings.length ? varFilm.warnings.map(function(w){ return '<div class="aceilv-note">'+esc(w)+'</div>'; }).join('') : '')
    : '';

  document.getElementById('aceilvCmpTableWrap').innerHTML=html+filmHtml;
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
    }catch(_){}
    return result;
  };
  wrapped.__aceilVariantsV1=true;
  window.renderObjectRooms=wrapped;
  try{ renderObjectRooms=wrapped; }catch(_){}
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
  try{ closeObjectRooms=wrappedClose; }catch(_){}
}
})();
