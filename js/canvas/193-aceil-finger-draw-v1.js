/* A·CEIL: optional one-stroke finger drawing. Existing tap/rectangle/circle modes stay intact. */
(function(){
  "use strict";

  var active=false, drawing=false, pointerId=null, raw=[], overlay=null, path=null, hint=null;

  function byId(id){return document.getElementById(id);}
  function distance(a,b){return Math.hypot(b.x-a.x,b.y-a.y);}

  function pointToSegmentDistance(p,a,b){
    var dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
    var t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den));
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }

  function rdp(list,epsilon){
    if(list.length<=2)return list.slice();
    var max=0,index=0,last=list.length-1;
    for(var i=1;i<last;i++){
      var d=pointToSegmentDistance(list[i],list[0],list[last]);
      if(d>max){max=d;index=i;}
    }
    if(max<=epsilon)return[list[0],list[last]];
    var left=rdp(list.slice(0,index+1),epsilon),right=rdp(list.slice(index),epsilon);
    return left.slice(0,-1).concat(right);
  }

  function simplifyStroke(list){
    if(!Array.isArray(list)||list.length<3)return[];
    var filtered=[list[0]];
    for(var i=1;i<list.length;i++)if(distance(filtered[filtered.length-1],list[i])>=5)filtered.push(list[i]);
    if(filtered.length<3)return[];

    var xs=filtered.map(function(p){return p.x;}),ys=filtered.map(function(p){return p.y;});
    var diag=Math.hypot(Math.max.apply(null,xs)-Math.min.apply(null,xs),Math.max.apply(null,ys)-Math.min.apply(null,ys));
    var closeLimit=Math.max(28,diag*.09);
    if(distance(filtered[0],filtered[filtered.length-1])<=closeLimit){
      filtered[filtered.length-1]={x:filtered[0].x,y:filtered[0].y};
    }else{
      filtered.push({x:filtered[0].x,y:filtered[0].y});
    }

    var simple=rdp(filtered,Math.max(8,diag*.018));
    if(simple.length>1&&distance(simple[0],simple[simple.length-1])<1)simple.pop();

    /* Remove tiny closing edges and almost-collinear duplicate corners. */
    var changed=true;
    while(changed&&simple.length>3){
      changed=false;
      for(var j=0;j<simple.length;j++){
        var prev=simple[(j-1+simple.length)%simple.length],cur=simple[j],next=simple[(j+1)%simple.length];
        var a=distance(prev,cur),b=distance(cur,next);
        var turn=Math.abs(Math.atan2((cur.x-prev.x)*(next.y-cur.y)-(cur.y-prev.y)*(next.x-cur.x),(cur.x-prev.x)*(next.x-cur.x)+(cur.y-prev.y)*(next.y-cur.y)));
        if(a<12||b<12||turn<.13){simple.splice(j,1);changed=true;break;}
      }
    }
    while(simple.length>24){
      var remove=0,best=Infinity;
      for(var k=0;k<simple.length;k++){
        var score=pointToSegmentDistance(simple[k],simple[(k-1+simple.length)%simple.length],simple[(k+1)%simple.length]);
        if(score<best){best=score;remove=k;}
      }
      simple.splice(remove,1);
    }
    return simple.length>=3?simple:[];
  }

  function clientPoint(e){
    if(typeof getCanvasPoint==="function")return getCanvasPoint(e.clientX,e.clientY);
    var base=byId("cv"),r=base.getBoundingClientRect();
    return{x:(e.clientX-r.left)*(base.width/r.width),y:(e.clientY-r.top)*(base.height/r.height)};
  }

  function svgPoint(e){
    var r=overlay.getBoundingClientRect();
    return{x:e.clientX-r.left,y:e.clientY-r.top};
  }

  function redrawPreview(){
    if(!path)return;
    path.setAttribute("points",raw.map(function(item){return item.s.x+","+item.s.y;}).join(" "));
  }

  function stopEvent(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}

  function finish(e){
    if(!active||!drawing||e.pointerId!==pointerId)return;
    stopEvent(e);drawing=false;
    try{overlay.releasePointerCapture(pointerId);}catch(_e){}
    pointerId=null;
    var shape=simplifyStroke(raw.map(function(item){return item.c;}));
    if(shape.length<3){
      raw=[];redrawPreview();
      if(typeof showToast==="function")showToast("Намалюйте замкнений контур одним рухом");
      return;
    }
    try{
      pts=shape.map(function(p){return{x:Math.round(p.x),y:Math.round(p.y)};});
      lengths=[];realPts=[];circleMode=false;closed=false;
      closeShape();
      if(typeof saveState==="function")saveState();
      if(typeof showToast==="function")showToast("Контур створено — введіть точні розміри стін");
    }finally{disable();}
  }

  function cancelStroke(e){
    if(!active||!drawing||e.pointerId!==pointerId)return;
    stopEvent(e);drawing=false;pointerId=null;raw=[];redrawPreview();
    if(typeof showToast==="function")showToast("Малювання перервано — спробуйте ще раз");
  }

  function onDown(e){
    if(!active||drawing||e.button>0)return;
    stopEvent(e);drawing=true;pointerId=e.pointerId;raw=[{c:clientPoint(e),s:svgPoint(e)}];
    overlay.setPointerCapture(e.pointerId);redrawPreview();
  }
  function onMove(e){
    if(!active||!drawing||e.pointerId!==pointerId)return;
    stopEvent(e);var s=svgPoint(e),last=raw[raw.length-1];
    if(!last||distance(last.s,s)>=2){raw.push({c:clientPoint(e),s:s});redrawPreview();}
  }

  function disable(){
    active=false;drawing=false;pointerId=null;raw=[];
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
    overlay.setAttribute("viewBox","0 0 "+Math.max(1,base.clientWidth)+" "+Math.max(1,base.clientHeight));
    overlay.style.cssText="position:absolute;inset:0;width:100%;height:100%;z-index:55;touch-action:none;cursor:crosshair;user-select:none;-webkit-user-select:none;";
    path=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    path.setAttribute("fill","none");path.setAttribute("stroke","#2563eb");path.setAttribute("stroke-width","4");
    path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
    overlay.appendChild(path);host.appendChild(overlay);

    hint=document.createElement("div");hint.id="aceilFingerDrawHint";
    hint.innerHTML='<span><b>Ведіть пальцем одним рухом</b><small>Після відривання контур замкнеться</small></span><button type="button" aria-label="Скасувати">×</button>';
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

  window.ACEILFingerDraw={enable:enable,disable:disable,simplify:simplifyStroke};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installMenuButton,{once:true});else installMenuButton();
  setTimeout(installMenuButton,500);
})();
