
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
        ENGINE.setActiveId(proj, null);
        ENGINE.persistProject(proj);
        toast('\u270F\uFE0F \u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u043F\u0440\u0430\u0446\u044E\u0454 \u043B\u0438\u0448\u0435 \u0437 \u041E\u0441\u043D\u043E\u0432\u043D\u0438\u043C \u043A\u043E\u0448\u0442\u043E\u0440\u0438\u0441\u043E\u043C \u2014 \u0430\u043A\u0442\u0438\u0432\u043D\u0438\u0439 \u0432\u0430\u0440\u0456\u0430\u043D\u0442 \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E \u043D\u0430 \u0447\u0430\u0441 \u0440\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u043D\u043D\u044F.');
        try{ renderVariantBar(proj); }catch(_){}
        /* Make sure the object we're about to load rooms from is the real,
           unvirtualized one - never anything a report call may have handed
           back while the (now-deactivated) variant was still active. */
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
    '.aceilv-cmp-table tr.save td{color:#15803d;font-weight:900;}';
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

  function currentScopeIds(){
    if(scopeState.mode==='all') return rooms.map(function(r){ return r.id; });
    return Array.from(roomListEl.querySelectorAll('.aceilv-room-chk:checked')).map(function(c){ return c.value; });
  }
  function buildOptsForPreview(){
    var changes={};
    CAT_DEFS.forEach(function(def){ changes[def.key]=Object.assign({}, catState[def.key]); });
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
      var notesEl=document.getElementById('aceilvNotes');
      notesEl.innerHTML = res.assumptions.length ? res.assumptions.map(function(a){ return '<div class="aceilv-note">'+esc(a)+'</div>'; }).join('') : '';
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
    var hasChange=CAT_DEFS.some(function(def){ return opts.changes[def.key].mode!=='keep'; });
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
      '<div class="aceilv-modal-btns"><button type="button" class="aceilv-btn-secondary" id="aceilvCmpClose">\u0417\u0430\u043A\u0440\u0438\u0442\u0438</button></div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#aceilvCmpClose').addEventListener('click', function(){ overlay.classList.remove('open'); });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.classList.remove('open'); });
  return overlay;
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
  document.getElementById('aceilvCmpTableWrap').innerHTML=html;
}

function openCompareModal(project){
  var alts=(project.estimateVariants||[]);
  if(!alts.length){ toast('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0441\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u0438\u0439 \u0432\u0430\u0440\u0456\u0430\u043D\u0442'); return; }
  var overlay=ensureCompareModal();
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
