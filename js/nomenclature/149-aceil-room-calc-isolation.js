
(function(){
'use strict';
if(window.__A·CEILRoomCalcIsolationV331)return;
window.__A·CEILRoomCalcIsolationV331=true;

function clone(v){try{return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));}catch(_){try{return JSON.parse(JSON.stringify(v));}catch(__){return Array.isArray(v)?v.slice():v;}}}
function parse(raw){if(raw&&typeof raw==='object')return clone(raw);try{return JSON.parse(raw||'{}');}catch(_){return {};}}
function key(it){if(!it)return '';return it.id!=null?'id:'+String(it.id):'n:'+String(it.name||'').trim().toLowerCase()+'|g:'+String(it.groupId==null?'':it.groupId);}
function nameKey(it){if(!it)return '';return 'n:'+String(it.name||'').trim().toLowerCase()+'|g:'+String(it.groupId==null?'':it.groupId);}
function zeroResult(it){
  var c=clone(it||{});
  c.qty=0;
  c.manualQtyOverride=false;
  delete c.filmRoomSelected;
  delete c.contourInsertSuppressed;
  c.autoFilled=false;c.autoZero=true;
  /* A whole-contour replacement is a room decision, never a catalog default.
     Without clearing it here, choosing a shadow/floating contour in one room
     silently colours and recalculates every newly created room. */
  c.fullContourSelected=false;
  delete c.fullContourPresetName;
  delete c.fullContourColor;
  /* Вставка рахується за замовчуванням завжди. Для НОВОЇ кімнати
     локальний дефолт — біла вставка. Вибір чорної зберігається лише
     у snapshot поточної кімнати і не змінює глобальний каталог/дефолт. */
  c.insertSelected=aceilDefaultInsertSelection(c);
  ['calculatedQty','autoQty','resultQty','computedQty','lineTotal','total','sum','amount'].forEach(function(k){
    if(Object.prototype.hasOwnProperty.call(c,k))delete c[k];
  });
  return c;
}
function runtimeItems(){try{return clone(typeof elemItems!=='undefined'&&Array.isArray(elemItems)?elemItems:(window.elemItems||[]));}catch(_){return clone(window.elemItems||[]);}}
function runtimeGroups(){try{return clone(typeof elemGroups!=='undefined'&&Array.isArray(elemGroups)?elemGroups:(window.elemGroups||[]));}catch(_){return clone(window.elemGroups||[]);}}
function catalogItems(){
  try{
    var c=window.__A·CEILNomenCatalogV339;
    if(c&&Array.isArray(c.items)&&c.items.length)return clone(c.items);
  }catch(_){}
  return runtimeItems();
}
function catalogGroups(){
  try{
    var c=window.__A·CEILNomenCatalogV339;
    if(c&&Array.isArray(c.groups)&&c.groups.length)return clone(c.groups);
  }catch(_){}
  return runtimeGroups();
}
function roomFilmItems(list){return (Array.isArray(list)?list:[]).filter(function(it){return it&&it.filmPickerManaged===true&&it.roomScoped===true;});}
function roomFilmGroups(list){return (Array.isArray(list)?list:[]).filter(function(g){return g&&g.roomScoped===true&&g.roomScopedKind==='film-color';});}
function filmGroupSet(managed){var out={};managed.forEach(function(it){out[String(it.groupId)]=true;});return out;}
function install(items,groups){
  var ii=clone(items||[]),gg=clone(groups||[]);
  try{elemItems=ii;window.elemItems=elemItems;}catch(_){window.elemItems=ii;}
  try{elemGroups=gg;window.elemGroups=elemGroups;}catch(_){window.elemGroups=gg;}
}
function mergedRoomItems(room,catalog){
  var st=parse(room&&room.state), saved=Array.isArray(st.elemItems)?st.elemItems:(room&&Array.isArray(room.elemItems)?room.elemItems:[]);
  var managed=roomFilmItems(saved),managedGroups=filmGroupSet(managed);
  var base=(Array.isArray(catalog)?catalog:[]).filter(function(it){return !(managedGroups[String(it&&it.groupId)]&&Number(it&&it.filmWidth)>0);});
  var bySaved={};saved.forEach(function(it){var k=key(it);if(k)bySaved[k]=it;var nk=nameKey(it);if(nk&&!bySaved[nk])bySaved[nk]=it;});
  var ROOM_FIELDS=['qty','manualQtyOverride','contourInsertSuppressed','autoFilled','autoZero','insertSelected','fullContourSelected','fullContourPresetName','fullContourColor','calculatedQty','autoQty','resultQty','computedQty','lineTotal','total','sum','amount'];
  var out=[],seen={};
  base.forEach(function(cat){
    var k=key(cat);if(!k||seen[k])return;seen[k]=1;
    /* v3.39: catalog owns ALL structure/configuration.
       A room may restore only its calculation/result fields. */
    var row=zeroResult(cat),old=bySaved[k]||bySaved[nameKey(cat)];
    if(old){
      ROOM_FIELDS.forEach(function(field){
        if(Object.prototype.hasOwnProperty.call(old,field))row[field]=clone(old[field]);
      });
    }
    out.push(row);
  });
  managed.forEach(function(it){var k=key(it);if(k&&!seen[k]){seen[k]=1;out.push(clone(it));}});
  /* Зі старого знімка повертаємо лише явно позначені кімнатні позиції плівки.
     Інші видалені або застарілі рядки каталогу не воскресають. */
  return out;
}
function mergedRoomGroups(room,catalog){
  var st=parse(room&&room.state),saved=Array.isArray(st.elemGroups)?st.elemGroups:(room&&Array.isArray(room.elemGroups)?room.elemGroups:[]),out=clone(Array.isArray(catalog)?catalog:[]),seen={};
  out.forEach(function(g){seen[String(g&&g.id)]=true;});
  roomFilmGroups(saved).forEach(function(g){if(!seen[String(g.id)]){seen[String(g.id)]=true;out.unshift(clone(g));}});
  return out;
}
function persistRoomRuntime(obj,idx){
  try{
    if(!obj||!Array.isArray(obj.rooms)||!obj.rooms[idx])return;
    var room=obj.rooms[idx],st=parse(room.state);
    st.elemItems=runtimeItems();st.elemGroups=runtimeGroups();
    room.elemItems=clone(st.elemItems);room.elemGroups=clone(st.elemGroups);room.state=JSON.stringify(st);
    var list=window.A·CEIL&&window.A·CEIL.ProjectRepository?window.A·CEIL.ProjectRepository.list():[];
    var oid=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
    var oi=list.findIndex(function(p){return p&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&oid!=null&&String(v)===String(oid);});});
    if(oi>=0){list[oi].rooms[idx]=clone(room);window.A·CEIL.ProjectRepository.replaceAll(list);}
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
function refresh(){
  try{if(typeof window.rmUniversalAutoCountV319==='function')window.rmUniversalAutoCountV319({noSave:true});}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof renderElemList==='function')renderElemList();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof updateElemBadge==='function')updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof recalcElemTotal==='function')recalcElemTotal();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* Explicit lifecycle operations: no interception of room globals. */
function emptyState(items,groups){
  return {schemaVersion:window.A·CEILProjectSchema?window.A·CEILProjectSchema.CURRENT_VERSION:3,
    projectType:'room',pts:[],lengths:[],realPts:[],closed:false,diagonals:[],diagonalOverrides:{},
    circleMode:false,circleDiamCm:0,notes:[],elemItems:clone(items),elemGroups:clone(groups),
    lightMarks:[],wallMarks:[],linearElements:[],wallTypes:[],arcPoints:[]};
}
function refreshPrice(){
  try{if(typeof recalcElemTotal==='function')recalcElemTotal();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof updateElemBadge==='function')updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof rpcUpdate==='function')rpcUpdate();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{if(typeof rpUpdateHome==='function')rpUpdateHome();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
window.A·CEIL=window.A·CEIL||{};
window.A·CEIL.RoomNomenclature=Object.freeze({
  prepareLoad:function(obj,index){
    var room=obj&&Array.isArray(obj.rooms)?obj.rooms[index]:null;
    if(!room)return null;
    var state=parse(room.state);
    // Preserve legacy empty-state defaults without installing an obsolete catalogue first.
    var saved=Array.isArray(state.elemItems)&&state.elemItems.length?state.elemItems:
      (Array.isArray(room.elemItems)&&room.elemItems.length?room.elemItems:null);
    if(!saved)room.state=JSON.stringify(Object.assign(emptyState([],[]),state));
    return {object:obj,index:index,items:mergedRoomItems(room,catalogItems()),groups:mergedRoomGroups(room,catalogGroups())};
  },
  finishLoad:function(context){
    if(!context)return;
    install(context.items,context.groups);refresh();persistRoomRuntime(context.object,context.index);
  },
  refreshPrice:function(){refreshPrice();setTimeout(refreshPrice,0);setTimeout(refreshPrice,80);},
  newRoomState:function(){return emptyState(catalogItems().map(zeroResult),catalogGroups());},
  installNewRoom:function(state,obj,index){
    install(state.elemItems,state.elemGroups);refresh();persistRoomRuntime(obj,index);
  }
});

window.A·CEILRoomCalcAuditV331=function(){
  try{
    var oid=typeof _activeObjectId!=='undefined'?_activeObjectId:null,list=window.A·CEIL.ProjectRepository.list();
    var obj=list.find(function(p){return p&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&oid!=null&&String(v)===String(oid);});});
    if(!obj||!Array.isArray(obj.rooms))return {ok:false,reason:'no_active_object'};
    return {ok:true,rooms:obj.rooms.map(function(r,i){var s=parse(r.state);return {index:i,id:r.id,name:r.name,itemQty:(s.elemItems||[]).map(function(it){return {id:it.id,name:it.name,qty:it.qty};})};})};
  }catch(e){return {ok:false,reason:String(e&&e.message||e)};}
};
})();
