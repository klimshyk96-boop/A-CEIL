
(function(){
'use strict';
/* A·CEIL LightLine PRO — ізольований редактор світлової лінії.
   Без перевизначення window.draw / window.openRmLightStart.
   Прев'ю малюється на окремому overlay-канвасі; лаунчер додається через MutationObserver. */

var mode=false,start=null,preview=null,currentId=null,editPickIdx=null,undoSnap=null;
var snapMode='wall',offsetCm=5,offsetCustom=false,previewDesc=null,startDesc=null;
var placeFamily=('PointerEvent' in window)?'pointer':'touch';

/* --- доступ до середовища застосунку (тільки читання) --- */
function cv(){try{return (typeof window.cv!=='undefined'&&window.cv)?window.cv:document.querySelector('canvas#cv')||document.querySelector('canvas');}catch(e){return document.querySelector('canvas');}}
function list(){if(!Array.isArray(window.linearElements))window.linearElements=[];try{linearElements=window.linearElements;}catch(e){window.__diagSilent&&window.__diagSilent(e)}return window.linearElements;}
function pxcm(){try{var v=typeof _pxPerCm==='function'?Number(_pxPerCm()):1;return v>0?v:1;}catch(e){return 1;}}
function vs(){try{return isFinite(viewScale)?Number(viewScale):1;}catch(e){return 1;}}
function vo(){try{return{x:isFinite(viewOffsetX)?Number(viewOffsetX):0,y:isFinite(viewOffsetY)?Number(viewOffsetY):0};}catch(e){return{x:0,y:0};}}
function screenToBase(p){var s=vs(),o=vo();return{x:(p.x-o.x)/s,y:(p.y-o.y)/s};}
function baseToScreen(p){var s=vs(),o=vo();return{x:p.x*s+o.x,y:p.y*s+o.y};}
function uid(){return'flp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);}
function roomPts(){try{return Array.isArray(pts)?pts:[];}catch(e){return[];}}
function deepCopy(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
function toast(t){try{if(typeof showToast==='function')showToast(t);}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
function canvasPoint(ev){var c=cv(),r=c.getBoundingClientRect();var cx,cy;if(ev.clientX!=null){cx=ev.clientX;cy=ev.clientY;}else{var t=(ev.changedTouches&&ev.changedTouches[0])||(ev.touches&&ev.touches[0]);if(!t)return null;cx=t.clientX;cy=t.clientY;}if(cx==null||cy==null)return null;return{x:(cx-r.left)*c.width/r.width,y:(cy-r.top)*c.height/r.height};}
function snap(p){var poly=roomPts(),best={p:p,d:18};for(var i=0;i<poly.length;i++){var q=poly[i],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<best.d)best={p:{x:q.x,y:q.y},d:d};var a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(l2){var t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)),x=a.x+t*dx,y=a.y+t*dy,d2=Math.hypot(p.x-x,p.y-y);if(d2<best.d)best={p:{x:x,y:y},d:d2};}}return best.p;}
/* ===== Магнітна прив'язка до стін (усі обчислення — у екранному canvas-просторі, як snap/pts) ===== */
function snapThreshold(){try{var c=cv(),r=c.getBoundingClientRect();return 24*(r.width?c.width/r.width:1);}catch(e){return 24;}}
function nearestWall(p){var poly=roomPts();if(!poly||poly.length<2)return null;var best=null;for(var i=0;i<poly.length;i++){var a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)continue;var t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)),x=a.x+dx*t,y=a.y+dy*t,d=Math.hypot(p.x-x,p.y-y);if(!best||d<best.dist)best={i:i,t:t,x:x,y:y,dist:d};}return best;}
function wallPointScreen(i,t){var poly=roomPts();if(!poly||poly.length<2)return null;var a=poly[i],b=poly[(i+1)%poly.length];if(!a||!b)return null;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function inwardNormal(i){var poly=roomPts();if(!poly||poly.length<3)return null;var a=poly[i],b=poly[(i+1)%poly.length];if(!a||!b)return null;var dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,cent=poly.reduce(function(s,p){return{x:s.x+p.x/poly.length,y:s.y+p.y/poly.length};},{x:0,y:0}),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if((cent.x-mid.x)*nx+(cent.y-mid.y)*ny<0){nx=-nx;ny=-ny;}return{x:nx,y:ny};}
function insidePolygon(p,poly){if(!poly||poly.length<3)return false;var inside=false,n=poly.length;for(var i=0,j=n-1;i<n;j=i++){var xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;var hit=((yi>p.y)!==(yj>p.y))&&(p.x<(xj-xi)*(p.y-yi)/((yj-yi)||1e-9)+xi);if(hit)inside=!inside;}return inside;}
function offsetPointFromWall(i,t,cm){var wp=wallPointScreen(i,t);if(!wp)return null;var nrm=inwardNormal(i);if(!nrm)return null;var k=pxcm()*vs();return{x:wp.x+nrm.x*cm*k,y:wp.y+nrm.y*cm*k};}
function freeDesc(screenPt){var bp=screenToBase(screenPt);return{snapMode:'free',wallIndex:-1,wallT:0,offsetCm:0,x:bp.x,y:bp.y};}
function wallDesc(i,t){var wp=wallPointScreen(i,t),bp=wp?screenToBase(wp):{x:0,y:0};return{snapMode:'wall',wallIndex:i,wallT:t,offsetCm:0,x:bp.x,y:bp.y};}
function offDesc(i,t,cm,screenPt){var bp=screenToBase(screenPt);return{snapMode:'offset',wallIndex:i,wallT:t,offsetCm:cm,x:bp.x,y:bp.y};}
function resolvePoint(d){if(!d)return null;if(d.snapMode==='wall'||d.snapMode==='offset'){var wp=wallPointScreen(d.wallIndex,d.wallT);if(!wp)return baseToScreen({x:d.x,y:d.y});if(d.snapMode==='offset'&&d.offsetCm){var nrm=inwardNormal(d.wallIndex);if(nrm){var k=pxcm()*vs();return{x:wp.x+nrm.x*d.offsetCm*k,y:wp.y+nrm.y*d.offsetCm*k};}}return wp;}return baseToScreen({x:d.x,y:d.y});}
/* магніт для сирої екранної точки за поточним режимом; повертає {pt,desc} */
function magnet(raw){if(snapMode==='free')return{pt:raw,desc:freeDesc(raw)};var nw=nearestWall(raw);if(!nw||nw.dist>snapThreshold())return{pt:raw,desc:freeDesc(raw)};if(snapMode==='offset'){var off=offsetPointFromWall(nw.i,nw.t,offsetCm);if(off&&insidePolygon(off,roomPts()))return{pt:off,desc:offDesc(nw.i,nw.t,offsetCm,off)};return{pt:{x:nw.x,y:nw.y},desc:wallDesc(nw.i,nw.t)};}return{pt:{x:nw.x,y:nw.y},desc:wallDesc(nw.i,nw.t)};}
/* перерахунок дескриптора точки під поточний режим/відступ (для редактора) */
function convertDesc(d){var i,t;if(d&&d.wallIndex>=0){i=d.wallIndex;t=d.wallT;}else{var sp=resolvePoint(d);var nw=nearestWall(sp);if(!nw)return null;i=nw.i;t=nw.t;}if(snapMode==='free'){return freeDesc(resolvePoint(d));}if(snapMode==='wall'){return wallDesc(i,t);}var off=offsetPointFromWall(i,t,offsetCm);if(!off||!insidePolygon(off,roomPts()))return null;return offDesc(i,t,offsetCm,off);}
/* застосувати поточний режим/відступ до обох точок активної лінії */
function reapplySnap(){var el=getEl();if(!el)return false;var d0=el.flpPts&&el.flpPts[0],d1=el.flpPts&&el.flpPts[1];if(!d0||!d1){var ep=endpoints(el);d0=freeDesc(ep[0]);d1=freeDesc(ep[1]);}var n0=convertDesc(d0),n1=convertDesc(d1);if(!n0||!n1){toast('⚠️ Відступ виходить за межі кімнати або стіну не визначено');return false;}undoSnap={kind:'edit',id:el.id,index:list().indexOf(el),data:deepCopy(el)};applyEndpoints(el,resolvePoint(n0),resolvePoint(n1),[n0,n1]);persist();return true;}
function endpoints(el){if(el&&el.flpPts&&el.flpPts.length===2){var q0=resolvePoint(el.flpPts[0]),q1=resolvePoint(el.flpPts[1]);if(q0&&q1)return[q0,q1];}var c=baseToScreen(el.centerCanvasPx||{x:0,y:0}),len=(Number(el.segments&&el.segments[0])||0)*pxcm()*vs(),a=(Number(el.rotation)||0)*Math.PI/180,dx=Math.cos(a)*len/2,dy=Math.sin(a)*len/2;return[{x:c.x-dx,y:c.y-dy},{x:c.x+dx,y:c.y+dy}];}
function applyEndpoints(el,a,b,descs){var aa=screenToBase(a),bb=screenToBase(b),mid={x:(aa.x+bb.x)/2,y:(aa.y+bb.y)/2},dist=Math.hypot(b.x-a.x,b.y-a.y)/(pxcm()*vs());el.centerCanvasPx=mid;el.rotation=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;el.segments=[Math.max(.1,Math.round(dist*10)/10)];el.totalLengthCm=el.segments[0];el.shape='line';el.type='linearElement';el.elementType='lightLine';el.profileWidth=el.profileWidth||35;el.freePro=true;if(descs&&descs.length===2){el.flpPts=[descs[0],descs[1]];}else if(!el.flpPts){el.flpPts=[freeDesc(a),freeDesc(b)];}try{var base=typeof _nearestLightBaseIndex==='function'?_nearestLightBaseIndex(mid.x,mid.y):0,co=typeof canvasToLightCoords==='function'?canvasToLightCoords(mid.x,mid.y,base):null;if(co){el.center={x:co.x,y:co.y};el.baseIndex=co.baseIndex;}}catch(e){window.__diagSilent&&window.__diagSilent(e)}return el;}
function persist(){try{if(typeof draw==='function')draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}try{if(typeof saveState==='function')saveState();}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
function getEl(){return list().find(function(x){return x&&x.id===currentId;});}

/* --- індикатор активного режиму + блокування інших інструментів --- */
function active(){return mode||editPickIdx!==null||!!(currentId&&document.getElementById('flpModal')&&document.getElementById('flpModal').classList.contains('open'));}
function setLock(on){try{document.body.classList.toggle('flp-editing',!!on);}catch(e){window.__diagSilent&&window.__diagSilent(e)}}

function bar(text,opts){opts=opts||{};var b=document.getElementById('flpBar');if(!b){b=document.createElement('div');b.id='flpBar';b.innerHTML='<span id="flpBarText"></span><button type="button" id="flpBarUndo" hidden>↩︎ Скасувати дію</button><button type="button" id="flpBarCancel">Скасувати</button>';document.body.appendChild(b);b.querySelector('#flpBarCancel').addEventListener('click',onBarCancel);b.querySelector('#flpBarUndo').addEventListener('click',function(){window.flpUndo();});}
  document.getElementById('flpBarText').textContent=text||'';
  var undoBtn=document.getElementById('flpBarUndo');undoBtn.hidden=!(opts.undo&&undoSnap);
  var cancelBtn=document.getElementById('flpBarCancel');cancelBtn.hidden=opts.cancel===false;
  cancelBtn.textContent=opts.cancelText||'Скасувати';
  b.classList.add('show');}
function hideBar(){var b=document.getElementById('flpBar');if(b)b.classList.remove('show');}
function onBarCancel(){if(editPickIdx!==null){editPickIdx=null;var id=currentId;if(id)openEditor(id);else endFlp();return;}endFlp();}

/* --- overlay-канвас для прев'ю (замість перевизначення draw) --- */
function overlay(){var c=cv();if(!c)return null;var host=c.parentElement;if(!host)return null;var o=document.getElementById('flpOverlay');if(!o){o=document.createElement('canvas');o.id='flpOverlay';o.style.position='absolute';o.style.zIndex='6';o.style.setProperty('pointer-events','none','important');o.style.setProperty('background','transparent','important');o.style.setProperty('box-shadow','none','important');o.style.setProperty('border-radius','0','important');host.appendChild(o);}o.width=c.width;o.height=c.height;o.style.left=c.offsetLeft+'px';o.style.top=c.offsetTop+'px';o.style.width=c.clientWidth+'px';o.style.height=c.clientHeight+'px';return o;}
function drawPreview(){var o=overlay();if(!o)return;var g=o.getContext('2d');g.clearRect(0,0,o.width,o.height);if(!(mode&&start))return;var q=preview||start;g.save();
  /* підсвітка стіни-прив'язки для рухомої точки */
  if(previewDesc&&(previewDesc.snapMode==='wall'||previewDesc.snapMode==='offset')){var poly=roomPts(),a=poly[previewDesc.wallIndex],b=poly[(previewDesc.wallIndex+1)%poly.length];if(a&&b){g.strokeStyle='#2563eb';g.lineWidth=5;g.globalAlpha=.5;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.globalAlpha=1;}var wp=wallPointScreen(previewDesc.wallIndex,previewDesc.wallT);if(wp&&previewDesc.snapMode==='offset'){g.strokeStyle='#2563eb';g.lineWidth=2;g.setLineDash([4,4]);g.beginPath();g.moveTo(wp.x,wp.y);g.lineTo(q.x,q.y);g.stroke();g.setLineDash([]);}}
  g.strokeStyle='#f59e0b';g.lineWidth=4;g.setLineDash([10,7]);g.beginPath();g.moveTo(start.x,start.y);g.lineTo(q.x,q.y);g.stroke();g.setLineDash([]);[start,q].forEach(function(p){g.fillStyle='#fff';g.strokeStyle='#f59e0b';g.lineWidth=3;g.beginPath();g.arc(p.x,p.y,7,0,Math.PI*2);g.fill();g.stroke();});
  /* кільце-магніт на прив'язаній точці */
  if(previewDesc&&previewDesc.snapMode!=='free'){g.strokeStyle='#2563eb';g.lineWidth=2.5;g.beginPath();g.arc(q.x,q.y,11,0,Math.PI*2);g.stroke();}
  g.restore();}
function clearPreview(){var o=document.getElementById('flpOverlay');if(o){var g=o.getContext('2d');g.clearRect(0,0,o.width,o.height);}}

/* --- створення --- */
function createLine(a,b,da,db){var el={id:uid(),anchor:{sideIndex:-1,alongCm:0,inwardCm:0,direction:'parallel'}};applyEndpoints(el,a,b,[da||freeDesc(a),db||freeDesc(b)]);list().push(el);undoSnap=null;persist();openEditor(el.id);}

/* --- вхід у режим постановки --- */
window.flpStart=function(){mode=true;start=null;preview=null;editPickIdx=null;undoSnap=null;startDesc=null;previewDesc=null;snapMode='wall';offsetCm=5;setLock(true);bar('Торкніться початку лінії',{cancel:true});try{closeModal('rmLightStartModal');}catch(e){window.__diagSilent&&window.__diagSilent(e)}toast('💡 Початок → кінець');clearPreview();};

/* --- побудова полів редактора --- */
function snapPanel(){
  var icons={wall:'<svg viewBox="0 0 40 24" aria-hidden="true"><line x1="4" y1="7" x2="36" y2="7" stroke="#94a3b8" stroke-width="3"/><line x1="8" y1="7" x2="32" y2="7" stroke="#f59e0b" stroke-width="4"/></svg>',offset:'<svg viewBox="0 0 40 24" aria-hidden="true"><line x1="4" y1="6" x2="36" y2="6" stroke="#94a3b8" stroke-width="3"/><line x1="8" y1="16" x2="32" y2="16" stroke="#f59e0b" stroke-width="4"/><line x1="12" y1="7" x2="12" y2="15" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="2 2"/></svg>',free:'<svg viewBox="0 0 40 24" aria-hidden="true"><line x1="8" y1="12" x2="32" y2="12" stroke="#f59e0b" stroke-width="4"/></svg>'};
  function btn(m,label){return '<button type="button" class="flp-snap-btn'+(snapMode===m?' active':'')+'" data-snap="'+m+'"><span class="flp-snap-ic">'+icons[m]+'</span><span class="flp-snap-lbl">'+label+'</span></button>';}
  var hint=snapMode==='wall'?'<div class="flp-snap-hint">Лінія автоматично прилипає до найближчої стіни</div>':snapMode==='free'?'<div class="flp-snap-hint">Лінія не прив\u2019язана до стіни</div>':'';
  var offBlock='';
  if(snapMode==='offset'){
    var presets=[2,5,10],cur=Math.round(offsetCm*10)/10;
    var obtns=presets.map(function(v){return '<button type="button" class="flp-off-btn'+(!offsetCustom&&offsetCm===v?' active':'')+'" data-off="'+v+'">'+v+' см</button>';}).join('')+'<button type="button" class="flp-off-btn'+(offsetCustom?' active':'')+'" data-off="custom">Свій розмір</button>';
    offBlock='<div class="flp-off"><div class="flp-off-label">Відстань від стіни</div><div class="flp-off-btns">'+obtns+'</div><div class="flp-off-current" id="flpOffCurrent">Відступ: '+cur+' см</div>'+(offsetCustom?'<div class="flp-off-custom"><label><small>Відступ, см</small><input id="flpOffInput" type="number" inputmode="decimal" min="0" value="'+cur+'"></label></div>':'')+'</div>';
  }
  return '<div class="flp-snap"><div class="flp-snap-title">ПРИВ\u2019ЯЗКА ЛІНІЇ</div><div class="flp-snap-sub">Розташування</div><div class="flp-snap-modes">'+btn('wall','До стіни')+btn('offset','З відступом')+btn('free','Вільно')+'</div>'+hint+offBlock+'<div class="flp-points-row"><button type="button" class="flp-pick-btn" data-flp-pick="0">◉ Початок — на кресленні</button><button type="button" class="flp-pick-btn" data-flp-pick="1">◎ Кінець — на кресленні</button></div></div>';
}
function snapCurrentDirectToWall(){
  var el=getEl();if(!el)return false;
  var ep=endpoints(el);if(!ep||ep.length<2)return false;
  var n0=nearestWall(ep[0]),n1=nearestWall(ep[1]);
  if(!n0||!n1)return false;
  undoSnap={kind:'edit',id:el.id,index:list().indexOf(el),data:deepCopy(el)};
  var d0=wallDesc(n0.i,n0.t),d1=wallDesc(n1.i,n1.t);
  applyEndpoints(el,{x:n0.x,y:n0.y},{x:n1.x,y:n1.y},[d0,d1]);
  persist();
  return true;
}
function setSnapMode(m){
  if(m===snapMode&&document.getElementById('flpBody').querySelector('.flp-snap-btn.active')){/* повторний клік дозволено */}
  var prev=snapMode;
  snapMode=m;offsetCustom=false;
  if(m==='offset'&&!(offsetCm>0))offsetCm=5;
  var ok=(m==='wall')?snapCurrentDirectToWall():reapplySnap();
  if(!ok&&m!=='free'){
    snapMode=prev;
    toast('⚠️ Не вдалося визначити стіну');
  }else if(ok&&m==='wall'){
    toast('✓ Лінію прив’язано до стіни');
  }
  if(currentId)openEditor(currentId);
}
function setOffset(cm,silent){offsetCm=Math.max(0,Number(cm)||0);snapMode='offset';var ok=reapplySnap();if(silent){var cur=document.getElementById('flpOffCurrent');if(cur)cur.textContent='Відступ: '+(Math.round(offsetCm*10)/10)+' см';var s=document.getElementById('flpSummary'),el=getEl();if(s&&el)s.textContent=Math.round((Number(el.segments[0])||0)*10)/10+' см · '+Math.round(Number(el.rotation)||0)+'°';}else{offsetCustom=false;if(currentId)openEditor(currentId);}return ok;}


function ensureModal(){var m=document.getElementById('flpModal');if(m)return m;m=document.createElement('div');m.className='modal-overlay flp-overlay';m.id='flpModal';m.innerHTML='<div class="modal flp-sheet" role="dialog" aria-modal="true" aria-labelledby="flpTitle"><div class="flp-sheet-head"><div><h3 id="flpTitle">💡 Світлова лінія</h3><div id="flpSummary" class="flp-summary"></div></div><button type="button" class="flp-x" id="flpXBtn" aria-label="Закрити">×</button></div><div id="flpBody" class="flp-body"></div><div class="flp-footer"><button type="button" class="flp-undo" id="flpUndoBtn" hidden>↩︎</button><button type="button" class="flp-delete" id="flpDeleteBtn">🗑 Видалити</button><button type="button" class="flp-done" id="flpDoneBtn">✓ Готово</button></div></div>';document.body.appendChild(m);
  /* надійні обробники кнопок — через addEventListener, без inline onclick */
  m.querySelector('#flpXBtn').addEventListener('click',function(){endFlp();});
  m.querySelector('#flpDoneBtn').addEventListener('click',function(){window.flpApply();endFlp();});
  m.querySelector('#flpDeleteBtn').addEventListener('click',function(){window.flpDelete();});
  m.querySelector('#flpUndoBtn').addEventListener('click',function(){window.flpUndo();});
  /* делеговані обробники панелі прив'язки */
  var body=m.querySelector('#flpBody');
  body.addEventListener('click',function(ev){var sn=ev.target.closest('[data-snap]');if(sn){setSnapMode(sn.getAttribute('data-snap'));return;}var of=ev.target.closest('[data-off]');if(of){var v=of.getAttribute('data-off');if(v==='custom'){offsetCustom=true;snapMode='offset';if(currentId)openEditor(currentId);var inp=document.getElementById('flpOffInput');if(inp){inp.focus();}}else{setOffset(Number(v));}return;}var pk=ev.target.closest('[data-flp-pick]');if(pk){window.flpPick(Number(pk.getAttribute('data-flp-pick')));return;}});
  body.addEventListener('input',function(ev){var inp=ev.target.closest('#flpOffInput');if(inp){setOffset(inp.value,true);}});
  return m;}

function refreshFooterUndo(){var b=document.getElementById('flpUndoBtn');if(b)b.hidden=!undoSnap;}

function openEditor(id){var m=ensureModal();currentId=id;var el=getEl();if(!el)return;if(el.flpPts&&el.flpPts[0]){snapMode=el.flpPts[0].snapMode||'wall';if(snapMode==='offset')offsetCm=Number(el.flpPts[0].offsetCm)||offsetCm;}else{snapMode='free';}document.getElementById('flpSummary').textContent=Math.round((Number(el.segments[0])||0)*10)/10+' см · '+Math.round(Number(el.rotation)||0)+'°';document.getElementById('flpBody').innerHTML=snapPanel();m.classList.add('open');m.style.display='flex';setLock(true);refreshFooterUndo();bar('Світлова лінія — редагування',{cancel:false,undo:true});}

window.flpPick=function(idx){var el=getEl();if(!el)return;editPickIdx=idx===1?1:0;var m=document.getElementById('flpModal');if(m){m.classList.remove('open');m.style.display='none';}bar('Торкніться місця для '+(editPickIdx===0?'початку':'кінця'),{cancel:true,cancelText:'Назад'});toast('📍 Виберіть точку на стіні');};

/* --- підтвердження (геометрія вже застосована наживо при кожній зміні) --- */
window.flpApply=function(){var el=getEl();if(el)persist();};

/* --- видалення (зі знімком для Undo) --- */
window.flpDelete=function(){var el=getEl();if(!el)return;var i=list().indexOf(el);undoSnap={kind:'delete',id:el.id,index:i,data:deepCopy(el)};if(i>=0)list().splice(i,1);currentId=null;persist();var m=document.getElementById('flpModal');if(m){m.classList.remove('open');m.style.display='none';}bar('Світлову лінію видалено',{cancel:true,cancelText:'Закрити',undo:true});setLock(false);toast('🗑 Світлову лінію видалено');};

/* --- Undo (1 крок, лише LightLine) --- */
window.flpUndo=function(){if(!undoSnap)return;var arr=list();if(undoSnap.kind==='delete'){arr.splice(Math.min(undoSnap.index<0?arr.length:undoSnap.index,arr.length),0,undoSnap.data);currentId=undoSnap.data.id;undoSnap=null;persist();openEditor(currentId);}else{var idx=arr.findIndex(function(x){return x&&x.id===undoSnap.id;});if(idx>=0){arr[idx]=undoSnap.data;currentId=undoSnap.data.id;}undoSnap=null;persist();if(currentId)openEditor(currentId);}toast('↩︎ Дію скасовано');};

/* --- завершення сесії: відновити всі інструменти --- */
function endFlp(){mode=false;start=null;preview=null;editPickIdx=null;currentId=null;clearPreview();hideBar();var m=document.getElementById('flpModal');if(m){m.classList.remove('open');m.style.display='none';}setLock(false);try{if(typeof draw==='function')draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
window.flpClose=endFlp;

/* --- єдиний перехоплювач подій канваса (capture) — повна ізоляція --- */
function onCanvasEvent(ev){
  if(!active())return; /* неактивно → не заважаємо жодному інструменту */
  ev.preventDefault();ev.stopImmediatePropagation();
  var type=ev.type;
  var moveType=placeFamily==='pointer'?'pointermove':'touchmove';
  var placeType=placeFamily==='pointer'?'pointerup':'touchend';
  if(type===moveType){if(mode&&start){var mp=canvasPoint(ev);if(mp){var mm=magnet(mp);preview=mm.pt;previewDesc=mm.desc;drawPreview();}}return;}
  if(type===placeType){
    var cp=canvasPoint(ev);if(!cp)return; /* немає валідної точки дотику → лінію не чіпаємо */
    var mg=magnet(cp),p=mg.pt;
    if(editPickIdx!==null){var el=getEl();if(el){undoSnap={kind:'move',id:el.id,index:list().indexOf(el),data:deepCopy(el)};var ep=endpoints(el);ep[editPickIdx]=p;var ds=(el.flpPts&&el.flpPts.length===2)?deepCopy(el.flpPts):[freeDesc(ep[0]),freeDesc(ep[1])];ds[editPickIdx]=mg.desc;applyEndpoints(el,ep[0],ep[1],ds);persist();var id=el.id;editPickIdx=null;previewDesc=null;openEditor(id);toast('✅ Точку встановлено');}return;}
    if(mode){if(!start){start=p;startDesc=mg.desc;preview=p;previewDesc=mg.desc;bar('Торкніться кінця лінії',{cancel:true});drawPreview();}else if(Math.hypot(p.x-start.x,p.y-start.y)>5){createLine(start,p,startDesc,mg.desc);mode=false;start=null;preview=null;startDesc=null;previewDesc=null;clearPreview();}}
    return;
  }
  /* решта типів (pointerdown/touchstart/mousedown/mousemove/mouseup/click тощо) —
     лише поглинаються для повної ізоляції канваса, точку НЕ ставлять */
}
function installCanvas(){var c=cv();if(!c||c.__flpInstalled)return;c.__flpInstalled=true;
  /* Постановку точки виконує ЛИШЕ одна родина подій (placeFamily: pointer, або touch як
     fallback), тому один фізичний дотик не створює дві точки. Проте поглинати (для повної
     ізоляції) доводиться всі типи, бо сам застосунок слухає на канвасі touch/mouse/click/
     pointer одночасно — інакше його touch-обробники «протікали б» повз ізоляцію. */
  ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','mousedown','mousemove','mouseup','click'].forEach(function(t){c.addEventListener(t,onCanvasEvent,true);});}

/* --- лаунчер у меню «Світло» через MutationObserver (без перевизначення openRmLightStart) --- */
function ensureLauncher(){var grid=document.querySelector('#rmLightStartModal .rm-ls-grid');if(!grid||grid.querySelector('[data-flp]'))return;var b=document.createElement('button');b.type='button';b.className='rm-ls-btn primary';b.dataset.flp='1';b.addEventListener('click',window.flpStart);b.innerHTML='<span class="rm-ls-icon">╱</span><span><b>Довільна форма</b><small>побудова по точках + точні прив’язки</small></span>';grid.insertBefore(b,grid.firstChild);}
function watchLauncher(){var host=document.getElementById('rmLightStartModal');if(!host)return;try{new MutationObserver(function(){ensureLauncher();}).observe(host,{childList:true,subtree:true,attributes:true});}catch(e){window.__diagSilent&&window.__diagSilent(e)}ensureLauncher();}

/* --- єдина ініціалізація --- */
function init(){installCanvas();watchLauncher();}
if(typeof rmOnReady==='function'){rmOnReady(init);}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init,{once:true});}else{init();}
setTimeout(init,400);

window.A·CEILFreeLightPro={start:window.flpStart,open:openEditor,undo:window.flpUndo};
})();
