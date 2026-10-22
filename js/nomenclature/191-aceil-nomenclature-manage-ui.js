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
    var ready=compactMainMenu()&&installManagePanel()&&wrapManageToggle()&&installIconLibrary();
    if(ready&&document.body.classList.contains("elem-manage")){
      var panel=byId("elemManageTools");
      if(panel)panel.setAttribute("aria-hidden","false");
    }
    return ready;
  }

  var NOMENCLATURE_ICONS=[
    {key:"profile",label:"Профіль",color:"#2563eb",shape:'<path d="M4 6v12h16V6"/><path d="M8 6v8h8V6"/>'},
    {key:"shadow-profile",label:"Тіньовий профіль",color:"#2563eb",shape:'<path d="M4 5v14h7v-6h9"/><path d="M13 8h7" stroke-dasharray="2 2"/>'},
    {key:"floating-profile",label:"Парящий профіль",color:"#2563eb",shape:'<path d="M4 5v14h8v-6h8"/><path d="M15 8l1.5-2M18 9l2-1M15 18l1.5 2M18 17l2 1"/>'},
    {key:"insert",label:"Вставка",color:"#2563eb",shape:'<path d="M5 5h14M12 5v14"/><path d="M8 10l4 4 4-4"/>'},
    {key:"corner",label:"Кут",color:"#2563eb",shape:'<path d="M5 5v14h14"/><path d="M9 9v6h6"/>'},
    {key:"break",label:"Обрив",color:"#2563eb",shape:'<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9 15L19 5M15 15L5 5"/>'},
    {key:"cornice",label:"Карниз",color:"#2563eb",shape:'<path d="M4 5h16M6 5v14M18 5v14"/><path d="M6 8c3 1 3 7 0 8M18 8c-3 1-3 7 0 8"/>'},
    {key:"length",label:"Довжина",color:"#2563eb",shape:'<path d="M4 12h16M4 8v8M20 8v8"/><path d="M8 9l-4 3 4 3M16 9l4 3-4 3"/>'},
    {key:"perimeter",label:"Периметр",color:"#2563eb",shape:'<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="3 2"/><path d="M8 9h8v6H8z"/>'},
    {key:"area",label:"Площа",color:"#2563eb",shape:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>'},
    {key:"curve",label:"Криволінійна",color:"#2563eb",shape:'<path d="M4 17C7 5 17 5 20 17"/><circle cx="4" cy="17" r="1.5"/><circle cx="20" cy="17" r="1.5"/>'},
    {key:"light-line",label:"Світлова лінія",color:"#2563eb",shape:'<path d="M4 12h16"/><path d="M6 8l-2-2M12 8V4M18 8l2-2M6 16l-2 2M12 16v4M18 16l2 2"/>'},
    {key:"spot",label:"Точкове світло",color:"#2563eb",shape:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>'},
    {key:"chandelier",label:"Люстра",color:"#2563eb",shape:'<path d="M12 3v5M6 9c0 4 2 7 6 7s6-3 6-7"/><path d="M8 20h8M9 16v4M15 16v4"/>'},
    {key:"track",label:"Шинопровід",color:"#2563eb",shape:'<path d="M3 7h18v4H3z"/><path d="M8 11v4M16 11v4"/><path d="M6 19l2-4 2 4M14 19l2-4 2 4"/>'},
    {key:"recessed-track",label:"Вмонтований трек",color:"#2563eb",shape:'<path d="M3 6h5v5h8V6h5M8 11v5h8v-5"/><path d="M12 16v4"/>'},
    {key:"magnetic-track",label:"Магнітний трек",color:"#2563eb",shape:'<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M6 10h4v4H6zM14 10h4v4h-4z"/>'},
    {key:"track-light",label:"Світильник трека",color:"#2563eb",shape:'<path d="M4 5h16M12 5v5"/><path d="M9 10h6l2 7H7z"/><path d="M9 20h6"/>'},
    {key:"ventilation",label:"Витяжка",color:"#2563eb",shape:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.5"/><path d="M12 10c0-5 6-4 5-1-.5 2-2.5 3-5 3M14 12c5 0 4 6 1 5-2-.5-3-2.5-3-5M12 14c0 5-6 4-5 1 .5-2 2.5-3 5-3"/>'},
    {key:"pipe",label:"Обхід труби",color:"#2563eb",shape:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M5 5l3 3M19 5l-3 3"/>'},
    {key:"fastener",label:"Кріплення",color:"#2563eb",shape:'<path d="M8 4h8l-1 5H9zM12 9v11"/><path d="M9 13h6M9 17h6"/>'},
    {key:"harpoon",label:"Гарпун",color:"#2563eb",shape:'<path d="M5 5h8v6h6M13 11v8H8v-4"/><path d="M16 8l3 3-3 3"/>'},
    {key:"film",label:"Полотно",color:"#2563eb",shape:'<path d="M4 6h13v12H4z"/><path d="M17 6a3 3 0 0 1 0 6h-2M7 9c2 1 5 1 7 0"/>'},
    {key:"controller",label:"Блок живлення",color:"#2563eb",shape:'<rect x="4" y="7" width="16" height="10" rx="2"/><path d="M7 12h4M9 10v4M14 12h3"/>'},
    {key:"tool",label:"Монтаж",color:"#2563eb",shape:'<path d="M14 5a4 4 0 0 0-5 5L4 15l5 5 5-5a4 4 0 0 0 5-5l-3 3-3-3z"/>'},
    {key:"delivery",label:"Доставка",color:"#2563eb",shape:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'},
    {key:"discount",label:"Знижка",color:"#2563eb",shape:'<path d="M6 18L18 6"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'},
    {key:"box",label:"Інше",color:"#2563eb",shape:'<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>'}
  ];

  // Lucide icons, ISC license: assets/vendor/lucide/LICENSE.txt
  NOMENCLATURE_ICONS=NOMENCLATURE_ICONS.concat([{"key":"laconic-film","set":"laconic","label":"Плівка","color":"#3159c9","shape":"<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" />\n  <path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" />\n  <path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />"},{"key":"laconic-profile","set":"laconic","label":"Профілі","color":"#3159c9","shape":"<line x1=\"22\" x2=\"2\" y1=\"6\" y2=\"6\" />\n  <line x1=\"22\" x2=\"2\" y1=\"18\" y2=\"18\" />\n  <line x1=\"6\" x2=\"6\" y1=\"2\" y2=\"22\" />\n  <line x1=\"18\" x2=\"18\" y1=\"2\" y2=\"22\" />"},{"key":"laconic-insert","set":"laconic","label":"Вставка","color":"#3159c9","shape":"<path d=\"M5 12h14\" />"},{"key":"laconic-corner","set":"laconic","label":"Кути","color":"#3159c9","shape":"<path d=\"m15 10 5 5-5 5\" />\n  <path d=\"M4 4v7a4 4 0 0 0 4 4h12\" />"},{"key":"laconic-light","set":"laconic","label":"Освітлення","color":"#3159c9","shape":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\" />\n  <path d=\"M9 18h6\" />\n  <path d=\"M10 22h4\" />"},{"key":"laconic-cornice","set":"laconic","label":"Карнизи","color":"#3159c9","shape":"<path d=\"M3 3h18\" />\n  <path d=\"M20 7H8\" />\n  <path d=\"M20 11H8\" />\n  <path d=\"M10 19h10\" />\n  <path d=\"M8 15h12\" />\n  <path d=\"M4 3v14\" />\n  <circle cx=\"4\" cy=\"19\" r=\"2\" />"},{"key":"laconic-complexity","set":"laconic","label":"Елементи складності","color":"#3159c9","shape":"<path d=\"m10.586 5.414-5.172 5.172\" />\n  <path d=\"m18.586 13.414-5.172 5.172\" />\n  <path d=\"M6 12h12\" />\n  <circle cx=\"12\" cy=\"20\" r=\"2\" />\n  <circle cx=\"12\" cy=\"4\" r=\"2\" />\n  <circle cx=\"20\" cy=\"12\" r=\"2\" />\n  <circle cx=\"4\" cy=\"12\" r=\"2\" />"},{"key":"laconic-led","set":"laconic","label":"LED","color":"#3159c9","shape":"<path d=\"M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z\" />"},{"key":"technical-film","set":"technical","label":"Плівка","color":"#3159c9","shape":"<path d=\"M12 17v4\" />\n  <path d=\"M8 21h8\" />\n  <path d=\"m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15\" />\n  <circle cx=\"8\" cy=\"9\" r=\"2\" />\n  <rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"2\" />"},{"key":"technical-profile","set":"technical","label":"Профілі","color":"#3159c9","shape":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />\n  <path d=\"M3 9h18\" />"},{"key":"technical-insert","set":"technical","label":"Вставка","color":"#3159c9","shape":"<circle cx=\"12\" cy=\"9\" r=\"1\" />\n  <circle cx=\"19\" cy=\"9\" r=\"1\" />\n  <circle cx=\"5\" cy=\"9\" r=\"1\" />\n  <circle cx=\"12\" cy=\"15\" r=\"1\" />\n  <circle cx=\"19\" cy=\"15\" r=\"1\" />\n  <circle cx=\"5\" cy=\"15\" r=\"1\" />"},{"key":"technical-corner","set":"technical","label":"Кути","color":"#3159c9","shape":"<path d=\"M21 11a8 8 0 0 0-8-8\" />\n  <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" />"},{"key":"technical-light","set":"technical","label":"Освітлення","color":"#3159c9","shape":"<path d=\"M12 2v5\" />\n  <path d=\"M14.829 15.998a3 3 0 1 1-5.658 0\" />\n  <path d=\"M20.92 14.606A1 1 0 0 1 20 16H4a1 1 0 0 1-.92-1.394l3-7A1 1 0 0 1 7 7h10a1 1 0 0 1 .92.606z\" />"},{"key":"technical-cornice","set":"technical","label":"Карнизи","color":"#3159c9","shape":"<path d=\"M2 7v10\" />\n  <path d=\"M6 5v14\" />\n  <rect width=\"12\" height=\"18\" x=\"10\" y=\"3\" rx=\"2\" />"},{"key":"technical-complexity","set":"technical","label":"Елементи складності","color":"#3159c9","shape":"<circle cx=\"19\" cy=\"5\" r=\"2\" />\n  <circle cx=\"5\" cy=\"19\" r=\"2\" />\n  <path d=\"M5 17A12 12 0 0 1 17 5\" />"},{"key":"technical-led","set":"technical","label":"LED","color":"#3159c9","shape":"<path d=\"M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z\" />\n  <path d=\"M17 21v-2\" />\n  <path d=\"M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10\" />\n  <path d=\"M21 21v-2\" />\n  <path d=\"M3 5V3\" />\n  <path d=\"M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z\" />\n  <path d=\"M7 5V3\" />"}]);

  // Purpose-built ceiling symbols: a simple silhouette and a construction view.
  var CEILING_ICON_VARIANTS=[
    {key:'light-line',label:'Світлова лінія',laconic:'<rect x="3" y="10" width="18" height="4" rx="1"/><path d="M7 6v1M12 5v2M17 6v1M7 17v1M12 17v2M17 17v1"/>',technical:'<path d="M2 7h5v3h10V7h5M7 10v6h10v-6M9 13h6M9 19l-1 2M12 19v2M15 19l1 2"/>'},
    {key:'light-line-corner',label:'Кутова світлова лінія',laconic:'<path d="M4 3h4v13h13v4H4z"/><path d="M12 5h2M12 10h2M18 12v-2"/>',technical:'<path d="M3 3h7v11h11v7H3zM6 3v15h15M10 7h3M10 11h3M17 14v-3"/>'},
    {key:'surface-track',label:'Накладний трек',laconic:'<rect x="3" y="5" width="18" height="3" rx="1"/><path d="M7 8v4M17 8v4"/><path d="m5 12 4-1 2 5-4 1zM15 12l4-1 2 5-4 1"/>',technical:'<path d="M2 4h20M5 4v6h14V4M8 7h8M8 10v4M16 10v4"/><path d="m5 15 4-2 3 5-4 2zM14 15l4-2 3 5-4 2"/>'},
    {key:'recessed-track',label:'Вмонтований трек',laconic:'<path d="M2 6h6v3h8V6h6M8 9v4M16 9v4"/><path d="m6 13 4-1 2 5-4 1zM14 13l4-1 2 5-4 1"/>',technical:'<path d="M2 8h4V3h12v5h4M9 4v4h6V4M6 8v4h12V8M12 12v3"/><path d="m9 15 5-1 2 5-5 1z"/>'},
    {key:'magnetic-track',label:'Магнітний трек',laconic:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M7 8v4M17 8v4M6 12h3v7H6zM14 12h6v3h-6z"/>',technical:'<path d="M3 3v9h18V3M6 3v6h12V3M6 15v4a3 3 0 0 0 6 0v-4M6 17h2M10 17h2M16 16h5v3h-5zM18 12v4"/>'},
    {key:'track-light',label:'Трековий світильник',laconic:'<path d="M3 4h18M12 4v5M10 9l5-2 4 9-5 2zM5 19l3-1M8 22l2-3"/>',technical:'<path d="M3 3h18v3H3zM12 6v4M10 10l5-2 4 9-5 2zM11 13l5-2M5 20l3-1M9 23l1-3"/>'},
    {key:'surface-cornice',label:'Накладний карниз',laconic:'<path d="M2 4h20M6 4v4M18 4v4"/><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M7 12v8M12 12v6M17 12v8"/>',technical:'<path d="M2 3h20M6 3v5M18 3v5M3 8h18v6H3zM7 11v3M12 11v3M17 11v3M7 17v4M17 17v4"/>'},
    {key:'hidden-cornice',label:'Прихований карниз',laconic:'<path d="M2 4h4v16M10 4h11v6H10zM13 10v10M18 10v8"/>',technical:'<path d="M2 3h4v18M10 3h12M10 3v9h12M13 6h7v3h-7zM15 12v8M20 12v6"/>'},
    {key:'wide-cornice',label:'Широкий карниз',laconic:'<rect x="2" y="5" width="20" height="8" rx="1"/><path d="M5 9h14M6 13v7M12 13v5M18 13v7"/>',technical:'<path d="M2 4h20v10H2zM5 7h14M6 10v4M12 10v4M18 10v4M6 17v4M12 17v3M18 17v4"/>'},
    {key:'single-cornice',label:'Однорядний карниз',laconic:'<rect x="3" y="6" width="18" height="3" rx="1"/><path d="M7 9v4M17 9v4M5 13h4v7H5zM15 13h4v7h-4z"/>',technical:'<path d="M2 5h20v5H2zM5 8h14M7 10v4M17 10v4"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/><path d="M7 18v3M17 18v3"/>'}
  ];
  ['laconic','technical'].forEach(function(set){
    CEILING_ICON_VARIANTS.forEach(function(icon){
      NOMENCLATURE_ICONS.push({key:set+'-'+icon.key,set:set,label:icon.label,color:'#3159c9',shape:icon[set]});
    });
  });

  // User-selected preview icons 2, 3, 4, 6 and 8.
  // MDI artwork: assets/vendor/mdi/LICENSE.txt and NOTICE.txt.
  NOMENCLATURE_ICONS=NOMENCLATURE_ICONS.concat([{"key": "selected-light-recessed", "set": "selected", "label": "Точковий світильник", "color": "#3159c9", "shape": "<g fill=\"currentColor\" stroke=\"none\"><path d=\"M12 7C6.5 7 2 9.46 2 12.5S6.5 18 12 18 22 15.54 22 12.5 17.5 7 12 7M16.5 10C16.5 10.4 14.9 11.54 12 11.54S7.5 10.4 7.5 10C7.5 9.91 7.65 9.74 7.9 9.55C9.06 9.21 10.44 9 12 9S14.94 9.21 16.1 9.55C16.35 9.74 16.5 9.91 16.5 10M12 16C7.12 16 4 13.93 4 12.5C4 11.81 4.73 11 6.03 10.29C6.3 11.83 8.87 13.04 12 13.04C15.13 13.04 17.7 11.83 17.97 10.29C19.27 11 20 11.81 20 12.5C20 13.93 16.88 16 12 16Z\" /></g>"}, {"key": "selected-chandelier", "set": "selected", "label": "Люстра", "color": "#3159c9", "shape": "<g fill=\"currentColor\" stroke=\"none\"><path d=\"M15 13.1C15 14.76 13.66 16.1 12 16.1S9 14.76 9 13.1 10.34 10.1 12 10.1 15 11.44 15 13.1M9 2V3C9 4.11 9.9 5 11 5V9.1C11.32 9.04 11.66 9 12 9S12.68 9.04 13 9.1V5C14.11 5 15 4.11 15 3V2H9M4 11.1C2.34 11.1 1 12.44 1 14.1S2.34 17.1 4 17.1 7 15.76 7 14.1 5.66 11.1 4 11.1M20 11.1C18.34 11.1 17 12.44 17 14.1S18.34 17.1 20 17.1 23 15.76 23 14.1 21.66 11.1 20 11.1M20 18.1C19.32 18.1 18.67 17.96 18.08 17.71C17.6 17.95 17.07 18.1 16.5 18.1C15.39 18.1 14.41 17.57 13.77 16.77C13.22 17 12.63 17.1 12 17.1S10.78 17 10.23 16.77C9.59 17.57 8.61 18.1 7.5 18.1C6.93 18.1 6.4 17.95 5.92 17.71C5.33 17.96 4.68 18.1 4 18.1C3.73 18.1 3.46 18.06 3.2 18C4.21 19.29 5.76 20.1 7.5 20.1C8.83 20.1 10.05 19.63 11 18.84V21.1C11 21.65 11.45 22.1 12 22.1C12.55 22.1 13 21.65 13 21.1V18.84C13.95 19.63 15.17 20.1 16.5 20.1C18.24 20.1 19.79 19.29 20.8 18C20.54 18.06 20.27 18.1 20 18.1Z\" /></g>"}, {"key": "selected-led-strip", "set": "selected", "label": "LED-стрічка", "color": "#3159c9", "shape": "<g fill=\"currentColor\" stroke=\"none\"><path d=\"M2.81,8.46L14.83,20.5L15.54,19.78L16.95,21.19L18.36,19.78L16.95,18.36L18.36,16.95L19.78,18.36L21.19,16.95L19.78,15.54L20.5,14.83L8.46,2.81L2.81,8.46M5.64,8.46L8.46,5.64L17.66,14.83L14.83,17.66L5.64,8.46M7.05,8.46L8.46,9.88L9.88,8.46L8.46,7.05L7.05,8.46M9.17,10.59L10.59,12L12,10.59L10.59,9.17L9.17,10.59M11.29,12.71L12.71,14.12L14.12,12.71L12.71,11.29L11.29,12.71M13.41,14.83L14.83,16.24L16.24,14.83L14.83,13.41L13.41,14.83Z\" /></g>"}, {"key": "selected-ceiling-light-outline", "set": "selected", "label": "Підвісний світильник", "color": "#3159c9", "shape": "<g fill=\"currentColor\" stroke=\"none\"><path d=\"M14.76 11L16.76 15H7.24L9.24 11H14.76M13 4H11V9H8L4 17H20L16 9H13V4M14 18H10C10 19.11 10.9 20 12 20S14 19.11 14 18Z\" /></g>"}, {"key": "selected-magnetic-vent", "set": "selected", "label": "Магнітна витяжка", "color": "#3159c9", "shape": "<g transform=\"scale(.75)\" stroke-width=\"1.6\"><rect x=\"3\" y=\"3\" width=\"26\" height=\"26\" rx=\"3\"/><rect x=\"7\" y=\"7\" width=\"18\" height=\"18\" rx=\"1\"/><path d=\"M11 12h10M11 16h10M11 20h10\"/></g>"}]);

  // Additional ceiling equipment and installation work icons (original SVG artwork).
  NOMENCLATURE_ICONS=NOMENCLATURE_ICONS.concat([
  {
    "key": "selected-camera",
    "set": "selected",
    "label": "Камера",
    "color": "#3159c9",
    "shape": "<path d=\"M4 7h16v3H4zM5 10a7 7 0 0 0 14 0\"/><circle cx=\"12\" cy=\"13\" r=\"2.2\"/><path d=\"M8 4h8M12 4v3\"/>"
  },
  {
    "key": "selected-sensor",
    "set": "selected",
    "label": "Датчик",
    "color": "#3159c9",
    "shape": "<ellipse cx=\"12\" cy=\"9\" rx=\"8\" ry=\"4\"/><path d=\"M4 9v3c0 2.2 3.6 4 8 4s8-1.8 8-4V9M8 10h.01M12 11h.01M16 10h.01M9 19l-1 2M15 19l1 2M12 19v3\"/>"
  },
  {
    "key": "selected-height-work",
    "set": "selected",
    "label": "Робота на висоті",
    "color": "#3159c9",
    "shape": "<path d=\"M4 21 8 3h4l4 18M7 7h6M6 12h8M5 17h10M19 3v18m-2-16 2-2 2 2m-4 14 2 2 2-2\"/>"
  },
  {
    "key": "selected-double-spot",
    "set": "selected",
    "label": "Подвійний точковий світильник",
    "color": "#3159c9",
    "shape": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><circle cx=\"7.2\" cy=\"12\" r=\"3.2\"/><circle cx=\"16.8\" cy=\"12\" r=\"3.2\"/><path d=\"M5.8 10.8a2 2 0 0 1 2.8 0m6.8 0a2 2 0 0 1 2.8 0\"/>"
  },
  {
    "key": "selected-curved-wall",
    "set": "selected",
    "label": "Криволінійність",
    "color": "#3159c9",
    "shape": "<path d=\"M3 18C3 2 21 22 21 6\" stroke-width=\"2.6\"/><path d=\"M3 18V5M21 6v13M3 5h5m8 14h5\" stroke-dasharray=\"2 2\"/><circle cx=\"3\" cy=\"18\" r=\"1.5\" fill=\"currentColor\"/><circle cx=\"21\" cy=\"6\" r=\"1.5\" fill=\"currentColor\"/>"
  },
  {
    "key": "selected-round-vent",
    "set": "selected",
    "label": "Кругла витяжка",
    "color": "#3159c9",
    "shape": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"6.5\"/><path d=\"M7 8h10M5.7 12h12.6M7 16h10\"/>"
  },
  {
    "key": "selected-wall-protection",
    "set": "selected",
    "label": "Захист стін",
    "color": "#3159c9",
    "shape": "<path d=\"M3 21V3h18v18M3 6h18\"/><path d=\"M5 6v13l4-2 3 2 3-2 4 2V6\" fill=\"currentColor\" fill-opacity=\".12\"/><path d=\"m7 9 3 3m4-3 3 3M7 4h2m6 0h2\"/>"
  },
  {
    "key": "selected-floor-protection",
    "set": "selected",
    "label": "Захист підлоги",
    "color": "#3159c9",
    "shape": "<path d=\"m3 17 6-9h11l-5 10H5M3 17c0-1.7 3-2.2 3-.5v3c0 1.7-3 1.7-3 0v-3M6 20h10l6-11M10 10l-3 5m7-5-3 5m7-5-3 5\"/><path d=\"M3 3v5m0 0h4\"/>"
  }
]);

  // Pipe collars, film removal and cornice termination (original SVG artwork).
  NOMENCLATURE_ICONS=NOMENCLATURE_ICONS.concat([
  {
    "key": "selected-pipe-bypass",
    "set": "selected",
    "label": "Обхід труби",
    "color": "#3159c9",
    "shape": "<ellipse cx=\"12\" cy=\"5\" rx=\"3.5\" ry=\"2\"/><path d=\"M8.5 5v9c0 2.7 7 2.7 7 0V5M8.5 10C4.5 10.7 2 12.3 2 14.5 2 17.5 6.5 20 12 20s10-2.5 10-5.5c0-2.2-2.5-3.8-6.5-4.5M12 16v4\"/>"
  },
  {
    "key": "selected-film-removal",
    "set": "selected",
    "label": "Демонтаж плівки",
    "color": "#3159c9",
    "shape": "<path d=\"M3 4h18M4 7h15v5c-4 0-7 3-7 7H4z\" fill=\"currentColor\" fill-opacity=\".1\"/><path d=\"M12 19c1-3 5-2 7-7M21 15v6m-3-3 3 3 2-3\"/>"
  },
  {
    "key": "selected-cornice-end",
    "set": "selected",
    "label": "Обрив карнизу",
    "color": "#3159c9",
    "shape": "<path d=\"M2 5h14v5H2M2 8h14M16 4v7M6 10v4m-2 0h4v7H4zM12 10v4m-2 0h4v7h-4zM19 6h3m-3 3h3\"/><path d=\"M16 15v5m-2-2 2-3 2 3\"/>"
  }
]);

  function escapeText(value){
    return String(value==null?"":value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function iconRecord(value){
    if(typeof value!=="string"||value.indexOf("svg:")!==0)return null;
    var key=value.slice(4);
    return NOMENCLATURE_ICONS.find(function(icon){return icon.key===key})||null;
  }
  function iconMarkup(value,withLabel){
    var icon=iconRecord(value);
    if(!icon)return '<span class="nom-legacy-icon">'+escapeText(value||"🔧")+'</span>';
    return '<span class="nom-svg-icon" style="--nom-icon-color:'+icon.color+'">'
      +'<svg viewBox="0 0 24 24" aria-hidden="true">'+icon.shape+'</svg>'
      +(withLabel?'<span>'+escapeText(icon.label)+'</span>':'')+'</span>';
  }
  function suggestedIcon(item){
    var source=String(item&&item.source||"").toLowerCase();
    if(source){
      if(/linearbreaks|linear_break|cornicebreak|breaks/.test(source))return "break";
      if(/linearcorners|linear_corner|corners/.test(source))return "corner";
      if(/linearfixtures|lineartrack:fixtures/.test(source))return "track-light";
      if(/lineartype:magnetictrack/.test(source))return "magnetic-track";
      if(/lineartype:recessedtrack/.test(source))return "recessed-track";
      if(/lineartype:surfacetrack/.test(source))return "track";
      if(/lineartype:lightline|linear_length/.test(source))return "light-line";
      if(/shadow_profile/.test(source))return "shadow-profile";
      if(/floating_profile/.test(source))return "floating-profile";
      if(/main_profile|profile_beam|walltype:/.test(source))return "profile";
      if(/white_insert/.test(source))return "insert";
      if(/hidden_curtain|ceilingcornice:/.test(source))return "cornice";
      if(/spot_light|lighttype:spot/.test(source))return "spot";
      if(/chandelier|lighttype:.*люстр/.test(source))return "chandelier";
      if(/ventilation|lighttype:.*vent/.test(source))return "ventilation";
      if(/full_perimeter/.test(source))return "perimeter";
      if(/total_area/.test(source))return "area";
      if(/curve_length/.test(source))return "curve";
    }
    var value=String(item&&item.name||"").toLowerCase();
    var rules=[
      [/магніт.*(трек|шин)/,"magnetic-track"],[/вмонт.*(трек|шин)/,"recessed-track"],
      [/треков.*світиль/,"track-light"],[/(трек|шинопров)/,"track"],[/світл.*ліні|led/,"light-line"],[/люстр/,"chandelier"],
      [/світиль|точков|ламп/,"spot"],[/витяж|вентил/,"ventilation"],[/труб/,"pipe"],
      [/тіньов/,"shadow-profile"],[/парящ/,"floating-profile"],[/карниз/,"cornice"],
      [/обрив|різан|підріз/,"break"],[/встав/,"insert"],[/кут/,"corner"],[/гарпун/,"harpoon"],[/плів|полотн/,"film"],
      [/площ/,"area"],[/периметр/,"perimeter"],[/довжин|метр погон/,"length"],[/криволін|дуг/,"curve"],
      [/блок|трансформ|контрол/,"controller"],[/кріп|саморіз|дюбел/,"fastener"],[/монтаж|робот/,"tool"],
      [/достав/,"delivery"],[/знижк/,"discount"],[/профіл/,"profile"]
    ];
    for(var i=0;i<rules.length;i++)if(rules[i][0].test(value))return rules[i][1];
    return "box";
  }
  function chooseSvgIcon(key){
    if(!_editingIconId)return;
    var item=elemItems.find(function(candidate){return candidate.id===_editingIconId});
    if(item){item.icon="svg:"+key;renderElemList();saveState()}
    closeModal("emojiModal");
  }
  function autoChooseIcon(){
    if(!_editingIconId)return;
    var item=elemItems.find(function(candidate){return candidate.id===_editingIconId});
    if(item)chooseSvgIcon(suggestedIcon(item));
  }
  function enhancedIconGrid(currentIcon){
    var grid=byId("emojiGrid");
    if(!grid)return;
    var current=iconRecord(currentIcon),activeSet=current&&(current.set||'existing')||'selected';
    var sets=[['selected','Нові'],['laconic','Лаконічний'],['technical','Технічний'],['existing','Інші SVG']];
    var tabs=sets.map(function(set){return '<button type="button" data-nom-icon-set="'+set[0]+'" aria-pressed="'+(set[0]===activeSet)+'">'+set[1]+'</button>'}).join('');
    var svgButtons=sets.map(function(set){
      return '<div class="nom-svg-grid" data-nom-icon-panel="'+set[0]+'"'+(set[0]===activeSet?'':' hidden')+'>'+NOMENCLATURE_ICONS.filter(function(icon){return (icon.set||'existing')===set[0]}).map(function(icon){
        var value='svg:'+icon.key;
        return '<button type="button" class="nom-icon-option'+(value===currentIcon?' selected':'')+'" aria-label="'+escapeText(icon.label)+'" onclick="selectNomenclatureSvgIcon(\''+icon.key+'\')">'+iconMarkup(value,true)+'</button>';
      }).join('')+'</div>';
    }).join('');
    var emojiButtons=(window.EMOJI_LIST||typeof EMOJI_LIST!=="undefined"&&EMOJI_LIST||[]).map(function(emoji){
      return '<button type="button" class="emoji-opt '+(emoji===currentIcon?'selected':'')+'" onclick="selectEmoji(\''+emoji+'\')">'+escapeText(emoji)+'</button>';
    }).join("");
    grid.innerHTML='<button type="button" class="nom-icon-auto" onclick="autoSelectNomenclatureIcon()"><span>✦</span><strong>Підібрати автоматично</strong></button>'
      +'<div class="nom-icon-section-title">Набір іконок</div><div class="nom-icon-sets">'+tabs+'</div>'+svgButtons
      +'<details class="nom-emoji-more"><summary>Emoji</summary><div class="nom-emoji-grid">'+emojiButtons+'</div></details>';
    grid.querySelectorAll('[data-nom-icon-set]').forEach(function(button){button.onclick=function(){
      grid.querySelectorAll('[data-nom-icon-set]').forEach(function(tab){tab.setAttribute('aria-pressed',String(tab===button))});
      grid.querySelectorAll('[data-nom-icon-panel]').forEach(function(panel){panel.hidden=panel.dataset.nomIconPanel!==button.dataset.nomIconSet});
    }});

  }
  function installIconLibrary(){
    if(window.__aceilNomenclatureIconsV1)return true;
    if(typeof window.renderItemRow!=="function"||typeof window.buildEmojiGrid!=="function")return false;
    var originalRender=window.renderItemRow;
    var wrappedRender=function(item){
      var html=originalRender.apply(this,arguments);
      return html.replace(/(<div class="em-icon"[^>]*>)[\s\S]*?(<\/div>)/,function(_,open,close){
        return open+iconMarkup(item&&item.icon,false)+close;
      });
    };
    window.renderItemRow=wrappedRender;
    try{renderItemRow=wrappedRender}catch(_renderError){}
    window.buildEmojiGrid=enhancedIconGrid;
    try{buildEmojiGrid=enhancedIconGrid}catch(_gridError){}
    window.selectNomenclatureSvgIcon=chooseSvgIcon;
    window.autoSelectNomenclatureIcon=autoChooseIcon;
    window.__aceilNomenclatureIconsV1=true;
    return true;
  }
  function boot(){
    if(install())return;
    var attempts=0,timer=setInterval(function(){attempts++;if(install()||attempts>50)clearInterval(timer)},100);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
