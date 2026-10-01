(function(){
  "use strict";
  if(window.__aceilNomenclatureManageUiV1)return;
  window.__aceilNomenclatureManageUiV1=true;

  function byId(id){return document.getElementById(id)}
  function closeBackup(){
    var panel=byId("elemBackupPanel"),button=byId("elemBackupToggle");
    if(panel)panel.classList.remove("open");
    if(button)button.setAttribute("aria-expanded","false");
  }
  window.toggleElemBackupPanel=function(){
    var panel=byId("elemBackupPanel"),button=byId("elemBackupToggle");
    if(!panel)return;
    var open=!panel.classList.contains("open");
    panel.classList.toggle("open",open);
    if(button)button.setAttribute("aria-expanded",String(open));
  };

  function compactMainMenu(){
    var menu=byId("elemMenu");
    if(!menu)return false;
    menu.innerHTML=''
      +'<button type="button" onclick="closeElemMenu(),forceSyncNomenclature(true)"><span class="elem-menu-icon" aria-hidden="true">☁</span><span>Зберегти в хмару</span></button>'
      +'<button type="button" onclick="closeElemMenu(),forceLoadNomenclature()"><span class="elem-menu-icon" aria-hidden="true">↓</span><span>Завантажити з хмари</span></button>'
      +'<button type="button" onclick="closeElemMenu(),toggleElemManageMode()"><span class="elem-menu-icon" aria-hidden="true">⚙</span><span id="elemManageMenuLabel">Керування</span></button>';
    return true;
  }

  function installManagePanel(){
    var modal=byId("elementsModal"),card=modal&&modal.firstElementChild,header=card&&card.firstElementChild;
    if(!header)return false;
    var panel=byId("elemManageTools");
    if(!panel){
      panel=document.createElement("div");
      panel.id="elemManageTools";
      panel.setAttribute("aria-hidden","true");
      panel.innerHTML=''
        +'<div class="elem-manage-title"><span>Керування номенклатурою</span><button type="button" onclick="toggleElemManageMode()" aria-label="Закрити керування">×</button></div>'
        +'<div id="elemManageAutoCountMount"></div>'
        +'<div class="elem-manage-actions">'
        +'<button type="button" onclick="openAddGroupFromMenu()"><span aria-hidden="true">＋</span><span>Додати групу</span></button>'
        +'<button type="button" onclick="toggleElemBackupPanel()" aria-expanded="false" id="elemBackupToggle"><span aria-hidden="true">↕</span><span>Резервна копія</span></button>'
        +'</div>'
        +'<div id="elemBackupPanel">'
        +'<button type="button" onclick="exportProjectsJSON()"><span aria-hidden="true">↓</span>Експорт JSON</button>'
        +'<button type="button" onclick="pickProjectsJSON()"><span aria-hidden="true">↑</span>Імпорт JSON</button>'
        +'</div>';
      header.insertAdjacentElement("afterend",panel);
    }
    var existingToggle=byId("aceilAutoCountMaster"),mount=byId("elemManageAutoCountMount");
    if(existingToggle&&mount&&existingToggle.parentElement!==mount)mount.appendChild(existingToggle);
    return true;
  }

  function wrapManageToggle(){
    if(window.__aceilManageToggleWrapped||typeof window.toggleElemManageMode!=="function")return false;
    var original=window.toggleElemManageMode;
    window.toggleElemManageMode=function(){
      original.apply(this,arguments);
      var active=document.body.classList.contains("elem-manage"),panel=byId("elemManageTools"),label=byId("elemManageMenuLabel");
      if(panel)panel.setAttribute("aria-hidden",String(!active));
      if(label)label.textContent=active?"Закрити керування":"Керування";
      if(!active){
        closeBackup();
        var add=byId("addGroupPanel");
        if(add)add.style.display="none";
      }
      if(window.A_CEIL_AutoCount&&typeof window.A_CEIL_AutoCount.sync==="function")window.A_CEIL_AutoCount.sync();
    };
    window.__aceilManageToggleWrapped=true;
    return true;
  }

  function install(){
    var ready=compactMainMenu()&&installManagePanel()&&wrapManageToggle();
    if(ready&&document.body.classList.contains("elem-manage")){
      var panel=byId("elemManageTools");
      if(panel)panel.setAttribute("aria-hidden","false");
    }
    return ready;
  }
  function boot(){
    if(install())return;
    var attempts=0,timer=setInterval(function(){attempts++;if(install()||attempts>50)clearInterval(timer)},100);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
