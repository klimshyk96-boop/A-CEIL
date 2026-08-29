
(function(){
"use strict";
if(window.__A·CEILCurveCircleGeometryV302)return;
window.__A·CEILCurveCircleGeometryV302=true;

var oldIsArc=window._isArcSide;
var oldCanvasPts=window._sideArcCanvasPts;
var oldEffective=window._sideEffectiveLenCm;

function num(v){
  v=Number(String(v==null?"":v).replace(",","."));
  return Number.isFinite(v)?v:0;
}
function measureData(i){
  try{
    var a=Array.isArray(arcPoints[i])?arcPoints[i]:null;
    if(a&&a[0]&&a[0].model==="measure-points"&&a[0].data)return a[0].data;
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return null;
}
function hasMeasure(i){
  var d=measureData(i);
  return !!(d&&Array.isArray(d.points)&&d.points.length);
}
function sideLen(i){
  try{return Math.max(1,num(typeof _sideLenCm==="function"?_sideLenCm(i):lengths[i]))}
  catch(_){return 1}
}
function sourceGeometry(i){
  var n=pts.length,j=(i+1)%n;
  if(Array.isArray(realPts)&&realPts.length===n&&realPts.every(function(p){return p&&isFinite(p.x)&&isFinite(p.y)})){
    return {real:realPts.map(function(p){return{x:num(p.x),y:num(p.y)}}),native:true};
  }
  var a=pts[i],b=pts[j],px=Math.hypot(b.x-a.x,b.y-a.y)||1,scale=sideLen(i)/px;
  return {
    real:pts.map(function(p){return{x:(p.x-a.x)*scale,y:(p.y-a.y)*scale}}),
    native:false
  };
}
function circleIntersections(c0,r0,c1,r1){
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
function projection(p,a,b){
  var dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
  return ((p.x-a.x)*dx+(p.y-a.y)*dy)/den;
}
function chooseCandidate(cands,prev,prevPrev,end,sideStart,sideEnd){
  if(!cands.length)return null;
  var prevT=projection(prev,sideStart,sideEnd);
  function score(p){
    var t=projection(p,sideStart,sideEnd);
    var s=Math.hypot(p.x-end.x,p.y-end.y);
    if(t<prevT-0.015)s+=10000*(prevT-t);
    if(prevPrev){
      var ax=prev.x-prevPrev.x,ay=prev.y-prevPrev.y;
      var bx=p.x-prev.x,by=p.y-prev.y;
      var al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
      if(al>0&&bl>0){
        var cos=Math.max(-1,Math.min(1,(ax*bx+ay*by)/(al*bl)));
        s+=(1-cos)*120;
      }
    }
    return s;
  }
  return cands.slice().sort(function(a,b){return score(a)-score(b)})[0];
}
function solve(i){
  var d=measureData(i);
  if(!d)return{ok:false,error:"no_data",points:[]};
  var n=pts.length,j=(i+1)%n,g=sourceGeometry(i),rp=g.real;
  var startIdx=Number(d.startCorner);
  if(startIdx!==i&&startIdx!==j)startIdx=i;
  var endIdx=startIdx===i?j:i;
  var startVertex=rp[startIdx],endVertex=rp[endIdx];
  var vx=endVertex.x-startVertex.x,vy=endVertex.y-startVertex.y,L=Math.hypot(vx,vy)||1;
  var off=Math.max(0,Math.min(L,num(d.startOffset)));
  var startPoint={x:startVertex.x+vx/L*off,y:startVertex.y+vy/L*off};
  var solved=[],prev=startPoint,prevPrev=null;

  for(var k=0;k<d.points.length;k++){
    var item=d.points[k]||{},seg=num(item.arcLen),diag=num(item.diag),anchor=rp[Number(item.diagCorner)];
    if(!(seg>0)||!(diag>0)||!anchor){
      return{ok:false,error:"invalid_point",index:k,points:solved,startPoint:startPoint};
    }
    var cands=circleIntersections(prev,seg,anchor,diag);
    if(!cands.length){
      return{ok:false,error:"no_intersection",index:k,points:solved,startPoint:startPoint};
    }
    var chosen=chooseCandidate(cands,prev,prevPrev,endVertex,startVertex,endVertex);
    solved.push({x:chosen.x,y:chosen.y,label:item.label||("C"+(k+1)),control:true});
    prevPrev=prev;prev=chosen;
  }
  return{
    ok:true,startCorner:startIdx,endCorner:endIdx,startPoint:startPoint,
    points:solved,real:rp,sideStart:rp[i],sideEnd:rp[j],native:g.native
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
  if(points.length<2)return points.slice();
  if(points.length===2)return points.slice();
  var out=[Object.assign({},points[0],{_control:true})],count=steps||14;
  function get(k){
    if(k<0)return points[0];
    if(k>=points.length)return points[points.length-1];
    return points[k];
  }
  for(var i=0;i<points.length-1;i++){
    var p0=get(i-1),p1=get(i),p2=get(i+1),p3=get(i+2);
    for(var s=1;s<=count;s++){
      var t=s/count,t2=t*t,t3=t2*t;
      var x=.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
      var y=.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
      out.push({x:x,y:y,_control:s===count});
    }
  }
  return out;
}
function canvasPoints(i){
  var sol=solve(i);
  if(!sol.ok)return[];
  var route=[sol.startPoint].concat(sol.points);
  if(sol.startCorner!==(i)){
    route=route.slice().reverse();
  }
  var canvasRoute=route.map(function(p){return toCanvas(i,p,sol)});
  return catmull(canvasRoute,14);
}
function sampledLengthCm(i){
  var sol=solve(i);
  if(!sol.ok)return sideLen(i);
  var j=(i+1)%pts.length;
  var route=[sol.startPoint].concat(sol.points);
  if(sol.startCorner!==i)route=route.slice().reverse();
  var full=[sol.sideStart].concat(route).concat([sol.sideEnd]);
  var sum=0;
  for(var k=1;k<full.length;k++)sum+=Math.hypot(full[k].x-full[k-1].x,full[k].y-full[k-1].y);
  return sum;
}

window.A·CEILCurveMeasureGeometryV302={
  solve:solve,
  circleIntersections:circleIntersections,
  canvasPoints:canvasPoints
};
window._isArcSide=function(i){return hasMeasure(i)||(typeof oldIsArc==="function"&&oldIsArc(i))};
window._sideArcCanvasPts=function(i){return hasMeasure(i)?canvasPoints(i):(typeof oldCanvasPts==="function"?oldCanvasPts(i):[])};
window._sideEffectiveLenCm=function(i){return hasMeasure(i)?sampledLengthCm(i):(typeof oldEffective==="function"?oldEffective(i):sideLen(i))};
window._sideCurveLenCm=window._sideEffectiveLenCm;

/* Keep local bindings used by draw() in sync with the new implementation. */
try{
  _isArcSide=window._isArcSide;
  _sideArcCanvasPts=window._sideArcCanvasPts;
  _sideEffectiveLenCm=window._sideEffectiveLenCm;
  _sideCurveLenCm=window._sideCurveLenCm;
}catch(_){window.__diagSilent&&window.__diagSilent(_)}
})();
