
(function(){
"use strict";
if(window.__A·CEILSmartAlignV347)return;
window.__A·CEILSmartAlignV347=true;

var S={active:false,qty:5,taps:[],previewAligned:[],aligned:[],groups:[],canvas:null,suppressUntil:0};

function gid(x){return document.getElementById(x)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function poly(){try{return Array.isArray(pts)?pts.map(function(p){return{x:+p.x,y:+p.y}}):[]}catch(_){return[]}}
function pointIn(p,P){
  try{if(window.A·CEILUtils&&A·CEILUtils.pointInPolygon)return A·CEILUtils.pointInPolygon(p,P)}catch(_){}
  var inside=false;for(var i=0,j=P.length-1;i<P.length;j=i++){var a=P[i],b=P[j];if(((a.y>p.y)!=(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y||1e-9)+a.x))inside=!inside}return inside;
}
function dominantRoomAngle(P){
  var sx=0,sy=0;
  for(var i=0;i<P.length;i++){var a=P[i],b=P[(i+1)%P.length],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<3)continue;var q=4*Math.atan2(dy,dx);sx+=L*Math.cos(q);sy+=L*Math.sin(q)}
  return .25*Math.atan2(sy,sx);
}
function pcaAngle(A){
  var mx=0,my=0;A.forEach(function(p){mx+=p.x;my+=p.y});mx/=A.length;my/=A.length;
  var xx=0,yy=0,xy=0;A.forEach(function(p){var x=p.x-mx,y=p.y-my;xx+=x*x;yy+=y*y;xy+=x*y});
  return .5*Math.atan2(2*xy,xx-yy);
}
function normAng(a){while(a>Math.PI/2)a-=Math.PI;while(a<=-Math.PI/2)a+=Math.PI;return a}
function angDiff(a,b){var x=Math.abs(normAng(a-b));return Math.min(x,Math.PI-x)}
function project(p,a){var c=Math.cos(a),s=Math.sin(a);return{u:p.x*c+p.y*s,v:-p.x*s+p.y*c}}
function unproject(q,a){var c=Math.cos(a),s=Math.sin(a);return{x:q.u*c-q.v*s,y:q.u*s+q.v*c}}
function median(arr){if(!arr.length)return 0;var a=arr.slice().sort(function(x,y){return x-y}),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function nearestMedian(A){
  var n=[];for(var i=0;i<A.length;i++){var best=Infinity;for(var j=0;j<A.length;j++)if(i!==j)best=Math.min(best,d(A[i],A[j]));if(isFinite(best))n.push(best)}return median(n)||50;
}
function globalPxPerCm(){
  try{if(typeof _pxPerCm==="function"){var p=+_pxPerCm();if(isFinite(p)&&p>0)return p}}catch(_){}
  return 1;
}
function niceCm(v){
  /* No setting for the user: keep their intent, only clean the dimension.
     57 -> 55, 62 -> 60, 78 -> 80 etc. */
  if(!isFinite(v)||v<=0)return 0;
  var step=v<30?2.5:5;
  return Math.max(step,Math.round(v/step)*step);
}
function wallPxPerCm(i,P){
  try{
    var a=P[i],b=P[(i+1)%P.length],cm=Array.isArray(lengths)?+lengths[i]||0:0;
    if(a&&b&&cm>0){var px=Math.hypot(b.x-a.x,b.y-a.y)/cm;if(isFinite(px)&&px>0)return px}
  }catch(_){}
  return globalPxPerCm();
}
function pointSegDist(p,a,b){
  var vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y,vv=vx*vx+vy*vy;
  if(vv<1e-9)return d(p,a);
  var t=clamp((wx*vx+wy*vy)/vv,0,1),x=a.x+t*vx,y=a.y+t*vy;
  return Math.hypot(p.x-x,p.y-y);
}
function nearestWallIndex(p,P){
  var best=0,bd=Infinity;
  for(var i=0;i<P.length;i++){
    var dd=pointSegDist(p,P[i],P[(i+1)%P.length]);
    if(dd<bd){bd=dd;best=i}
  }
  return best;
}
function lineIntervals(P,a,v){
  /* Rotate the polygon into row coordinates and intersect it with v=const. */
  var Q=P.map(function(p){return project(p,a)}),xs=[];
  for(var i=0;i<Q.length;i++){
    var A=Q[i],B=Q[(i+1)%Q.length];
    if((A.v<=v&&B.v>v)||(B.v<=v&&A.v>v)){
      xs.push(A.u+(v-A.v)*(B.u-A.u)/(B.v-A.v));
    }
  }
  xs.sort(function(x,y){return x-y});
  var out=[];for(var k=0;k+1<xs.length;k+=2)if(xs[k+1]-xs[k]>2)out.push([xs[k],xs[k+1]]);
  return out;
}
function intervalForU(P,a,v,u){
  var ints=lineIntervals(P,a,v),best=null,bd=Infinity;
  ints.forEach(function(ab){
    if(u>=ab[0]&&u<=ab[1]){best=ab;bd=0;return}
    var dd=Math.min(Math.abs(u-ab[0]),Math.abs(u-ab[1]));
    if(dd<bd){bd=dd;best=ab}
  });
  return best;
}
function snapRowVToParallelWall(g,a,meanV,P){
  if(!g.length)return meanV;
  var uMid=g.reduce(function(s,q){return s+q.u},0)/g.length;
  var center=unproject({u:uMid,v:meanV},a),best=null;
  for(var i=0;i<P.length;i++){
    var A=P[i],B=P[(i+1)%P.length],wa=Math.atan2(B.y-A.y,B.x-A.x);
    if(angDiff(wa,a)>12*Math.PI/180)continue;
    var vx=B.x-A.x,vy=B.y-A.y,vv=vx*vx+vy*vy;if(vv<1e-9)continue;
    var t=((center.x-A.x)*vx+(center.y-A.y)*vy)/vv;
    if(t<-.12||t>1.12)continue;
    var proj={x:A.x+clamp(t,0,1)*vx,y:A.y+clamp(t,0,1)*vy},dd=d(center,proj);
    if(!best||dd<best.dd)best={i:i,A:A,B:B,proj:proj,dd:dd};
  }
  if(!best)return meanV;
  var pxcm=wallPxPerCm(best.i,P),cm=best.dd/pxcm,targetCm=niceCm(cm);
  if(!targetCm)return meanV;
  var wallQ1=project(best.A,a),wallQ2=project(best.B,a),wallV=(wallQ1.v+wallQ2.v)/2;
  var sign=meanV>=wallV?1:-1,targetV=wallV+sign*targetCm*pxcm;
  /* Do not allow a clean-number correction to jump far away from the user's sketch. */
  if(Math.abs(targetV-meanV)>Math.max(18,20*globalPxPerCm()))return meanV;
  var testU=g.map(function(q){return q.u}),ok=true;
  for(var j=0;j<testU.length;j++)if(!pointIn(unproject({u:testU[j],v:targetV},a),P)){ok=false;break}
  return ok?targetV:meanV;
}
function snapRowSpan(g,a,rowV,P){
  if(g.length<2)return null;
  var us=g.map(function(q){return q.u}).sort(function(x,y){return x-y}),uMid=(us[0]+us[us.length-1])/2;
  var ab=intervalForU(P,a,rowV,uMid);if(!ab)return null;
  var pxcm=globalPxPerCm(),leftCm=Math.max(0,(us[0]-ab[0])/pxcm),rightCm=Math.max(0,(ab[1]-us[us.length-1])/pxcm);
  var left=ab[0]+niceCm(leftCm)*pxcm,right=ab[1]-niceCm(rightCm)*pxcm;
  /* Keep enough span for a useful row; otherwise preserve the user's outer taps. */
  if(!(right>left)||right-left<Math.max(20,(g.length-1)*8)){left=us[0];right=us[us.length-1]}
  return{left:left,right:right,bounds:ab};
}

function naturalRowGroups(A,a){
  var Q=A.map(function(p,i){var q=project(p,a);q.i=i;return q}).sort(function(x,y){return x.v-y.v});
  if(Q.length<=1)return[Q];
  var gaps=[];for(var i=1;i<Q.length;i++)gaps.push(Q[i].v-Q[i-1].v);
  var med=median(gaps),ppc=globalPxPerCm();
  /* Split only on truly visible gaps. This is intentionally generous: the user
     is sketching intent with a finger, not measuring the row. */
  var threshold=Math.max(24*ppc,med*1.60),span=Q[Q.length-1].v-Q[0].v;
  var groups=[],g=[Q[0]];
  for(var k=1;k<Q.length;k++){
    var gap=Q[k].v-Q[k-1].v;
    var split=gap>threshold && (span<1 || gap>span*.16);
    if(split){groups.push(g);g=[]}
    g.push(Q[k]);
  }
  if(g.length)groups.push(g);
  return groups;
}
function groupQuality(A,a,P){
  var groups=naturalRowGroups(A,a),ppc=globalPxPerCm(),score=0,covered=0;
  groups.forEach(function(g){
    if(g.length===1){score-=95;return}
    covered+=g.length;
    var mv=g.reduce(function(s,q){return s+q.v},0)/g.length;
    var sd=Math.sqrt(g.reduce(function(s,q){return s+(q.v-mv)*(q.v-mv)},0)/g.length)/ppc;
    var us=g.map(function(q){return q.u}),range=(Math.max.apply(null,us)-Math.min.apply(null,us))/ppc;
    var rowness=range/(range+3.5*sd+1);
    score+=g.length*210 + rowness*150 - sd*4.5;
  });
  score+=covered*35-groups.length*18;
  return{groups:groups,score:score};
}
function parallelWallIndex(center,a,P){
  var best=-1,bd=Infinity;
  for(var i=0;i<P.length;i++){
    var A=P[i],B=P[(i+1)%P.length],wa=Math.atan2(B.y-A.y,B.x-A.x);
    if(angDiff(wa,a)>15*Math.PI/180)continue;
    var dd=pointSegDist(center,A,B);if(dd<bd){bd=dd;best=i}
  }
  return best>=0?best:nearestWallIndex(center,P);
}
function cleanSignedCm(v,step){
  step=step||5;if(!isFinite(v))return v;
  var s=v<0?-1:1,a=Math.abs(v);return s*Math.round(a/step)*step;
}
function coordsFromWall(p,bi){
  try{if(typeof canvasToLightCoords==="function"){var c=canvasToLightCoords(p.x,p.y,bi);if(c&&isFinite(c.x)&&isFinite(c.y))return{x:+c.x,y:+c.y}}}catch(_){}
  return null;
}
function pointFromWall(x,y,bi){
  try{if(typeof lightCoordsToCanvas==="function"){var p=lightCoordsToCanvas(x,y,bi);if(p&&isFinite(p.x)&&isFinite(p.y))return{x:+p.x,y:+p.y}}}catch(_){}
  return null;
}
function snapSingleClean(p,P){
  var bi=nearestWallIndex(p,P),co=coordsFromWall(p,bi);if(!co)return{x:p.x,y:p.y,group:0,baseIndex:bi};
  var q=pointFromWall(cleanSignedCm(co.x,5),cleanSignedCm(co.y,5),bi);
  if(q&&pointIn(q,P))return{x:q.x,y:q.y,group:0,baseIndex:bi};
  return{x:p.x,y:p.y,group:0,baseIndex:bi};
}

function wallFrame(baseIndex){
  try{if(typeof _lightMap==="function"){var m=_lightMap(baseIndex);if(m)return m}}catch(_){}
  return null;
}
function canPlacePlanAtAbsOffset(plan,targetAbs,P){
  if(!plan||plan.kind!=="wall"||plan.g.length<2)return false;
  var sign=(plan.rawY<0||plan.rowY<0)?-1:1,rowY=sign*targetAbs;
  for(var k=0;k<plan.coords.length;k++){
    var x=plan.startX+plan.step*k,p=pointFromWall(x,rowY,plan.bi);
    if(!p||!pointIn(p,P))return false;
  }
  return true;
}
function harmonizeParallelRowOffsets(plans,P){
  var rows=plans.filter(function(p){return p&&p.kind==="wall"&&p.g.length>=2});
  if(rows.length<2)return null;
  /* Never collapse two intentional rows that both reference the same wall. */
  var uniqueWalls={};rows.forEach(function(r){uniqueWalls[r.bi]=1});
  if(Object.keys(uniqueWalls).length<2)return null;
  var vals=rows.map(function(r){return Math.abs(r.rawY)}).filter(function(v){return isFinite(v)&&v>0});
  if(vals.length!==rows.length)return null;
  var min=Math.min.apply(null,vals),max=Math.max.apply(null,vals),weighted=0,w=0;
  rows.forEach(function(r){weighted+=Math.abs(r.rawY)*r.g.length;w+=r.g.length});
  var target=niceCm(weighted/(w||1));
  /* 30 vs 50 cm is clearly one rough design intent; 30 vs 100 cm probably is not. */
  if(max-min>Math.max(40,target*.65))return null;
  var candidates=[target,target-5,target+5,target-10,target+10,target-15,target+15]
    .filter(function(v){return v>=10})
    .map(function(v){return niceCm(v)});
  var seen={},best=null,bestCost=Infinity;
  candidates.forEach(function(c){
    if(seen[c])return;seen[c]=1;
    if(!rows.every(function(r){return canPlacePlanAtAbsOffset(r,c,P)}))return;
    var cost=rows.reduce(function(s,r){return s+Math.abs(Math.abs(r.rawY)-c)*r.g.length},0);
    if(cost<bestCost){bestCost=cost;best=c}
  });
  if(best==null)return null;
  rows.forEach(function(r){r.rowY=(r.rawY<0?-1:1)*best;r.commonWallOffsetCm=best});
  return best;
}
function buildRowPlan(g,gi,a,P,A){
  g.sort(function(x,y){return x.u-y.u});
  if(g.length===1)return{kind:"single",g:g,gi:gi};
  var center={x:0,y:0};g.forEach(function(q){center.x+=A[q.i].x;center.y+=A[q.i].y});center.x/=g.length;center.y/=g.length;
  var bi=parallelWallIndex(center,a,P),coords=g.map(function(q){var co=coordsFromWall(A[q.i],bi);return{q:q,co:co}}),valid=coords.every(function(z){return z.co});
  if(!valid)return{kind:"canvas",g:g,gi:gi};
  coords.sort(function(x,y){return x.co.x-y.co.x});
  var rawY=coords.reduce(function(s,z){return s+z.co.y},0)/coords.length,rowY=cleanSignedCm(rawY,5);
  var minX=coords[0].co.x,maxX=coords[coords.length-1].co.x,rawStep=(maxX-minX)/(coords.length-1);
  var step=Math.max(5,Math.abs(cleanSignedCm(rawStep,5))),centerX=cleanSignedCm((minX+maxX)/2,2.5),startX=centerX-step*(coords.length-1)/2;
  return{kind:"wall",g:g,gi:gi,bi:bi,coords:coords,rawY:rawY,rowY:rowY,step:step,startX:startX,centerX:centerX};
}

function alignAtAngle(A,a,P){
  var info=groupQuality(A,a,P),groups=info.groups,out=new Array(A.length),movement=0,descs=[];
  var plans=groups.map(function(g,gi){descs.push(g.length);return buildRowPlan(g,gi,a,P,A)});
  var commonOffset=harmonizeParallelRowOffsets(plans,P);
  plans.forEach(function(plan){
    var g=plan.g,gi=plan.gi;
    if(plan.kind==="single"){
      var one=snapSingleClean(A[g[0].i],P);one.group=gi;out[g[0].i]=one;movement+=d(A[g[0].i],one);return;
    }
    if(plan.kind==="wall"){
      var made=[];
      for(var k=0;k<plan.coords.length;k++){
        var x=plan.startX+plan.step*k,p=pointFromWall(x,plan.rowY,plan.bi);
        if(!p||!pointIn(p,P)){
          x=cleanSignedCm(plan.coords[k].co.x,5);p=pointFromWall(x,plan.rowY,plan.bi);
        }
        if(!p||!pointIn(p,P))p=A[plan.coords[k].q.i];
        made.push({idx:plan.coords[k].q.i,p:p});
      }
      made.forEach(function(z){out[z.idx]={x:z.p.x,y:z.p.y,group:gi,baseIndex:plan.bi,wallOffsetCm:Math.abs(plan.rowY),commonWallOffsetCm:plan.commonWallOffsetCm||null};movement+=d(A[z.idx],z.p)});
      return;
    }
    /* Geometry fallback: still align and equalise even without wall coordinates. */
    var rawV=g.reduce(function(s,q){return s+q.v},0)/g.length,us=g.map(function(q){return q.u}),u0=Math.min.apply(null,us),u1=Math.max.apply(null,us);
    for(var j=0;j<g.length;j++){
      var u=u0+(u1-u0)*j/(g.length-1),p2=unproject({u:u,v:rawV},a),idx=g[j].i;
      if(!pointIn(p2,P))p2=A[idx];
      out[idx]={x:p2.x,y:p2.y,group:gi,baseIndex:nearestWallIndex(p2,P)};movement+=d(A[idx],p2);
    }
  });
  return{points:out,groups:groups,score:info.score-movement*.08,movement:movement,desc:descs,commonWallOffsetCm:commonOffset};
}
function segmentFit(A,start,end,room){
  var len=end-start,idxs=[],ptsSeg=[];
  for(var i=start;i<end;i++){idxs.push(i);ptsSeg.push(A[i])}
  if(len===1)return{start:start,end:end,len:1,idxs:idxs,angle:room,cost:240};

  var raw=pcaAngle(ptsSeg),axes=[room,room+Math.PI/2],a=axes[0];
  if(angDiff(raw,axes[1])<angDiff(raw,axes[0]))a=axes[1];

  var Q=ptsSeg.map(function(p,i){var q=project(p,a);q.i=idxs[i];return q});
  var mv=Q.reduce(function(s,q){return s+q.v},0)/len;
  var ppc=Math.max(.0001,globalPxPerCm());
  var sd=Math.sqrt(Q.reduce(function(s,q){return s+(q.v-mv)*(q.v-mv)},0)/len)/ppc;
  var us=Q.map(function(q){return q.u}).sort(function(x,y){return x-y});
  var span=(us[us.length-1]-us[0])/ppc;
  var diffs=[];for(var k=1;k<us.length;k++)diffs.push((us[k]-us[k-1])/ppc);
  var stepCv=0;
  if(diffs.length>1){
    var mean=diffs.reduce(function(s,v){return s+v},0)/diffs.length;
    if(mean>0){
      var vs=diffs.reduce(function(s,v){return s+(v-mean)*(v-mean)},0)/diffs.length;
      stepCv=Math.sqrt(vs)/mean;
    }
  }

  /* Two points are valid rows but get a small penalty so 5 collinear taps
     prefer one row rather than 2+3. Three+ points must actually look row-like. */
  var cost=34 + sd*6.5 + stepCv*55 + (len===2?18:0);
  if(span<20)cost+=90;
  if(len>=3&&sd>Math.max(22,span*.20))cost+=160;
  return{start:start,end:end,len:len,idxs:idxs,angle:a,cost:cost,sd:sd,span:span};
}

function sequenceRows(A,P){
  /*
   * v3.92 ROW/COLUMN CLUSTERING
   * Geometry of the taps is primary. Tap order is NOT treated as one route.
   * Candidate horizontal and vertical lines are discovered independently.
   */
  var n=A.length;
  if(n<2)return {segments:[],cost:0,cluster391:true};

  var xs=A.map(function(p){return p.x}), ys=A.map(function(p){return p.y});
  var spanX=Math.max.apply(null,xs)-Math.min.apply(null,xs);
  var spanY=Math.max.apply(null,ys)-Math.min.apply(null,ys);
  var scale=Math.max(1,Math.min(Math.max(spanX,spanY),500));
  var tol=Math.max(22,Math.min(75,scale*.12));

  function make(axis){
    var arr=A.map(function(p,i){
      return {i:i,cross:axis==="h"?p.y:p.x,along:axis==="h"?p.x:p.y};
    }).sort(function(a,b){return a.cross-b.cross});
    var groups=[];
    arr.forEach(function(v){
      var best=null,bd=Infinity;
      groups.forEach(function(g){
        var c=g.sum/g.items.length,d=Math.abs(v.cross-c);
        if(d<bd){bd=d;best=g}
      });
      if(best && bd<=tol){best.items.push(v);best.sum+=v.cross}
      else groups.push({items:[v],sum:v.cross});
    });
    groups.forEach(function(g){
      g.center=g.sum/g.items.length;
      g.items.sort(function(a,b){return a.along-b.along});
    });
    return groups.filter(function(g){return g.items.length>=2});
  }

  var H=make("h"), V=make("v"), candidates=[];
  H.forEach(function(g){candidates.push({axis:"h",items:g.items,center:g.center})});
  V.forEach(function(g){candidates.push({axis:"v",items:g.items,center:g.center})});

  /* Score useful lines: more points and larger span are better. */
  candidates.forEach(function(g){
    var span=g.items[g.items.length-1].along-g.items[0].along;
    var scatter=0;
    g.items.forEach(function(v){scatter+=Math.abs(v.cross-g.center)});
    g.score=g.items.length*100+span*.15-scatter;
  });
  candidates.sort(function(a,b){return b.score-a.score});

  /* Assign a point to its strongest line. Intersections may be shared. */
  var chosen=[];
  candidates.forEach(function(g){
    var fresh=g.items.filter(function(v){
      var uses=chosen.reduce(function(z,c){return z+(c.idxs.indexOf(v.i)>=0?1:0)},0);
      return uses===0;
    }).length;
    if(fresh>=2 || (g.items.length>=3 && fresh>=1)){
      chosen.push({
        idxs:g.items.map(function(v){return v.i}),
        angle:g.axis==="h"?0:Math.PI/2,
        axis:g.axis,
        center:g.center,
        score:g.score
      });
    }
  });

  /* Any leftovers stay deliberate singletons, not invented connections. */
  var covered={};
  chosen.forEach(function(g){g.idxs.forEach(function(i){covered[i]=1})});
  for(var i=0;i<n;i++)if(!covered[i]){
    chosen.push({idxs:[i],angle:0,axis:"single",center:0,score:0});
  }

  return {segments:chosen,cost:0,tolerance:tol,cluster391:true};
}

function alignSequenceRows(A,P){
  /*
   * v3.92:
   * - independent rows/columns
   * - straight lines
   * - equal spacing inside every line
   * - a robust COMMON pitch target across lines
   * - no forced connection between separate rows
   * - polygon safety + anti-collapse
   */
  var seq=sequenceRows(A,P), segs=seq.segments||[];
  var ppc=Math.max(.0001,globalPxPerCm());
  function D(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy)}
  function inside(p){return pointIn(p,P)}
  function median(a){
    if(!a.length)return 0;
    a=a.slice().sort(function(x,y){return x-y});
    var m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }

  /* Estimate pitch from within detected rows only — never across a row break. */
  var steps=[];
  segs.forEach(function(g){
    if(g.idxs.length<2)return;
    var pts=g.idxs.map(function(i){return A[i]});
    pts.sort(function(a,b){return g.axis==="h"?a.x-b.x:a.y-b.y});
    for(var k=1;k<pts.length;k++){
      var d=D(pts[k-1],pts[k]);
      if(d>4)steps.push(d);
    }
  });
  var commonPitch=median(steps);

  var proposals=A.map(function(p){return []});
  var desc=[];

  segs.forEach(function(g,gi){
    desc.push(g.idxs.length);
    if(g.idxs.length===1){
      var si=g.idxs[0];
      proposals[si].push({x:A[si].x,y:A[si].y,w:1});
      return;
    }

    var ids=g.idxs.slice().sort(function(i,j){
      return g.axis==="h"?A[i].x-A[j].x:A[i].y-A[j].y;
    });
    var cross=ids.reduce(function(z,i){return z+(g.axis==="h"?A[i].y:A[i].x)},0)/ids.length;
    var vals=ids.map(function(i){return g.axis==="h"?A[i].x:A[i].y});
    var center=(vals[0]+vals[vals.length-1])/2;

    /* Prefer common pitch, but don't expand a row destructively. */
    var natural=(vals[vals.length-1]-vals[0])/(ids.length-1);
    var pitch=commonPitch||natural;
    if(pitch<natural*.65 || pitch>natural*1.45)pitch=natural;

    for(var k=0;k<ids.length;k++){
      var along=center+(k-(ids.length-1)/2)*pitch;
      var p=g.axis==="h"?{x:along,y:cross}:{x:cross,y:along};
      proposals[ids[k]].push({x:p.x,y:p.y,w:g.score||100});
    }
  });

  /* Intersections receive a weighted compromise; ordinary points have one proposal. */
  var out=A.map(function(orig,i){
    var ps=proposals[i];
    if(!ps.length)return {x:orig.x,y:orig.y};
    var sw=0,x=0,y=0;
    ps.forEach(function(p){var w=Math.max(1,p.w);sw+=w;x+=p.x*w;y+=p.y*w});
    return {x:x/sw,y:y/sw};
  });

  /* Safety: reject only destructive points individually. */
  for(var i=0;i<out.length;i++){
    if(!inside(out[i]) || D(out[i],A[i])/ppc>65){
      out[i]={x:A[i].x,y:A[i].y};
    }
  }

  /* Hard anti-collapse: if a proposed pair collapses, restore both originals. */
  var minSep=Math.max(16,ppc*22);
  for(var a=0;a<out.length;a++){
    for(var b=a+1;b<out.length;b++){
      if(D(out[a],out[b])<minSep){
        out[a]={x:A[a].x,y:A[a].y};
        out[b]={x:A[b].x,y:A[b].y};
      }
    }
  }

  /*
   * v3.92 FINAL PRECISION PASS
   * The recognizer already decided the intended rows/columns.
   * This pass only removes the remaining tiny visual error:
   * - exact common axis for each detected line;
   * - exact arithmetic spacing inside the line;
   * - preserve the line centre/span;
   * - never move outside the polygon;
   * - never collapse two lights.
   */
  segs.forEach(function(g){
    if(g.idxs.length<2 || (g.axis!=="h" && g.axis!=="v"))return;

    var ids=g.idxs.slice().sort(function(i,j){
      return g.axis==="h"?out[i].x-out[j].x:out[i].y-out[j].y;
    });

    var cross=ids.reduce(function(z,i){
      return z+(g.axis==="h"?out[i].y:out[i].x);
    },0)/ids.length;

    var vals=ids.map(function(i){return g.axis==="h"?out[i].x:out[i].y});
    var first=vals[0], last=vals[vals.length-1];
    var step=(last-first)/(ids.length-1);

    /* If the common pitch is already close, use it exactly. */
    if(commonPitch>0 && step>0 && commonPitch>=step*.82 && commonPitch<=step*1.18){
      var center=(first+last)/2;
      first=center-commonPitch*(ids.length-1)/2;
      step=commonPitch;
    }

    var trial=[];
    for(var k=0;k<ids.length;k++){
      var along=first+step*k;
      trial.push(g.axis==="h"?{x:along,y:cross}:{x:cross,y:along});
    }

    /* Apply only if the complete precision line remains legal and conservative. */
    var legal=trial.every(function(p,k){
      return inside(p) && D(p,A[ids[k]])/ppc<=65;
    });
    if(legal){
      for(var q=0;q<ids.length;q++)out[ids[q]]=trial[q];
    }
  });

  /* Final anti-collapse after precision correction. */
  var minSepFinal=Math.max(16,ppc*22);
  for(var aa=0;aa<out.length;aa++){
    for(var bb=aa+1;bb<out.length;bb++){
      if(D(out[aa],out[bb])<minSepFinal){
        out[aa]={x:A[aa].x,y:A[aa].y};
        out[bb]={x:A[bb].x,y:A[bb].y};
      }
    }
  }

  var movement=0;
  var finalPts=out.map(function(p,i){
    movement+=D(p,A[i]);
    return {
      x:p.x,y:p.y,group:0,
      baseIndex:nearestWallIndex(p,P),
      cluster391:true,
      precision392:true,
      commonPitchPx:commonPitch||0
    };
  });

  return {
    points:finalPts,groups:segs,desc:desc,
    score:1000-movement*.02,movement:movement,
    cluster391:true,commonPitchPx:commonPitch||0
  };
}

function smartAlign(A,P){
  if(!A.length)return{points:[],groups:[],desc:[],score:0};
  if(A.length===1){
    var s=snapSingleClean(A[0],P);
    return{points:[s],groups:[[A[0]]],desc:[1],score:0,angle:dominantRoomAngle(P)}
  }
  var r=alignSequenceRows(A,P);

  /* v3.68 hard invariant: Smart Align must NEVER lose a point.
     Sparse JS arrays are dangerous because forEach() silently skips holes.
     If any downstream layout branch failed to write an index, keep that tap
     instead of silently creating fewer luminaires than requested. */
  if(!r.points||r.points.length!==A.length)r.points=new Array(A.length);
  for(var i=0;i<A.length;i++){
    if(!r.points[i]||!isFinite(r.points[i].x)||!isFinite(r.points[i].y)){
      var keep={x:A[i].x,y:A[i].y,group:i,baseIndex:nearestWallIndex(A[i],P),recovered:true};
      r.points[i]=keep;
    }
  }
  return r;
}
function cv(){return gid("cv")||document.querySelector("canvas")}
function clientToCanvas(e){
  try{
    if(typeof getCanvasPoint==="function"){
      var q=getCanvasPoint(e.clientX,e.clientY);
      if(q&&isFinite(q.x)&&isFinite(q.y))return{x:+q.x,y:+q.y};
    }
  }catch(_){}
  var c=cv(),r=c.getBoundingClientRect(),sc=(typeof viewScale!=="undefined"&&isFinite(viewScale)&&viewScale>0)?viewScale:1;
  var ox=(typeof viewOffsetX!=="undefined"&&isFinite(viewOffsetX))?viewOffsetX:0;
  var oy=(typeof viewOffsetY!=="undefined"&&isFinite(viewOffsetY))?viewOffsetY:0;
  return{x:((e.clientX-r.left)*(c.width/r.width)-ox)/sc,y:((e.clientY-r.top)*(c.height/r.height)-oy)/sc};
}
function canvasToClient(p){
  var c=cv(),r=c.getBoundingClientRect(),sc=(typeof viewScale!=="undefined"&&isFinite(viewScale)&&viewScale>0)?viewScale:1;
  var ox=(typeof viewOffsetX!=="undefined"&&isFinite(viewOffsetX))?viewOffsetX:0;
  var oy=(typeof viewOffsetY!=="undefined"&&isFinite(viewOffsetY))?viewOffsetY:0;
  return{x:r.left+(p.x*sc+ox)*(r.width/c.width),y:r.top+(p.y*sc+oy)*(r.height/c.height)};
}
function clearPreview(){var h=gid("rmSaPreview347");if(h)h.innerHTML=""}
function dot(p,cls){
  var q=canvasToClient(p),el=document.createElement("div");el.className="rm-sa-dot "+cls;el.style.left=q.x+"px";el.style.top=q.y+"px";gid("rmSaPreview347").appendChild(el);
}
function line(a,b){
  var A=canvasToClient(a),B=canvasToClient(b),L=Math.hypot(B.x-A.x,B.y-A.y),ang=Math.atan2(B.y-A.y,B.x-A.x)*180/Math.PI,el=document.createElement("div");
  el.className="rm-sa-line";el.style.left=A.x+"px";el.style.top=A.y+"px";el.style.width=L+"px";el.style.transform="rotate("+ang+"deg)";gid("rmSaPreview347").appendChild(el);
}
function renderDraft(){
  clearPreview();gid("rmSaPreview347").classList.add("show");
  var P=poly(),r=S.taps.length?smartAlign(S.taps,P):{points:[]};S.previewAligned=r.points||[];
  S.previewAligned.forEach(function(p){dot(p,"draft")});
  var gs={};S.previewAligned.forEach(function(p){(gs[p.group]||(gs[p.group]=[])).push(p)});
  Object.keys(gs).forEach(function(k){var g=gs[k];if(g.length>1){var a=g.slice().sort(function(x,y){return x.x===y.x?x.y-y.y:x.x-y.x});line(a[0],a[a.length-1])}});
  gid("rmSaProgress347").textContent=S.taps.length+" / "+S.qty;
}
function renderFinal(){
  clearPreview();gid("rmSaPreview347").classList.add("show");
  S.aligned.forEach(function(p){dot(p,"final")});
  var gs={};S.aligned.forEach(function(p){(gs[p.group]||(gs[p.group]=[])).push(p)});
  Object.keys(gs).forEach(function(k){var g=gs[k];if(g.length>1){g.sort(function(a,b){return a.x===b.x?a.y-b.y:a.x-b.x});line(g[0],g[g.length-1])}});
}
function stop(){S.active=false;S.suppressUntil=Math.max(S.suppressUntil,Date.now()+900);gid("rmSaHud347").classList.remove("show")}
function sync(){
  try{if(typeof updateLightBadge==="function")updateLightBadge()}catch(_){}
  try{if(typeof syncLightMarksToElems==="function")syncLightMarksToElems()}catch(_){}
  try{if(typeof saveState==="function")saveState()}catch(_){}
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw()}catch(_){}
}
function canvasCapture(e){
  if(!S.active)return;
  S.suppressUntil=Date.now()+900;
  window.__A·CEILSmartAlignCapture347=true;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  var p=clientToCanvas(e),P=poly();
  if(!pointIn(p,P)){try{showToast("Точка має бути всередині стелі")}catch(_){}return}
  S.taps.push(p);renderDraft();
  if(S.taps.length>=S.qty){
    stop();
    var r=smartAlign(S.taps,P);S.aligned=r.points;S.groups=r.desc||[];
    renderFinal();
    var rows=S.groups.filter(function(n){return n>1}),single=S.groups.filter(function(n){return n===1}).length;
    gid("rmSaResult347").textContent=(function(){
      var scheme=rows.length?rows.join(" + "):"вільна композиція";
      if(single)scheme+=" + "+single+" окрема";
      var zones=(r.zoneSummaries||[]).map(function(z){
        return Math.round(z.widthCm*10)/10+" см → вісь "+Math.round(z.halfCm*10)/10+" см";
      });
      return "Розпізнано: "+scheme+". "+(zones.length?"Зони: "+zones.join("; ")+". ":"")+"Кожен ряд поставлено по центру своєї локальної зони.";
    })();
    gid("rmSaConfirm347").classList.add("open");
  }
}
window.rmSa347Open=function(){
  try{if(typeof rmLfClose==="function")rmLfClose()}catch(_){}
  var P=poly();if(P.length<3){try{showToast("Спочатку замкніть контур кімнати")}catch(_){}return}
  gid("rmSmartAlign347").classList.add("open");
};
window.rmSa347Close=function(){gid("rmSmartAlign347").classList.remove("open")};
window.rmSa347Start=function(){
  S.qty=clamp(parseInt(gid("rmSaQty347").value,10)||5,2,24);S.taps=[];S.previewAligned=[];S.aligned=[];S.groups=[];
  rmSa347Close();clearPreview();gid("rmSaPreview347").classList.add("show");gid("rmSaHud347").classList.add("show");gid("rmSaProgress347").textContent="0 / "+S.qty;S.active=true;window.__A·CEILSmartAlignCapture347=true;
  try{lightMode=null}catch(_){window.lightMode=null}
  try{showToast("Поставте "+S.qty+" точок приблизно там, де хочете світильники")}catch(_){}
};
window.rmSa347Cancel=function(){stop();window.__A·CEILSmartAlignCapture347=false;S.taps=[];S.previewAligned=[];S.aligned=[];clearPreview();gid("rmSaPreview347").classList.remove("show");gid("rmSaConfirm347").classList.remove("open")};
window.rmSa347Retry=function(){window.__A·CEILSmartAlignCapture347=true;gid("rmSaConfirm347").classList.remove("open");clearPreview();S.taps=[];S.previewAligned=[];S.aligned=[];gid("rmSaHud347").classList.add("show");gid("rmSaProgress347").textContent="0 / "+S.qty;S.active=true};
window.rmSa347Apply=function(){
  if(!S.aligned.length)return;
  try{
    var base=Date.now();
    S.aligned.forEach(function(p,i){
      var m={id:"light_smartalign_"+base+"_"+i,type:"spot",x:Math.round(p.x),y:Math.round(p.y),smartAligned:true,smartWallOffsetCm:Number.isFinite(+p.wallOffsetCm)?+p.wallOffsetCm:null};
      try{m.baseIndex=Number.isFinite(+p.baseIndex)?+p.baseIndex:nearestWallIndex(m,poly())}catch(_){try{if(typeof _nearestLightBaseIndex==="function")m.baseIndex=_nearestLightBaseIndex(m.x,m.y)}catch(__){}}
      try{if(typeof _updateLightCoords==="function")_updateLightCoords(m)}catch(_){}
      lightMarks.push(m);
    });
    try{selectedLightId=lightMarks[lightMarks.length-1].id}catch(_){}
    sync();gid("rmSaConfirm347").classList.remove("open");clearPreview();gid("rmSaPreview347").classList.remove("show");
    S.taps=[];S.previewAligned=[];S.aligned=[];window.__A·CEILSmartAlignCapture347=false;
    try{showToast("✓ Світильники вирівняно. Точні координати додані у звіт.")}catch(_){}
  }catch(e){try{showToast("Не вдалося додати світильники")}catch(_){}}
};

/* Capture before ALL legacy canvas handlers while Smart Align is active.
   iOS fires touchstart/touchend/click in addition to pointerdown; the old wall handler
   listened to touchend, which is why the wall menu opened after every Smart Align tap. */
function swallowLegacy(e){
  if(!(S.active||Date.now()<S.suppressUntil))return;
  try{e.preventDefault()}catch(_){}
  try{e.stopPropagation()}catch(_){}
  try{e.stopImmediatePropagation()}catch(_){}
}
function bindCanvas(){
  var c=cv();if(!c||c.__rmSa347)return;c.__rmSa347=true;
  c.addEventListener("pointerdown",canvasCapture,true);
  c.addEventListener("touchstart",swallowLegacy,{capture:true,passive:false});
  c.addEventListener("touchend",swallowLegacy,{capture:true,passive:false});
  c.addEventListener("click",swallowLegacy,true);
  c.addEventListener("contextmenu",swallowLegacy,true);
}
bindCanvas();setTimeout(bindCanvas,400);setTimeout(bindCanvas,1200);

/* Add the feature INSIDE the existing Spotlights sheet. */
function injectSpotButton(){
  var modal=gid("lightFlowModal"),box=modal&&modal.querySelector(".modal");if(!box||box.querySelector(".rm-sa-entry"))return;
  var tabs=gid("rmLfTabs");
  if(!tabs)return;
  var b=document.createElement("button");b.type="button";b.className="rm-sa-entry";
  b.innerHTML="✦ Вирівняти по ескізу<br><small style='font-size:10.5px;font-weight:750;color:#64748b'>Тикаєте приблизно — A·CEIL одразу вирівнює</small>";
  b.onclick=window.rmSa347Open;
  tabs.parentNode.insertBefore(b,tabs.nextSibling);
}
var oldSpot=window.rmStartSpotFlow;
if(typeof oldSpot==="function"){
  window.rmStartSpotFlow=function(){var r=oldSpot.apply(this,arguments);setTimeout(injectSpotButton,0);return r};
  try{rmStartSpotFlow=window.rmStartSpotFlow}catch(_){}
}
setTimeout(injectSpotButton,900);

window.A·CEILSmartAlignV347=Object.freeze({
  align:function(points,polygon){return smartAlign(points.map(function(p){return{x:+p.x,y:+p.y}}),polygon.map(function(p){return{x:+p.x,y:+p.y}}))}
});
})();
