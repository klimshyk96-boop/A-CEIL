
(function(){
  'use strict';
  if(window.__A_CEIL_WallElementsParallelLanes20260828) return;
  window.__A_CEIL_WallElementsParallelLanes20260828 = true;

  var FALLBACK = ['#16a34a','#7c3aed','#d97706','#2563eb','#dc2626','#0891b2'];
  function num(v){ v=Number(v); return Number.isFinite(v)?v:0; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function getPts(){ try{return Array.isArray(pts)?pts:[]}catch(_){return []} }
  function getMarks(){
    try{ if(typeof wallMarks!=='undefined' && Array.isArray(wallMarks)) return wallMarks; }catch(_){ }
    return Array.isArray(window.wallMarks)?window.wallMarks:[];
  }
  function getSideLen(i,a,b){
    try{ if(typeof _sideLenCm==='function'){ var v=Number(_sideLenCm(i)); if(v>0)return v; } }catch(_){ }
    try{ if(Array.isArray(lengths) && Number(lengths[i])>0)return Number(lengths[i]); }catch(_){ }
    return Math.hypot(num(b.x)-num(a.x),num(b.y)-num(a.y))||1;
  }
  function color(v,i){
    v=String(v||'').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)?v:FALLBACK[Math.abs(i||0)%FALLBACK.length];
  }
  function rr(c,x,y,w,h,r){
    c.beginPath();
    if(c.roundRect)c.roundRect(x,y,w,h,r); else c.rect(x,y,w,h);
  }
  function geometry(m){
    var p=getPts();
    if(p.length<2||!m)return null;
    var i=Number(m.sideIndex)||0, a=p[i], b=p[(i+1)%p.length];
    if(!a||!b)return null;
    var sideLen=getSideLen(i,a,b), len=Math.max(0,Number(m.lenCm)||0), off=Math.max(0,Number(m.offsetCm)||0);
    if(!sideLen||!len)return null;
    if(off+len>sideLen)off=Math.max(0,sideLen-len);
    var t1=clamp(off/sideLen,0,1), t2=clamp((off+len)/sideLen,0,1);
    var dx=num(b.x)-num(a.x), dy=num(b.y)-num(a.y), L=Math.hypot(dx,dy)||1;
    var nx=-dy/L, ny=dx/L;
    var x1=num(a.x)+dx*t1, y1=num(a.y)+dy*t1, x2=num(a.x)+dx*t2, y2=num(a.y)+dy*t2;
    var mx=(x1+x2)/2, my=(y1+y2)/2;
    var cx=p.reduce(function(s,q){return s+num(q.x)},0)/(p.length||1);
    var cy=p.reduce(function(s,q){return s+num(q.y)},0)/(p.length||1);
    // nx/ny points OUTSIDE the room. We draw wall elements inside so they stay visible on mobile.
    if((cx-mx)*nx+(cy-my)*ny>0){ nx=-nx; ny=-ny; }
    return {i:i,x1:x1,y1:y1,x2:x2,y2:y2,mx:mx,my:my,nx:nx,ny:ny,dx:dx,dy:dy,len:len};
  }
  function laneIndex(list, mark, geom){
    var idx=0;
    for(var j=0;j<list.length;j++){
      var q=list[j];
      if(q===mark) return idx;
      var g=geometry(q);
      if(g && g.i===geom.i) idx++;
    }
    return idx;
  }
  function drawLabel(c,g,m,col,lane){
    var title=String(m.type||'Елемент').replace(/\s+/g,' ').trim()||'Елемент';
    c.save();
    c.font='800 10px -apple-system,BlinkMacSystemFont,Arial';
    var rawW=Math.min(Math.max(74,c.measureText(title).width+22),142), rawH=24;
    var vertical=Math.abs(g.dy)>1.15*Math.abs(g.dx);
    // Put labels in separate rows too: 24px, 52px, 80px... from the wall.
    var labelDist=24 + lane*28;
    var lx=g.mx-g.nx*labelDist, ly=g.my-g.ny*labelDist;
    var cw=(c.canvas&&c.canvas.width)||9999, ch=(c.canvas&&c.canvas.height)||9999;
    var boxW=vertical?rawH:rawW, boxH=vertical?rawW:rawH;
    lx=clamp(lx,10+boxW/2,cw-10-boxW/2);
    ly=clamp(ly,10+boxH/2,ch-10-boxH/2);
    c.translate(lx,ly);
    if(vertical)c.rotate(-Math.PI/2);
    c.fillStyle='rgba(255,255,255,.97)';
    rr(c,-rawW/2,-rawH/2,rawW,rawH,8); c.fill();
    c.strokeStyle=col; c.lineWidth=1.15;
    rr(c,-rawW/2,-rawH/2,rawW,rawH,8); c.stroke();
    c.fillStyle=col; c.textAlign='center'; c.textBaseline='middle';
    c.font='800 10px -apple-system,BlinkMacSystemFont,Arial';
    c.fillText(title,0,0);
    c.restore();
  }

  window.drawWallMarks=function(c){
    try{
      if(typeof _reportMode!=='undefined' && _reportMode)return;
      var list=getMarks(), p=getPts();
      if(!Array.isArray(list)||!list.length||p.length<2)return;
      c.save();
      c.lineCap='round'; c.lineJoin='round'; c.setLineDash([]);
      list.forEach(function(m,i){
        var g=geometry(m); if(!g)return;
        var lane=laneIndex(list,m,g);
        // Each element gets its own parallel lane. 1st = 7px, 2nd = 14px, 3rd = 21px...
        var dist=7*(lane+1);
        var sx=-g.nx*dist, sy=-g.ny*dist;
        var col=color(m.color,i);
        c.strokeStyle=col; c.lineWidth=5.8;
        c.beginPath(); c.moveTo(g.x1+sx,g.y1+sy); c.lineTo(g.x2+sx,g.y2+sy); c.stroke();
        drawLabel(c,g,m,col,lane);
      });
      c.restore();
    }catch(e){
      try{c.restore()}catch(_){ }
      try{window.__diagSilent&&window.__diagSilent(e)}catch(_){ }
    }
  };
  try{ drawWallMarks=window.drawWallMarks; }catch(_){ }
})();
