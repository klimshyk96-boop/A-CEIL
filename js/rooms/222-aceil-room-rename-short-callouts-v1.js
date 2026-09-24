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

/* Short wall dimensions: replace cramped labels with outside callouts.
   Applies to normal canvas and report capture because both use draw(). */
var threshold=90, proto=window.CanvasRenderingContext2D&&CanvasRenderingContext2D.prototype;
if(!proto||proto.__aceilShortCallouts)return; proto.__aceilShortCallouts=true;
var nativeFill=proto.fillText, suppress=false, shortValues={};
proto.fillText=function(text,x,y,maxWidth){
  if(suppress){var s=String(text||'').replace(/\s+/g,' ').trim(),m=s.match(/^(\d+(?:[.,]\d+)?)\s*см$/i);if(m&&shortValues[Math.round(parseFloat(m[1].replace(',','.')))])return;}
  return arguments.length>3?nativeFill.call(this,text,x,y,maxWidth):nativeFill.call(this,text,x,y);
};
function label(i){var s='',n=i+1;while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function getPts(){try{return Array.isArray(pts)?pts:[];}catch(e){return Array.isArray(window.pts)?window.pts:[];}}
function getLens(){try{return Array.isArray(lengths)?lengths:[];}catch(e){return Array.isArray(window.lengths)?window.lengths:[];}}
function ctx(){try{return cv&&cv.getContext?cv.getContext('2d'):null;}catch(e){var c=document.getElementById('cv');return c&&c.getContext?c.getContext('2d'):null;}}
function callouts(){
  var p=getPts(),ls=getLens(),c=ctx(); if(!c||p.length<2)return;
  var isClosed=false;try{isClosed=!!closed;}catch(e){isClosed=!!window.closed;}
  var count=isClosed?p.length:Math.max(0,p.length-1), cx=0,cy=0;p.forEach(function(q){cx+=Number(q.x)||0;cy+=Number(q.y)||0;});cx/=p.length;cy/=p.length;
  var groups={};
  for(var i=0;i<count;i++){var L=Math.round(Number(ls[i])||0);if(!(L>0&&L<=threshold))continue;var a=p[i],b=p[(i+1)%p.length],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;if((mx+nx*20-cx)*(mx-cx)+(my+ny*20-cy)*(my-cy)<0){nx=-nx;ny=-ny;}var key=Math.round(Math.atan2(dy,dx)*8/Math.PI);(groups[key]||(groups[key]=[])).push({i:i,L:L,mx:mx,my:my,nx:nx,ny:ny});}
  Object.keys(groups).forEach(function(k){groups[k].sort(function(a,b){return a.my-b.my||a.mx-b.mx;});groups[k].forEach(function(o,j){
    var off=30+j*24, ex=o.mx+o.nx*off,ey=o.my+o.ny*off, tx=ex+o.nx*16,ty=ey+o.ny*16, text=label(o.i)+label((o.i+1)%p.length)+' · '+o.L+' см';
    c.save();c.strokeStyle='#64748b';c.fillStyle='rgba(255,255,255,.97)';c.lineWidth=1.2;c.setLineDash([]);c.beginPath();c.moveTo(o.mx,o.my);c.lineTo(ex,ey);c.lineTo(tx,ty);c.stroke();c.font='700 12px Arial';var w=c.measureText(text).width+14,h=24, bx=tx+(o.nx>=0?4:-w-4),by=ty-h/2;c.beginPath();if(c.roundRect)c.roundRect(bx,by,w,h,7);else c.rect(bx,by,w,h);c.fill();c.strokeStyle='#cbd5e1';c.stroke();c.fillStyle='#334155';c.textAlign='center';c.textBaseline='middle';nativeFill.call(c,text,bx+w/2,by+h/2);c.restore();
  });});
}
var oldDraw=window.draw;if(typeof oldDraw==='function'&&!oldDraw.__aceilShortCallouts){
  var wrapped=function(){shortValues={};getLens().forEach(function(v){v=Math.round(Number(v)||0);if(v>0&&v<=threshold)shortValues[v]=1;});suppress=true;try{return oldDraw.apply(this,arguments);}finally{suppress=false;try{callouts();}catch(e){}}};wrapped.__aceilShortCallouts=true;window.draw=wrapped;try{draw=wrapped;}catch(e){}
}
})();
