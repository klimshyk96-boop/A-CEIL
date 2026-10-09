/* Canonical scene renderer. No later module may wrap draw(). */
function draw(){ return ACEILCanvas.render(drawScene, ctx); }
function drawScene(){
const _canvasUIScale=1/Math.max(.65,Math.abs(Number(viewScale))||1);
if(ctx.clearRect(0,0,ACEILCanvas.width(cv),ACEILCanvas.height(cv)),ctx.save(),ctx.translate(viewOffsetX,viewOffsetY),ctx.scale(viewScale,viewScale),_hideCanvasServiceLabels()||drawLightGrid(ctx),circleMode&&circleDiamCm>0){const cx=ACEILCanvas.width(cv)/2,cy=ACEILCanvas.height(cv)/2,r=.42*Math.min(ACEILCanvas.width(cv),ACEILCanvas.height(cv));return ctx.fillStyle="rgba(0,113,227,0.07)",ctx.beginPath(),ctx.arc(cx,cy,r,0,2*Math.PI),ctx.fill(),ctx.strokeStyle="#1d1d1f",ctx.lineWidth=3,ctx.beginPath(),ctx.arc(cx,cy,r,0,2*Math.PI),ctx.stroke(),ctx.strokeStyle="#ff3b30",ctx.lineWidth=2,ctx.setLineDash([8,6]),ctx.beginPath(),ctx.moveTo(cx-r,cy),ctx.lineTo(cx+r,cy),ctx.stroke(),ctx.setLineDash([]),ctx.fillStyle="#ff3b30",ctx.font="bold 16px Arial",ctx.textAlign="center",ctx.fillText(`⌀ ${circleDiamCm} см`,cx,cy-12),ctx.strokeStyle="#0071e3",ctx.lineWidth=1.5,ctx.setLineDash([5,4]),ctx.beginPath(),ctx.moveTo(cx,cy),ctx.lineTo(cx,cy-r),ctx.stroke(),ctx.setLineDash([]),ctx.fillStyle="#0071e3",ctx.font="14px Arial",ctx.fillText(`r = ${(circleDiamCm/2).toFixed(1)} см`,cx+36,cy-r/2),ctx.fillStyle="#0071e3",ctx.beginPath(),ctx.arc(cx,cy,6,0,2*Math.PI),ctx.fill(),drawWallSideFlash(ctx),_hideCanvasServiceLabels()||(_reportMode&&_loadRS&&!1===_loadRS().showWallMarks||drawWallMarks(ctx),_reportMode&&_loadRS&&!1===_loadRS().showLights||(drawLightBindings(ctx),drawLightMarks(ctx))),ctx.textAlign="left",void ctx.restore()}if(!pts.length)return void ctx.restore();if(!closed&&pts.length>=3&&!_reportMode)try{ctx.save(),ctx.beginPath(),ctx.moveTo(pts[0].x,pts[0].y);for(let i=0;i<pts.length-1;i++){if(_isArcSide(i)){const _lp=_sideArcCanvasPts(i)||[];_lp.forEach(_q=>ctx.lineTo(_q.x,_q.y))}ctx.lineTo(pts[i+1].x,pts[i+1].y)}ctx.closePath(),ctx.fillStyle="rgba(59,130,246,0.22)",ctx.fill(),ctx.beginPath(),ctx.moveTo(pts[pts.length-1].x,pts[pts.length-1].y),ctx.lineTo(pts[0].x,pts[0].y),ctx.strokeStyle="rgba(37,99,235,0.75)",ctx.lineWidth=2,ctx.setLineDash([8,6]),ctx.stroke(),ctx.restore()}catch(_lpe){try{ctx.restore()}catch(_){}}ctx.strokeStyle="#1d1d1f",ctx.lineWidth=3,ctx.beginPath(),ctx.moveTo(pts[0].x,pts[0].y);{const _n=pts.length,_segCount=closed?_n:_n-1;for(let i=0;i<_segCount;i++){const _j=(i+1)%_n;if(_isArcSide(i)){const _ap=_sideArcCanvasPts(i)||[];_ap.forEach(_p=>ctx.lineTo(_p.x,_p.y))}ctx.lineTo(pts[_j].x,pts[_j].y)}}closed&&ctx.closePath(),ctx.stroke(),_hideCanvasServiceLabels()||pts.forEach((p,i)=>{_isArcSide(i)&&(ctx.save(),ctx.strokeStyle="#7c3aed",ctx.lineWidth=1,ctx.setLineDash([4,3]),ctx.beginPath(),ctx.moveTo(p.x,p.y),ctx.lineTo(pts[(i+1)%pts.length].x,pts[(i+1)%pts.length].y),ctx.stroke(),ctx.setLineDash([]),(_sideArcCanvasPts(i)||[]).forEach(_p=>{if(_p._control){ctx.fillStyle="#7c3aed",ctx.beginPath(),ctx.arc(_p.x,_p.y,3.5,0,2*Math.PI),ctx.fill()}}),ctx.restore())}),
ctx.font="bold 18px Arial",_hideCanvasServiceLabels()||pts.forEach((p,i)=>{if(ctx.fillStyle="#0071e3",ctx.beginPath(),
ctx.arc(p.x,p.y,8*_canvasUIScale,0,2*Math.PI),
ctx.fill(),closed&&pts.length>=3){const prev=pts[(i-1+pts.length)%pts.length],next=pts[(i+1)%pts.length],v1={x:prev.x-p.x,y:prev.y-p.y},v2={x:next.x-p.x,y:next.y-p.y},len1=Math.hypot(v1.x,v1.y),len2=Math.hypot(v2.x,v2.y);if(len1>0&&len2>0){let cosA=(v1.x*v2.x+v1.y*v2.y)/(len1*len2);cosA=Math.max(-1,Math.min(1,cosA));const angle=180*Math.acos(cosA)/Math.PI,diff=Math.abs(angle-90),arcR=Math.min(28,.25*len1,.25*len2),a1=Math.atan2(v1.y,v1.x),a2=Math.atan2(v2.y,v2.x);let arcColor=diff<=1?"#22c55e":diff<=3?"#f59e0b":"#ef4444";ctx.strokeStyle=arcColor,ctx.lineWidth=2.5,ctx.beginPath();let startA=a1,endA=a2,delta=endA-startA;for(;delta<0;)delta+=2*Math.PI;if(delta>Math.PI){let tmp=startA;startA=endA,endA=tmp,delta=2*Math.PI-delta}if(ctx.arc(p.x,p.y,arcR,startA,endA),ctx.stroke(),diff<=1){const sq=10,u1={x:v1.x/len1,y:v1.y/len1},u2={x:v2.x/len2,y:v2.y/len2};ctx.strokeStyle="#22c55e",ctx.lineWidth=2,ctx.beginPath(),ctx.moveTo(p.x+u1.x*sq,p.y+u1.y*sq),ctx.lineTo(p.x+u1.x*sq+u2.x*sq,p.y+u1.y*sq+u2.y*sq),ctx.lineTo(p.x+u2.x*sq,p.y+u2.y*sq),ctx.stroke()}else{const bisX=v1.x/len1+v2.x/len2,bisY=v1.y/len1+v2.y/len2,bisLen=Math.hypot(bisX,bisY)||1,labelDist=arcR+22,lx=p.x+bisX/bisLen*labelDist,ly=p.y+bisY/bisLen*labelDist,label=angle.toFixed(1)+"°";ctx.font="bold 12px Arial";const tw=ctx.measureText(label).width,pad=4;ctx.fillStyle=diff<=3?"#fef3c7":"#fee2e2",ctx.beginPath(),ctx.roundRect(lx-tw/2-pad,ly-9,tw+2*pad,18,5),ctx.fill(),ctx.strokeStyle=diff<=3?"#f59e0b":"#ef4444",ctx.lineWidth=1.5,ctx.stroke(),ctx.fillStyle=diff<=3?"#92400e":"#991b1b",ctx.textAlign="center",ctx.fillText(label,lx,ly+4),ctx.textAlign="left"}}}}),!_hideCanvasServiceLabels()&&null!==selectedPoint&&pts[selectedPoint]&&(ctx.fillStyle="#34c759",ctx.beginPath(),
ctx.arc(pts[selectedPoint].x,pts[selectedPoint].y,12*_canvasUIScale,0,2*Math.PI),
ctx.fill()),ctx.fillStyle="#515154",ctx.font="15px Arial";const _rmCx=pts.reduce((s,p)=>s+p.x,0)/(pts.length||1),_rmCy=pts.reduce((s,p)=>s+p.y,0)/(pts.length||1);for(let i=0;i<pts.length;i++){let j=(i+1)%pts.length;if(lengths[i]&&!_reportMode&&!_hideCanvasServiceLabels()&&pts.length<=5&&!(window.ACEILIsShortWall&&window.ACEILIsShortWall(i))){const mx=(pts[i].x+pts[j].x)/2,my=(pts[i].y+pts[j].y)/2,dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y,len=Math.hypot(dx,dy)||1;let nx=-dy/len,ny=dx/len;(_rmCx-mx)*nx+(_rmCy-my)*ny>0&&(nx=-nx,ny=-ny);const TICK=18,LBL=36;ctx.strokeStyle="#94a3b8",ctx.lineWidth=1,ctx.beginPath(),ctx.moveTo(pts[i].x,pts[i].y),ctx.lineTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.moveTo(pts[j].x,pts[j].y),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke(),ctx.beginPath(),ctx.moveTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke();const lx=mx+nx*LBL,ly=my+ny*LBL,dimText=_isArcSide(i)?"〜"+Math.round(_sideCurveLenCm(i))+" см":lengths[i]+" см";ctx.save(),ctx.font="bold 14px Arial";const tw=ctx.measureText(dimText).width,padX=8,boxH=20,bx=lx-tw/2-padX,by=ly-boxH/2-2,bw=tw+2*padX,bh=boxH+4;ctx.beginPath(),ctx.roundRect?ctx.roundRect(bx,by,bw,bh,7):ctx.rect(bx,by,bw,bh),ctx.fillStyle="rgba(255,255,255,.94)",ctx.fill(),ctx.strokeStyle="rgba(51,65,85,.30)",ctx.lineWidth=1,ctx.stroke(),ctx.fillStyle="#334155",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText(dimText,lx,ly+.5),ctx.restore()}else if(lengths[i]&&_reportMode&&pts.length<=5&&!(window.ACEILIsShortWall&&window.ACEILIsShortWall(i))&&(()=>{const r="function"==typeof _loadRS?_loadRS():window.reportSettings||{};
const e=document.getElementById("rs_dimensions");return!0===(e?e.checked:r.dimensions)
})()){const mx=(pts[i].x+pts[j].x)/2,my=(pts[i].y+pts[j].y)/2,dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y,len=Math.hypot(dx,dy)||1;let nx=-dy/len,ny=dx/len;(_rmCx-mx)*nx+(_rmCy-my)*ny>0&&(nx=-nx,ny=-ny);const TICK=16,LBL=34;ctx.save(),ctx.strokeStyle="rgba(37,99,235,.55)",ctx.lineWidth=1.3,ctx.beginPath(),ctx.moveTo(pts[i].x,pts[i].y),ctx.lineTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.moveTo(pts[j].x,pts[j].y),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke(),ctx.beginPath(),ctx.moveTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke();const lx=mx+nx*LBL,ly=my+ny*LBL,dimText=_isArcSide(i)?"〜"+Math.round(_sideCurveLenCm(i))+" см":lengths[i]+" см";ctx.font="bold 15px Arial";const tw=ctx.measureText(dimText).width,padX=9,boxH=22,bx=lx-tw/2-padX,by=ly-boxH/2-2,bw=tw+2*padX,bh=boxH+4;ctx.beginPath(),ctx.roundRect?ctx.roundRect(bx,by,bw,bh,7):ctx.rect(bx,by,bw,bh),ctx.fillStyle="rgba(255,255,255,.97)",ctx.fill(),ctx.strokeStyle="rgba(37,99,235,.45)",ctx.lineWidth=1,ctx.stroke(),ctx.fillStyle="#1d4ed8",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText(dimText,lx,ly+.5),ctx.restore()}}(_hideCanvasServiceLabels()?[]:_diagonalsForCurrentDraw()).forEach(d=>{const _confirmedKey=N(d[0])+N(d[1]);if(_reportMode&&!(Number(diagonalOverrides[_confirmedKey])>0))return;if(!pts[d[0]]||!pts[d[1]])return;const x1=pts[d[0]].x,y1=pts[d[0]].y,x2=pts[d[1]].x,y2=pts[d[1]].y,dx=x2-x1,dy=y2-y1,dist=Math.hypot(dx,dy)||1,nx=-dy/dist,ny=dx/dist,mx=(x1+x2)/2,my=(y1+y2)/2;function drawArrow(fromX,fromY,toX,toY){const ax=toX-fromX,ay=toY-fromY,al=Math.hypot(ax,ay)||1,bx=ax/al,by=ay/al;ctx.beginPath(),ctx.moveTo(toX,toY),ctx.lineTo(toX-11*bx-11*by*.5,toY-11*by+11*bx*.5),ctx.lineTo(toX-11*bx+11*by*.5,toY-11*by-11*bx*.5),ctx.closePath(),ctx.fillStyle="#dc2626",ctx.fill()}ctx.save(),ctx.strokeStyle="#dc2626",ctx.lineWidth=2.2,ctx.setLineDash([10,6]),ctx.beginPath(),ctx.moveTo(x1,y1),ctx.lineTo(x2,y2),ctx.stroke(),ctx.setLineDash([]),drawArrow(x2,y2,x1,y1),drawArrow(x1,y1,x2,y2),ctx.strokeStyle="#dc2626",ctx.lineWidth=2,[[x1,y1],[x2,y2]].forEach(([px,py])=>{ctx.beginPath(),ctx.moveTo(px+10*nx,py+10*ny),ctx.lineTo(px-10*nx,py-10*ny),ctx.stroke()});const overrideKey=N(d[0])+N(d[1]);let len=0;len=realPts.length&&realPts[d[0]]&&realPts[d[1]]?Math.hypot(realPts[d[1]].x-realPts[d[0]].x,realPts[d[1]].y-realPts[d[0]].y):dist;const _reportPair=_reportMode?_getReportDiagPairs({
  pts:pts,realPts:realPts,lengths:lengths,diagonals:[d],diagonalOverrides:diagonalOverrides
},((typeof _loadRS==="function"?_loadRS():window.reportSettings||{}).diagMode||"manual")).find(function(p){return p.a===Math.min(d[0],d[1])&&p.b===Math.max(d[0],d[1]);}):null,displayLen=_reportPair&&_reportPair.value>0?_reportPair.value:(null!=diagonalOverrides[overrideKey]?diagonalOverrides[overrideKey]:len),cm=Math.round(displayLen),m=(displayLen/100).toFixed(2),label=`${N(d[0])}${N(d[1])}: ${cm} см`,label2=`(${m} м)`;ctx.font="bold 13px -apple-system,Arial";const w1=ctx.measureText(label).width;ctx.font="12px -apple-system,Arial";const w2=ctx.measureText(label2).width,badgeW=Math.max(w1,w2)+22,bx=mx+34*nx-badgeW/2,by=my+34*ny-19;ctx.shadowColor="rgba(0,0,0,0.18)",ctx.shadowBlur=8,ctx.shadowOffsetY=3,ctx.beginPath(),ctx.moveTo(bx+10,by),ctx.lineTo(bx+badgeW-10,by),ctx.quadraticCurveTo(bx+badgeW,by,bx+badgeW,by+10),ctx.lineTo(bx+badgeW,by+38-10),ctx.quadraticCurveTo(bx+badgeW,by+38,bx+badgeW-10,by+38),ctx.lineTo(bx+10,by+38),ctx.quadraticCurveTo(bx,by+38,bx,by+38-10),ctx.lineTo(bx,by+10),ctx.quadraticCurveTo(bx,by,bx+10,by),ctx.closePath();const grad=ctx.createLinearGradient(bx,by,bx,by+38);grad.addColorStop(0,"#fff1f1"),grad.addColorStop(1,"#ffe0e0"),ctx.fillStyle=grad,ctx.fill(),ctx.shadowColor="transparent",ctx.shadowBlur=0,ctx.shadowOffsetY=0,ctx.strokeStyle="#ef4444",ctx.lineWidth=1.5,ctx.stroke(),ctx.fillStyle="#991b1b",ctx.font="bold 13px -apple-system,Arial",ctx.textAlign="center",ctx.fillText(label,bx+badgeW/2,by+15),ctx.fillStyle="#b91c1c",ctx.font="12px -apple-system,Arial",ctx.fillText(label2,bx+badgeW/2,by+29),ctx.textAlign="left",ctx.restore()}),_hideCanvasServiceLabels()||(drawAutoControlDiagonals(ctx),drawConflictZoneHighlight(ctx),drawRecommendedDiagHighlight(ctx)),drawWallSideFlash(ctx),_hideCanvasServiceLabels()||(_reportMode&&_loadRS&&!1===_loadRS().showWallMarks||drawWallMarks(ctx),_reportMode&&_loadRS&&!1===_loadRS().showLights||(drawLightBindings(ctx),drawLightMarks(ctx))),
_hideCanvasServiceLabels()||(()=>{ctx.save();const s=_canvasUIScale,fs=16*s,pad=5*s,bh=21*s,off=17*s,step=25*s,cx=pts.reduce((a,p)=>a+p.x,0)/(pts.length||1),cy=pts.reduce((a,p)=>a+p.y,0)/(pts.length||1),used=[];ctx.font=`700 ${fs}px -apple-system,Arial`,ctx.textAlign="center",ctx.textBaseline="middle";pts.forEach((p,i)=>{const t=N(i),tw=ctx.measureText(t).width,bw=tw+2*pad;let vx=p.x-cx,vy=p.y-cy,vl=Math.hypot(vx,vy)||1;vx/=vl;vy/=vl;const tx=-vy,ty=vx,candidates=[[vx*off,vy*off],[vx*off+tx*step,vy*off+ty*step],[vx*off-tx*step,vy*off-ty*step],[vx*(off+step),vy*(off+step)]];let box=null;for(const d of candidates){const lx=p.x+d[0],ly=p.y+d[1],r={x:lx-bw/2,y:ly-bh/2,w:bw,h:bh,lx:lx,ly:ly};if(!used.some(q=>r.x<q.x+q.w+3*s&&r.x+r.w+3*s>q.x&&r.y<q.y+q.h+3*s&&r.y+r.h+3*s>q.y)){box=r;break}}if(!box){const d=candidates[1],n=used.length+1;box={x:p.x+d[0]-bw/2,y:p.y+d[1]+n*3*s-bh/2,w:bw,h:bh,lx:p.x+d[0],ly:p.y+d[1]+n*3*s}}used.push(box);ctx.fillStyle="rgba(255,255,255,.9)",ctx.beginPath(),ctx.roundRect?ctx.roundRect(box.x,box.y,box.w,box.h,5*s):ctx.rect(box.x,box.y,box.w,box.h),ctx.fill(),ctx.fillStyle="#111827",ctx.fillText(t,box.lx,box.ly+.5*s)});ctx.restore()})(),
/* v9 complex room: compact wall-size table with geometry-aware placement. */
(!_reportMode&&!window.ACEILExternalWallDimensions&&!_hideCanvasServiceLabels()&&closed&&pts.length>5&&(()=>{
  const rr=cv.getBoundingClientRect(),u=rr&&rr.width?ACEILCanvas.width(cv)/rr.width:1,sc=viewScale||1,ox=viewOffsetX||0,oy=viewOffsetY||0;
  const row=16*u,pad=7*u,title=19*u,margin=7*u;let W=108*u,H=pad+title+pts.length*row+pad;
  const sp=pts.map(p=>({x:p.x*sc+ox,y:p.y*sc+oy}));
  const pointInPoly=(x,y)=>{let c=false;for(let i=0,j=sp.length-1;i<sp.length;j=i++){const a=sp[i],b=sp[j];if(((a.y>y)!=(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y||1e-9)+a.x))c=!c}return c};
  const segDist=(px,py,a,b)=>{const vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,q=vx*vx+vy*vy;if(q<1e-9)return Math.hypot(px-a.x,py-a.y);const z=Math.max(0,Math.min(1,(wx*vx+wy*vy)/q));return Math.hypot(px-a.x-z*vx,py-a.y-z*vy)};
  const rectPenalty=(x,y)=>{
    if(x<margin||y<margin||x+W>ACEILCanvas.width(cv)-margin||y+H>ACEILCanvas.height(cv)-margin)return 1e9;
    let score=0;
    /* Heavy penalty when the box covers a vertex or wall. */
    sp.forEach(p=>{if(p.x>x-10*u&&p.x<x+W+10*u&&p.y>y-10*u&&p.y<y+H+10*u)score+=5000});
    for(let i=0;i<sp.length;i++){
      const a=sp[i],b=sp[(i+1)%sp.length];
      const samples=12;
      for(let k=0;k<=samples;k++){const q=k/samples,px=a.x+(b.x-a.x)*q,py=a.y+(b.y-a.y)*q;if(px>x-6*u&&px<x+W+6*u&&py>y-6*u&&py<y+H+6*u)score+=700}
    }
    /* Prefer empty/non-room areas, but allow a genuine concavity/open pocket. */
    const probes=[[.12,.12],[.5,.12],[.88,.12],[.12,.5],[.5,.5],[.88,.5],[.12,.88],[.5,.88],[.88,.88]];
    probes.forEach(q=>{if(pointInPoly(x+W*q[0],y+H*q[1]))score+=110});
    /* Keep away from geometry even if there is no literal overlap. */
    const cx=x+W/2,cy=y+H/2;
    for(let i=0;i<sp.length;i++){const d=segDist(cx,cy,sp[i],sp[(i+1)%sp.length]);if(d<55*u)score+=(55*u-d)*2}
    return score;
  };
  const solve=()=>{
    let candidates=[];
    [margin,ACEILCanvas.width(cv)-W-margin].forEach(x=>{
      [margin,56*u,Math.max(margin,(ACEILCanvas.height(cv)-H)/2),Math.max(margin,ACEILCanvas.height(cv)-H-margin)].forEach(y=>candidates.push([x,y]));
    });
    const stepX=Math.max(28*u,W*.32),stepY=Math.max(24*u,row*2);
    for(let y=margin;y<=ACEILCanvas.height(cv)-H-margin;y+=stepY)for(let x=margin;x<=ACEILCanvas.width(cv)-W-margin;x+=stepX)candidates.push([x,y]);
    sp.forEach(p=>[[-W-12*u,-H/2],[12*u,-H/2],[-W/2,-H-12*u],[-W/2,12*u]].forEach(d=>candidates.push([p.x+d[0],p.y+d[1]])));
    let best=[ACEILCanvas.width(cv)-W-margin,margin],bestScore=Infinity;
    candidates.forEach(c=>{const x=Math.max(margin,Math.min(ACEILCanvas.width(cv)-W-margin,c[0])),y=Math.max(margin,Math.min(ACEILCanvas.height(cv)-H-margin,c[1])),q=rectPenalty(x,y);if(q<bestScore){bestScore=q;best=[x,y]}});
    return{x:best[0],y:best[1]};
  };
  /* True when the box would cover a vertex, a wall or the room interior. */
  const hitsGeometry=(x,y)=>{
    if([[.12,.12],[.5,.12],[.88,.12],[.12,.5],[.5,.5],[.88,.5],[.12,.88],[.5,.88],[.88,.88]].some(q=>pointInPoly(x+W*q[0],y+H*q[1])))return true;
    if(sp.some(p=>p.x>x-10*u&&p.x<x+W+10*u&&p.y>y-10*u&&p.y<y+H+10*u))return true;
    for(let i=0;i<sp.length;i++){const a=sp[i],b=sp[(i+1)%sp.length];for(let k=0;k<=12;k++){const q=k/12,px=a.x+(b.x-a.x)*q,py=a.y+(b.y-a.y)*q;if(px>x-6*u&&px<x+W+6*u&&py>y-6*u&&py<y+H+6*u)return true}}
    return false;
  };
  let spot=solve();
  const covers=hitsGeometry(spot.x,spot.y);
  window.__aceilWLHit=null;window.__aceilWLRows=[];
  /* Table would cover the plan: show a small collapsed chip until the user opens it. */
  /* A different shape (other number of points) starts with the list closed again. */
  if(window.__aceilWLN!==pts.length){window.__aceilWLN=pts.length;window.__aceilWLOpen=false}
  const collapsed=covers&&!window.__aceilWLOpen;
  if(collapsed){
    /* Chip is a blue pill in the same row as the "+ Кімната" button (to its right); if the plan reaches there it slides down the left edge. */
    W=104*u;H=28*u;
    const roomTabsTop=document.getElementById("roomTabsRow")?38*u:4*u,top=roomTabsTop+46*u,stepY=H+10*u,ys=[],xs=[margin+4*u,ACEILCanvas.width(cv)-W-margin-4*u];
    for(let yy=top;yy+H<=ACEILCanvas.height(cv)-margin;yy+=stepY)ys.push(yy);
    spot={x:100*u,y:roomTabsTop};
    if(hitsGeometry(spot.x,spot.y)){
      spot=null;
      for(const xx of xs){for(const yy of ys){if(!hitsGeometry(xx,yy)){spot={x:xx,y:yy};break}}if(spot)break}
      if(!spot)spot={x:100*u,y:roomTabsTop};
    }
  }
  const x=spot.x;let y=spot.y;
  /* Opened table must not hide its own title under the "+ Кімната" button in the top-left corner. */
  if(covers&&!collapsed)y=Math.min(Math.max(y,50*u),Math.max(margin,ACEILCanvas.height(cv)-H-margin));
  if(collapsed){
    ctx.save();ACEILCanvas.screenTransform(ctx);
    ctx.shadowColor="rgba(59,99,232,.35)",ctx.shadowBlur=10*u,ctx.shadowOffsetY=3*u;
    ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,W,H,14*u):ctx.rect(x,y,W,H);
    const _g=ctx.createLinearGradient(x,y,x+W,y+H);_g.addColorStop(0,"#3b63e8"),_g.addColorStop(1,"#5b5fe6");
    ctx.fillStyle=_g,ctx.fill();ctx.shadowColor="transparent";ctx.shadowBlur=0;
    ctx.fillStyle="#ffffff",ctx.font=`800 ${11*u}px -apple-system,Arial`,ctx.textAlign="center",ctx.textBaseline="middle";
    ctx.fillText("\u25BE Розміри · "+pts.length,x+W/2,y+H/2+.5*u);
    ctx.restore();
    window.__aceilWLHit={x:x,y:y,w:W,h:H};
    return true;
  }
  ctx.save();ACEILCanvas.screenTransform(ctx);
  ctx.shadowColor="rgba(15,23,42,.09)",ctx.shadowBlur=8*u,ctx.shadowOffsetY=2*u;
  ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,W,H,9*u):ctx.rect(x,y,W,H);
  ctx.fillStyle="rgba(255,255,255,.965)",ctx.fill();ctx.shadowColor="transparent";ctx.shadowBlur=0;
  ctx.strokeStyle="rgba(37,99,235,.25)",ctx.lineWidth=1*u,ctx.stroke();
  ctx.fillStyle="#2563eb",ctx.font=`800 ${10.5*u}px -apple-system,Arial`,ctx.textAlign="left",ctx.textBaseline="middle";
  ctx.fillText("Розміри стін",x+pad,y+pad+title/2);
  for(let i=0;i<pts.length;i++){
    const yy=y+pad+title+i*row+row/2,nm=N(i)+N((i+1)%pts.length),val=(_isArcSide(i)?"〜"+Math.round(_sideCurveLenCm(i)):Math.round(Number(lengths[i])||0))+" см";
    window.__aceilWLRows.push({x:x,y:yy-row/2,w:W,h:row,i:i});
    if(i){ctx.strokeStyle="rgba(148,163,184,.14)",ctx.lineWidth=.6*u,ctx.beginPath(),ctx.moveTo(x+pad,yy-row/2),ctx.lineTo(x+W-pad,yy-row/2),ctx.stroke()}
    ctx.fillStyle="#172554",ctx.font=`800 ${10*u}px -apple-system,Arial`,ctx.textAlign="left",ctx.fillText(nm,x+pad,yy);
    ctx.fillStyle="#334155",ctx.font=`650 ${10*u}px -apple-system,Arial`,ctx.textAlign="right",ctx.fillText(val,x+W-pad,yy);
  }
  if(covers){ctx.fillStyle="#2563eb",ctx.font=`800 ${11*u}px -apple-system,Arial`,ctx.textAlign="right",ctx.textBaseline="middle",ctx.fillText("\u25B4",x+W-pad,y+pad+title/2);window.__aceilWLHit={x:x,y:y,w:W,h:H}}
  ctx.restore();return true;
})()),
ctx.restore()}
