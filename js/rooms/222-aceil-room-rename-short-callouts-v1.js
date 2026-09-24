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

/* Short wall dimensions v4.
   Screen-space callouts: anchors follow the transformed drawing, while label size stays
   constant on screen. This is intentionally drawn AFTER the canvas transform is restored. */
var SHORT_CM=90;
function getPts(){try{return Array.isArray(pts)?pts:[];}catch(e){return Array.isArray(window.pts)?window.pts:[];}}
function getLens(){try{return Array.isArray(lengths)?lengths:[];}catch(e){return Array.isArray(window.lengths)?window.lengths:[];}}
function isClosed(){try{return !!closed;}catch(e){return !!window.closed;}}
function getCtx(){try{return cv&&cv.getContext?cv.getContext('2d'):null;}catch(e){var q=document.getElementById('cv');return q&&q.getContext?q.getContext('2d'):null;}}
function alphaLabel(i){var s='',n=i+1;while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
window.ACEILIsShortWall=function(i){var ls=getLens(),v=Math.round(Number(ls[i])||0);return v>0&&v<=SHORT_CM;};
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
function viewport(){var sc=1,ox=0,oy=0;try{sc=Number(viewScale)||1;ox=Number(viewOffsetX)||0;oy=Number(viewOffsetY)||0;}catch(e){sc=Number(window.viewScale)||1;ox=Number(window.viewOffsetX)||0;oy=Number(window.viewOffsetY)||0;}return{sc:sc,ox:ox,oy:oy};}
function toScreen(q,v){return{x:q.x*v.sc+v.ox,y:q.y*v.sc+v.oy};}
function drawShortCalloutsScreen(){
  var p=getPts(),ls=getLens(),c=getCtx();if(!c||p.length<2)return;
  var v=viewport(),count=isClosed()?p.length:Math.max(0,p.length-1),sp=p.map(function(q){return toScreen(q,v);}),cx=0,cy=0;
  sp.forEach(function(q){cx+=q.x;cy+=q.y;});cx/=sp.length;cy/=sp.length;
  var items=[];
  for(var i=0;i<count;i++){
    var L=Math.round(Number(ls[i])||0);if(!(L>0&&L<=SHORT_CM))continue;
    var a=sp[i],b=sp[(i+1)%sp.length],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    var nx=-dy/d,ny=dx/d;if((cx-mx)*nx+(cy-my)*ny>0){nx=-nx;ny=-ny;}
    items.push({i:i,L:L,mx:mx,my:my,nx:nx,ny:ny,ang:Math.atan2(dy,dx)});
  }
  /* Stable lane assignment in SCREEN pixels. Zooming therefore never shrinks the labels. */
  items.sort(function(a,b){return a.my-b.my||a.mx-b.mx;});
  var lanes=[];
  items.forEach(function(o){
    var lane=0;
    for(;;lane++){
      var hit=lanes.some(function(q){return q.lane===lane&&Math.abs(q.ang-o.ang)<.38&&Math.hypot(q.mx-o.mx,q.my-o.my)<92;});
      if(!hit)break;
    }
    o.lane=lane;lanes.push(o);
  });
  items.forEach(function(o){
    var lead=34+o.lane*29, ex=o.mx+o.nx*lead,ey=o.my+o.ny*lead;
    var text=alphaLabel(o.i)+alphaLabel((o.i+1)%p.length)+' · '+o.L+' см';
    c.save();c.setTransform(1,0,0,1,0,0);c.setLineDash([]);c.lineCap='round';c.lineJoin='round';
    c.font='700 12px -apple-system,BlinkMacSystemFont,Arial';var w=Math.max(76,c.measureText(text).width+20),h=28;
    /* Label is placed on the outward side. Connector terminates at the near edge of badge. */
    var horizontal=Math.abs(o.nx)>.45,bx,by,edgeX,edgeY;
    if(horizontal){bx=ex+(o.nx<0?-w-12:12);by=ey-h/2;edgeX=o.nx<0?bx+w:bx;edgeY=ey;}
    else{bx=ex-w/2;by=ey+(o.ny<0?-h-12:12);edgeX=ex;edgeY=o.ny<0?by+h:by;}
    c.strokeStyle='#2563eb';c.lineWidth=1.35;c.beginPath();c.moveTo(o.mx,o.my);c.lineTo(ex,ey);c.lineTo(edgeX,edgeY);c.stroke();
    c.fillStyle='#2563eb';c.beginPath();c.arc(o.mx,o.my,2.8,0,Math.PI*2);c.fill();
    rr(c,bx,by,w,h,7);c.fillStyle='rgba(255,255,255,.985)';c.fill();c.strokeStyle='#2563eb';c.lineWidth=1.15;c.stroke();
    c.fillStyle='#172554';c.textAlign='center';c.textBaseline='middle';c.fillText(text,bx+w/2,by+h/2+.25);c.restore();
  });
}

var oldDraw=window.draw;
if(typeof oldDraw==='function'&&!oldDraw.__aceilShortCalloutsV4){
  var wrapped=function(){var r=oldDraw.apply(this,arguments);try{drawShortCalloutsScreen();}catch(e){}return r;};
  wrapped.__aceilShortCalloutsV4=true;window.draw=wrapped;try{draw=wrapped;}catch(e){}
}
})();
