/* A·CEIL insert-choice guard. */
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
    var selected=list.filter(function(item){return item.insertSelected===true;});
    if(selected.length===1)return selected[0];
    if(selected.length>1)return null;
    /* Без явного локального вибору кімнати дефолт завжди білий.
       Не дозволяємо кількості/стану глобального каталогу зробити чорну
       вставку дефолтом для наступної кімнати або іншого проєкту. */
    var white=list.filter(function(item){return colorOf(item)==="white";});
    return white.length===1?white[0]:null;
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
    if(window.A_CEIL_AutoCount&&typeof window.A_CEIL_AutoCount.isEnabled==="function"&&!window.A_CEIL_AutoCount.isEnabled())return;
    var before=candidates(),roomItems=items();
    var preferred=preferredBeforeAutofill(before);
    var preferredId=preferred&&preferred.id;
    var result=previous.apply(this,arguments);
    if(!preferred)return result;

    function restorePreferredInsert(){
      if(items()!==roomItems)return;
      var after=candidates();
      var chosen=after.find(function(item){return item===preferred||String(item.id)===String(preferredId);});
      if(!chosen)return;

      // Read the geometric remainder, never reuse a stale black/manual quantity.
      var preview=typeof window.previewNomenclatureSource==="function"?window.previewNomenclatureSource("white_insert",chosen):null;
      if(!preview)return;
      var calculatedQty=Math.max(0,Number(preview.qty)||0);
      var changed=false;
      after.forEach(function(item){
        if(item.manualQtyOverride===true)return;
        var isChosen=item===chosen;
        var qty=isChosen?calculatedQty:0;
        if(Number(item.qty)!==qty||item.insertSelected!==isChosen)changed=true;
        item.qty=qty;
        item.insertSelected=isChosen;
        item.autoFilled=true;
        item.autoZero=qty===0;

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
