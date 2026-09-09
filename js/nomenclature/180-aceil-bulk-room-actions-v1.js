
(function(){
"use strict";
if(window.__aceilBulkRoomActionsV1)return;
window.__aceilBulkRoomActionsV1=true;

/* ============================================================
   A·CEIL — масові дії по кімнатах (v1)

   Дозволяє застосувати профіль (елементи категорії "profiles")
   або колір вставки (категорія "insert") з активної кімнати на
   всі або обрані інші кімнати проєкту.

   ВАЖЛИВО (обмеження, перевірити на реальних проєктах):
   - Кількість профілю масштабується за співвідношенням периметрів
     кімнат (евристика, не викликає "рідний" калькулятор профілю).
   - "Прибрати вставку" одразу зануляє qty вибраних позицій, але
     не блокує наступний авто-перерахунок (autoFillNomenclature),
     який теоретично може знову підставити вставку за замовчуванням
     при наступному редагуванні геометрії. Якщо це проявиться на
     практиці — потрібно додати такий самий wrapper навколо
     autoFillNomenclature, як у js/nomenclature/177-*-insert-choice-guard-v1.js.
   ============================================================ */

function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}}
function parseState(v){try{return typeof v==="string"?JSON.parse(v||"{}"):(v&&typeof v==="object"?v:{});}catch(_){return{};}}
function stringifyState(s){try{return JSON.stringify(s);}catch(_){return "{}";}}

function projects(){try{return window.A·CEIL.ProjectRepository.list({clone:true});}catch(_){return [];}}
function writeAll(arr){try{return window.A·CEIL.ProjectRepository.replaceAll(arr);}catch(_){return null;}}
function match(p,id){return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&String(v)===String(id);});}
function activeObjectIndex(arr){
  var id=null;
  try{if(typeof _activeObjectId!=="undefined"&&_activeObjectId!=null)id=_activeObjectId;}catch(_){}
  return arr.findIndex(function(p){return match(p,id);});
}
function activeRoomId(){try{return window._activeRoomId||null;}catch(_){return null;}}
function findRoomIdx(rooms,rid){return rooms.findIndex(function(r){return String(r&&r.id)===String(rid);});}

function categoryOf(groupName,itemName){
  if(typeof window.A·CEILReportCategory==="function"){
    try{return window.A·CEILReportCategory(groupName,itemName);}catch(_){/* fall through */}
  }
  var g=String(groupName||"").toLowerCase(),i=String(itemName||"").toLowerCase();
  if(/проф|карниз|багет|тіньов|парящ|паряч|shadow/.test(g))return "profiles";
  if(/встав|шнур|маскув/.test(g))return "insert";
  if(/проф|карниз|багет|тіньов|парящ|паряч|shadow/.test(i))return "profiles";
  if(/встав|шнур|маскув/.test(i))return "insert";
  return "other";
}

function liveState(){
  return{
    elemItems:(typeof elemItems!=="undefined"&&Array.isArray(elemItems))?elemItems:(Array.isArray(window.elemItems)?window.elemItems:[]),
    elemGroups:(typeof elemGroups!=="undefined"&&Array.isArray(elemGroups))?elemGroups:(Array.isArray(window.elemGroups)?window.elemGroups:[])
  };
}
function syncLiveIfActive(roomId,newItems,newGroups){
  if(String(roomId)!==String(activeRoomId()))return false;
  try{
    if(typeof elemItems!=="undefined"){elemItems.length=0;Array.prototype.push.apply(elemItems,clone(newItems||[]));}
    else window.elemItems=clone(newItems||[]);
  }catch(_){window.elemItems=clone(newItems||[]);}
  try{
    if(typeof elemGroups!=="undefined"){elemGroups.length=0;Array.prototype.push.apply(elemGroups,clone(newGroups||[]));}
    else window.elemGroups=clone(newGroups||[]);
  }catch(_){window.elemGroups=clone(newGroups||[]);}
  try{if(typeof renderElemList==="function")renderElemList();}catch(_){}
  try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(_){}
  try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(_){}
  try{if(typeof saveState==="function")saveState();}catch(_){}
  try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();}catch(_){}
  return true;
}

function readRoomState(room){
  var st=parseState(room.state);
  if(String(room.id)===String(activeRoomId())){
    var live=liveState();
    st=Object.assign({},st,live);
  }
  return st;
}
function writeRoomState(room,patch){
  var st=parseState(room.state);
  Object.assign(st,patch);
  room.state=stringifyState(st);
  syncLiveIfActive(room.id,st.elemItems,st.elemGroups);
}
function syncStateRoomsField(obj){
  var s=parseState(obj.state);
  s.rooms=clone(obj.rooms||[]);
  obj.state=JSON.stringify(s);
}
function withProject(fn){
  var arr=projects(),oi=activeObjectIndex(arr);
  if(oi<0)return{ok:false,reason:"no-project"};
  var obj=arr[oi],rooms=Array.isArray(obj.rooms)?obj.rooms:[];
  var result=fn(obj,rooms)||{ok:false,reason:"unknown"};
  if(result.ok){
    syncStateRoomsField(obj);
    writeAll(arr);
  }
  return result;
}

function listRooms(){
  var arr=projects(),oi=activeObjectIndex(arr);
  if(oi<0)return[];
  var rooms=Array.isArray(arr[oi].rooms)?arr[oi].rooms:[];
  return rooms.map(function(r){return{id:r.id,name:r.name||"Кімната",per:Number(r.per)||0,active:String(r.id)===String(activeRoomId())};});
}

function removeCategoryFromState(items,groups,cat){
  var groupIds=groups.filter(function(g){return categoryOf(g.name,"")===cat;}).map(function(g){return String(g.id);});
  var keptItems=items.filter(function(it){
    if(it.groupId&&groupIds.indexOf(String(it.groupId))>=0)return false;
    if(!it.groupId&&categoryOf("",it.name)===cat)return false;
    return true;
  });
  var keptGroups=groups.filter(function(g){return groupIds.indexOf(String(g.id))<0;});
  return{items:keptItems,groups:keptGroups};
}
function cloneCategoryFromSource(srcItems,srcGroups,cat){
  var groupIds=srcGroups.filter(function(g){return categoryOf(g.name,"")===cat;}).map(function(g){return String(g.id);});
  var items=srcItems.filter(function(it){return (it.groupId&&groupIds.indexOf(String(it.groupId))>=0)||(!it.groupId&&categoryOf("",it.name)===cat);});
  var groups=srcGroups.filter(function(g){return groupIds.indexOf(String(g.id))>=0;});
  return{items:items,groups:groups};
}
function scaleQtyForLength(it,ratio){
  var u=String(it.unit||"").toLowerCase();
  var isLengthUnit=/^м$|пог|м\.п|метр/.test(u);
  if(!isLengthUnit||!isFinite(ratio)||ratio<=0)return Number(it.qty)||0;
  return Math.round((Number(it.qty)||0)*ratio*100)/100;
}

/* ---------- профіль/елементи ---------- */
function applyProfileToRooms(sourceRoomId,targetRoomIds){
  return withProject(function(obj,rooms){
    if(rooms.length<2)return{ok:false,reason:"single-room"};
    var srcIdx=findRoomIdx(rooms,sourceRoomId);
    if(srcIdx<0)return{ok:false,reason:"source-not-found"};
    var srcState=readRoomState(rooms[srcIdx]);
    var profile=cloneCategoryFromSource(srcState.elemItems||[],srcState.elemGroups||[],"profiles");
    if(!profile.items.length)return{ok:false,reason:"no-profile-in-source"};
    var srcPer=Number(rooms[srcIdx].per)||0,count=0;
    targetRoomIds.forEach(function(rid){
      if(String(rid)===String(sourceRoomId))return;
      var idx=findRoomIdx(rooms,rid);
      if(idx<0)return;
      var tState=readRoomState(rooms[idx]);
      var stripped=removeCategoryFromState(tState.elemItems||[],tState.elemGroups||[],"profiles");
      var tPer=Number(rooms[idx].per)||0,ratio=srcPer>0?tPer/srcPer:1;
      var idMap={},suffix=Date.now()+"_"+Math.random().toString(36).slice(2,6);
      var newGroups=profile.groups.map(function(g){var ng=clone(g);ng.id="g_bulk_"+suffix+"_"+ng.id;idMap[g.id]=ng.id;return ng;});
      var newItems=profile.items.map(function(it){var ni=clone(it);ni.id="i_bulk_"+suffix+"_"+(ni.id||Math.random().toString(36).slice(2,6));if(it.groupId&&idMap[it.groupId])ni.groupId=idMap[it.groupId];ni.qty=scaleQtyForLength(it,ratio);return ni;});
      writeRoomState(rooms[idx],{elemItems:stripped.items.concat(newItems),elemGroups:stripped.groups.concat(newGroups)});
      count++;
    });
    return{ok:count>0,count:count,reason:count>0?null:"nothing-applied"};
  });
}

/* ---------- вставка (колір / прибрати) ---------- */
function insertColorOf(it){
  if(it&&(it.sourceVariant==="white"||it.sourceVariant==="black"))return it.sourceVariant;
  var n=String(it&&it.name||"").toLowerCase();
  if(/біл/.test(n))return "white";
  if(/чорн/.test(n))return "black";
  return null;
}
function applyInsertToRooms(sourceRoomId,targetRoomIds,opts){
  opts=opts||{};
  return withProject(function(obj,rooms){
    if(rooms.length<2)return{ok:false,reason:"single-room"};
    var srcState=null;
    if(!opts.remove){
      var srcIdx=findRoomIdx(rooms,sourceRoomId);
      if(srcIdx<0)return{ok:false,reason:"source-not-found"};
      srcState=readRoomState(rooms[srcIdx]);
    }
    var count=0;
    targetRoomIds.forEach(function(rid){
      if(!opts.remove&&String(rid)===String(sourceRoomId))return;
      var idx=findRoomIdx(rooms,rid);
      if(idx<0)return;
      var tState=readRoomState(rooms[idx]);
      var items=(tState.elemItems||[]).map(clone),groups=tState.elemGroups||[];
      var insertItems=items.filter(function(it){var g=groups.find(function(x){return String(x.id)===String(it.groupId);});return categoryOf(g&&g.name,it.name)==="insert";});
      if(!insertItems.length)return;
      if(opts.remove){
        insertItems.forEach(function(it){it.qty=0;it.insertSelected=false;});
        writeRoomState(rooms[idx],{elemItems:items,elemGroups:groups,insertBulkRemoved:true});
        count++;
        return;
      }
      var srcInsert=(srcState.elemItems||[]).filter(function(it){var g=(srcState.elemGroups||[]).find(function(x){return String(x.id)===String(it.groupId);});return categoryOf(g&&g.name,it.name)==="insert";});
      var srcChosen=srcInsert.find(function(it){return it.insertSelected===true;})||srcInsert.find(function(it){return Number(it.qty)>0;});
      var chosenColor=srcChosen?insertColorOf(srcChosen):null;
      if(!chosenColor)return;
      var qtyMagnitude=insertItems.reduce(function(m,it){return Math.max(m,Number(it.qty)||0);},0)||Number(srcChosen.qty)||0;
      var matched=false;
      insertItems.forEach(function(it){
        var isChosen=insertColorOf(it)===chosenColor;
        it.qty=isChosen?qtyMagnitude:0;
        it.insertSelected=isChosen;
        if(isChosen)matched=true;
      });
      if(!matched)return;
      writeRoomState(rooms[idx],{elemItems:items,elemGroups:groups,insertBulkRemoved:false});
      count++;
    });
    return{ok:count>0,count:count,reason:count>0?null:"nothing-applied"};
  });
}

window.A·CEIL=window.A·CEIL||{};
window.A·CEIL.BulkRoomActions={
  listRooms:listRooms,
  applyProfileToRooms:applyProfileToRooms,
  applyInsertToRooms:applyInsertToRooms,
  activeRoomId:activeRoomId
};
})();
