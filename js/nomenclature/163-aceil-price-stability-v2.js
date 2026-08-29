
(function(){
"use strict";
if(window.__A_CEIL_PriceStabilityV2)return;
window.__A_CEIL_PriceStabilityV2=true;

function num(v){
  var x=Number(v);
  return Number.isFinite(x)?x:0;
}
function parseState(v){
  try{return typeof v==="string"?JSON.parse(v||"{}"):(v&&typeof v==="object"?v:{});}
  catch(_){return{};}
}
function itemTotal(items){
  return (Array.isArray(items)?items:[]).reduce(function(sum,it){
    return sum + num(it&&it.qty)*num(it&&it.price);
  },0);
}
function liveRoomTotal(){
  try{
    var items=(typeof elemItems!=="undefined"&&Array.isArray(elemItems))?elemItems:(window.elemItems||[]);
    return itemTotal(items);
  }catch(_){return 0;}
}
function projectList(){
  try{
    return window.A·CEIL&&window.A·CEIL.ProjectRepository
      ? window.A·CEIL.ProjectRepository.list({clone:true})
      : [];
  }catch(_){return[];}
}
function sameId(p,id){
  return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){
    return v!=null&&String(v)===String(id);
  });
}
function activeObject(){
  try{
    var id=(typeof _activeObjectId!=="undefined")?_activeObjectId:null;
    if(id==null)return null;
    return projectList().find(function(p){return sameId(p,id);})||null;
  }catch(_){return null;}
}
function savedRoomTotal(room){
  var st=parseState(room&&room.state);
  return itemTotal(st.elemItems);
}

/*
  PRICE RULE:
  - opening a project NEVER recalculates nomenclature;
  - in multi-room mode the top total = sum of all room states;
  - only the currently open room may use the live runtime total, so edits are
    reflected immediately without contaminating the other rooms.
*/
function stableTotal(){
  var obj=activeObject();
  if(!obj||!obj.multiRoom||!Array.isArray(obj.rooms)||!obj.rooms.length){
    return liveRoomTotal();
  }

  var activeIdx=null;
  try{
    if(typeof _activeRoomIdx!=="undefined"&&_activeRoomIdx!=null)activeIdx=Number(_activeRoomIdx);
  }catch(_){}

  return obj.rooms.reduce(function(sum,room,idx){
    if(activeIdx!==null&&idx===activeIdx){
      return sum+liveRoomTotal();
    }
    return sum+savedRoomTotal(room);
  },0);
}
function setTopTotal(){
  try{
    var total=stableTotal();
    var pill=document.getElementById("rpcTotalPill");
    if(pill){
      var b=pill.querySelector("b");
      if(b)b.textContent=Math.round(total).toLocaleString("uk-UA")+" ₴";
    }
    var old=document.getElementById("rpcTotal");
    if(old)old.textContent=Math.round(total).toLocaleString("uk-UA")+" ₴";
  }catch(_){}
}
window.A_CEIL_GetStableProjectTotal=stableTotal;
window.A_CEIL_UpdateStableProjectTotal=setTopTotal;

function wrapAfter(name){
  var old=null;
  try{old=window[name]||null;}catch(_){}
  if(typeof old!=="function"||old.__priceStabilityV2)return;

  var wrapped=function(){
    var result=old.apply(this,arguments);
    if(result&&typeof result.then==="function"){
      return result.then(function(v){
        setTimeout(setTopTotal,0);
        setTimeout(setTopTotal,100);
        return v;
      });
    }
    setTimeout(setTopTotal,0);
    setTimeout(setTopTotal,100);
    return result;
  };
  wrapped.__priceStabilityV2=true;
  wrapped.__original=old;
  window[name]=wrapped;
}

/* These wrappers only update DISPLAY. They never call auto-count/recalculate. */
["loadProject","openObjectRooms","openRoom","_loadRoomToCanvas","rpcUpdate","rpUpdateHome"].forEach(wrapAfter);

/* Any change of nomenclature may change only the current room's live contribution. */
var oldRecalc=null;
try{oldRecalc=window.recalcElemTotal||recalcElemTotal;}catch(_){}
if(typeof oldRecalc==="function"&&!oldRecalc.__priceStabilityV2){
  var wrappedRecalc=function(){
    var r=oldRecalc.apply(this,arguments);
    setTopTotal();
    return r;
  };
  wrappedRecalc.__priceStabilityV2=true;
  window.recalcElemTotal=wrappedRecalc;
  try{recalcElemTotal=wrappedRecalc;}catch(_){}
}

/* Initial correction after all existing startup code has finished. */
setTimeout(setTopTotal,250);
setTimeout(setTopTotal,700);

})();
