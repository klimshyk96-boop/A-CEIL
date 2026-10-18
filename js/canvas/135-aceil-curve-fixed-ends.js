(function(){
"use strict";
if(window.__A·CEILCurveGeometryV306)return;
window.__A·CEILCurveGeometryV306=true;

function num(v){
  v=Number(String(v==null?"":v).replace(",","."));
  return Number.isFinite(v)?v:0;
}
function distance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
function sideLen(i){
  try{return Math.max(1,num(typeof _sideLenCm==="function"?_sideLenCm(i):lengths[i]))}
  catch(_){return 1}
}
function sourceGeometry(i){
  var n=pts.length,j=(i+1)%n;
  if(Array.isArray(realPts)&&realPts.length===n&&realPts.every(function(p){
    return p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y));
  }))return realPts.map(function(p){return{x:num(p.x),y:num(p.y)}});
  var a=pts[i],b=pts[j],px=distance(a,b)||1,scale=sideLen(i)/px;
  return pts.map(function(p){return{x:(p.x-a.x)*scale,y:(p.y-a.y)*scale}});
}
function rawFor(i){
  try{return Array.isArray(arcPoints[i])?arcPoints[i]:null}catch(_){return null}
}
function isMeasure(raw){
  return !!(raw&&raw[0]&&raw[0].model==="measure-points"&&raw[0].data);
}
function localPoint(a,b,d,o){
  var dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
  return{x:a.x+dx/L*d-dy/L*o,y:a.y+dy/L*d+dx/L*o};
}
function sideSign(p,a,b){
  var cross=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
  return Math.abs(cross)<1e-6?0:(cross>0?1:-1);
}
function legacyToMeasure(i,raw){
  if(!Array.isArray(raw)||!raw.length)return null;
  var L=sideLen(i),start=0,end=L,controls=[];
  raw.forEach(function(p){
    if(!p)return;
    if(p.role==="start")start=Math.max(0,Math.min(L,num(p.d)));
    else if(p.role==="end")end=Math.max(0,Math.min(L,num(p.d)));
    else if(p.role==="control"||Number.isFinite(Number(p.d)))controls.push({d:num(p.d),o:num(p.o)});
  });
  if(end<start){var swap=start;start=end;end=swap}
  controls=controls.filter(function(p){return p.d>=start&&p.d<=end}).sort(function(a,b){return a.d-b.d});
  if(!controls.length)return null;
  var rp=sourceGeometry(i),a=rp[i],b=rp[(i+1)%rp.length],anchorIndex=(i-1+rp.length)%rp.length;
  var previous=localPoint(a,b,start,0),points=controls.map(function(control){
    var p=localPoint(a,b,control.d,control.o),item={
      arcLen:+distance(previous,p).toFixed(2),
      diagCorner:anchorIndex,
      diag:+distance(rp[anchorIndex],p).toFixed(2),
      sideHint:sideSign(p,a,b)
    };
    previous=p;
    return item;
  });
  return{version:2,startCorner:i,startOffset:+start.toFixed(2),endOffset:+(L-end).toFixed(2),points:points};
}
function dataFor(i,migrate){
  var raw=rawFor(i);
  if(isMeasure(raw)){
    var data=raw[0].data;
    if(data.endOffset==null)data.endOffset=0;
    if(data.version==null)data.version=2;
    return data;
  }
  var converted=legacyToMeasure(i,raw);
  if(converted&&migrate!==false){
    arcPoints[i]=[{model:"measure-points",data:converted}];
  }
  return converted;
}
function circles(c0,r0,c1,r1){
  var dx=c1.x-c0.x,dy=c1.y-c0.y,d=Math.hypot(dx,dy);
  if(!(d>0)||d>r0+r1+.01||d<Math.abs(r0-r1)-.01)return[];
  var along=(r0*r0-r1*r1+d*d)/(2*d),height2=r0*r0-along*along;
  if(height2<0&&height2>-.05)height2=0;
  if(height2<0)return[];
  var height=Math.sqrt(height2),x=c0.x+along*dx/d,y=c0.y+along*dy/d;
  return[
    {x:x-dy*height/d,y:y+dx*height/d},
    {x:x+dy*height/d,y:y-dx*height/d}
  ];
}
function projection(p,a,b){
  var dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
  return((p.x-a.x)*dx+(p.y-a.y)*dy)/den;
}
function choose(candidates,item,previous,previousPrevious,end,a,b){
  if(!candidates.length)return null;
  var previousT=projection(previous,a,b),wantedSign=num(item.sideHint);
  function score(p){
    var t=projection(p,a,b),value=distance(p,end);
    if(t<previousT-.01)value+=(previousT-t)*10000;
    if(t>1.15)value+=(t-1.15)*5000;
    if(wantedSign&&sideSign(p,a,b)!==wantedSign)value+=100000;
    if(previousPrevious){
      var ux=previous.x-previousPrevious.x,uy=previous.y-previousPrevious.y;
      var vx=p.x-previous.x,vy=p.y-previous.y;
      var ul=Math.hypot(ux,uy),vl=Math.hypot(vx,vy);
      if(ul&&vl){
        var cosine=Math.max(-1,Math.min(1,(ux*vx+uy*vy)/(ul*vl)));
        value+=(1-cosine)*120;
      }
    }
    return value;
  }
  return candidates.slice().sort(function(x,y){return score(x)-score(y)})[0];
}
function solveWithData(i,data){
  if(!data||!Array.isArray(data.points)||!data.points.length)return{ok:false,error:"no_points",points:[]};
  var n=pts.length,j=(i+1)%n,rp=sourceGeometry(i),startIndex=Number(data.startCorner);
  if(startIndex!==i&&startIndex!==j)startIndex=i;
  var endIndex=startIndex===i?j:i,startVertex=rp[startIndex],endVertex=rp[endIndex];
  var dx=endVertex.x-startVertex.x,dy=endVertex.y-startVertex.y,L=Math.hypot(dx,dy)||1;
  var startOffset=Math.max(0,Math.min(L,num(data.startOffset)));
  var endOffset=Math.max(0,Math.min(L,num(data.endOffset)));
  if(startOffset+endOffset>=L-.01)return{ok:false,error:"offsets_overlap",points:[]};
  var start={x:startVertex.x+dx/L*startOffset,y:startVertex.y+dy/L*startOffset};
  var end={x:endVertex.x-dx/L*endOffset,y:endVertex.y-dy/L*endOffset};
  var controls=[],previous=start,previousPrevious=null;
  for(var k=0;k<data.points.length;k++){
    var item=data.points[k]||{},segment=num(item.arcLen),diagonal=num(item.diag),anchor=rp[Number(item.diagCorner)];
    if(!(segment>0)||!(diagonal>0)||!anchor)return{ok:false,error:"invalid_point",index:k,points:controls};
    var candidates=circles(previous,segment,anchor,diagonal);
    if(!candidates.length)return{ok:false,error:"no_intersection",index:k,points:controls};
    var point=choose(candidates,item,previous,previousPrevious,end,startVertex,endVertex);
    controls.push({x:point.x,y:point.y,label:"C"+(k+1),sideHint:sideSign(point,startVertex,endVertex)});
    previousPrevious=previous;previous=point;
  }
  return{
    ok:true,startCorner:startIndex,endCorner:endIndex,start:start,end:end,controls:controls,
    real:rp,sideStart:rp[i],sideEnd:rp[j],startOffset:startOffset,endOffset:endOffset
  };
}
function solve(i){return solveWithData(i,dataFor(i,true))}

/* Centripetal Catmull-Rom passes through every measured point and avoids the
   large overshoot produced by the previous uniform spline. */
function sampleSpline(knots,steps){
  if(knots.length<2)return knots.slice();
  if(knots.length===2)return knots.slice();
  var result=[{x:knots[0].x,y:knots[0].y,_control:true}],count=Math.max(12,steps||20);
  function at(k){
    if(k<0)return{x:2*knots[0].x-knots[1].x,y:2*knots[0].y-knots[1].y};
    if(k>=knots.length){var z=knots.length-1;return{x:2*knots[z].x-knots[z-1].x,y:2*knots[z].y-knots[z-1].y}}
    return knots[k];
  }
  function tj(t,p,q){return t+Math.sqrt(Math.max(distance(p,q),.0001))}
  function lerp(p,q,a,b,t){var den=b-a||1;return{x:(b-t)/den*p.x+(t-a)/den*q.x,y:(b-t)/den*p.y+(t-a)/den*q.y}}
  for(var i=0;i<knots.length-1;i++){
    var p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
    var t0=0,t1=tj(t0,p0,p1),t2=tj(t1,p1,p2),t3=tj(t2,p2,p3);
    for(var s=1;s<=count;s++){
      var t=t1+(t2-t1)*s/count;
      var a1=lerp(p0,p1,t0,t1,t),a2=lerp(p1,p2,t1,t2,t),a3=lerp(p2,p3,t2,t3,t);
      var b1=lerp(a1,a2,t0,t2,t),b2=lerp(a2,a3,t1,t3,t),p=lerp(b1,b2,t1,t2,t);
      p._control=s===count;
      result.push(p);
    }
  }
  return result;
}
function curveRealPoints(i){
  var solution=solve(i);
  if(!solution.ok)return[];
  var route=[solution.start].concat(solution.controls).concat([solution.end]);
  var sampled=sampleSpline(route,20);
  if(solution.startCorner!==i)sampled.reverse();
  return sampled;
}
function fullRealSide(i){
  var rp=sourceGeometry(i),curve=curveRealPoints(i);
  if(!curve.length)return[rp[i],rp[(i+1)%rp.length]];
  return[rp[i]].concat(curve).concat([rp[(i+1)%rp.length]]).filter(function(p,k,list){
    return k===0||distance(p,list[k-1])>.0001;
  });
}
function toCanvas(i,p,real){
  var j=(i+1)%pts.length,ra=real[i],rb=real[j],ca=pts[i],cb=pts[j];
  var rdx=rb.x-ra.x,rdy=rb.y-ra.y,rd=Math.hypot(rdx,rdy)||1;
  var cdx=cb.x-ca.x,cdy=cb.y-ca.y,cd=Math.hypot(cdx,cdy)||1;
  var ux=rdx/rd,uy=rdy/rd,nx=-uy,ny=ux,cux=cdx/cd,cuy=cdy/cd,cnx=-cuy,cny=cux,scale=cd/rd;
  var along=(p.x-ra.x)*ux+(p.y-ra.y)*uy,offset=(p.x-ra.x)*nx+(p.y-ra.y)*ny;
  return{x:ca.x+cux*along*scale+cnx*offset*scale,y:ca.y+cuy*along*scale+cny*offset*scale,_control:!!p._control};
}
function canvasPoints(i){
  var real=sourceGeometry(i),path=fullRealSide(i);
  return path.slice(1,-1).map(function(p){return toCanvas(i,p,real)});
}
function pathLength(list){
  var total=0;for(var k=1;k<list.length;k++)total+=distance(list[k-1],list[k]);return total;
}
function curveLength(i){return pathLength(curveRealPoints(i))}
function effectiveLength(i){return pathLength(fullRealSide(i))}
function active(i){
  try{return wallTypes[i]==="arc"&&!!dataFor(i,true)&&solve(i).ok}catch(_){return false}
}
function totalCurve(){
  var total=0;try{for(var i=0;i<pts.length;i++)if(active(i))total+=curveLength(i)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return total;
}
function boundaryRealPoints(){
  if(!Array.isArray(pts)||pts.length<3)return[];
  var rp=sourceGeometry(0),out=[rp[0]];
  for(var i=0;i<pts.length;i++){
    var side=active(i)?fullRealSide(i):[rp[i],rp[(i+1)%rp.length]];
    for(var k=1;k<side.length;k++)out.push(side[k]);
  }
  if(out.length>1&&distance(out[0],out[out.length-1])<.0001)out.pop();
  return out;
}
function areaCm2(){
  var boundary=boundaryRealPoints(),sum=0;
  if(boundary.length<3)return 0;
  for(var i=0;i<boundary.length;i++){
    var j=(i+1)%boundary.length;
    sum+=boundary[i].x*boundary[j].y-boundary[j].x*boundary[i].y;
  }
  return Math.abs(sum)/2;
}
function updateStats(){
  try{
    if(!closed||circleMode||!Array.isArray(pts)||pts.length<3)return;
    var per=document.getElementById("per"),area=document.getElementById("area");
    var perText=(_totalPerimeterCm()/100).toFixed(2);
    if(per&&per.textContent!==perText)per.textContent=perText;
    var value=areaCm2(),areaText=(value/1e4).toFixed(2);
    if(area&&value>0&&area.textContent!==areaText)area.textContent=areaText;
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
function stabilize(i){
  var data=dataFor(i,true),solution=solveWithData(i,data);
  if(!data||!solution.ok)return solution;
  solution.controls.forEach(function(point,k){if(data.points[k])data.points[k].sideHint=point.sideHint});
  data.version=2;
  return solution;
}

window.A·CEILCurveGeometryV306={
  dataFor:dataFor,
  legacyToMeasure:legacyToMeasure,
  solve:solve,
  solveData:solveWithData,
  canvasPoints:canvasPoints,
  fullRealSide:fullRealSide,
  boundaryRealPoints:boundaryRealPoints,
  curveLength:curveLength,
  effectiveLength:effectiveLength,
  active:active,
  totalCurve:totalCurve,
  areaCm2:areaCm2,
  stabilize:stabilize,
  updateStats:updateStats
};
window.A·CEILCurveFixedEndsV305=window.A·CEILCurveGeometryV306;

setTimeout(function(){
  try{
    for(var i=0;i<(pts||[]).length;i++)if(wallTypes[i]==="arc")dataFor(i,true);
    updateStats();
    if(typeof MutationObserver!=="undefined"){
      var observer=new MutationObserver(function(){updateStats()});
      [document.getElementById("per"),document.getElementById("area")].forEach(function(node){
        if(node)observer.observe(node,{childList:true,characterData:true,subtree:true});
      });
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
},0);
})();
