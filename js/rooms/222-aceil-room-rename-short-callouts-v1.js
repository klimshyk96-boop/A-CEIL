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

/* v7: dimensions for complex rooms are rendered by the native canvas renderer.
   Keep this helper only for simple rooms where the existing short-wall treatment is used. */
window.ACEILIsShortWall=function(i){
  try{
    var p=(typeof pts!=="undefined"&&Array.isArray(pts))?pts:(Array.isArray(window.pts)?window.pts:[]);
    var ls=(typeof lengths!=="undefined"&&Array.isArray(lengths))?lengths:(Array.isArray(window.lengths)?window.lengths:[]);
    if(p.length>5)return false;
    var v=Math.round(Number(ls[i])||0);
    return v>0&&v<=90;
  }catch(e){return false;}
};
})();
