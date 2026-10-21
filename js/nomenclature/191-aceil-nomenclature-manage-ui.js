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
    var current=iconRecord(currentIcon),activeSet=current&&current.set||'laconic';
    var sets=[['laconic','Лаконічний'],['technical','Технічний'],['existing','Інші SVG']];
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
