(function(){
  "use strict";
  if(window.__A_CEIL_REPORT_DIAGONALS_MENU_V1)return;
  window.__A_CEIL_REPORT_DIAGONALS_MENU_V1=true;

  function language(){
    try{return window["A·CEIL"]&&window["A·CEIL"].I18n&&window["A·CEIL"].I18n.currentLanguage||"uk"}catch(_){return"uk"}
  }
  function labels(){
    var all={
      uk:{title:"Які діагоналі показати",manual:"Тільки виміряні",all:"Усі можливі"},
      en:{title:"Which diagonals to show",manual:"Measured only",all:"All possible"},
      pl:{title:"Które przekątne pokazać",manual:"Tylko zmierzone",all:"Wszystkie możliwe"}
    };
    return all[language()]||all.uk;
  }
  function installStyle(){
    if(document.getElementById("aceilReportDiagonalsMenuStyle"))return;
    var style=document.createElement("style");
    style.id="aceilReportDiagonalsMenuStyle";
    style.textContent="#reportSettingsModal .rsdiag-menu{margin:8px 0 2px;padding:10px;border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff}#reportSettingsModal .rsdiag-menu[hidden]{display:none!important}#reportSettingsModal .rsdiag-title{margin-bottom:8px;color:#1e3a8a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}#reportSettingsModal .rsdiag-options{display:grid;grid-template-columns:1fr 1fr;gap:7px}#reportSettingsModal .rsdiag-option{min-height:42px!important;padding:8px!important;border:1px solid #cbd5e1!important;border-radius:12px!important;background:#fff!important;color:#334155!important;box-shadow:none!important;font-size:12px!important;font-weight:850!important}#reportSettingsModal .rsdiag-option.active{border-color:#2563eb!important;background:#2563eb!important;color:#fff!important}";
    document.head.appendChild(style);
  }
  function enhance(){
    var modal=document.getElementById("reportSettingsModal"),checkbox=document.getElementById("rs_diagonals"),select=document.getElementById("rsDiagMode");
    if(!modal||!checkbox||!select||document.getElementById("rsDiagInlineMenu"))return;
    installStyle();
    var oldCard=select.closest(".rspro-card"),toggle=checkbox.closest(".rspro-toggle"),text=labels(),menu=document.createElement("div");
    menu.id="rsDiagInlineMenu";menu.className="rsdiag-menu";
    menu.innerHTML='<div class="rsdiag-title"></div><div class="rsdiag-options"><button type="button" class="rsdiag-option" data-value="manual"></button><button type="button" class="rsdiag-option" data-value="all"></button></div>';
    menu.querySelector(".rsdiag-title").textContent=text.title;
    menu.querySelector('[data-value="manual"]').textContent=text.manual;
    menu.querySelector('[data-value="all"]').textContent=text.all;
    select.hidden=true;menu.appendChild(select);
    if(toggle)toggle.insertAdjacentElement("afterend",menu);else modal.querySelector(".rspro-body").appendChild(menu);
    if(oldCard&&oldCard.isConnected)oldCard.remove();
    function render(){
      menu.hidden=!checkbox.checked;
      menu.querySelectorAll("[data-value]").forEach(function(button){button.classList.toggle("active",button.dataset.value===(select.value||"manual"))});
    }
    menu.querySelectorAll("[data-value]").forEach(function(button){button.addEventListener("click",function(){select.value=button.dataset.value;try{if(typeof window.saveReportSettings==="function")window.saveReportSettings()}catch(_){}render()})});
    checkbox.addEventListener("change",render);render();
  }
  var previous=window.openReportSettings;
  if(typeof previous==="function"){
    var wrapped=function(){var result=previous.apply(this,arguments);setTimeout(enhance,0);setTimeout(enhance,80);return result};
    wrapped.__aceilReportDiagonalsMenuV1=true;
    window.openReportSettings=wrapped;
    try{openReportSettings=wrapped}catch(_){}
  }
  document.addEventListener("A·CEIL-language-changed",function(){setTimeout(enhance,0)});
})();
