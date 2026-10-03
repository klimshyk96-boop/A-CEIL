/* A·CEIL: optional one-stroke finger drawing. Existing tap/rectangle/circle modes stay intact. */
(function(){
  "use strict";

  var active=false, drawing=false, pointerId=null, raw=[], overlay=null, path=null, hint=null;
  var live=null;
  var storageKey='aceil-canvas-input-mode',mode='points',sourcePoints=null;
  try{if(localStorage.getItem(storageKey)==='finger')mode='finger';}catch(e){}
  function setMode(value){
    mode=value==='finger'?'finger':'points';
    try{localStorage.setItem(storageKey,mode);}catch(e){}
    disable();syncMode();
  }
  function syncMode(){
    ['points','finger'].forEach(function(value){
      var b=byId('aceil-input-'+value);if(!b)return;
      b.setAttribute('aria-pressed',String(mode===value));
      b.style.background=mode===value?'#2563eb':'#f1f5f9';
      b.style.color=mode===value?'#fff':'#334155';
    });
    if(typeof pts==='undefined')return;
    if(active&&(mode!=='finger'||closed||circleMode||pts!==sourcePoints))disable();
    if(mode==='finger'&&!active&&!closed&&!circleMode)enable();
  }
  function direction(x,y){
    if(Math.abs(y)<=Math.abs(x)*.577)return{x:Math.sign(x),y:0};
    if(Math.abs(x)<=Math.abs(y)*.577)return{x:0,y:Math.sign(y)};
    return{x:Math.sign(x)*Math.SQRT1_2,y:Math.sign(y)*Math.SQRT1_2};
  }
  function createStroke(p){return{corners:[p],tip:p,dir:null,closed:false,history:[p],candidate:null};}
  function intersect(a,u,b,v){
    var det=u.x*v.y-u.y*v.x;if(Math.abs(det)<.01)return null;
    var t=((b.x-a.x)*v.y-(b.y-a.y)*v.x)/det;
    return{x:a.x+t*u.x,y:a.y+t*u.y};
  }
  function advance(s,p){
    if(s.closed)return;
    var a=s.corners[s.corners.length-1],dx=p.x-a.x,dy=p.y-a.y;
    if(!s.dir){if(Math.hypot(dx,dy)<24)return;s.dir=direction(dx,dy);}
    // Use actual finger travel, not the error between finger and snapped endpoint.
    // Otherwise a constant lateral offset repeatedly creates alternating corners.
    if(distance(p,s.history[s.history.length-1])>=2)s.history.push(p);
    while(s.history.length>2&&distance(p,s.history[1])>=30)s.history.shift();
    var h=s.history[0],travel=distance(p,h);
    if(travel>=28){
      var next=direction(p.x-h.x,p.y-h.y),dot=next.x*s.dir.x+next.y*s.dir.y;
      if(dot<.9&&dot>-.9){
        if(!s.candidate||next.x*s.candidate.dir.x+next.y*s.candidate.dir.y<.99)s.candidate={dir:next,start:p};
        if(distance(p,s.candidate.start)>=(Math.abs(dot)>.5?40:22)){
          var corner=intersect(a,s.dir,p,next);
          if(corner&&distance(a,corner)>=28){s.corners.push(corner);a=corner;s.dir=next;s.history=[p];}
          s.candidate=null;
        }
      }else s.candidate=null;
    }
    var along=(p.x-a.x)*s.dir.x+(p.y-a.y)*s.dir.y;
    s.tip={x:a.x+s.dir.x*Math.max(0,along),y:a.y+s.dir.y*Math.max(0,along)};
    if(s.corners.length>=3&&distance(a,s.corners[0])>48&&distance(p,s.corners[0])<=32){
      var f=s.corners[0],prev=s.corners[s.corners.length-2];
      var u=direction(a.x-prev.x,a.y-prev.y),corner=intersect(prev,u,f,s.dir);
      if(corner&&distance(corner,a)<=32&&distance(prev,corner)>=28){
        s.corners[s.corners.length-1]=corner;s.tip=f;s.closed=true;
      }
    }
  }

  function byId(id){return document.getElementById(id);}
  function distance(a,b){return Math.hypot(b.x-a.x,b.y-a.y);}


  function svgPoint(e){
    var r=overlay.getBoundingClientRect();
    return{x:e.clientX-r.left,y:e.clientY-r.top};
  }

  function redrawPreview(){
    if(!path)return;
    path.setAttribute("points",(live?live.corners.concat([live.tip]):[]).map(function(p){return p.x+","+p.y;}).join(" "));
    var ring=overlay.querySelector('circle');
    if(live){
      if(!ring){ring=document.createElementNS(overlay.namespaceURI,'circle');ring.setAttribute('r','32');ring.setAttribute('fill','rgba(37,99,235,.08)');ring.setAttribute('stroke','#2563eb');ring.setAttribute('stroke-dasharray','4 4');ring.style.pointerEvents='none';overlay.appendChild(ring);}
      ring.setAttribute('cx',live.corners[0].x);ring.setAttribute('cy',live.corners[0].y);
      ring.setAttribute('stroke',live.closed?'#16a34a':'#2563eb');
    }else if(ring)ring.remove();
  }

  function stopEvent(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}

  function finish(e){
    if(!active||!drawing||e.pointerId!==pointerId)return;
    stopEvent(e);drawing=false;
    try{overlay.releasePointerCapture(pointerId);}catch(_e){}
    pointerId=null;
    advance(live,svgPoint(e));
    var shape=live.corners.slice(),isClosed=live.closed;
    if(!isClosed&&distance(shape[shape.length-1],live.tip)>=10)shape.push(live.tip);
    if(shape.length<2){
      raw=[];redrawPreview();
      if(typeof showToast==="function")showToast("Намалюйте замкнений контур одним рухом");
      return;
    }
    try{
      var r=overlay.getBoundingClientRect();
<<<<<<< HEAD
      pts=shape.map(function(p){return{x:(p.x*ACEILCanvas.width(cv)/r.width-viewOffsetX)/viewScale,y:(p.y*ACEILCanvas.height(cv)/r.height-viewOffsetY)/viewScale};});
=======
      pts=shape.map(function(p){return{x:(p.x*750/r.width-viewOffsetX)/viewScale,y:(p.y*750/r.height-viewOffsetY)/viewScale};});
>>>>>>> b3abd08b30fc471295445fee51012a2a3f04e8e0
      lengths=[];realPts=[];circleMode=false;closed=false;
      if(isClosed)closeShape();else{updateCornerCount();requestDraw();updateChecks();}
      if(typeof saveState==="function")saveState();
      if(typeof showToast==="function")showToast(isClosed?"Контур замкнено — введіть розміри":"Продовжуйте пальцем від останньої точки");
    }finally{disable();setTimeout(syncMode,0);}
  }

  function cancelStroke(e){
    if(!active||!drawing||e.pointerId!==pointerId)return;
    stopEvent(e);drawing=false;pointerId=null;raw=[];live=null;redrawPreview();
    if(typeof showToast==="function")showToast("Малювання перервано — спробуйте ще раз");
  }

  function onDown(e){
    if(!active||drawing||e.button>0)return;
    stopEvent(e);
    var p=svgPoint(e),r=overlay.getBoundingClientRect();
<<<<<<< HEAD
    var existing=pts.map(function(q){return{x:(q.x*viewScale+viewOffsetX)*r.width/ACEILCanvas.width(cv),y:(q.y*viewScale+viewOffsetY)*r.height/ACEILCanvas.height(cv)};});
=======
    var existing=pts.map(function(q){return{x:(q.x*viewScale+viewOffsetX)*r.width/750,y:(q.y*viewScale+viewOffsetY)*r.height/750};});
>>>>>>> b3abd08b30fc471295445fee51012a2a3f04e8e0
    if(existing.length){
      var end=existing[existing.length-1];
      if(distance(p,end)>40){showToast('Почніть від останньої точки контуру');return;}
      live=createStroke(end);live.corners=existing;
    }else live=createStroke(p);
    drawing=true;pointerId=e.pointerId;
    overlay.setPointerCapture(e.pointerId);redrawPreview();
  }
  function onMove(e){
    if(!active||!drawing||e.pointerId!==pointerId)return;
    stopEvent(e);advance(live,svgPoint(e));redrawPreview();
  }

  function disable(){
    active=false;drawing=false;pointerId=null;raw=[];live=null;
    if(overlay){overlay.remove();overlay=null;path=null;}
    if(hint){hint.remove();hint=null;}
    document.body.classList.remove("aceil-finger-draw-active");
  }

  function enable(){
    if(active)return;
    if(typeof pts==='undefined'||closed||circleMode)return;
    sourcePoints=pts;
    var base=byId("cv"),host=base&&base.parentElement;if(!base||!host)return;
    if(getComputedStyle(host).position==="static")host.style.position="relative";
    active=true;document.body.classList.add("aceil-finger-draw-active");

    overlay=document.createElementNS("http://www.w3.org/2000/svg","svg");
    overlay.id="aceilFingerDrawOverlay";
    overlay.setAttribute("aria-label","Поле безперервного малювання");
    overlay.style.cssText="position:absolute;inset:0;width:100%;height:100%;z-index:55;touch-action:none;cursor:crosshair;user-select:none;-webkit-user-select:none;";
    overlay.style.left=base.offsetLeft+'px';overlay.style.top=base.offsetTop+'px';
    overlay.style.width=base.clientWidth+'px';overlay.style.height=base.clientHeight+'px';
    path=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    path.setAttribute("fill","rgba(59,130,246,.22)");path.setAttribute("stroke","#172033");path.setAttribute("stroke-width","2");
    path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
    overlay.appendChild(path);host.appendChild(overlay);

    hint=document.createElement("div");hint.id="aceilFingerDrawHint";
    hint.innerHTML='<span><b>Рівні стіни під пальцем</b><small>Для замикання поверніться до початку</small></span><button type="button" aria-label="Скасувати">×</button>';
    hint.style.cssText="position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:12000;width:min(92vw,430px);box-sizing:border-box;background:rgba(15,23,42,.94);color:#fff;border-radius:16px;padding:10px 10px 10px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 28px rgba(15,23,42,.28);font-family:system-ui,-apple-system,sans-serif";
    hint.querySelector("span").style.cssText="min-width:0;flex:1";
    hint.querySelector("b").style.cssText="display:block;font-size:13px;line-height:1.25";
    hint.querySelector("small").style.cssText="display:block;margin-top:2px;color:#cbd5e1;font-size:11px";
    hint.querySelector("button").style.cssText="width:36px;height:36px;min-width:36px;border:0;border-radius:11px;background:#334155;color:#fff;font-size:24px;line-height:1;padding:0;box-shadow:none";
    hint.querySelector("button").setAttribute('aria-label','Перейти до малювання точками');
    hint.querySelector("button").onclick=function(){setMode('points');};document.body.appendChild(hint);

    overlay.addEventListener("pointerdown",onDown,{passive:false});
    overlay.addEventListener("pointermove",onMove,{passive:false});
    overlay.addEventListener("pointerup",finish,{passive:false});
    overlay.addEventListener("pointercancel",cancelStroke,{passive:false});
  }

  function installMenuButton(){
    var menu=byId('A·CEILRoomMenuPopup');if(!menu||byId('aceil-input-switch'))return;
    var box=document.createElement('div');box.id='aceil-input-switch';box.setAttribute('role','group');box.setAttribute('aria-label','Спосіб малювання');
    box.style.cssText='grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;padding:8px;';
    var title=document.createElement('span');title.textContent='Спосіб малювання';title.style.cssText='flex-basis:100%;font:600 12px system-ui;color:#475569';box.appendChild(title);
    ['points','finger'].forEach(function(value){
      var b=document.createElement('button');b.type='button';b.id='aceil-input-'+value;b.textContent=value==='points'?'Точками':'Пальцем';
      b.style.cssText='flex:1;min-width:0;min-height:44px;border:0;border-radius:10px;padding:8px;font:600 13px system-ui;box-shadow:none;';
      b.onclick=function(){setMode(value);};box.appendChild(b);
    });
    menu.insertBefore(box,menu.firstChild);syncMode();
  }

  window.ACEILFingerDraw={enable:function(){setMode('finger');},disable:function(){setMode('points');},setMode:setMode,getMode:function(){return mode;},createStroke:createStroke,advance:advance};
  window.addEventListener('resize',function(){disable();setTimeout(syncMode,100);});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installMenuButton,{once:true});else installMenuButton();
  setTimeout(installMenuButton,500);
  setInterval(syncMode,250);
})();
