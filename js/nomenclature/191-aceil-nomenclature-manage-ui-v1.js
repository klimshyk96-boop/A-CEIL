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
    var svgButtons=NOMENCLATURE_ICONS.map(function(icon){
      var value="svg:"+icon.key;
      return '<button type="button" class="nom-icon-option'+(value===currentIcon?' selected':'')+'" onclick="selectNomenclatureSvgIcon(\''+icon.key+'\')">'
        +iconMarkup(value,true)+'</button>';
    }).join("");
    var emojiButtons=(window.EMOJI_LIST||typeof EMOJI_LIST!=="undefined"&&EMOJI_LIST||[]).map(function(emoji){
      return '<button type="button" class="emoji-opt '+(emoji===currentIcon?'selected':'')+'" onclick="selectEmoji(\''+emoji+'\')">'+escapeText(emoji)+'</button>';
    }).join("");
    grid.innerHTML='<button type="button" class="nom-icon-auto" onclick="autoSelectNomenclatureIcon()"><span>✦</span><strong>Підібрати автоматично</strong></button>'
      +'<div class="nom-icon-section-title">SVG для номенклатури</div>'
      +'<div class="nom-svg-grid">'+svgButtons+'</div>'
      +'<details class="nom-emoji-more"><summary>Emoji</summary><div class="nom-emoji-grid">'+emojiButtons+'</div></details>';
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
