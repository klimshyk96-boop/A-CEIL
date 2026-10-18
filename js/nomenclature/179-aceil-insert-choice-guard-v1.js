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
  var choiceRevision=0;
  function rememberChoiceFromQty(item,qty){
    var list=candidates();
    if(list.indexOf(item)<0)return false;
    choiceRevision++;
    if(Number(qty)>0){
      list.forEach(function(candidate){
        candidate.insertSelected=candidate===item;
        if(candidate===item)return;
        candidate.qty=0;candidate.autoZero=true;
        var row=typeof document!=="undefined"&&document.getElementById("emrow_"+candidate.id);
        var input=row&&row.querySelector(".em-qty-input");
        if(input)input.value="";
        if(typeof updateLineTotalDOM==="function")updateLineTotalDOM(candidate);
      });
    }else if(item.insertSelected===true){
      item.insertSelected=false;
    }
    return true;
  }
  window.A_CEIL_SetInsertChoiceFromQty=rememberChoiceFromQty;
  function refreshAndSave(){
    try{if(typeof renderElemList==="function")renderElemList();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof saveState==="function")saveState();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  var afInsert=window["A\u00b7CEIL"]&&window["A\u00b7CEIL"].autofill;
  if(!afInsert)return;
  afInsert.stage("insertChoice",{
    enabled:function(){return !(window.A_CEIL_AutoCount&&typeof window.A_CEIL_AutoCount.isEnabled==="function"&&!window.A_CEIL_AutoCount.isEnabled());},
    skipValue:undefined,
    around:function(next){
    var before=candidates(),roomItems=items(),revision=choiceRevision;
    var preferred=preferredBeforeAutofill(before);
    var preferredId=preferred&&preferred.id;
    var result=next();
    if(!preferred)return result;

    function restorePreferredInsert(){
      if(items()!==roomItems||revision!==choiceRevision)return;
      var after=candidates();
      var chosen=after.find(function(item){return item===preferred||String(item.id)===String(preferredId);});
      if(!chosen)return;

      // Preview also checks selection, so establish it before asking for quantity.
      var changed=false;
      after.forEach(function(item){if(item.insertSelected!==(item===chosen))changed=true;item.insertSelected=item===chosen;});
      // Read the geometric remainder, never reuse a stale black/manual quantity.
      var preview=typeof window.previewNomenclatureSource==="function"?window.previewNomenclatureSource("white_insert",chosen):null;
      if(!preview)return;
      var calculatedQty=Math.max(0,Number(preview.qty)||0);
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
    }
  });
})();
