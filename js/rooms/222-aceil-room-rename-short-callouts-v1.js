(function(){
'use strict';
function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
function projects(){try{return typeof getProjects==='function'?getProjects():[];}catch(e){return[];}}
function persist(arr,obj){try{if(typeof setProjects==='function')setProjects(arr);}catch(e){} try{if(typeof _updateObjectInCloud==='function')Promise.resolve(_updateObjectInCloud(obj)).catch(function(){});}catch(e){}}
window.ACEILRenameRoom=function(index){
  var arr=projects(), oid=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
  var oi=arr.findIndex(function(p){return String(p&&(p.id||p._dbId))===String(oid);});
  if(oi<0||!arr[oi].rooms||!arr[oi].rooms[index])return;
  var room=arr[oi].rooms[index], old=String(room.name||('Кімната '+(index+1)));
  var name=window.prompt('Назва кімнати',old); if(name===null)return; name=String(name).trim();
  if(!name)return void(typeof showToast==='function'&&showToast('Вкажіть назву кімнати'));
  room.name=name; arr[oi]._roomRevision=Date.now(); arr[oi]._localUpdatedAt=Date.now();
  persist(arr,arr[oi]);
  try{if(String(window._activeRoomId||'')===String(room.id)||Number(window._activeRoomIdx)===Number(index)){window._currentProjComment=name;if(typeof _showRoomSaveBar==='function')_showRoomSaveBar(name);}}
  catch(e){}
  try{if(typeof renderObjectRooms==='function')renderObjectRooms(clone(arr[oi]));}catch(e){}
  try{if(typeof _renderRoomTabsAboveCanvas==='function')_renderRoomTabsAboveCanvas();}catch(e){}
  if(typeof showToast==='function')showToast('✏️ Кімнату перейменовано: '+name);
};
function enhanceRoomList(){
  var list=document.getElementById('objRoomsList'); if(!list)return;
  var cards=Array.prototype.slice.call(list.children||[]);
  cards.forEach(function(card){
    if(card.dataset&&card.dataset.renameReady==='1')return;
    var open=card.querySelector('button[onclick*="openRoom("]'); if(!open)return;
    var m=String(open.getAttribute('onclick')||'').match(/openRoom\((\d+)\)/); if(!m)return;
    var idx=Number(m[1]), body=card.children&&card.children[1]; if(!body)return;
    var title=body.querySelector('div'); if(!title)return;
    title.style.display='flex'; title.style.alignItems='center'; title.style.gap='6px';
    var b=document.createElement('button'); b.type='button'; b.title='Перейменувати кімнату'; b.setAttribute('aria-label','Перейменувати кімнату');
    b.textContent='✎'; b.style.cssText='margin-left:auto;padding:2px 7px;border:0;border-radius:8px;background:#f1f5f9;color:#475569;box-shadow:none;font-size:15px;line-height:22px;flex:0 0 auto';
    b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();window.ACEILRenameRoom(idx);}; title.appendChild(b); card.dataset.renameReady='1';
  });
}
new MutationObserver(enhanceRoomList).observe(document.documentElement,{childList:true,subtree:true}); setTimeout(enhanceRoomList,400);

/* Short wall dimensions v3.
   Short sides use ONE clean outside callout instead of the standard badge.
   Geometry follows canvas pan/zoom; typography/spacing are counter-scaled so labels stay readable. */
var SHORT_CM=90;
function getPts(){try{return Array.isArray(pts)?pts:[];}catch(e){return Array.isArray(window.pts)?window.pts:[];}}
function getLens(){try{return Array.isArray(lengths)?lengths:[];}catch(e){return Array.isArray(window.lengths)?window.lengths:[];}}
function isClosed(){try{return !!closed;}catch(e){return !!window.closed;}}
function getCtx(){try{return cv&&cv.getContext?cv.getContext('2d'):null;}catch(e){var c=document.getElementById('cv');return c&&c.getContext?c.getContext('2d'):null;}}
function alphaLabel(i){var s='',n=i+1;while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
window.ACEILIsShortWall=function(i){var ls=getLens(),v=Math.round(Number(ls[i])||0);return v>0&&v<=SHORT_CM;};
function rounded(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
function drawShortCallouts(){
  var p=getPts(),ls=getLens(),c=getCtx(); if(!c||p.length<2)return;
  var count=isClosed()?p.length:Math.max(0,p.length-1),cx=0,cy=0;
  p.forEach(function(q){cx+=Number(q.x)||0;cy+=Number(q.y)||0;});cx/=p.length;cy/=p.length;
  var sc=1,ox=0,oy=0;try{sc=Math.max(.5,Number(viewScale)||1);ox=Number(viewOffsetX)||0;oy=Number(viewOffsetY)||0;}catch(e){sc=Math.max(.5,Number(window.viewScale)||1);}
  var inv=1/sc, items=[];
  for(var i=0;i<count;i++){
    var L=Math.round(Number(ls[i])||0); if(!(L>0&&L<=SHORT_CM))continue;
    var a=p[i],b=p[(i+1)%p.length],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    var nx=-dy/d,ny=dx/d; if((cx-mx)*nx+(cy-my)*ny>0){nx=-nx;ny=-ny;}
    items.push({i:i,L:L,mx:mx,my:my,nx:nx,ny:ny,angle:Math.atan2(dy,dx)});
  }
  /* Neighbours on the same outside edge are staggered, but never into the room. */
  items.sort(function(a,b){return a.my-b.my||a.mx-b.mx;});
  items.forEach(function(o,idx){
    var neighbours=items.filter(function(q){return Math.abs(q.angle-o.angle)<.35&&Math.hypot(q.mx-o.mx,q.my-o.my)<180*inv;});
    var rank=Math.max(0,neighbours.indexOf(o));
    var lead=(34+rank*28)*inv, elbow=12*inv, gap=7*inv;
    var ex=o.mx+o.nx*lead,ey=o.my+o.ny*lead;
    /* short tangential elbow makes ownership of the callout obvious */
    var tx=-o.ny,ty=o.nx, side=(o.nx<-.25||Math.abs(o.nx)<.25&&o.ny<0)?-1:1;
    var ax=ex+tx*elbow*side, ay=ey+ty*elbow*side;
    var text=alphaLabel(o.i)+alphaLabel((o.i+1)%p.length)+' · '+o.L+' см';
    c.save();
    c.lineWidth=1.15*inv;c.strokeStyle='#94a3b8';c.setLineDash([]);c.lineCap='round';c.lineJoin='round';
    c.beginPath();c.moveTo(o.mx,o.my);c.lineTo(ex,ey);c.lineTo(ax,ay);c.stroke();
    c.font='700 '+(11.5*inv)+'px -apple-system,BlinkMacSystemFont,Arial';
    var w=c.measureText(text).width+14*inv,h=22*inv;
    var bx=ax+(side>0?gap:-w-gap),by=ay-h/2;
    rounded(c,bx,by,w,h,6*inv);c.fillStyle='rgba(255,255,255,.98)';c.fill();c.strokeStyle='#cbd5e1';c.lineWidth=.9*inv;c.stroke();
    c.fillStyle='#475569';c.textAlign='center';c.textBaseline='middle';c.fillText(text,bx+w/2,by+h/2+.2*inv);
    c.restore();
  });
}
var oldDraw=window.draw;
if(typeof oldDraw==='function'&&!oldDraw.__aceilShortCalloutsV3){
  var wrapped=function(){
    var r=oldDraw.apply(this,arguments);
    try{
      var c=getCtx(),sc=1,ox=0,oy=0;try{sc=Number(viewScale)||1;ox=Number(viewOffsetX)||0;oy=Number(viewOffsetY)||0;}catch(e){}
      if(c){c.save();c.translate(ox,oy);c.scale(sc,sc);drawShortCallouts();c.restore();}
    }catch(e){}
    return r;
  };
  wrapped.__aceilShortCalloutsV3=true;window.draw=wrapped;try{draw=wrapped;}catch(e){}
}
})();
