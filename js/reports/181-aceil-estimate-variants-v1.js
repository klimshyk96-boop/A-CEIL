
(function(){
"use strict";
if(window.__aceilEstimateVariantsV1)return;
window.__aceilEstimateVariantsV1=true;

/* ============================================================
   A·CEIL — варіанти кошторису (v1)

   Дозволяє зберегти поточний стан номенклатури всіх кімнат проєкту
   як іменований "варіант", створити другий варіант на основі
   першого (для подальшого редагування через масові дії), порівняти
   суми двох варіантів і, коли клієнт визначився, видалити зайвий.

   Варіант зберігає ЛИШЕ номенклатуру (elemItems/elemGroups/
   wallMarks/lightMarks/linearElements) по кожній кімнаті — геометрія
   (pts/realPts/lengths) спільна і не дублюється.

   Дані живуть у project.estimateVariants (масив) та
   project.activeVariantId. Персистяться через
   window.A·CEIL.ProjectRepository, як і решта проєкту.
   ============================================================ */

function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}}
function parseState(v){try{return typeof v==="string"?JSON.parse(v||"{}"):(v&&typeof v==="object"?v:{});}catch(_){return{};}}
function stringifyState(s){try{return JSON.stringify(s);}catch(_){return "{}";}}
function uid(prefix){return prefix+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);}

function projects(){try{return window.A·CEIL.ProjectRepository.list({clone:true});}catch(_){return [];}}
function writeAll(arr){try{return window.A·CEIL.ProjectRepository.replaceAll(arr);}catch(_){return null;}}
function match(p,id){return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&String(v)===String(id);});}
function activeObjectIndex(arr){
  var id=null;
  try{if(typeof _activeObjectId!=="undefined"&&_activeObjectId!=null)id=_activeObjectId;}catch(_){}
  return arr.findIndex(function(p){return match(p,id);});
}
function activeRoomId(){try{return window._activeRoomId||null;}catch(_){return null;}}

var NOM_FIELDS=["elemItems","elemGroups","wallMarks","lightMarks","linearElements"];

function liveState(){
  var out={};
  try{out.elemItems=(typeof elemItems!=="undefined"&&Array.isArray(elemItems))?elemItems:(Array.isArray(window.elemItems)?window.elemItems:[]);}catch(_){out.elemItems=Array.isArray(window.elemItems)?window.elemItems:[];}
  try{out.elemGroups=(typeof elemGroups!=="undefined"&&Array.isArray(elemGroups))?elemGroups:(Array.isArray(window.elemGroups)?window.elemGroups:[]);}catch(_){out.elemGroups=Array.isArray(window.elemGroups)?window.elemGroups:[];}
  try{out.wallMarks=(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks))?wallMarks:(Array.isArray(window.wallMarks)?window.wallMarks:[]);}catch(_){out.wallMarks=Array.isArray(window.wallMarks)?window.wallMarks:[];}
  try{out.lightMarks=(typeof lightMarks!=="undefined"&&Array.isArray(lightMarks))?lightMarks:(Array.isArray(window.lightMarks)?window.lightMarks:[]);}catch(_){out.lightMarks=Array.isArray(window.lightMarks)?window.lightMarks:[];}
  try{out.linearElements=(typeof linearElements!=="undefined"&&Array.isArray(linearElements))?linearElements:(Array.isArray(window.linearElements)?window.linearElements:[]);}catch(_){out.linearElements=Array.isArray(window.linearElements)?window.linearElements:[];}
  return out;
}
function readRoomNomenclature(room){
  var st=parseState(room.state),out={};
  NOM_FIELDS.forEach(function(f){out[f]=Array.isArray(st[f])?st[f]:[];});
  if(String(room.id)===String(activeRoomId())){
    var live=liveState();
    NOM_FIELDS.forEach(function(f){if(Array.isArray(live[f])&&live[f].length)out[f]=live[f];});
  }
  return out;
}
function writeRoomNomenclature(room,nom){
  var st=parseState(room.state);
  NOM_FIELDS.forEach(function(f){st[f]=clone(nom[f]||[]);});
  room.state=stringifyState(st);
  if(String(room.id)===String(activeRoomId())){
    NOM_FIELDS.forEach(function(f){
      try{
        if(typeof window[f]!=="undefined"&&Array.isArray(window[f])){window[f].length=0;Array.prototype.push.apply(window[f],clone(nom[f]||[]));}
        else window[f]=clone(nom[f]||[]);
      }catch(_){window[f]=clone(nom[f]||[]);}
    });
    try{if(typeof renderElemList==="function")renderElemList();}catch(_){}
    try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(_){}
    try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(_){}
    try{if(typeof saveState==="function")saveState();}catch(_){}
    try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();}catch(_){}
  }
}
function syncStateRoomsField(obj){
  var s=parseState(obj.state);
  s.rooms=clone(obj.rooms||[]);
  s.estimateVariants=clone(obj.estimateVariants||[]);
  s.activeVariantId=obj.activeVariantId||null;
  obj.state=JSON.stringify(s);
}
function withProject(fn){
  var arr=projects(),oi=activeObjectIndex(arr);
  if(oi<0)return{ok:false,reason:"no-project"};
  var obj=arr[oi];
  if(!Array.isArray(obj.rooms))obj.rooms=[];
  if(!Array.isArray(obj.estimateVariants))obj.estimateVariants=[];
  var result=fn(obj)||{ok:false,reason:"unknown"};
  if(result.ok){
    syncStateRoomsField(obj);
    writeAll(arr);
  }
  return result;
}

function listVariants(){
  var arr=projects(),oi=activeObjectIndex(arr);
  if(oi<0)return[];
  var obj=arr[oi];
  return (Array.isArray(obj.estimateVariants)?obj.estimateVariants:[]).map(function(v){
    return{id:v.id,label:v.label,createdAt:v.createdAt,active:String(v.id)===String(obj.activeVariantId||"")};
  });
}

function snapshotAllRooms(rooms){
  var out={};
  rooms.forEach(function(r){out[r.id]=readRoomNomenclature(r);});
  return out;
}

function saveVariant(label){
  return withProject(function(obj){
    if(!Array.isArray(obj.rooms)||obj.rooms.length<1)return{ok:false,reason:"no-rooms"};
    var v={id:uid("var"),label:String(label||"Варіант "+(obj.estimateVariants.length+1)),createdAt:Date.now(),rooms:snapshotAllRooms(obj.rooms)};
    obj.estimateVariants.push(v);
    obj.activeVariantId=v.id;
    return{ok:true,id:v.id};
  });
}

function duplicateVariant(sourceId,label){
  return withProject(function(obj){
    var src=obj.estimateVariants.find(function(v){return String(v.id)===String(sourceId);});
    if(!src)return{ok:false,reason:"source-not-found"};
    var v={id:uid("var"),label:String(label||src.label+" (копія)"),createdAt:Date.now(),rooms:clone(src.rooms)};
    obj.estimateVariants.push(v);
    obj.activeVariantId=v.id;
    // одразу застосувати як активний стан, щоб можна було редагувати
    obj.rooms.forEach(function(r){if(v.rooms[r.id])writeRoomNomenclature(r,v.rooms[r.id]);});
    return{ok:true,id:v.id};
  });
}

function applyVariant(id){
  return withProject(function(obj){
    var v=obj.estimateVariants.find(function(x){return String(x.id)===String(id);});
    if(!v)return{ok:false,reason:"not-found"};
    obj.rooms.forEach(function(r){if(v.rooms[r.id])writeRoomNomenclature(r,v.rooms[r.id]);});
    obj.activeVariantId=v.id;
    return{ok:true};
  });
}

function deleteVariant(id){
  return withProject(function(obj){
    var idx=obj.estimateVariants.findIndex(function(x){return String(x.id)===String(id);});
    if(idx<0)return{ok:false,reason:"not-found"};
    obj.estimateVariants.splice(idx,1);
    if(String(obj.activeVariantId||"")===String(id))obj.activeVariantId=null;
    return{ok:true};
  });
}

/* ---------- порівняння ---------- */
function categoryOf(groupName,itemName){
  if(typeof window.A·CEILReportCategory==="function"){
    try{return window.A·CEILReportCategory(groupName,itemName);}catch(_){/* fall through */}
  }
  var g=String(groupName||"").toLowerCase(),i=String(itemName||"").toLowerCase();
  if(/проф|карниз|багет|тіньов|парящ|паряч|shadow/.test(g))return "profiles";
  if(/плів|полотн|premium|msd|teqtum|pongs|clipso|ткан/.test(g))return "canvas";
  if(/встав|шнур|маскув/.test(g))return "insert";
  if(/освіт|світ|люстр|трек|бра|led|ламп|світиль|точков/.test(g))return "lighting";
  if(g)return "other";
  if(/проф|карниз|багет|тіньов|парящ|паряч|shadow/.test(i))return "profiles";
  if(/плів|полотн|premium|msd|teqtum|pongs|clipso|ткан/.test(i))return "canvas";
  if(/встав|шнур|маскув/.test(i))return "insert";
  if(/освіт|світ|люстр|трек|бра|led|ламп|світиль|точков/.test(i))return "lighting";
  return "other";
}
function groupsFromState(st){
  try{if(typeof _modernGetNomenclatureGroupsFromState==="function")return _modernGetNomenclatureGroupsFromState(st||{})||[];}catch(_){}
  return [];
}
function totalsForSnapshot(roomsSnapshot,roomsMeta){
  var out={total:0,profiles:0,canvas:0,insert:0,lighting:0,other:0},perRoom=[];
  Object.keys(roomsSnapshot||{}).forEach(function(roomId){
    var st=roomsSnapshot[roomId]||{},groups=groupsFromState(st),roomTotal=0;
    groups.forEach(function(g){
      (g.items||[]).forEach(function(it){
        var qty=Number(it.qty)||0,price=Number(it.price)||0,sum=qty*price;
        if(qty<=0)return;
        var cat=categoryOf(g.name,it.name);
        out[cat]=(out[cat]||0)+sum;
        out.total+=sum;
        roomTotal+=sum;
      });
    });
    var meta=(roomsMeta||[]).find(function(r){return String(r.id)===String(roomId);});
    perRoom.push({id:roomId,name:meta?meta.name:"Кімната",total:roomTotal});
  });
  return{totals:out,perRoom:perRoom};
}
function compareVariants(idA,idB){
  var arr=projects(),oi=activeObjectIndex(arr);
  if(oi<0)return null;
  var obj=arr[oi];
  var a=(obj.estimateVariants||[]).find(function(v){return String(v.id)===String(idA);});
  var b=(obj.estimateVariants||[]).find(function(v){return String(v.id)===String(idB);});
  if(!a||!b)return null;
  var meta=(obj.rooms||[]).map(function(r){return{id:r.id,name:r.name||"Кімната"};});
  return{
    a:{id:a.id,label:a.label,result:totalsForSnapshot(a.rooms,meta)},
    b:{id:b.id,label:b.label,result:totalsForSnapshot(b.rooms,meta)}
  };
}

window.A·CEIL=window.A·CEIL||{};
window.A·CEIL.EstimateVariants={
  listVariants:listVariants,
  saveVariant:saveVariant,
  duplicateVariant:duplicateVariant,
  applyVariant:applyVariant,
  deleteVariant:deleteVariant,
  compareVariants:compareVariants
};
})();
