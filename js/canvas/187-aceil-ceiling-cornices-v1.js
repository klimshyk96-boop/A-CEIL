(function(){
  "use strict";
  if(window.__A_CEIL_CEILING_CORNICES_V1)return;
  window.__A_CEIL_CEILING_CORNICES_V1=true;

  var editingId=null;
  var pendingPlacement=null;
  var backupKey="A·CEIL_ceiling_cornices_v1";
  var suspendPersistence=false;

  function id(value){return document.getElementById(value);}
  function clone(value){try{return JSON.parse(JSON.stringify(value));}catch(e){return Array.isArray(value)?value.slice():value;}}
  function parse(value){try{return typeof value==="string"?JSON.parse(value||"{}"):value&&typeof value==="object"?value:{};}catch(e){return {};}}
  function list(){if(!Array.isArray(window.ceilingCornices))window.ceilingCornices=[];return window.ceilingCornices;}
  function toast(text){try{if(typeof window.showToast==="function")window.showToast(text);}catch(e){}}
  function redraw(){try{if(typeof window.requestDraw==="function")window.requestDraw();else if(typeof window.draw==="function")window.draw();}catch(e){}}
  function projectList(){try{return typeof window.getProjects==="function"?window.getProjects():[];}catch(e){return [];}}
  function findProject(value){var wanted=String(value==null?"":value);return projectList().find(function(p){return p&&[p.id,p._dbId,p._localId].some(function(v){return String(v==null?"":v)===wanted;});})||null;}
  function activeObjectId(){try{return typeof _activeObjectId!=="undefined"?_activeObjectId:window._activeObjectId;}catch(e){return window._activeObjectId;}}
  function activeRoomIndex(){try{return typeof _activeRoomIdx!=="undefined"?_activeRoomIdx:window._activeRoomIdx;}catch(e){return window._activeRoomIdx;}}
  function currentProjectId(){try{return typeof _currentProjectId!=="undefined"?_currentProjectId:window._currentProjectId;}catch(e){return window._currentProjectId;}}
  function currentContextKey(){
    var objectId=activeObjectId(),roomIndex=activeRoomIndex(),projectId=currentProjectId();
    return objectId!=null&&roomIndex!=null?"room:"+objectId+":"+roomIndex:"project:"+(projectId==null?"draft":projectId);
  }
  function backupWrite(){
    try{var all=parse(localStorage.getItem(backupKey));all[currentContextKey()]=clone(list());localStorage.setItem(backupKey,JSON.stringify(all));}catch(e){}
  }
  function backupRead(key){try{var all=parse(localStorage.getItem(backupKey));return Array.isArray(all[key])?clone(all[key]):[];}catch(e){return [];}}
  function patchState(target){
    if(!target)return;
    var state=parse(target.state);
    state.ceilingCornices=clone(list());
    target.state=JSON.stringify(state);
    target.ceilingCornices=clone(list());
  }
  function syncProject(project){
    try{
      var dbId=project&&(project._dbId||(!String(project.id||"").match(/^(local_|obj_|room_)/)?project.id:null));
      var client=typeof _sb!=="undefined"?_sb:window._sb,user=typeof _sbUser!=="undefined"?_sbUser:window._sbUser;
      if(!dbId||!client||!user)return;
      var cloudState=parse(project.state);
      if(Array.isArray(project.rooms)){cloudState.multiRoom=true;cloudState.rooms=clone(project.rooms);}
      Promise.resolve(client.from("projects").update({state:cloudState}).eq("id",dbId)).catch(function(){});
    }catch(e){}
  }
  function persistNow(){
    backupWrite();
    try{
      var projects=projectList();
      var objectId=activeObjectId(),roomIndex=activeRoomIndex(),projectId=currentProjectId();
      var project=findProject(objectId!=null?objectId:projectId);
      if(project&&objectId!=null&&roomIndex!=null&&project.rooms&&project.rooms[roomIndex])patchState(project.rooms[roomIndex]);
      else if(project)patchState(project);
      if(project&&typeof window.setProjects==="function"){window.setProjects(projects);syncProject(project);}
    }catch(e){window.__diagSilent&&window.__diagSilent(e);}
  }

  function points(){try{return typeof pts!=="undefined"&&Array.isArray(pts)?pts:[];}catch(e){return [];}}
  function sideLengths(){try{return typeof lengths!=="undefined"&&Array.isArray(lengths)?lengths:[];}catch(e){return [];}}
  function pointInRoom(x,y){
    var p=points(),inside=false;
    if(p.length<3)return true;
    for(var i=0,j=p.length-1;i<p.length;j=i++){
      var xi=+p[i].x||0,yi=+p[i].y||0,xj=+p[j].x||0,yj=+p[j].y||0;
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi)inside=!inside;
    }
    return inside;
  }
  function roomMap(baseIndex){
    var p=points();if(p.length<2)return null;
    var i=Math.max(0,Math.min(p.length-1,Number(baseIndex)||0)),j=(i+1)%p.length,a=p[i],b=p[j];
    var vx=(+b.x||0)-(+a.x||0),vy=(+b.y||0)-(+a.y||0),d=Math.hypot(vx,vy);if(!d)return null;
    var cm=+sideLengths()[i]||0;if(!cm)cm=d;
    var ux=vx/d,uy=vy/d,px=-uy,py=ux,midX=(+a.x+(+b.x))/2,midY=(+a.y+(+b.y))/2;
    if(!pointInRoom(midX+px*Math.min(35,d*.15),midY+py*Math.min(35,d*.15))){px=uy;py=-ux;}
    return {a:a,ux:ux,uy:uy,px:px,py:py,scale:d/cm};
  }
  function localToCanvas(xCm,yCm,baseIndex){var m=roomMap(baseIndex);return m?{x:(+m.a.x||0)+(xCm*m.ux+yCm*m.px)*m.scale,y:(+m.a.y||0)+(xCm*m.uy+yCm*m.py)*m.scale}:null;}
  function localShape(item){
    var a=Math.max(1,+item.lengthA||70),b=Math.max(1,+item.lengthB||140),sx=item.flipX?-1:1,sy=item.flipY?-1:1;
    if(item.shape==="straight")return [[0,0],[sx*a,0]];
    return [[0,0],[sx*a,0],[sx*a,sy*b]];
  }
  function canvasShape(item){return localShape(item).map(function(p){return localToCanvas((+item.offsetX||0)+p[0],(+item.offsetY||0)+p[1],item.baseIndex||0);}).filter(Boolean);}
  function totalLength(item){return item.shape==="straight"?(+item.lengthA||0):(+item.lengthA||0)+(+item.lengthB||0);}
  function directionIcon(item){return (item.flipY?(item.flipX?"┘":"└"):(item.flipX?"┐":"┌"));}

  function drawCornices(ctx){
    if(!ctx||!list().length)return;
    var zoom=1;try{zoom=typeof viewScale!=="undefined"&&isFinite(viewScale)&&viewScale>0?viewScale:1;}catch(e){}
    list().forEach(function(item){
      var ps=canvasShape(item);if(ps.length<2)return;
      var color=item.color==="white"?"#f8fafc":"#111827";
      ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
      ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(var i=1;i<ps.length;i++)ctx.lineTo(ps[i].x,ps[i].y);
      ctx.strokeStyle=item.color==="white"?"#64748b":"rgba(255,255,255,.95)";ctx.lineWidth=8/zoom;ctx.stroke();
      ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(var j=1;j<ps.length;j++)ctx.lineTo(ps[j].x,ps[j].y);
      ctx.strokeStyle=color;ctx.lineWidth=(item.mountingType==="hidden"?5:4)/zoom;
      if(item.mountingType==="niche")ctx.setLineDash([9/zoom,6/zoom]);ctx.stroke();ctx.setLineDash([]);
      var mid=ps[Math.floor(ps.length/2)],label=item.shape==="straight"?Math.round(+item.lengthA||0)+" см":"Г · "+Math.round(+item.lengthB||0)+"×"+Math.round(+item.lengthA||0)+" см";
      ctx.font="800 "+(11/zoom)+"px -apple-system,Arial";var w=ctx.measureText(label).width+12/zoom;
      ctx.fillStyle="rgba(255,255,255,.94)";ctx.strokeStyle="rgba(15,23,42,.16)";ctx.lineWidth=1/zoom;
      ctx.fillRect(mid.x-w/2,mid.y-25/zoom,w,18/zoom);ctx.strokeRect(mid.x-w/2,mid.y-25/zoom,w,18/zoom);
      ctx.fillStyle="#0f172a";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,mid.x,mid.y-16/zoom);
      ctx.restore();
    });
  }
  function wrapDrawing(){
    var previous=window.drawLightMarks;
    if(typeof previous!=="function"||previous.__ceilingCornices)return;
    var wrapped=function(ctx){var result=previous.apply(this,arguments);try{drawCornices(ctx);}catch(e){window.__diagSilent&&window.__diagSilent(e);}return result;};
    wrapped.__ceilingCornices=true;window.drawLightMarks=wrapped;
    try{drawLightMarks=wrapped;}catch(e){}
  }

  function ensureStyle(){
    if(id("aceilCeilingCornicesStyle"))return;
    var style=document.createElement("style");style.id="aceilCeilingCornicesStyle";
    style.textContent='#ceilingCorniceModal{display:none;position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.55);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);align-items:flex-end;justify-content:center;padding:10px}#ceilingCorniceModal.open{display:flex}.cc-card{width:min(96vw,480px);max-height:88dvh;overflow:auto;-webkit-overflow-scrolling:touch;background:#fff;border-radius:26px;padding:17px;box-shadow:0 24px 70px rgba(15,23,42,.28)}.cc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.cc-title{font-size:20px;font-weight:950;color:#0f172a}.cc-sub{font-size:11px;font-weight:750;color:#64748b;margin-top:3px}.cc-close{width:38px!important;height:38px!important;min-height:38px!important;padding:0!important;background:#f1f5f9!important;color:#334155!important;box-shadow:none!important}.cc-label{display:block;margin:11px 0 5px;font-size:10.5px;font-weight:950;color:#64748b;text-transform:uppercase;letter-spacing:.06em}.cc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cc-input,.cc-select{width:100%;height:44px;padding:9px 11px;border:1.5px solid #e2e8f0;border-radius:14px;background:#fff;color:#0f172a;font-size:14px;font-weight:800;box-sizing:border-box}.cc-choice{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.cc-choice button,.cc-directions button,.cc-colors button{min-height:46px!important;padding:8px!important;background:#f8fafc!important;color:#334155!important;border:1.5px solid #e2e8f0!important;box-shadow:none!important}.cc-choice button.active,.cc-directions button.active,.cc-colors button.active{background:linear-gradient(135deg,#2563eb,#6366f1)!important;color:#fff!important;border-color:transparent!important}.cc-directions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.cc-directions button{font-size:22px!important}.cc-colors{display:grid;grid-template-columns:1fr 1fr;gap:7px}.cc-summary{margin-top:11px;padding:10px 12px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:850}.cc-advanced{display:none;margin-top:8px;padding:10px;border-radius:14px;background:#f8fafc}.cc-advanced.open{display:block}.cc-gear{width:100%;margin-top:10px;min-height:40px!important;background:#f1f5f9!important;color:#475569!important;box-shadow:none!important}.cc-footer{display:grid;grid-template-columns:auto 1fr 1.7fr;gap:8px;margin-top:13px;position:sticky;bottom:-17px;padding:10px 0 17px;background:linear-gradient(180deg,rgba(255,255,255,.7),#fff 30%)}.cc-footer button{min-height:46px!important}.cc-delete{background:#fff1f2!important;color:#be123c!important;border:1px solid #fecdd3!important;box-shadow:none!important}.cc-cancel{background:#f1f5f9!important;color:#475569!important;box-shadow:none!important}.cc-save{background:linear-gradient(135deg,#2563eb,#6366f1)!important;color:#fff!important}.cc-launch-icon{font-size:21px}.cc-profile-note{font-size:10px;color:#94a3b8;font-weight:700;margin-top:4px}#ccPlacementHint{display:none;position:fixed;left:50%;bottom:105px;transform:translateX(-50%);z-index:10060;width:min(88vw,430px);padding:12px 14px;border-radius:18px;background:#0f172a;color:#fff;box-shadow:0 12px 35px rgba(15,23,42,.35);font-size:13px;font-weight:850;text-align:center}#ccPlacementHint.open{display:block}#ccPlacementHint button{margin-top:8px;min-height:34px!important;padding:5px 14px!important;background:#fff!important;color:#0f172a!important;box-shadow:none!important}@media(max-width:420px){.cc-card{padding:15px}.cc-footer{grid-template-columns:1fr 1.7fr}.cc-delete{grid-column:1/-1;order:3}}';
    document.head.appendChild(style);
  }
  function ensureModal(){
    if(id("ceilingCorniceModal"))return;
    var modal=document.createElement("div");modal.id="ceilingCorniceModal";
    modal.innerHTML='<div class="cc-card"><div class="cc-head"><div><div class="cc-title" id="ccTitle">Карниз на стелі</div><div class="cc-sub">Оберіть форму, розмір і колір</div></div><button type="button" class="cc-close" onclick="closeCeilingCorniceModal()">×</button></div><div class="cc-label">Форма</div><div class="cc-choice" id="ccShapes"><button type="button" data-value="straight">— Прямий</button><button type="button" data-value="L">Г-подібний</button></div><div class="cc-grid"><div><label class="cc-label" id="ccLengthALabel">Довга сторона, см</label><input class="cc-input" id="ccLengthA" type="number" inputmode="decimal" value="160"></div><div id="ccLengthBWrap"><label class="cc-label">Коротка сторона, см</label><input class="cc-input" id="ccLengthB" type="number" inputmode="decimal" value="70"></div></div><div id="ccDirectionWrap"><div class="cc-label">Коротка сторона</div><div class="cc-directions" id="ccDirections"><button type="button" data-x="1" data-y="0">↰ Зліва</button><button type="button" data-x="0" data-y="0">↱ Справа</button></div></div><div class="cc-label">Колір</div><div class="cc-colors" id="ccColors"><button type="button" data-value="white">⚪ Білий</button><button type="button" data-value="black">⚫ Чорний</button></div><button type="button" class="cc-gear" onclick="toggleCeilingCorniceAdvanced()">⚙️ Точне розташування і профіль</button><div class="cc-advanced" id="ccAdvanced"><div class="cc-label">Від якої стіни</div><select class="cc-select" id="ccBase"></select><div class="cc-grid"><div><label class="cc-label">Відступ уздовж, см</label><input class="cc-input" id="ccOffsetX" type="number" inputmode="decimal" value="0"></div><div><label class="cc-label">Відступ від стіни, см</label><input class="cc-input" id="ccOffsetY" type="number" inputmode="decimal" value="0"></div></div><label class="cc-label">Профіль номенклатури</label><input class="cc-input" id="ccProfile" placeholder="Можна прив’язати пізніше"><div class="cc-profile-note">Карниз завжди прихований та однорядний. Ціна з’явиться після прив’язки профілю.</div></div><div class="cc-summary" id="ccSummary"></div><div class="cc-footer"><button type="button" class="cc-delete" id="ccDelete" onclick="deleteCeilingCornice()">🗑</button><button type="button" class="cc-cancel" onclick="closeCeilingCorniceModal()">Скасувати</button><button type="button" class="cc-save" id="ccSave" onclick="saveCeilingCornice()">Обрати стіну →</button></div></div>';
    document.body.appendChild(modal);
    var hint=document.createElement("div");hint.id="ccPlacementHint";hint.innerHTML='Торкніться потрібної стіни на кресленні<br><button type="button" onclick="cancelCeilingCornicePlacement()">Скасувати</button>';document.body.appendChild(hint);
    modal.addEventListener("click",function(e){if(e.target===modal)window.closeCeilingCorniceModal();});
    modal.querySelectorAll("input,select").forEach(function(el){el.addEventListener("input",updateSummary);el.addEventListener("change",updateSummary);});
    id("ccShapes").querySelectorAll("button").forEach(function(btn){btn.onclick=function(){setChoice("ccShapes",btn.dataset.value);updateSummary();};});
    id("ccColors").querySelectorAll("button").forEach(function(btn){btn.onclick=function(){setChoice("ccColors",btn.dataset.value);};});
    id("ccDirections").querySelectorAll("button").forEach(function(btn){btn.onclick=function(){setDirection(btn.dataset.x==="1",btn.dataset.y==="1");};});
  }
  function setChoice(group,value){var box=id(group);if(!box)return;box.dataset.value=value;box.querySelectorAll("button").forEach(function(btn){btn.classList.toggle("active",btn.dataset.value===value);});}
  function setDirection(flipX,flipY){var box=id("ccDirections");box.dataset.x=flipX?"1":"0";box.dataset.y=flipY?"1":"0";box.querySelectorAll("button").forEach(function(btn){btn.classList.toggle("active",btn.dataset.x===box.dataset.x&&btn.dataset.y===box.dataset.y);});}
  window.toggleCeilingCorniceAdvanced=function(){var box=id("ccAdvanced");if(box)box.classList.toggle("open");};
  function fillBaseOptions(selected){var p=points(),select=id("ccBase");if(!select)return;select.innerHTML=(p.length?p:[{}]).map(function(_,i){return '<option value="'+i+'">Кут '+String.fromCharCode(65+i)+'</option>';}).join("");select.value=String(Math.max(0,Math.min(p.length-1,+selected||0)));}
  function updateSummary(){
    var shape=id("ccShapes")&&id("ccShapes").dataset.value||"L",a=Math.max(0,+id("ccLengthA").value||0),b=Math.max(0,+id("ccLengthB").value||0),total=shape==="straight"?a:a+b;
    id("ccLengthBWrap").style.display=shape==="straight"?"none":"block";id("ccDirectionWrap").style.display=shape==="straight"?"none":"block";id("ccLengthALabel").textContent=shape==="straight"?"Довжина, см":"Довга сторона, см";
    id("ccSummary").textContent=shape==="straight"?"Прямий · "+Math.round(a)+" см":"Г-подібний · "+Math.round(b)+" × "+Math.round(a)+" см · загалом "+(total/100).toFixed(2)+" м";
  }
  function openEditor(item){
    ensureStyle();ensureModal();editingId=item&&item.id||null;
    var value=item||{shape:"L",lengthA:160,lengthB:70,flipX:false,flipY:false,color:"white",mountingType:"hidden",rows:1,baseIndex:0,offsetX:0,offsetY:0,profileName:""};
    id("ccTitle").textContent=editingId?"Редагувати карниз":"Новий карниз на стелі";
    setChoice("ccShapes",value.shape||"L");setChoice("ccColors",value.color||"white");setDirection(!!value.flipX,!!value.flipY);
    id("ccLengthA").value=Math.round(+value.lengthA||160);id("ccLengthB").value=Math.round(+value.lengthB||70);fillBaseOptions(value.baseIndex||0);id("ccOffsetX").value=Math.round(+value.offsetX||0);id("ccOffsetY").value=Math.round(+value.offsetY||0);id("ccProfile").value=value.profileName||"";id("ccDelete").style.display=editingId?"block":"none";id("ccSave").textContent=editingId?"✓ Зберегти":"Обрати стіну →";id("ccAdvanced").classList.toggle("open",!!editingId);updateSummary();id("ceilingCorniceModal").classList.add("open");
  }
  window.openCeilingCorniceModal=function(itemId){var item=itemId?list().find(function(x){return x.id===itemId;}):null;openEditor(item);};
  window.closeCeilingCorniceModal=function(){var modal=id("ceilingCorniceModal");if(modal)modal.classList.remove("open");editingId=null;};
  window.saveCeilingCornice=function(){
    var shape=id("ccShapes").dataset.value||"L",a=Math.max(1,Math.round(+id("ccLengthA").value||0)),b=Math.max(1,Math.round(+id("ccLengthB").value||0));
    if(!a||(shape!=="straight"&&!b)){toast("Вкажіть розміри карниза");return;}
    var values={shape:shape,lengthA:a,lengthB:b,flipX:id("ccDirections").dataset.x==="1",flipY:false,color:id("ccColors").dataset.value||"white",mountingType:"hidden",rows:1,baseIndex:Math.max(0,+id("ccBase").value||0),offsetX:Math.max(0,+id("ccOffsetX").value||0),offsetY:Math.max(0,+id("ccOffsetY").value||0),profileName:String(id("ccProfile").value||"").trim()};
    var item=editingId?list().find(function(x){return x.id===editingId;}):null;
    if(!item){pendingPlacement=values;id("ceilingCorniceModal").classList.remove("open");id("ccPlacementHint").classList.add("open");editingId=null;toast("Торкніться потрібної стіни");return;}
    Object.keys(values).forEach(function(k){item[k]=values[k];});item.totalLengthM=Math.round(totalLength(item))/100;
    persistNow();try{if(typeof window.saveState==="function")window.saveState();}catch(e){}redraw();window.closeCeilingCorniceModal();toast("✓ Карниз збережено");
  };
  window.deleteCeilingCornice=function(){if(!editingId)return;var index=list().findIndex(function(x){return x.id===editingId;});if(index>=0)list().splice(index,1);persistNow();try{if(typeof window.saveState==="function")window.saveState();}catch(e){}redraw();window.closeCeilingCorniceModal();toast("Карниз видалено");};
  window.cancelCeilingCornicePlacement=function(){pendingPlacement=null;var hint=id("ccPlacementHint");if(hint)hint.classList.remove("open");toast("Розміщення скасовано");};

  function distanceToSegment(p,a,b){var vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y,c1=wx*vx+wy*vy;if(c1<=0)return Math.hypot(p.x-a.x,p.y-a.y);var c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(p.x-b.x,p.y-b.y);var t=c1/c2;return Math.hypot(p.x-(a.x+t*vx),p.y-(a.y+t*vy));}
  function eventWorld(ev,canvas){var r=canvas.getBoundingClientRect(),rawX=(ev.clientX-r.left)*(canvas.width/r.width),rawY=(ev.clientY-r.top)*(canvas.height/r.height),zoom=1,ox=0,oy=0;try{zoom=typeof viewScale!=="undefined"&&viewScale>0?viewScale:1;ox=typeof viewOffsetX!=="undefined"?viewOffsetX:0;oy=typeof viewOffsetY!=="undefined"?viewOffsetY:0;}catch(e){}return{x:(rawX-ox)/zoom,y:(rawY-oy)/zoom,threshold:18/zoom};}
  function nearestWall(point){var p=points(),best=null;for(var i=0;i<p.length;i++){var a=p[i],b=p[(i+1)%p.length],vx=b.x-a.x,vy=b.y-a.y,len2=vx*vx+vy*vy;if(!len2)continue;var t=Math.max(0,Math.min(1,((point.x-a.x)*vx+(point.y-a.y)*vy)/len2)),q={x:a.x+t*vx,y:a.y+t*vy},distance=Math.hypot(point.x-q.x,point.y-q.y);if(!best||distance<best.distance)best={index:i,t:t,distance:distance};}return best;}
  function placeOnWall(point){var wall=nearestWall(point);if(!wall)return false;var item=clone(pendingPlacement),map=roomMap(wall.index);if(!map)return false;var sideCm=(+sideLengths()[wall.index]||Math.hypot(points()[(wall.index+1)%points().length].x-points()[wall.index].x,points()[(wall.index+1)%points().length].y-points()[wall.index].y)/map.scale),longCm=Math.max(1,+item.lengthA||1);if(longCm>sideCm){toast("Карниз "+Math.round(longCm)+" см не вміщується на стіні "+Math.round(sideCm)+" см");return true;}var intervalStart=Math.max(0,Math.min(sideCm-longCm,wall.t*sideCm-longCm/2));item.id="cornice_"+Date.now()+"_"+Math.floor(Math.random()*1000);item.baseIndex=wall.index;item.offsetY=0;if(item.flipX)item.offsetX=intervalStart+longCm;else item.offsetX=intervalStart;item.mountingType="hidden";item.rows=1;item.flipY=false;item.totalLengthM=Math.round(totalLength(item))/100;list().push(item);pendingPlacement=null;var hint=id("ccPlacementHint");if(hint)hint.classList.remove("open");persistNow();try{if(typeof window.saveState==="function")window.saveState();}catch(e){}redraw();toast("✓ Карниз поставлено на стіну");return true;}
  function hitCornice(point){for(var i=list().length-1;i>=0;i--){var ps=canvasShape(list()[i]);for(var j=1;j<ps.length;j++)if(distanceToSegment(point,ps[j-1],ps[j])<=point.threshold)return list()[i];}return null;}
  function bindCanvas(){var canvas=id("cv");if(!canvas||canvas.dataset.ceilingCornicesBound==="1")return;canvas.dataset.ceilingCornicesBound="1";canvas.addEventListener("click",function(ev){var point=eventWorld(ev,canvas);if(pendingPlacement){ev.preventDefault();ev.stopImmediatePropagation();placeOnWall(point);return;}var hit=hitCornice(point);if(!hit)return;ev.preventDefault();ev.stopImmediatePropagation();window.openCeilingCorniceModal(hit.id);},true);}

  function injectLauncher(){
    var host=id("rmLightStartModal"),grid=host&&host.querySelector(".rm-ce-grid, .rm-ls-grid");if(!grid||id("ccLauncher"))return;
    var modern=grid.classList.contains("rm-ce-grid"),button=document.createElement("button");button.type="button";button.id="ccLauncher";button.className=modern?"rm-ce-card":"rm-ls-btn custom-real";
    button.innerHTML=modern?'<span class="rm-ce-icon cc-launch-icon">⌜</span><span><b>Карниз</b><small>прямий або Г-подібний</small></span>':'<span class="rm-ls-icon cc-launch-icon">⌜</span><span><b>Карниз</b></span>';
    button.onclick=function(){try{if(typeof window.closeRmLightStart==="function")window.closeRmLightStart();}catch(e){}window.openCeilingCorniceModal();};
    var settings=grid.querySelector(".settings");grid.insertBefore(button,settings||null);
  }
  function wrapLauncher(){var previous=window.openRmLightStart;if(typeof previous!=="function"||previous.__ceilingCornices)return;var wrapped=function(){var result=previous.apply(this,arguments);setTimeout(injectLauncher,0);return result;};wrapped.__ceilingCornices=true;window.openRmLightStart=wrapped;try{openRmLightStart=wrapped;}catch(e){}}

  function restoreFrom(target,key){var state=parse(target&&target.state),saved=Array.isArray(state.ceilingCornices)?state.ceilingCornices:Array.isArray(target&&target.ceilingCornices)?target.ceilingCornices:backupRead(key);window.ceilingCornices=clone(saved||[]);setTimeout(redraw,30);}
  function wrapPersistence(){
    var loadRoom=window._loadRoomToCanvas;if(typeof loadRoom==="function"&&!loadRoom.__ceilingCornices){var roomWrapped=function(project,roomIndex){var room=project&&project.rooms&&project.rooms[roomIndex],state=parse(room&&room.state),saved=clone(Array.isArray(state.ceilingCornices)?state.ceilingCornices:Array.isArray(room&&room.ceilingCornices)?room.ceilingCornices:backupRead("room:"+String(project&&project.id)+":"+roomIndex)),result;suspendPersistence=true;try{result=loadRoom.apply(this,arguments);}finally{suspendPersistence=false;}window.ceilingCornices=saved||[];setTimeout(redraw,30);return result;};roomWrapped.__ceilingCornices=true;window._loadRoomToCanvas=roomWrapped;try{_loadRoomToCanvas=roomWrapped;}catch(e){}}
    var loadProject=window.loadProject;if(typeof loadProject==="function"&&!loadProject.__ceilingCornices){var projectWrapped=function(projectId){var project=findProject(projectId),state=parse(project&&project.state),saved=clone(Array.isArray(state.ceilingCornices)?state.ceilingCornices:Array.isArray(project&&project.ceilingCornices)?project.ceilingCornices:backupRead("project:"+projectId)),result;suspendPersistence=true;try{result=loadProject.apply(this,arguments);}finally{suspendPersistence=false;}window.ceilingCornices=saved||[];setTimeout(redraw,30);return result;};projectWrapped.__ceilingCornices=true;window.loadProject=projectWrapped;try{loadProject=projectWrapped;}catch(e){}}
    var reportRoom=window._renderRoomForReport;if(typeof reportRoom==="function"&&!reportRoom.__ceilingCornices){var reportWrapped=function(room){var previousList=clone(list()),state=parse(room&&room.state);window.ceilingCornices=clone(Array.isArray(state.ceilingCornices)?state.ceilingCornices:room&&room.ceilingCornices||[]);try{return reportRoom.apply(this,arguments);}finally{window.ceilingCornices=previousList;redraw();}};reportWrapped.__ceilingCornices=true;window._renderRoomForReport=reportWrapped;try{_renderRoomForReport=reportWrapped;}catch(e){}}
    ["saveState","saveCurrentRoom","saveProject"].forEach(function(name){var previous=window[name];if(typeof previous!=="function"||previous.__ceilingCornices)return;var wrapped=function(){var result=previous.apply(this,arguments);if(!suspendPersistence){persistNow();if(result&&typeof result.then==="function")result.then(function(){persistNow();});}return result;};wrapped.__ceilingCornices=true;window[name]=wrapped;try{eval(name+"=wrapped");}catch(e){}});
    ["resetAll","resetAllSilent"].forEach(function(name){var previous=window[name];if(typeof previous!=="function"||previous.__ceilingCornices)return;var wrapped=function(){window.ceilingCornices=[];return previous.apply(this,arguments);};wrapped.__ceilingCornices=true;window[name]=wrapped;try{eval(name+"=wrapped");}catch(e){}});
  }
  function init(){ensureStyle();ensureModal();wrapDrawing();wrapLauncher();wrapPersistence();bindCanvas();injectLauncher();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  setTimeout(init,300);setTimeout(init,1200);
})();
