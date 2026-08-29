
(function(){
'use strict';
if(window.__A·CEILRoomCalcIsolationV331)return;
window.__A·CEILRoomCalcIsolationV331=true;

function clone(v){try{return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));}catch(_){try{return JSON.parse(JSON.stringify(v));}catch(__){return Array.isArray(v)?v.slice():v;}}}
function parse(raw){if(raw&&typeof raw==='object')return clone(raw);try{return JSON.parse(raw||'{}');}catch(_){return {};}}
function key(it){if(!it)return '';return it.id!=null?'id:'+String(it.id):'n:'+String(it.name||'').trim().toLowerCase()+'|g:'+String(it.groupId==null?'':it.groupId);}
function zeroResult(it){
  var c=clone(it||{});
  c.qty=0;
  c.manualQtyOverride=false;
  c.autoFilled=false;c.autoZero=true;
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
function install(items,groups){
  var ii=clone(items||[]),gg=clone(groups||[]);
  try{elemItems=ii;window.elemItems=elemItems;}catch(_){window.elemItems=ii;}
  try{elemGroups=gg;window.elemGroups=elemGroups;}catch(_){window.elemGroups=gg;}
}
function mergedRoomItems(room,catalog){
  var st=parse(room&&room.state), saved=Array.isArray(st.elemItems)?st.elemItems:(room&&Array.isArray(room.elemItems)?room.elemItems:[]);
  var base=Array.isArray(catalog)?catalog:[];
  var bySaved={};saved.forEach(function(it){var k=key(it);if(k)bySaved[k]=it;});
  var ROOM_FIELDS=['qty','manualQtyOverride','autoFilled','autoZero','calculatedQty','autoQty','resultQty','computedQty','lineTotal','total','sum','amount'];
  var out=[],seen={};
  base.forEach(function(cat){
    var k=key(cat);if(!k||seen[k])return;seen[k]=1;
    /* v3.39: catalog owns ALL structure/configuration.
       A room may restore only its calculation/result fields. */
    var row=zeroResult(cat),old=bySaved[k];
    if(old){
      ROOM_FIELDS.forEach(function(field){
        if(Object.prototype.hasOwnProperty.call(old,field))row[field]=clone(old[field]);
      });
    }
    out.push(row);
  });
  /* Deliberately DO NOT append items found only in an old room snapshot.
     Old rooms are no longer allowed to resurrect deleted/stale catalog rows. */
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

var oldLoad=window._loadRoomToCanvas||((typeof _loadRoomToCanvas==='function')?_loadRoomToCanvas:null);
if(typeof oldLoad==='function'&&!oldLoad.__roomCalcIsolationV331){
  var wrappedLoad=function(obj,roomIdx){
    var catalog=catalogItems(), groupsBefore=catalogGroups();
    var target=obj&&Array.isArray(obj.rooms)?obj.rooms[roomIdx]:null;
    /* v3.39: global nomenclature is authoritative.
       Room snapshot contributes only quantities/results. */
    var targetItems=mergedRoomItems(target,catalog);
    var targetGroups=groupsBefore;

    var result=oldLoad.apply(this,arguments);

    /* Restore room results on top of the global catalog without replacing
       group order, names, icons, prices, units or auto-fill sources. */
    install(targetItems,targetGroups);
    refresh();
    persistRoomRuntime(obj,roomIdx);
    return result;
  };
  wrappedLoad.__roomCalcIsolationV331=true;
  wrappedLoad.__original=oldLoad;
  window._loadRoomToCanvas=wrappedLoad;
  try{_loadRoomToCanvas=wrappedLoad;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* New room: same catalog/prices, always zero room quantities. */
var oldConfirm=window.confirmNewRoom||((typeof confirmNewRoom==='function')?confirmNewRoom:null);
if(typeof oldConfirm==='function'&&!oldConfirm.__roomCalcIsolationV331){
  var wrappedConfirm=function(){
    var catalog=catalogItems(),groups=catalogGroups();
    var result=oldConfirm.apply(this,arguments);
    var fresh=catalog.map(zeroResult);
    install(fresh,groups);refresh();
    try{
      var idx=typeof _activeRoomIdx!=='undefined'?_activeRoomIdx:null;
      var oid=typeof _activeObjectId!=='undefined'?_activeObjectId:null;
      var list=window.A·CEIL.ProjectRepository.list();
      var oi=list.findIndex(function(p){return p&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&oid!=null&&String(v)===String(oid);});});
      if(oi>=0&&Number.isInteger(idx)&&list[oi].rooms&&list[oi].rooms[idx])persistRoomRuntime(list[oi],idx);
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return result;
  };
  wrappedConfirm.__roomCalcIsolationV331=true;
  window.confirmNewRoom=wrappedConfirm;
  try{confirmNewRoom=wrappedConfirm;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

window.A·CEILRoomCalcAuditV331=function(){
  try{
    var oid=typeof _activeObjectId!=='undefined'?_activeObjectId:null,list=window.A·CEIL.ProjectRepository.list();
    var obj=list.find(function(p){return p&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&oid!=null&&String(v)===String(oid);});});
    if(!obj||!Array.isArray(obj.rooms))return {ok:false,reason:'no_active_object'};
    return {ok:true,rooms:obj.rooms.map(function(r,i){var s=parse(r.state);return {index:i,id:r.id,name:r.name,itemQty:(s.elemItems||[]).map(function(it){return {id:it.id,name:it.name,qty:it.qty};})};})};
  }catch(e){return {ok:false,reason:String(e&&e.message||e)};}
};
})();
