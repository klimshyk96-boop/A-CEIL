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
  if(data&&Number(data.version)===3)return solveSegments(i,data);
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
var solutionCache={};
function solve(i){
  var data=dataFor(i,true);
  if(!data||Number(data.version)!==3)return solveWithData(i,data);
  var key=JSON.stringify([data,pts,realPts,lengths]);
  if(!solutionCache[i]||solutionCache[i].key!==key)solutionCache[i]={key:key,value:solveWithData(i,data)};
  return solutionCache[i].value;
}

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
  if(solution.segments)return segmentPath(solution);
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
  // Real coordinates may use Y-up while the canvas uses Y-down.
  if(outwardSign(real)!==outwardSign(pts))offset=-offset;
  return{x:ca.x+cux*along*scale+cnx*offset*scale,y:ca.y+cuy*along*scale+cny*offset*scale,_control:!!p._control};
}
function canvasPoints(i){
  var real=sourceGeometry(i),path=fullRealSide(i);
  return path.slice(1,-1).map(function(p){return toCanvas(i,p,real)});
}
function pathLength(list){
  var total=0;for(var k=1;k<list.length;k++)total+=distance(list[k-1],list[k]);return total;
}
function curveLength(i){
  var solution=solve(i);
  if(solution.ok&&solution.segments)return solution.segments.reduce(function(sum,item,k){
    return sum+(num(item.curveCm)>0?num(item.curveCm):pathLength(segmentSamples(solution,k)));
  },0);
  return pathLength(curveRealPoints(i));
}
function effectiveLength(i){var data=dataFor(i,true);return data&&Number(data.version)===3?curveLength(i):pathLength(fullRealSide(i))}
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
    updateCurveWarning();
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
  if(Number(data.version)!==3)data.version=2;
  return solution;
}

// Version 3 stores chords and tape lengths separately. Base corner indices and
// existing diagonal keys never change when virtual contour points are added.
function currentState(){return{pts:pts,realPts:realPts,lengths:lengths,wallTypes:wallTypes,arcPoints:arcPoints}}
function letters(index){var out="";for(index++;index>0;index=Math.floor((index-1)/26))out=String.fromCharCode(65+(index-1)%26)+out;return out}
function segmentData(state,i){
  var raw=state.arcPoints&&state.arcPoints[i],data=raw&&raw[0]&&raw[0].data;
  return state.wallTypes&&state.wallTypes[i]==="arc"&&data&&Number(data.version)===3?data:null;
}
function labels(state,draftSide,draftData){
  state=state||currentState();var corners=[],controls=[],count=0;
  for(var i=0;i<(state.pts||[]).length;i++){
    corners[i]=letters(count++);
    var data=i===draftSide?draftData:segmentData(state,i);
    controls[i]=(data&&data.points||[]).map(function(){return letters(count++)});
  }
  return{corners:corners,controls:controls};
}
function cornerLabel(i,state){return labels(state).corners[i]||letters(i)}
function hasSegments(state){state=state||currentState();return(state.pts||[]).some(function(_,i){return !!segmentData(state,i)})}
function outwardSign(poly){var area=0;for(var i=0;i<poly.length;i++){var q=poly[(i+1)%poly.length];area+=poly[i].x*q.y-q.x*poly[i].y}return area>=0?-1:1}
function solveSegments(i,data){
  var rp=sourceGeometry(i),a=rp[i],b=rp[(i+1)%rp.length],items=data.points||[],segments=items.concat([{chordCm:data.endChordCm,curveCm:data.endCurveCm}]);
  if(!items.length||items.length>24)return{ok:false,error:"no_points"};
  for(var k=0;k<segments.length;k++){
    var chord=num(segments[k].chordCm),arc=num(segments[k].curveCm);
    if(!(chord>0))return{ok:false,error:"invalid_chord",index:k};
    if(arc>0&&(arc<chord-.01||arc>chord*Math.PI/2+.01))return{ok:false,error:"invalid_arc",index:k};
    if(k<items.length&&num(items[k].diag)>0&&(!rp[Number(items[k].diagCorner)]||num(items[k].diag)<0))return{ok:false,error:"invalid_diagonal",index:k};
  }
  var total=segments.reduce(function(sum,p){return sum+num(p.chordCm)},0),L=distance(a,b),longest=Math.max.apply(null,segments.map(function(p){return num(p.chordCm)}));
  if(!(L>.01))return{ok:false,error:"invalid_chord"};
  if(total<L-.01||longest>total-longest+L+.01)return{ok:false,error:"no_intersection"};
  var sign=num(data.bulgeSign)||outwardSign(rp),ux=(b.x-a.x)/L,uy=(b.y-a.y)/L,best=null;
  // Several seeds disambiguate the two circle intersections without making
  // an optional missing diagonal into a fabricated measurement.
  [1,-1,.3,2].forEach(function(seed){
    var walk=0,path=[{x:a.x,y:a.y}];
    items.forEach(function(item,k){
      walk+=num(item.chordCm);var t=walk/total,offset=Math.max(L*.025,Math.sqrt(Math.max(0,total*total-L*L))*.5)*Math.sin(Math.PI*t)*sign*seed;
      path.push({x:a.x+(b.x-a.x)*t-uy*offset,y:a.y+(b.y-a.y)*t+ux*offset});
    });path.push({x:b.x,y:b.y});
    function project(p,q,target,movableP,movableQ){
      var dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,weight=(d-target)/d/((movableP?1:0)+(movableQ?1:0));
      if(movableP){p.x+=dx*weight;p.y+=dy*weight}
      if(movableQ){q.x-=dx*weight;q.y-=dy*weight}
    }
    var error=Infinity;
    for(var iter=0;iter<1800;iter++){
      for(var s=0;s<segments.length;s++)project(path[s],path[s+1],num(segments[s].chordCm),s>0,s+1<path.length-1);
      items.forEach(function(item,k){if(num(item.diag)>0)project(path[k+1],rp[Number(item.diagCorner)],num(item.diag),true,false)});
      error=0;
      segments.forEach(function(item,k){error=Math.max(error,Math.abs(distance(path[k],path[k+1])-num(item.chordCm)))});
      items.forEach(function(item,k){if(num(item.diag)>0)error=Math.max(error,Math.abs(distance(path[k+1],rp[Number(item.diagCorner)])-num(item.diag)))});
      if(error<.005)break;
    }
    var wrong=path.slice(1,-1).filter(function(p){return sideSign(p,a,b)!==sign}).length;
    var score=error+(wrong?100:0);
    if(!best||score<best.score)best={score:score,error:error,path:path};
  });
  if(!best||best.error>.25)return{ok:false,error:"no_intersection",maxError:best&&best.error};
  var controls=best.path.slice(1,-1).map(function(p,k){return{x:p.x,y:p.y,id:items[k].id,sideHint:sideSign(p,a,b)}});
  return{ok:true,startCorner:i,endCorner:(i+1)%rp.length,start:a,end:b,controls:controls,real:rp,sideStart:a,sideEnd:b,startOffset:0,endOffset:0,segments:segments,path:best.path,bulgeSign:sign,
    approximate:items.filter(function(p){return num(p.diag)>0}).length<items.length||segments.some(function(p){return !(num(p.curveCm)>0)}),maxError:best.error};
}
function segmentSamples(solution,k){
  var a=solution.path[k],b=solution.path[k+1],chord=distance(a,b),arc=num(solution.segments[k].curveCm);
  if(!(arc>0))return sampleSpline(solution.path,32).slice(k*32,k*32+33);
  if(arc<=chord+.001)return[a,b];
  var lo=0,hi=Math.PI;
  for(var j=0;j<45;j++){var mid=(lo+hi)/2;if(mid/(2*Math.sin(mid/2))<arc/chord)lo=mid;else hi=mid}
  var theta=(lo+hi)/2,radius=chord/(2*Math.sin(theta/2)),ux=(b.x-a.x)/chord,uy=(b.y-a.y)/chord,sign=solution.bulgeSign;
  var prev=solution.path[Math.max(0,k-1)],next=solution.path[Math.min(solution.path.length-1,k+2)],turn=(b.x-prev.x)*(next.y-a.y)-(b.y-prev.y)*(next.x-a.x);
  if(Math.abs(turn)>.001)sign=turn>0?-1:1;
  var result=[];
  for(var s=0;s<=64;s++){var angle=theta*(s/64-.5),x=radius*Math.sin(angle),y=sign*radius*(Math.cos(angle)-Math.cos(theta/2));result.push({x:(a.x+b.x)/2+ux*x-uy*y,y:(a.y+b.y)/2+uy*x+ux*y,_control:s===0||s===64})}
  result[0]={x:a.x,y:a.y,_control:true};result[64]={x:b.x,y:b.y,_control:true};return result;
}
function segmentPath(solution){var result=[];solution.segments.forEach(function(_,k){result=result.concat(segmentSamples(solution,k).slice(k?1:0))});return result}
function measurementRows(state){
  state=state||currentState();var map=labels(state),out=[];
  for(var i=0;i<(state.pts||[]).length;i++){
    var j=(i+1)%state.pts.length,data=segmentData(state,i);
    if(data){
      var names=[map.corners[i]].concat(map.controls[i],[map.corners[j]]);
      data.points.concat([{chordCm:data.endChordCm,curveCm:data.endCurveCm}]).forEach(function(p,k){out.push({side:i,label:names[k]+names[k+1],chordCm:num(p.chordCm),curveCm:num(p.curveCm),curved:true})});
    }else out.push({side:i,label:map.corners[i]+map.corners[j],chordCm:num((state.lengths||[])[i]),curved:false});
  }
  return out;
}
function diagonalRows(state){
  state=state||currentState();var map=labels(state),out=[];
  for(var i=0;i<(state.pts||[]).length;i++){var data=segmentData(state,i);if(data)data.points.forEach(function(p,k){if(num(p.diag)>0)out.push({label:map.corners[Number(p.diagCorner)]+map.controls[i][k],value:num(p.diag),side:i,id:p.id})})}
  return out;
}
var lastCapture=null,reportCaptures=new Map();
function captureImage(){
  var src=cv.toDataURL('image/png');
  if(lastCapture){reportCaptures.set(src,JSON.parse(JSON.stringify(lastCapture)));while(reportCaptures.size>8)reportCaptures.delete(reportCaptures.keys().next().value)}
  return src;
}
function drawAnnotations(c){
  var map=labels(),scale=1/Math.max(.65,Math.abs(Number(viewScale))||1);
  var matrix=c.getTransform(),captured={points:[],diagonals:[],showDiagonals:!_reportMode||((typeof _loadRS==='function'?_loadRS():{}).diagonals===true)};
  function pixel(p){return{x:matrix.a*p.x+matrix.c*p.y+matrix.e,y:matrix.b*p.x+matrix.d*p.y+matrix.f}}
  pts.forEach(function(p,i){captured.points.push(Object.assign(pixel(p),{label:map.corners[i]}))});
  c.save();c.textAlign="center";c.textBaseline="middle";
  for(var i=0;i<pts.length;i++){
    var data=segmentData(currentState(),i);if(!data)continue;var solution=solve(i);if(!solution.ok)continue;
    solution.controls.forEach(function(p,k){
      var q=toCanvas(i,p,solution.real),item=data.points[k];
      captured.points.push(Object.assign(pixel(q),{label:map.controls[i][k]}));
      if(num(item.diag)>0)captured.diagonals.push({a:pixel(pts[Number(item.diagCorner)]),b:pixel(q),label:map.corners[Number(item.diagCorner)]+map.controls[i][k],value:num(item.diag)});
      if(_reportMode)return;
      if(num(item.diag)>0&&(!_reportMode||((typeof _loadRS==='function'?_loadRS():{}).diagonals!==false))){
        var anchor=pts[Number(item.diagCorner)];c.strokeStyle="#b45309";c.lineWidth=scale;c.setLineDash([5*scale,4*scale]);c.beginPath();c.moveTo(anchor.x,anchor.y);c.lineTo(q.x,q.y);c.stroke();c.setLineDash([]);
        var text=map.corners[Number(item.diagCorner)]+map.controls[i][k]+" "+window._formatReportCm(item.diag)+" см",mx=(anchor.x+q.x)/2,my=(anchor.y+q.y)/2;
        c.font=11*scale+"px Arial";var width=c.measureText(text).width+10*scale;c.fillStyle="rgba(255,251,235,.94)";c.fillRect(mx-width/2,my-9*scale,width,18*scale);c.fillStyle="#92400e";c.fillText(text,mx,my);
      }
      c.fillStyle="#7c3aed";c.beginPath();c.arc(q.x,q.y,4*scale,0,Math.PI*2);c.fill();
      // Use the normal of the base side to keep labels clear of measured points.
      var ca=pts[i],cb=pts[(i+1)%pts.length],len=distance(ca,cb)||1,sign=solution.bulgeSign*(outwardSign(solution.real)!==outwardSign(pts)?-1:1),nx=-(cb.y-ca.y)/len*sign,ny=(cb.x-ca.x)/len*sign;
      c.font="700 "+16*scale+"px Arial";c.lineWidth=4*scale;c.strokeStyle="white";c.strokeText(map.controls[i][k],q.x+nx*19*scale,q.y+ny*19*scale);c.fillStyle="#5b21b6";c.fillText(map.controls[i][k],q.x+nx*19*scale,q.y+ny*19*scale);
    });
  }
  c.restore();
  lastCapture=hasSegments()?captured:null;
  if(!_reportMode)updateCurveWarning();
}
function updateCurveWarning(){
  var needs=false;
  for(var i=0;i<(pts||[]).length;i++)if(segmentData(currentState(),i)){var result=solve(i);if(result.ok&&result.approximate)needs=true}
  var el=document.getElementById("aceilCurveWarningV3");
  if(!el){
    var canvas=document.getElementById("cv");if(!canvas||!canvas.parentElement)return;
    el=document.createElement("button");el.id="aceilCurveWarningV3";el.type="button";el.textContent="⚠";
    el.title="Форма кривої наближена";el.setAttribute("aria-label",el.title);
    el.style.cssText="position:absolute;right:16px;top:86px;width:36px;height:36px;border:1px solid #eab308;border-radius:50%;background:#fef9c3;color:#854d0e;z-index:5;font-size:21px";
    el.onclick=function(){showToast("Форма кривої наближена: додай діагональ до кожної точки та довжини всіх ділянок по кривій. Хорди й введені довжини зберігаються окремо.",6500)};
    canvas.parentElement.appendChild(el);
  }
  if(el.hidden===needs)el.hidden=!needs;
}

window.A·CEILCurveGeometryV306={
  labels:labels,
  cornerLabel:cornerLabel,
  hasSegments:hasSegments,
  outwardSign:function(){return outwardSign(sourceGeometry(0))},
  measurementRows:measurementRows,
  diagonalRows:diagonalRows,
  drawAnnotations:drawAnnotations,
  captureImage:captureImage,
  reportCapture:function(src){return reportCaptures.get(src)},
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
