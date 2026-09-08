(function(){
  "use strict";
  if(window.__aceilInsertChoiceGuardV1)return;
  window.__aceilInsertChoiceGuardV1=true;

  function items(){
    try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return Array.isArray(window.elemItems)?window.elemItems:[];
  }
  function norm(value){return String(value==null?"":value).trim().toLowerCase();}
  function colorOf(item){
    if(item&&(item.sourceVariant==="white"||item.sourceVariant==="black"))return item.sourceVariant;
    var name=norm(item&&item.name);
    if(/біл/.test(name))return "white";
    if(/чорн/.test(name))return "black";
    return "";
  }
  function candidates(){
    return items().filter(function(item){
      if(!item)return false;
      if(norm(item.source)==="white_insert")return true;
      /* Older/cloud nomenclature can have no source assigned to the black
         insert. It is still the same insert choice and must be preserved. */
      var name=norm(item.name);
      return /вставк|insert/.test(name)&&!!colorOf(item);
    });
  }
  function preferredBeforeAutofill(list){
    /* A value entered by the user must override the catalog's default white
       selection. Otherwise every recalculation resets black back to zero. */
    var manualPositive=list.filter(function(item){
      return Number(item.qty)>0&&(item.manualQtyOverride===true||item.autoFilled!==true);
    });
    if(manualPositive.length===1)return manualPositive[0];

    var selected=list.filter(function(item){return item.insertSelected===true;});
    if(selected.length===1)return selected[0];

    var blackPositive=list.filter(function(item){return colorOf(item)==="black"&&Number(item.qty)>0;});
    var whitePositive=list.some(function(item){return colorOf(item)==="white"&&Number(item.qty)>0;});
    return blackPositive.length===1&&!whitePositive?blackPositive[0]:null;
  }
  function refreshAndSave(){
    try{if(typeof renderElemList==="function")renderElemList();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof saveState==="function")saveState();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  var previous=window.autoFillNomenclature;
  if(typeof previous!=="function"||previous.__insertChoiceGuardV1)return;

  var wrapped=function(){
    var before=candidates();
    var preferred=preferredBeforeAutofill(before);
    var preferredId=preferred&&preferred.id;
    var result=previous.apply(this,arguments);
    if(!preferred)return result;

    function restorePreferredInsert(){
      var after=candidates();
      var chosen=after.find(function(item){return item===preferred||String(item.id)===String(preferredId);});
      if(!chosen)return;

      var calculatedQty=after.reduce(function(max,item){return Math.max(max,Number(item.qty)||0);},0);
      var changed=false;
      after.forEach(function(item){
        var isChosen=item===chosen;
        var qty=isChosen?calculatedQty:0;
        if(Number(item.qty)!==qty||item.insertSelected!==isChosen)changed=true;
        item.qty=qty;
        item.insertSelected=isChosen;
        item.autoFilled=true;
        item.autoZero=qty===0;
        item.manualQtyOverride=false;
      });
      if(changed)refreshAndSave();
    }

    restorePreferredInsert();
    /* Universal AutoCount performs one more deferred pass after this wrapper
       returns. Re-apply the user's black/white choice after that pass. */
    setTimeout(restorePreferredInsert,0);
    setTimeout(restorePreferredInsert,80);
    setTimeout(restorePreferredInsert,300);
    if(result&&typeof result.then==="function")result.then(restorePreferredInsert).catch(function(){});
    return result;
  };
  wrapped.__insertChoiceGuardV1=true;
  window.autoFillNomenclature=wrapped;
  try{autoFillNomenclature=wrapped;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
})();
