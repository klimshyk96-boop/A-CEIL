(function(){
  "use strict";
  if(window.__aceilAutoCountToggleV1)return;
  window.__aceilAutoCountToggleV1=true;

  var BASE_KEY="A_CEIL_autocount_enabled_v1";
  var memoryKey="",memoryValue=null;

  function gid(id){return document.getElementById(id)}
  /* Device-wide on purpose: the gate must be known before auth and before any
     calculator module can run during page startup. */
  function storageKey(){return BASE_KEY}
  function isEnabled(){
    var key=storageKey();
    if(memoryKey===key&&memoryValue!==null)return memoryValue;
    try{
      var stored=localStorage.getItem(key),value=stored!=="0";
      memoryKey=key;memoryValue=value;return value;
    }catch(_){return true}
  }
  function toast(message){
    try{if(typeof showToast==="function")showToast(message,2800)}catch(_){/* UI feedback must not block the setting. */}
  }
  function recalculateNow(){
    try{
      if(typeof window.autoFillNomenclature==="function")window.autoFillNomenclature({silent:true});
      else if(typeof window.rmUniversalAutoCountV319==="function")window.rmUniversalAutoCountV319({noSave:false});
    }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }
  function manualRecalculateButton(){
    var modal=gid("elementsModal");
    if(!modal)return null;
    return modal.querySelector('button[onclick*="autoFillNomenclature"]');
  }
  function syncUI(){
    var enabled=isEnabled(),input=gid("aceilAutoCountMasterToggle"),status=gid("aceilAutoCountMasterStatus"),row=gid("aceilAutoCountMaster");
    if(input)input.checked=enabled;
    if(status)status.textContent=enabled?"Увімкнено":"Вимкнено";
    if(row)row.classList.toggle("is-off",!enabled);
    var recalc=manualRecalculateButton();
    if(recalc){
      recalc.disabled=!enabled;
      recalc.setAttribute("aria-disabled",String(!enabled));
      recalc.title=enabled?"Перерахувати номенклатуру":"Автопрорахунок вимкнено";
    }
  }
  function setEnabled(value,options){
    value=!!value;options=options||{};
    memoryKey=storageKey();memoryValue=value;
    try{localStorage.setItem(memoryKey,value?"1":"0")}catch(_){/* Keep the runtime state usable in private mode. */}
    syncUI();
    try{window.dispatchEvent(new CustomEvent("aceil:autocount-change",{detail:{enabled:value}}))}catch(_){/* Older WebViews. */}
    if(value&&options.recalculate!==false)recalculateNow();
    if(!options.silent)toast(value?"✓ Автопрорахунок увімкнено":"Автопрорахунок вимкнено — кількість вводиться вручну");
    return value;
  }

  window.A_CEIL_AutoCount={
    isEnabled:isEnabled,
    setEnabled:setEnabled,
    sync:syncUI
  };

  function installStyles(){
    if(gid("aceilAutoCountToggleStyles"))return;
    var style=document.createElement("style");
    style.id="aceilAutoCountToggleStyles";
    style.textContent="#aceilAutoCountMaster{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding:9px 10px;border:1px solid #dbeafe;border-radius:12px;background:#f7faff;color:#1e293b}#aceilAutoCountMaster.is-off{border-color:#e2e8f0;background:#f8fafc}#aceilAutoCountMasterCopy{min-width:0;display:flex;flex-direction:column;gap:2px}#aceilAutoCountMasterCopy b{font-size:12px;line-height:1.25;font-weight:750;color:#1e293b}#aceilAutoCountMasterStatus{font-size:10px;line-height:1.2;font-weight:650;color:#2563eb}#aceilAutoCountMaster.is-off #aceilAutoCountMasterStatus{color:#64748b}.aceil-autocount-switch{position:relative;width:46px;height:27px;flex:0 0 46px}.aceil-autocount-switch input{position:absolute;opacity:0;width:1px;height:1px}.aceil-autocount-slider{position:absolute;inset:0;border-radius:999px;background:#cbd5e1;transition:.18s;box-shadow:inset 0 0 0 1px rgba(15,23,42,.06)}.aceil-autocount-slider:before{content:\"\";position:absolute;width:21px;height:21px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.25);transition:.18s}.aceil-autocount-switch input:checked+.aceil-autocount-slider{background:#2563eb}.aceil-autocount-switch input:checked+.aceil-autocount-slider:before{transform:translateX(19px)}.aceil-autocount-switch input:focus-visible+.aceil-autocount-slider{outline:2px solid #2563eb;outline-offset:2px}#elementsModal button[onclick*=\"autoFillNomenclature\"]:disabled{opacity:.42!important;cursor:not-allowed!important;filter:grayscale(.35)}@media(max-width:430px){#aceilAutoCountMaster{margin-top:8px;padding:8px 9px}#aceilAutoCountMasterCopy b{font-size:11.5px}}";
    document.head.appendChild(style);
  }
  function installToggle(){
    installStyles();
    var modal=gid("elementsModal");if(!modal)return false;
    if(gid("aceilAutoCountMaster")){syncUI();return true}
    var card=modal.firstElementChild,header=card&&card.firstElementChild;
    if(!header)return false;
    var row=document.createElement("div");row.id="aceilAutoCountMaster";
    row.innerHTML='<span id="aceilAutoCountMasterCopy"><b>Автопрорахунок</b><span id="aceilAutoCountMasterStatus">Увімкнено</span></span><label class="aceil-autocount-switch" title="Увімкнути або вимкнути автоматичний прорахунок"><input id="aceilAutoCountMasterToggle" type="checkbox" aria-label="Автопрорахунок"><span class="aceil-autocount-slider"></span></label>';
    header.appendChild(row);
    gid("aceilAutoCountMasterToggle").addEventListener("change",function(){setEnabled(this.checked)});
    if(typeof MutationObserver==="function"){
      new MutationObserver(function(){if(modal.classList.contains("open"))syncUI()}).observe(modal,{attributes:true,attributeFilter:["class"]});
    }
    syncUI();return true;
  }
  function boot(){
    if(installToggle())return;
    var tries=0,timer=setInterval(function(){tries++;if(installToggle()||tries>40)clearInterval(timer)},100);
  }

  window.addEventListener("storage",function(event){if(event.key&&event.key.indexOf(BASE_KEY)===0){memoryKey="";memoryValue=null;syncUI()}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
