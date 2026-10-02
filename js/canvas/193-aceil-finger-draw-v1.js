/* A·CEIL: optional one-stroke finger drawing. Existing tap/rectangle/circle modes stay intact. */
(function(){
  "use strict";

  var active=false, drawing=false, pointerId=null, raw=[], overlay=null, path=null, hint=null;
  var live=null;
  function direction(x,y){var a=Math.round(Math.atan2(y,x)/(Math.PI/4))*Math.PI/4;return{x:Math.cos(a),y:Math.sin(a)};}
  function createStroke(p){return{corners:[p],tip:p,dir:null,closed:false};}
  function advance(s,p){
    if(s.closed)return;
    var a=s.corners[s.corners.length-1],dx=p.x-a.x,dy=p.y-a.y;
    if(!s.dir){if(Math.hypot(dx,dy)<10)return;s.dir=direction(dx,dy);}
    var along=dx*s.dir.x+dy*s.dir.y,side=-dx*s.dir.y+dy*s.dir.x;
    if(Math.abs(side)>12&&distance(a,s.tip)>=20){
      var next=direction(p.x-s.tip.x,p.y-s.tip.y);
      if(next.x*s.dir.x+next.y*s.dir.y<.93){
        s.corners.push(s.tip);a=s.tip;s.dir=next;
        along=(p.x-a.x)*next.x+(p.y-a.y)*next.y;
      }
    }
    s.tip={x:a.x+s.dir.x*Math.max(0,along),y:a.y+s.dir.y*Math.max(0,along)};
    if(s.corners.length>=3&&distance(a,s.corners[0])>28&&distance(p,s.corners[0])<=14){
      var f=s.corners[0],cross=(f.x-a.x)*s.dir.y-(f.y-a.y)*s.dir.x;
      if(Math.abs(cross)<.5){s.tip=f;s.closed=true;}
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
      pts=shape.map(function(p){return{x:(p.x*750/r.width-viewOffsetX)/viewScale,y:(p.y*750/r.height-viewOffsetY)/viewScale};});
      lengths=[];realPts=[];circleMode=false;closed=false;
      if(isClosed)closeShape();else{updateCornerCount();requestDraw();updateChecks();}
      if(typeof saveState==="function")saveState();
      if(typeof showToast==="function")showToast(isClosed?"Контур замкнено — введіть розміри":"Відкритий контур можна продовжити натисканнями");
    }finally{disable();}
  }

  function cancelStroke(e){
    if(!active||!drawing||e.pointerId!==pointerId)return;
    stopEvent(e);drawing=false;pointerId=null;raw=[];live=null;redrawPreview();
    if(typeof showToast==="function")showToast("Малювання перервано — спробуйте ще раз");
  }

  function onDown(e){
    if(!active||drawing||e.button>0)return;
    stopEvent(e);drawing=true;pointerId=e.pointerId;live=createStroke(svgPoint(e));
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
    if(typeof pts!=="undefined"&&((Array.isArray(pts)&&pts.length)||closed||circleMode)){
      if(typeof showToast==="function")showToast('Спочатку очистіть полотно кнопкою "Очистити"');
      return;
    }
    var base=byId("cv"),host=base&&base.parentElement;if(!base||!host)return;
    if(getComputedStyle(host).position==="static")host.style.position="relative";
    if(typeof closeShapeMenu==="function")closeShapeMenu();
    active=true;document.body.classList.add("aceil-finger-draw-active");

    overlay=document.createElementNS("http://www.w3.org/2000/svg","svg");
    overlay.id="aceilFingerDrawOverlay";
    overlay.setAttribute("aria-label","Поле безперервного малювання");
    overlay.style.cssText="position:absolute;inset:0;width:100%;height:100%;z-index:55;touch-action:none;cursor:crosshair;user-select:none;-webkit-user-select:none;";
    overlay.style.left=base.offsetLeft+'px';overlay.style.top=base.offsetTop+'px';
    overlay.style.width=base.clientWidth+'px';overlay.style.height=base.clientHeight+'px';
    path=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    path.setAttribute("fill","none");path.setAttribute("stroke","#172033");path.setAttribute("stroke-width","2");
    path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
    overlay.appendChild(path);host.appendChild(overlay);

    hint=document.createElement("div");hint.id="aceilFingerDrawHint";
    hint.innerHTML='<span><b>Рівні стіни під пальцем</b><small>Для замикання поверніться до початку</small></span><button type="button" aria-label="Скасувати">×</button>';
    hint.style.cssText="position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:12000;width:min(92vw,430px);box-sizing:border-box;background:rgba(15,23,42,.94);color:#fff;border-radius:16px;padding:10px 10px 10px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 28px rgba(15,23,42,.28);font-family:system-ui,-apple-system,sans-serif";
    hint.querySelector("span").style.cssText="min-width:0;flex:1";
    hint.querySelector("b").style.cssText="display:block;font-size:13px;line-height:1.25";
    hint.querySelector("small").style.cssText="display:block;margin-top:2px;color:#cbd5e1;font-size:11px";
    hint.querySelector("button").style.cssText="width:36px;height:36px;min-width:36px;border:0;border-radius:11px;background:#334155;color:#fff;font-size:24px;line-height:1;padding:0;box-shadow:none";
    hint.querySelector("button").onclick=disable;document.body.appendChild(hint);

    overlay.addEventListener("pointerdown",onDown,{passive:false});
    overlay.addEventListener("pointermove",onMove,{passive:false});
    overlay.addEventListener("pointerup",finish,{passive:false});
    overlay.addEventListener("pointercancel",cancelStroke,{passive:false});
  }

  function installMenuButton(){
    var menu=byId("shapeMenu");if(!menu||byId("aceilFingerDrawButton"))return;
    var button=document.createElement("button");button.type="button";button.id="aceilFingerDrawButton";button.className="quick-menu-card";
    button.innerHTML='<span class="quick-menu-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18c3-5 4-11 7-11 2 0 1 5 2 5 1 0 1-8 3-8 2 0 0 8 2 8 1 0 1-4 2-4 2 0 1 8-2 11-2 3-9 2-14-1z"/></svg></span><span class="quick-menu-text"><b>Малювати пальцем</b><small>одним безперервним рухом</small></span>';
    button.addEventListener("click",enable);menu.appendChild(button);
  }

  window.ACEILFingerDraw={enable:enable,disable:disable,createStroke:createStroke,advance:advance};
  window.addEventListener('resize',disable);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installMenuButton,{once:true});else installMenuButton();
  setTimeout(installMenuButton,500);
})();
