
(function(){
"use strict";
if(window.__A·CEILCurveFixedEndsV305)return;
window.__A·CEILCurveFixedEndsV305=true;

function num(v){
  v=Number(String(v==null?"":v).replace(",","."));
  return Number.isFinite(v)?v:0;
}
function dataFor(i){
  try{
    var a=Array.isArray(arcPoints[i])?arcPoints[i]:null;
    return a&&a[0]&&a[0].model==="measure-points"?a[0].data:null;
  }catch(_){return null}
}
function sideLen(i){
  try{return Math.max(1,num(typeof _sideLenCm==="function"?_sideLenCm(i):lengths[i]))}
  catch(_){return 1}
}
function distPointSeg(px,py,a,b){
  var dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
  var t=((px-a.x)*dx+(py-a.y)*dy)/den;
  t=Math.max(0,Math.min(1,t));
  var x=a.x+t*dx,y=a.y+t*dy;
  return Math.hypot(px-x,py-y);
}
function circles(c0,r0,c1,r1){
  var dx=c1.x-c0.x,dy=c1.y-c0.y,d=Math.hypot(dx,dy);
  if(!(d>0)||d>r0+r1+0.001||d<Math.abs(r0-r1)-0.001)return[];
  var a=(r0*r0-r1*r1+d*d)/(2*d);
  var h2=r0*r0-a*a;
  if(h2<0&&h2>-0.01)h2=0;
  if(h2<0)return[];
  var h=Math.sqrt(h2),xm=c0.x+a*dx/d,ym=c0.y+a*dy/d;
  var rx=-dy*h/d,ry=dx*h/d;
  return [{x:xm+rx,y:ym+ry},{x:xm-rx,y:ym-ry}];
}
function realGeometry(i){
  var n=pts.length,j=(i+1)%n;
  if(Array.isArray(realPts)&&realPts.length===n&&realPts.every(function(p){
    return p&&isFinite(p.x)&&isFinite(p.y);
  })){
    return realPts.map(function(p){return{x:num(p.x),y:num(p.y)}});
  }
  var a=pts[i],b=pts[j],px=Math.hypot(b.x-a.x,b.y-a.y)||1;
  var sc=sideLen(i)/px;
  return pts.map(function(p){return{x:(p.x-a.x)*sc,y:(p.y-a.y)*sc}});
}
function projection(p,a,b){
  var dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
  return ((p.x-a.x)*dx+(p.y-a.y)*dy)/den;
}
function choose(cands,prev,prevPrev,end,a,b){
  if(!cands.length)return null;
  var prevT=projection(prev,a,b);
  function score(p){
    var t=projection(p,a,b);
    var s=Math.hypot(p.x-end.x,p.y-end.y);
    if(t<prevT-0.01)s+=10000*(prevT-t);
    if(prevPrev){
      var ux=prev.x-prevPrev.x,uy=prev.y-prevPrev.y;
      var vx=p.x-prev.x,vy=p.y-prev.y;
      var ul=Math.hypot(ux,uy),vl=Math.hypot(vx,vy);
      if(ul&&vl){
        var cs=Math.max(-1,Math.min(1,(ux*vx+uy*vy)/(ul*vl)));
        s+=(1-cs)*100;
      }
    }
    return s;
  }
  return cands.slice().sort(function(x,y){return score(x)-score(y)})[0];
}
function solveFixed(i){
  var d=dataFor(i);
  if(!d||!Array.isArray(d.points))return{ok:false,points:[]};

  var n=pts.length,j=(i+1)%n,rp=realGeometry(i);
  var startIdx=Number(d.startCorner);
  if(startIdx!==i&&startIdx!==j)startIdx=i;
  var endIdx=startIdx===i?j:i;
  var start=rp[startIdx],end=rp[endIdx];

  var controls=[];
  var prev=start,prevPrev=null;

  /* Остання введена точка вважається кінцем вибраної стіни.
     Вона потрібна для перевірки заміру, але не може відтягнути контур убік. */
  var intermediateCount=Math.max(0,d.points.length-1);

  for(var k=0;k<intermediateCount;k++){
    var item=d.points[k]||{};
    var seg=num(item.arcLen),diag=num(item.diag);
    var anchor=rp[Number(item.diagCorner)];
    if(!(seg>0)||!(diag>0)||!anchor)return{ok:false,index:k,points:controls};

    var cands=circles(prev,seg,anchor,diag);
    if(!cands.length)return{ok:false,index:k,points:controls};

    var p=choose(cands,prev,prevPrev,end,start,end);
    controls.push(p);
    prevPrev=prev;
    prev=p;
  }

  return{
    ok:true,
    startCorner:startIdx,
    endCorner:endIdx,
    start:start,
    end:end,
    controls:controls,
    real:rp,
    sideStart:rp[i],
    sideEnd:rp[j]
  };
}
function toCanvas(i,p,sol){
  var j=(i+1)%pts.length;
  var ra=sol.sideStart,rb=sol.sideEnd,ca=pts[i],cb=pts[j];
  var rdx=rb.x-ra.x,rdy=rb.y-ra.y,rd=Math.hypot(rdx,rdy)||1;
  var cdx=cb.x-ca.x,cdy=cb.y-ca.y,cd=Math.hypot(cdx,cdy)||1;
  var ux=rdx/rd,uy=rdy/rd,nx=-uy,ny=ux;
  var cux=cdx/cd,cuy=cdy/cd,cnx=-cuy,cny=cux,scale=cd/rd;
  var lx=(p.x-ra.x)*ux+(p.y-ra.y)*uy;
  var ly=(p.x-ra.x)*nx+(p.y-ra.y)*ny;
  return{x:ca.x+cux*lx*scale+cnx*ly*scale,y:ca.y+cuy*lx*scale+cny*ly*scale};
}
function catmull(points,steps){
  if(points.length<2)return[];
  if(points.length===2)return[];
  var out=[],count=steps||16;
  function at(k){
    if(k<0)return points[0];
    if(k>=points.length)return points[points.length-1];
    return points[k];
  }
  for(var i=0;i<points.length-1;i++){
    var p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
    for(var s=1;s<=count;s++){
      var t=s/count,t2=t*t,t3=t2*t;
      out.push({
        x:.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y:.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
        _control:s===count&&i<points.length-2
      });
    }
  }
  /* draw() сам додає кінцеву вершину стіни, тому прибираємо дубль кінця. */
  if(out.length)out.pop();
  return out;
}
function canvasPoints(i){
  var sol=solveFixed(i);
  if(!sol.ok)return[];
  var route=[sol.start].concat(sol.controls).concat([sol.end]);
  if(sol.startCorner!==i)route.reverse();
  return catmull(route.map(function(p){return toCanvas(i,p,sol)}),16);
}

var previousIsArc=window._isArcSide;
window._isArcSide=function(i){
  return !!dataFor(i)||(typeof previousIsArc==="function"&&previousIsArc(i));
};
window._sideArcCanvasPts=function(i){
  return dataFor(i)?canvasPoints(i):[];
};

/* На цьому етапі крива не змінює числову довжину стіни.
   Це прибирає стрибок 227 → 570 см і не ламає периметр. */
window._sideEffectiveLenCm=function(i){return sideLen(i)};
window._sideCurveLenCm=function(i){return sideLen(i)};

try{
  _isArcSide=window._isArcSide;
  _sideArcCanvasPts=window._sideArcCanvasPts;
  _sideEffectiveLenCm=window._sideEffectiveLenCm;
  _sideCurveLenCm=window._sideCurveLenCm;
}catch(_){window.__diagSilent&&window.__diagSilent(_)}

window.A·CEILCurveFixedEndsV305={
  solve:solveFixed,
  canvasPoints:canvasPoints
};

/* Початок кривої завжди від вершини — без прихованого 20% відступу. */
var oldOpen=window.rmCurveMeasureOpenV301||window.rmCurveOpenV87;
window.rmCurveOpenV87=function(side){
  try{
    var d=dataFor(side);
    if(!d){
      if(!Array.isArray(arcPoints))arcPoints=[];
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return typeof oldOpen==="function"?oldOpen.call(this,side):undefined;
};
})();
