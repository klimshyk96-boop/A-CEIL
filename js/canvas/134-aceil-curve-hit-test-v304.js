
(function(){
"use strict";
if(window.__A·CEILCurveHitTestV304)return;
window.__A·CEILCurveHitTestV304=true;

function distToSeg(px,py,a,b){
  var dx=b.x-a.x,dy=b.y-a.y;
  var den=dx*dx+dy*dy||1;
  var t=((px-a.x)*dx+(py-a.y)*dy)/den;
  t=Math.max(0,Math.min(1,t));
  var x=a.x+t*dx,y=a.y+t*dy;
  return Math.hypot(px-x,py-y);
}

function curveDistance(side,x,y){
  try{
    if(typeof _isArcSide!=="function"||!_isArcSide(side))return Infinity;
    var arr=typeof _sideArcCanvasPts==="function"?(_sideArcCanvasPts(side)||[]):[];
    if(!arr.length)return Infinity;

    var start=pts[side];
    var end=pts[(side+1)%pts.length];
    var route=[start].concat(arr).concat([end]);
    var best=Infinity;
    for(var i=1;i<route.length;i++){
      best=Math.min(best,distToSeg(x,y,route[i-1],route[i]));
    }
    return best;
  }catch(_){
    return Infinity;
  }
}

var oldFindWallSideHit=window.findWallSideHit||(
  typeof findWallSideHit==="function"?findWallSideHit:null
);

function findWallSideHitV304(x,y){
  var straight=-1;
  try{
    if(typeof oldFindWallSideHit==="function")straight=Number(oldFindWallSideHit(x,y));
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}

  var bestSide=straight,bestDist=straight>=0?30:Infinity;
  try{
    for(var i=0;i<pts.length;i++){
      var d=curveDistance(i,x,y);
      if(d<bestDist){
        bestDist=d;
        bestSide=i;
      }
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return bestDist<=38?bestSide:-1;
}

window.findWallSideHit=findWallSideHitV304;
try{findWallSideHit=findWallSideHitV304}catch(_){window.__diagSilent&&window.__diagSilent(_)}

window.findWallSideHitTouchV304=function(clientX,clientY){
  try{
    var p=getCanvasPoint(clientX,clientY);
    var r=cv.getBoundingClientRect();
    var canvasPerCss=((cv.width/(r.width||cv.width||1))+(cv.height/(r.height||cv.height||1)))/2;
    var threshold=(48*canvasPerCss)/(viewScale||1);

    var bestSide=-1,bestDist=Infinity;
    for(var i=0;i<pts.length;i++){
      var a=pts[i],b=pts[(i+1)%pts.length];
      var d1=distToSeg(p.x,p.y,a,b);
      var d2=curveDistance(i,p.x,p.y);
      var d=Math.min(d1,d2);
      if(d<bestDist){bestDist=d;bestSide=i}
    }
    return bestDist<=threshold?bestSide:-1;
  }catch(_){
    return -1;
  }
};

/* Replace only the existing touch hit function binding. */
try{
  findWallSideHitTouch=window.findWallSideHitTouchV304;
}catch(_){window.__diagSilent&&window.__diagSilent(_)}

/* Ensure a previously hidden wall menu can reopen. */
var oldOpen=window.rmWallTapOpenV84;
window.rmWallTapOpenV84=function(side){
  var menu=document.getElementById("rmWallTapMenuV84");
  if(menu){
    menu.style.display="";
    menu.style.pointerEvents="auto";
  }
  return typeof oldOpen==="function"?oldOpen.apply(this,arguments):undefined;
};
})();
