(function(){
  "use strict";
  if(window.__A_CEIL_REPORT_DIAGONALS_MENU_V1)return;
  window.__A_CEIL_REPORT_DIAGONALS_MENU_V1=true;

  function language(){
    try{return window["A·CEIL"]&&window["A·CEIL"].i18n&&window["A·CEIL"].i18n.getLanguage()||"uk"}catch(_){return"uk"}
  }
  function labels(){
    var all={
      uk:{title:"Діагоналі у звіті",none:"Без діагоналей",manual:"Тільки виміряні",all:"Усі можливі"},
      en:{title:"Report diagonals",none:"No diagonals",manual:"Measured only",all:"All possible"},
      pl:{title:"Przekątne w raporcie",none:"Bez przekątnych",manual:"Tylko zmierzone",all:"Wszystkie możliwe"},
      ru:{title:"Диагонали в отчёте",none:"Без диагоналей",manual:"Только измеренные",all:"Все возможные"}
    };
    return all[language()]||all.uk;
  }
  function installStyle(){
    if(document.getElementById("aceilReportDiagonalsMenuStyle"))return;
    var style=document.createElement("style");
    style.id="aceilReportDiagonalsMenuStyle";
    style.textContent="#reportSettingsModal .rsdiag-menu{grid-column:1/-1;min-width:0;max-width:100%;box-sizing:border-box;margin:8px 0 2px;padding:10px;border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff}#reportSettingsModal .rsdiag-menu[hidden]{display:none!important}#reportSettingsModal .rsdiag-title{margin-bottom:8px;color:#1e3a8a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;overflow-wrap:anywhere}#reportSettingsModal .rsdiag-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;min-width:0}#reportSettingsModal .rsdiag-option{width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box;white-space:normal!important;overflow-wrap:anywhere;min-height:42px!important;padding:8px!important;border:1px solid #cbd5e1!important;border-radius:12px!important;background:#fff!important;color:#334155!important;box-shadow:none!important;font-size:11px!important;font-weight:850!important}#reportSettingsModal .rsdiag-option.active{border-color:#2563eb!important;background:#2563eb!important;color:#fff!important}";
    document.head.appendChild(style);
  }
  function enhance(){
    var modal=document.getElementById("reportSettingsModal"),checkbox=document.getElementById("rs_diagonals"),select=document.getElementById("rsDiagMode");
    if(!modal||!checkbox||!select||document.getElementById("rsDiagInlineMenu"))return;
    installStyle();
    var oldCard=select.closest(".rspro-card"),toggle=checkbox.closest(".rspro-toggle"),text=labels(),menu=document.createElement("div");
    menu.id="rsDiagInlineMenu";menu.className="rsdiag-menu";
    menu.innerHTML='<div class="rsdiag-title"></div><div class="rsdiag-options"><button type="button" class="rsdiag-option" data-value="none"></button><button type="button" class="rsdiag-option" data-value="manual"></button><button type="button" class="rsdiag-option" data-value="all"></button></div>';
    menu.querySelector(".rsdiag-title").textContent=text.title;
    menu.querySelector('[data-value="none"]').textContent=text.none;
    menu.querySelector('[data-value="manual"]').textContent=text.manual;
    menu.querySelector('[data-value="all"]').textContent=text.all;
    select.hidden=true;menu.appendChild(select);
    if(toggle)toggle.insertAdjacentElement("afterend",menu);else modal.querySelector(".rspro-body").appendChild(menu);
    if(oldCard&&oldCard.isConnected)oldCard.remove();
    function render(){
      menu.hidden=false;
      var current=checkbox.checked?(select.value||"manual"):"none";
      menu.querySelectorAll("[data-value]").forEach(function(button){button.classList.toggle("active",button.dataset.value===current)});
    }
    menu.querySelectorAll("[data-value]").forEach(function(button){button.addEventListener("click",function(){
      var hide=button.dataset.value==="none";
      checkbox.checked=!hide;
      if(!hide)select.value=button.dataset.value;
      // Keep the original settings pipeline and language/caching hooks in sync.
      checkbox.dispatchEvent(new Event("change",{bubbles:true}));
      select.dispatchEvent(new Event("change",{bubbles:true}));
      try{if(typeof window.saveReportSettings==="function")window.saveReportSettings()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      render();
    })});
    checkbox.addEventListener("change",render);render();
  }
window.A·CEIL.pipeline.get("openReportSettings").stage("diagonalSettings",{around:function(next){var result=next();setTimeout(enhance,0);setTimeout(enhance,80);return result}});
  document.addEventListener("A·CEIL-language-changed",function(){setTimeout(enhance,0)});
})();
