
(function(){
  'use strict';
  if(window.A·CEILGeometry) return;
  const finite=v=>Number.isFinite(Number(v));
  const num=(v,fallback=0)=>finite(v)?Number(v):fallback;
  const clonePoint=p=>({x:num(p&&p.x),y:num(p&&p.y)});
  function normalizePoints(input,options){
    const opts=options&&typeof options==='object'?options:{};
    if(!Array.isArray(input)) return [];
    const out=[];
    for(const raw of input){
      if(!raw||!finite(raw.x)||!finite(raw.y)) continue;
      const point=clonePoint(raw);
      const prev=out[out.length-1];
      if(opts.keepDuplicates||!prev||prev.x!==point.x||prev.y!==point.y) out.push(point);
    }
    if(!opts.keepClosingPoint&&out.length>1){
      const first=out[0],last=out[out.length-1];
      if(first.x===last.x&&first.y===last.y) out.pop();
    }
    return out;
  }
  function distance(a,b){return Math.hypot(num(b&&b.x)-num(a&&a.x),num(b&&b.y)-num(a&&a.y));}
  function sideLengths(points,options){
    const pts=normalizePoints(points,options),closed=!(options&&options.closed===false),result=[];
    if(pts.length<2) return result;
    const limit=closed?pts.length:pts.length-1;
    for(let i=0;i<limit;i++) result.push(distance(pts[i],pts[(i+1)%pts.length]));
    return result;
  }
  function perimeter(points,options){return sideLengths(points,options).reduce((sum,v)=>sum+v,0);}
  function signedArea(points){
    const pts=normalizePoints(points);
    if(pts.length<3) return 0;
    let sum=0;
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];sum+=a.x*b.y-b.x*a.y;}
    return sum/2;
  }
  function area(points){return Math.abs(signedArea(points));}
  function bounds(points){
    const pts=normalizePoints(points);
    if(!pts.length) return null;
    let minX=pts[0].x,maxX=pts[0].x,minY=pts[0].y,maxY=pts[0].y;
    for(let i=1;i<pts.length;i++){const p=pts[i];if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;}
    return {minX,maxX,minY,maxY,width:maxX-minX,height:maxY-minY};
  }
  function centroid(points){
    const pts=normalizePoints(points);
    if(!pts.length) return null;
    if(pts.length<3){const b=bounds(pts);return{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2};}
    let crossSum=0,cx=0,cy=0;
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],cross=a.x*b.y-b.x*a.y;crossSum+=cross;cx+=(a.x+b.x)*cross;cy+=(a.y+b.y)*cross;}
    if(Math.abs(crossSum)<1e-12){const b=bounds(pts);return{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2};}
    return{x:cx/(3*crossSum),y:cy/(3*crossSum)};
  }
  function pointInPolygon(point,points){
    const pts=normalizePoints(points);if(!point||!finite(point.x)||!finite(point.y)||pts.length<3)return false;
    if(window.A·CEILUtils&&typeof window.A·CEILUtils.pointInPolygon==='function') return window.A·CEILUtils.pointInPolygon(clonePoint(point),pts);
    let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;
  }
  function validate(points,options){
    const pts=normalizePoints(points),issues=[];
    if(!Array.isArray(points)) issues.push('points не є масивом');
    if(pts.length<3) issues.push('Для замкненого контуру потрібно щонайменше 3 точки');
    if(pts.length>=3&&area(pts)<=0) issues.push('Площа контуру дорівнює нулю');
    if(sideLengths(pts).some(v=>v<=0)) issues.push('Контур містить сторону нульової довжини');
    return issues;
  }
  function parseState(project){
    if(!project||typeof project!=='object') return null;
    let state=project.state;
    if(typeof state==='string'){try{state=JSON.parse(state);}catch(_){state=null;}}
    return state&&typeof state==='object'?state:project;
  }
  function extract(project){
    const state=parseState(project)||{};
    const circle=!!(state.circleMode||state.geometry&&state.geometry.type==='circle');
    const diameterCm=num(state.circleDiamCm||state.circleDiameterCm||state.geometry&&state.geometry.diameterCm,0);
    const points=normalizePoints(state.realPts||state.points||state.pts||state.geometry&&state.geometry.points||[]);
    const explicitLengths=Array.isArray(state.lengths)?state.lengths.map(v=>num(v,0)).filter(v=>v>=0):[];
    return {state,circle,diameterCm,points,explicitLengths};
  }
  function calculate(input,options){
    const opts=options&&typeof options==='object'?options:{},unitScale=num(opts.unitScale,100),data=Array.isArray(input)?{circle:false,diameterCm:0,points:normalizePoints(input),explicitLengths:[]}:extract(input);
    let rawArea=0,rawPerimeter=0,b=null,sides=[],cornerCount=0,type='empty';
    if(data.circle&&data.diameterCm>0){
      type='circle';const r=data.diameterCm/2;rawArea=Math.PI*r*r;rawPerimeter=Math.PI*data.diameterCm;b={minX:0,maxX:data.diameterCm,minY:0,maxY:data.diameterCm,width:data.diameterCm,height:data.diameterCm};cornerCount=0;
    }else if(data.points.length){
      type='polygon';rawArea=area(data.points);sides=data.explicitLengths.length===data.points.length?data.explicitLengths.slice():sideLengths(data.points);rawPerimeter=sides.reduce((sum,v)=>sum+v,0);b=bounds(data.points);cornerCount=data.points.length;
    }
    const divisor=unitScale>0?unitScale:100;
    return Object.freeze({type,points:data.points.slice(),sideLengthsCm:sides,perimeterCm:rawPerimeter,perimeterM:rawPerimeter/divisor,areaCm2:rawArea,areaM2:rawArea/(divisor*divisor),boundsCm:b,boundsM:b?{minX:b.minX/divisor,maxX:b.maxX/divisor,minY:b.minY/divisor,maxY:b.maxY/divisor,width:b.width/divisor,height:b.height/divisor}:null,cornerCount,centroidCm:type==='polygon'?centroid(data.points):type==='circle'?{x:data.diameterCm/2,y:data.diameterCm/2}:null,issues:type==='polygon'?validate(data.points):[]});
  }
  window.A·CEILGeometry=Object.freeze({normalizePoints,distance,sideLengths,perimeter,signedArea,area,bounds,centroid,pointInPolygon,validate,extract,calculate});
})();
