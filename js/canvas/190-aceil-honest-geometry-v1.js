(function(){
  "use strict";
  if(window.__A_CEIL_HONEST_GEOMETRY_V1)return;
  window.__A_CEIL_HONEST_GEOMETRY_V1=true;

  function finitePoint(p){return p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y))}
  function distance(a,b){return Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y))}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function copyPoints(list){return list.map(function(p){return{x:Number(p.x)||0,y:Number(p.y)||0}})}
  function median(values){
    values=values.filter(function(v){return Number.isFinite(v)&&v>0}).sort(function(a,b){return a-b});
    if(!values.length)return 1;
    var m=Math.floor(values.length/2);
    return values.length%2?values[m]:(values[m-1]+values[m])/2;
  }
  function labelPoint(i){
    var s="",n=i+1;
    while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}
    return s;
  }
  function interiorAngle(list,i){
    var n=list.length,a=list[(i-1+n)%n],b=list[i],c=list[(i+1)%n];
    var ax=a.x-b.x,ay=a.y-b.y,bx=c.x-b.x,by=c.y-b.y;
    var la=Math.hypot(ax,ay),lb=Math.hypot(bx,by);if(!la||!lb)return NaN;
    return Math.acos(clamp((ax*bx+ay*by)/(la*lb),-1,1))*180/Math.PI;
  }
  function angleStats(before,after){
    var maxChange=0,maxRightError=0,rightCount=0;
    for(var i=0;i<before.length;i++){
      var a=interiorAngle(before,i),b=interiorAngle(after,i);
      if(!Number.isFinite(a)||!Number.isFinite(b))continue;
      maxChange=Math.max(maxChange,Math.abs(a-b));
      if(Math.abs(a-90)<=6){rightCount++;maxRightError=Math.max(maxRightError,Math.abs(b-90))}
    }
    return{maxChange:maxChange,maxRightError:maxRightError,sourceMostlyRight:rightCount>=Math.max(3,before.length-1)};
  }
  function legacyClosure(source,target){
    var n=source.length,chain=[{x:0,y:0}];
    for(var i=0;i<n-1;i++){
      var dx=source[i+1].x-source[i].x,dy=source[i+1].y-source[i].y,d=Math.hypot(dx,dy)||1;
      chain.push({x:chain[i].x+dx/d*target[i],y:chain[i].y+dy/d*target[i]});
    }
    var implied=distance(chain[n-1],chain[0]),entered=target[n-1];
    return{impliedCm:implied,enteredCm:entered,diffCm:Math.abs(implied-entered),sideLabel:labelPoint(n-1)+labelPoint(0)};
  }
  function polygonFeasibility(target){
    var sum=target.reduce(function(s,v){return s+v},0),max=Math.max.apply(null,target);
    return{ok:max<=sum-max+0.01,sum:sum,max:max,shortBy:Math.max(0,max-(sum-max))};
  }
  function diagonalConstraints(n){
    var out=[],arr=[],overrides={};
    try{arr=Array.isArray(diagonals)?diagonals:[]}catch(_){arr=[]}
    try{overrides=diagonalOverrides||{}}catch(_){overrides={}}
    arr.forEach(function(pair){
      if(!Array.isArray(pair)||pair.length<2)return;
      var a=Number(pair[0]),b=Number(pair[1]);
      if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=n||b>=n||a===b)return;
      var lo=Math.min(a,b),hi=Math.max(a,b),key=labelPoint(lo)+labelPoint(hi),value=Number(overrides[key]);
      if(value>0)out.push({a:a,b:b,length:value,key:key});
    });
    return out;
  }
  function projectPair(points,a,b,target,weight){
    var p=points[a],q=points[b],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
    if(!(d>1e-8)){dx=1;dy=0;d=1}
    var correction=(d-target)/d*.5*(weight==null?1:weight);
    p.x+=dx*correction;p.y+=dy*correction;
    q.x-=dx*correction;q.y-=dy*correction;
  }
  function normalizePose(points,originAngle){
    var tx=points[0].x,ty=points[0].y;
    points.forEach(function(p){p.x-=tx;p.y-=ty});
    var now=Math.atan2(points[1].y,points[1].x),da=originAngle-now,c=Math.cos(da),s=Math.sin(da);
    points.forEach(function(p){var x=p.x,y=p.y;p.x=x*c-y*s;p.y=x*s+y*c});
  }
  function maxConstraintError(points,target,extra){
    var max=0,n=points.length;
    for(var i=0;i<n;i++)max=Math.max(max,Math.abs(distance(points[i],points[(i+1)%n])-target[i]));
    (extra||[]).forEach(function(c){max=Math.max(max,Math.abs(distance(points[c.a],points[c.b])-c.length))});
    return max;
  }
  function wrapAngle(value){
    while(value<=-Math.PI)value+=Math.PI*2;
    while(value>Math.PI)value-=Math.PI*2;
    return value;
  }
  function solveExactOrthogonal(source,target,extra){
    var n=source.length,quarter=Math.PI/2,base=Math.atan2(source[1].y-source[0].y,source[1].x-source[0].x),angles=[];
    for(var i=0;i<n;i++){
      var a=source[i],b=source[(i+1)%n],raw=Math.atan2(b.y-a.y,b.x-a.x),turn=Math.round(wrapAngle(raw-base)/quarter),snapped=base+turn*quarter;
      if(Math.abs(wrapAngle(raw-snapped))>8*Math.PI/180)return null;
      angles.push(snapped);
    }
    var endX=0,endY=0;
    for(var j=0;j<n;j++){endX+=target[j]*Math.cos(angles[j]);endY+=target[j]*Math.sin(angles[j])}
    /* This is deliberately strict: snapping is allowed only when the entered
       lengths already form a genuinely closed right-angled contour. */
    if(Math.hypot(endX,endY)>.05)return null;
    var result=[{x:0,y:0}];
    for(var p=0;p<n-1;p++)result.push({
      x:result[p].x+target[p]*Math.cos(angles[p]),
      y:result[p].y+target[p]*Math.sin(angles[p])
    });
    if(extra&&extra.length&&maxConstraintError(result,target,extra)>.25)return null;
    return{points:result,maxErrorCm:maxConstraintError(result,target,extra),exactOrthogonal:true};
  }
  function solveClosedPolygon(source,target,extra){
    var n=source.length,angles=[];
    for(var i=0;i<n;i++){
      var a=source[i],b=source[(i+1)%n];
      angles.push(Math.atan2(b.y-a.y,b.x-a.x));
    }

    /* Close the vector chain by changing all directions as little as possible.
       Every side is treated equally, so moving the letter A to another corner
       cannot change the resulting area. The whole result is rotated back only
       after solving to keep the orientation drawn by the measurer. */
    var sourceFirstAngle=angles[0];
    for(var step=0;step<320;step++){
      var rx=0,ry=0;
      for(var s=0;s<n;s++){rx+=target[s]*Math.cos(angles[s]);ry+=target[s]*Math.sin(angles[s])}
      if(Math.hypot(rx,ry)<.0001)break;
      var m00=0,m01=0,m11=0;
      for(var j=0;j<n;j++){
        var jx=-target[j]*Math.sin(angles[j]),jy=target[j]*Math.cos(angles[j]);
        m00+=jx*jx;m01+=jx*jy;m11+=jy*jy;
      }
      var det=m00*m11-m01*m01;
      if(Math.abs(det)<1e-9)break;
      var ux=(-rx*m11+ry*m01)/det,uy=(rx*m01-ry*m00)/det;
      for(var k=0;k<n;k++){
        var kx=-target[k]*Math.sin(angles[k]),ky=target[k]*Math.cos(angles[k]);
        var delta=clamp((kx*ux+ky*uy)*.78,-.35,.35);
        angles[k]+=delta;
      }
    }
    var rotateBack=sourceFirstAngle-angles[0];
    for(var r=0;r<n;r++)angles[r]+=rotateBack;
    var result=[{x:0,y:0}];
    for(var p=0;p<n-1;p++)result.push({
      x:result[p].x+target[p]*Math.cos(angles[p]),
      y:result[p].y+target[p]*Math.sin(angles[p])
    });

    /* Confirmed diagonals add real information. Refine the already sensible
       closed solution against them without returning to the tapped template. */
    if(extra.length){
      var firstAngle=angles[0],iterations=Math.max(1800,Math.min(5000,n*420));
      for(var it=0;it<iterations;it++){
        var reverse=it%2===1;
        for(var q=0;q<n;q++){
          var side=reverse?n-1-q:q;
          projectPair(result,side,(side+1)%n,target[side],1);
        }
        for(var e=0;e<extra.length;e++)projectPair(result,extra[e].a,extra[e].b,extra[e].length,.72);
        normalizePose(result,firstAngle);
        if(it>120&&it%30===0&&maxConstraintError(result,target,extra)<.025)break;
      }
    }
    return{points:result,maxErrorCm:maxConstraintError(result,target,extra)};
  }
  function polygonArea(list){
    var sum=0;
    for(var i=0;i<list.length;i++){var j=(i+1)%list.length;sum+=list[i].x*list[j].y-list[j].x*list[i].y}
    return Math.abs(sum)/2;
  }
  function fitForCanvas(list){
    var width=750,height=750;
    try{if(cv){width=Number(cv.width)||width;height=Number(cv.height)||height}}catch(_){}
    var xs=list.map(function(p){return p.x}),ys=list.map(function(p){return p.y});
    var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
    var pad=Math.max(56,Math.min(85,Math.min(width,height)*.115));
    var scale=Math.min((width-2*pad)/Math.max(1,maxX-minX),(height-2*pad)/Math.max(1,maxY-minY));
    var usedW=(maxX-minX)*scale,usedH=(maxY-minY)*scale;
    var offX=(width-usedW)/2,offY=(height-usedH)/2;
    return list.map(function(p){return{x:(p.x-minX)*scale+offX,y:(p.y-minY)*scale+offY}});
  }
  function ensureWarning(){
    var el=document.getElementById("aceilGeometryWarning");if(el)return el;
    var canvas=document.getElementById("cv"),host=canvas&&canvas.parentElement;if(!host)return null;
    if(getComputedStyle(host).position==="static")host.style.position="relative";
    el=document.createElement("button");el.id="aceilGeometryWarning";el.type="button";
    el.style.cssText="display:none;position:absolute;left:50%;top:39px;transform:translateX(-50%);z-index:63;max-width:calc(100% - 24px);padding:7px 11px;border:1px solid #f59e0b;border-radius:11px;background:rgba(255,251,235,.97);color:#92400e;box-shadow:0 5px 18px rgba(146,64,14,.16);font:800 10.5px/1.25 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:center;white-space:normal";
    el.addEventListener("click",function(){try{window["A·CEILMeasureConfidence"]&&window["A·CEILMeasureConfidence"].open()}catch(_){}});
    host.appendChild(el);return el;
  }
  function setWarning(result){
    var el=ensureWarning();if(!el)return;
    if(!result||!result.warning){el.style.display="none";el.textContent="";return}
    el.textContent=result.warning;el.style.display="block";
    el.style.borderColor=result.invalid?"#ef4444":"#f59e0b";
    el.style.background=result.invalid?"rgba(254,242,242,.97)":"rgba(255,251,235,.97)";
    el.style.color=result.invalid?"#991b1b":"#92400e";
  }
  function notifyWarning(result){
    if(!result||!result.warning)return;
    try{if(typeof showToast==="function")showToast(result.warning,result.invalid?5600:4800)}catch(_){}
  }
  function finishUi(){
    try{if(typeof updateDiagList==="function")updateDiagList()}catch(_){}
    try{if(typeof updateCornerCount==="function")updateCornerCount()}catch(_){}
    try{if(typeof updateChecks==="function")updateChecks()}catch(_){}
    try{if(typeof draw==="function")draw()}catch(_){}
  }
  function honestRebuild(){
    try{
      if(!closed||circleMode||!Array.isArray(pts)||pts.length<3){
        window.A_CEIL_HonestGeometry.lastResult=null;setWarning(null);return;
      }
      var n=pts.length,source=copyPoints(pts),target=[];
      for(var i=0;i<n;i++){var value=Number(lengths[i]);if(!(value>0))return}
      for(var j=0;j<n;j++)target.push(Number(lengths[j]));
      var beforeClosure=legacyClosure(source,target),feasible=polygonFeasibility(target),extra=diagonalConstraints(n);
      if(!feasible.ok){
        var invalid={invalid:true,warning:"❌ Контур неможливо замкнути: найдовша сторона більша за суму інших на "+Math.round(feasible.shortBy)+" см"};
        window.A_CEIL_HonestGeometry.lastResult=invalid;setWarning(invalid);notifyWarning(invalid);
        var areaEl=document.getElementById("area");if(areaEl)areaEl.textContent="—";
        finishUi();return;
      }
      var solved=solveExactOrthogonal(source,target,extra)||solveClosedPolygon(source,target,extra);
      realPts=copyPoints(solved.points);
      pts=fitForCanvas(realPts);
      var area=polygonArea(realPts),areaEl2=document.getElementById("area");
      if(areaEl2)areaEl2.textContent=(area/1e4).toFixed(2);
      var stats=angleStats(source,pts),tolerance=Math.max(2,Math.max(beforeClosure.enteredCm,beforeClosure.impliedCm)*.012);
      var changed=!solved.exactOrthogonal&&(beforeClosure.diffCm>tolerance||stats.maxChange>3);
      var result={
        invalid:solved.maxErrorCm>1.5,
        closureBefore:beforeClosure,
        maxSideErrorCm:solved.maxErrorCm,
        maxAngleChange:stats.maxChange,
        areaCm2:area,
        warning:""
      };
      if(result.invalid){
        result.warning="❌ Розміри суперечать контрольним вимірам. Максимальна похибка "+solved.maxErrorCm.toFixed(1)+" см";
      }else if(changed){
        result.warning="⚠️ Контур не замикався: різниця "+Math.round(beforeClosure.diffCm)+" см. Фігуру деформовано — перевірте розміри";
      }else if(n>3&&extra.length===0&&!solved.exactOrthogonal&&!stats.sourceMostlyRight){
        result.warning="⚠️ Косі стіни не підтверджені діагоналлю — площа орієнтовна";
      }
      window.A_CEIL_HonestGeometry.lastResult=result;
      setWarning(result);finishUi();if(result.warning)notifyWarning(result);
      return result;
    }catch(error){
      try{window.__diagSilent&&window.__diagSilent(error)}catch(_){}
    }
  }
  function syncWarning(){
    try{
      if(!closed||circleMode||!Array.isArray(pts)||pts.length<3){
        window.A_CEIL_HonestGeometry.lastResult=null;setWarning(null);return;
      }
    }catch(_){window.A_CEIL_HonestGeometry.lastResult=null;setWarning(null);return}
    var current=window.A_CEIL_HonestGeometry.lastResult;
    if(current&&current.warning){setWarning(current);return}
    try{
      if(pts.length<4){setWarning(null);return}
      var hasManual=false;Object.keys(diagonalOverrides||{}).forEach(function(key){if(Number(diagonalOverrides[key])>0)hasManual=true});
      var crooked=false;for(var i=0;i<pts.length;i++){var a=interiorAngle(pts,i);if(Number.isFinite(a)&&Math.abs(a-90)>3){crooked=true;break}}
      setWarning(crooked&&!hasManual?{warning:"⚠️ Косі стіни не підтверджені діагоналлю — площа орієнтовна"}:null);
    }catch(_){}
  }
  function clearWarningState(){
    window.A_CEIL_HonestGeometry.lastResult=null;
    setWarning(null);
  }

  window.A_CEIL_HonestGeometry={
    version:"1.4",
    solve:solveClosedPolygon,
    solveExactOrthogonal:solveExactOrthogonal,
    closure:legacyClosure,
    rebuild:honestRebuild,
    sync:syncWarning,
    clear:clearWarningState,
    lastResult:null
  };
  try{rebuild=honestRebuild}catch(_){}
  window.rebuild=honestRebuild;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",syncWarning,{once:true});else syncWarning();
  document.addEventListener("visibilitychange",function(){if(!document.hidden)syncWarning()});
})();
