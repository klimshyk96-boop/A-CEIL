(function(){
  "use strict";
  if(window.__A_CEIL_INSTALLER_SHARE_V1)return;
  window.__A_CEIL_INSTALLER_SHARE_V1=true;

  var busy=false,selectedHarpoonColor="";
  var copy={
    uk:{menu:"Відправити виконавцю",hint:"Бланк замірів або проєкт",title:"Відправити виконавцю",sub:"Оберіть колір гарпуна та склад бланка. Елементи стін і кошторис не передаються.",harpoon:"Колір гарпуна",white:"Білий",black:"Чорний",chooseColor:"Оберіть колір гарпуна",blank:"Бланк замірів",blankHint:"Контури, розміри, площа та діагоналі",project:"Проєкт стелі",projectHint:"Додатково світло й елементи стелі",cancel:"Скасувати",working:"Готуємо файл…",share:"Відправити",save:"Зберегти",back:"Закрити",ready:"Файл готовий",noGeometry:"Спочатку створіть і замкніть контур",badMeasure:"Є непідтверджена похибка заміру. Перевірте контур перед відправленням",failed:"Не вдалося створити бланк",saved:"Файл збережено"},
    en:{menu:"Send to installer",hint:"Measurement sheet or ceiling plan",title:"Send to installer",sub:"Choose the harpoon colour and sheet contents. Wall elements and estimate are excluded.",harpoon:"Harpoon colour",white:"White",black:"Black",chooseColor:"Choose the harpoon colour",blank:"Measurement sheet",blankHint:"Contours, dimensions, area and diagonals",project:"Ceiling plan",projectHint:"Also lights and ceiling elements",cancel:"Cancel",working:"Preparing file…",share:"Share",save:"Save",back:"Close",ready:"File is ready",noGeometry:"Create and close the contour first",badMeasure:"The measurement has an unresolved discrepancy. Check it before sharing",failed:"Could not create the sheet",saved:"File saved"},
    pl:{menu:"Wyślij wykonawcy",hint:"Arkusz pomiarowy lub projekt",title:"Wyślij wykonawcy",sub:"Wybierz kolor harpuna i zawartość. Elementy ścian i kosztorys są pomijane.",harpoon:"Kolor harpuna",white:"Biały",black:"Czarny",chooseColor:"Wybierz kolor harpuna",blank:"Arkusz pomiarowy",blankHint:"Kontury, wymiary, powierzchnia i przekątne",project:"Projekt sufitu",projectHint:"Dodatkowo światło i elementy sufitu",cancel:"Anuluj",working:"Przygotowywanie pliku…",share:"Udostępnij",save:"Zapisz",back:"Zamknij",ready:"Plik jest gotowy",noGeometry:"Najpierw utwórz i zamknij kontur",badMeasure:"Pomiar ma niepotwierdzoną rozbieżność. Sprawdź go przed wysłaniem",failed:"Nie udało się utworzyć arkusza",saved:"Plik zapisano"}
  };

  function language(){
    try{return window["A·CEIL"]&&window["A·CEIL"].I18n&&window["A·CEIL"].I18n.currentLanguage||"uk"}catch(_){return"uk"}
  }
  function t(key){var set=copy[language()]||copy.uk;return set[key]||copy.uk[key]||key}
  function clone(value){try{return JSON.parse(JSON.stringify(value))}catch(_){return value}}
  function toast(message,duration){try{if(typeof showToast==="function")showToast(message,duration||3200)}catch(_){}}
  function safeName(value){
    var map={а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ye",ж:"zh",з:"z",и:"y",і:"i",ї:"yi",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ь:"",ю:"yu",я:"ya"};
    return String(value||"A-CEIL").toLowerCase().split("").map(function(ch){return Object.prototype.hasOwnProperty.call(map,ch)?map[ch]:ch}).join("").replace(/[^a-z0-9._-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,80)||"A-CEIL";
  }
  function activeObject(){
    try{
      if(typeof _activeObjectId==="undefined"||_activeObjectId==null||typeof getProjects!=="function")return null;
      return (getProjects()||[]).find(function(item){return item&&[item.id,item._dbId,item._localId].some(function(id){return id!=null&&String(id)===String(_activeObjectId)})})||null;
    }catch(_){return null}
  }
  function currentState(){
    return clone({
      pts:typeof pts!=="undefined"?pts:[],lengths:typeof lengths!=="undefined"?lengths:[],realPts:typeof realPts!=="undefined"?realPts:[],closed:typeof closed!=="undefined"&&closed,
      diagonals:typeof diagonals!=="undefined"?diagonals:[],circleMode:typeof circleMode!=="undefined"&&circleMode,circleDiamCm:typeof circleDiamCm!=="undefined"?circleDiamCm:0,
      diagonalOverrides:typeof diagonalOverrides!=="undefined"?diagonalOverrides:{},notes:typeof notes!=="undefined"?notes:[],elemItems:typeof elemItems!=="undefined"?elemItems:[],elemGroups:typeof elemGroups!=="undefined"?elemGroups:[],
      lightMarks:typeof lightMarks!=="undefined"?lightMarks:[],wallMarks:typeof wallMarks!=="undefined"?wallMarks:[],linearElements:typeof linearElements!=="undefined"?linearElements:[],wallTypes:typeof wallTypes!=="undefined"?wallTypes:[],arcPoints:typeof arcPoints!=="undefined"?arcPoints:[],
      ceilingCornices:typeof ceilingCornices!=="undefined"?ceilingCornices:[]
    });
  }
  function currentRoom(){
    var state=currentState(),area=document.getElementById("area"),per=document.getElementById("per");
    return{name:String((typeof _currentProjComment!=="undefined"&&_currentProjComment)||"Кімната"),area:area?area.textContent:"",per:per?per.textContent:"",state:JSON.stringify(state)};
  }
  function reportObject(){
    var source=activeObject(),object=source?clone(source):{name:String((typeof _currentProjName!=="undefined"&&_currentProjName)||"Новий обʼєкт"),addr:String((typeof _currentProjAddr!=="undefined"&&_currentProjAddr)||""),phone:String((typeof _currentProjPhone!=="undefined"&&_currentProjPhone)||""),rooms:[currentRoom()]};
    if(!Array.isArray(object.rooms))object.rooms=[];
    try{
      if(source&&typeof _activeRoomIdx!=="undefined"&&_activeRoomIdx!=null&&object.rooms[_activeRoomIdx])object.rooms[_activeRoomIdx]=Object.assign({},object.rooms[_activeRoomIdx],currentRoom());
    }catch(_){}
    if(!object.rooms.length)object.rooms=[currentRoom()];
    return object;
  }
  function parseState(value){try{return typeof value==="string"?JSON.parse(value||"{}"):clone(value||{})}catch(_){return{}}}
  function hasGeometry(state){return !!(state&&((Array.isArray(state.pts)&&state.pts.length>=3)||(state.circleMode&&Number(state.circleDiamCm)>0)))}
  function ceilingColor(state){
    var items=state&&Array.isArray(state.elemItems)?state.elemItems:[],films=items.filter(function(item){return item&&(item.filmPickerManaged===true||item.roomScopedKind==="film-color"||Number(item.filmWidth)>0)&&(item.colorCode||item.name)}),chosen=films.find(function(item){return Number(item.qty)>0})||films.find(function(item){return item.filmSelected})||films[0];
    if(!chosen)return"НЕ ВИБРАНО";
    var code=String(chosen.colorCode||String(chosen.name||"").split(" ")[0]||"").toUpperCase(),texture=String(chosen.colorTexture||""),labels=window.ACEIL_TEXTURE_LABELS||{lak:"Глянець",mat:"Мат",satin:"Сатин"},seriesId=chosen.seriesId||chosen.filmSeriesId||"premium",series=(Array.isArray(window.ACEIL_FILM_SERIES)?window.ACEIL_FILM_SERIES:[]).find(function(item){return item&&item.id===seriesId}),parts=[code,labels[texture]||texture,series&&series.name||seriesId].filter(Boolean);
    return parts.join(" · ")||"НЕ ВИБРАНО";
  }
  function cleanObject(object,mode){
    var result=clone(object);
    result.rooms=(result.rooms||[]).map(function(room){
      var next=clone(room),state=parseState(next.state);
      next.ceilingColor=ceilingColor(state);
      state.wallMarks=[];state.ceilingCornices=[];state.elemItems=[];state.elemGroups=[];
      if(mode==="blank"){state.lightMarks=[];state.linearElements=[]}
      next.state=JSON.stringify(state);return next;
    });
    return result;
  }
  function preset(mode,harpoonColor){
    var base={drawing:true,showLights:mode==="project",showLightCoords:mode==="project",mountingLightBindings:mode==="project",showLegend:mode==="project",showWallMarks:false,showWallCoords:false,area:true,dimensions:true,dimensionsList:true,overall:true,diagonals:true,nomenclature:false,qty:false,unitPrice:false,rowTotal:false,grandTotal:false,diagMode:"manual",reportStyle:"modern",reportAudience:"installer",harpoonColor:harpoonColor||"",companyName:"A·CEIL PRO",companyPhone:"",companySite:""};
    try{var saved=typeof window._loadRS==="function"?window._loadRS():{};base.companyName=saved.companyName||base.companyName;base.companyPhone=saved.companyPhone||"";base.companySite=saved.companySite||""}catch(_){}
    return base;
  }
  function measurementProblem(object){
    try{
      for(var i=0;i<object.rooms.length;i++){
        var room=object.rooms[i];if(!hasGeometry(parseState(room.state)))return t("noGeometry");
        if(typeof window._analyzeRoomState==="function"){
          var analysis=window._analyzeRoomState(room),kind=analysis&&analysis.verdict&&analysis.verdict.type;
          if(kind==="proven"||kind==="conflict")return t("badMeasure")+": "+(room.name||"Кімната");
        }
      }
    }catch(_){return t("failed")}
    return"";
  }
  function canvasBlob(canvas){return new Promise(function(resolve,reject){try{canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error(t("failed")))} ,"image/png")}catch(error){reject(error)}})}
  function download(blob,fileName){var url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1800)}
  async function nativeShare(blob,fileName,title){
    var file=new File([blob],fileName,{type:"image/png"});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:title});return true}
    return false;
  }
  function preview(canvas,fileName,title){
    var old=document.getElementById("aceilInstallerPreview");if(old)old.remove();
    var layer=document.createElement("div");layer.id="aceilInstallerPreview";layer.innerHTML='<div class="ais-preview-head"><button type="button" data-close>← '+t("back")+'</button><strong>'+t("ready")+'</strong><span></span></div><div class="ais-preview-body"><img alt="'+title+'"></div><div class="ais-preview-actions"><button type="button" data-save>'+t("save")+'</button><button type="button" class="primary" data-share>'+t("share")+'</button></div>';
    document.body.appendChild(layer);layer.querySelector("img").src=canvas.toDataURL("image/png");
    var close=function(){layer.remove()};layer.querySelector("[data-close]").onclick=close;
    layer.querySelector("[data-save]").onclick=async function(){var blob=await canvasBlob(canvas);download(blob,fileName);toast(t("saved"))};
    layer.querySelector("[data-share]").onclick=async function(){try{var blob=await canvasBlob(canvas);if(!await nativeShare(blob,fileName,title))download(blob,fileName)}catch(error){if(!error||error.name!=="AbortError")toast(error&&error.message||t("failed"),4200)}};
  }
  async function buildAndShare(mode){
    if(busy)return;if(!selectedHarpoonColor){setStatus(t("chooseColor"));return}var object=reportObject(),problem=measurementProblem(object);if(problem){toast(problem,4600);return}
    busy=true;setStatus(t("working"));document.querySelectorAll("#aceilInstallerShareModal [data-mode],#aceilInstallerShareModal [data-harpoon]").forEach(function(button){button.disabled=true});
    var clean=cleanObject(object,mode),settings=preset(mode,selectedHarpoonColor),oldSettings=null,hadSettings=false,oldPreview=window._modernOpenPreview,captured=null;
    try{
      hadSettings=localStorage.getItem("reportSettings")!==null;oldSettings=localStorage.getItem("reportSettings");localStorage.setItem("reportSettings",JSON.stringify(settings));window.reportSettings=settings;
      var capture=function(canvas,fileName){captured={canvas:canvas,fileName:fileName}};window._modernOpenPreview=capture;try{_modernOpenPreview=capture}catch(_){}
      if(typeof window.generateModernObjectReport!=="function")throw new Error(t("failed"));
      await window.generateModernObjectReport(clean,settings);if(!captured||!captured.canvas)throw new Error(t("failed"));
      var fileName="A-CEIL_"+(mode==="blank"?"blank_zamiriv_":"proekt_steli_")+safeName(clean.name)+".png",title=(mode==="blank"?t("blank"):t("project"))+" — "+String(clean.name||"A·CEIL"),blob=await canvasBlob(captured.canvas),shared=false;
      closeChooser(false);
      try{shared=await nativeShare(blob,fileName,title)}catch(error){if(error&&error.name==="AbortError")return;if(!error||error.name!=="NotAllowedError")throw error}
      if(!shared)preview(captured.canvas,fileName,title);
    }catch(error){toast(error&&error.message||t("failed"),4500);if(captured&&captured.canvas)preview(captured.canvas,captured.fileName||"A-CEIL.png",t("ready"))}
    finally{
      window._modernOpenPreview=oldPreview;try{_modernOpenPreview=oldPreview}catch(_){}
      if(hadSettings)localStorage.setItem("reportSettings",oldSettings);else localStorage.removeItem("reportSettings");try{window.reportSettings=typeof window._loadRS==="function"?window._loadRS():{}}catch(_){}
      busy=false;setStatus("");document.querySelectorAll("#aceilInstallerShareModal [data-harpoon]").forEach(function(button){button.disabled=false});document.querySelectorAll("#aceilInstallerShareModal [data-mode]").forEach(function(button){button.disabled=!selectedHarpoonColor});
    }
  }
  function ensureUi(){
    if(document.getElementById("aceilInstallerShareModal"))return;
    var style=document.createElement("style");style.id="aceilInstallerShareStyles";style.textContent='#aceilInstallerShareModal{position:fixed;inset:0;z-index:10030;display:none;align-items:flex-end;justify-content:center;padding:12px;background:rgba(15,23,42,.48);box-sizing:border-box}#aceilInstallerShareModal.open{display:flex}.ais-card{width:min(100%,420px);background:#fff;border-radius:22px;padding:17px;box-shadow:0 24px 70px rgba(15,23,42,.3);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.ais-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.ais-head h3{margin:0;font-size:18px;color:#0f172a}.ais-close{width:36px;height:36px;padding:0;border:0;border-radius:11px;background:#f1f5f9;color:#64748b;font-size:24px;box-shadow:none}.ais-sub{margin:7px 0 13px;color:#64748b;font-size:12px;line-height:1.4;font-weight:650}.ais-color-label{margin:2px 0 7px;color:#334155;font-size:12px;font-weight:850}.ais-colors{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ais-color{min-height:44px;border:1px solid #cbd5e1;border-radius:13px;background:#fff;color:#334155;font-size:13px;font-weight:850;box-shadow:none;display:flex;align-items:center;justify-content:center;gap:8px}.ais-color i{width:17px;height:17px;border:1px solid #94a3b8;border-radius:50%;background:#fff}.ais-color[data-harpoon="black"] i{background:#111827;border-color:#111827}.ais-color.active{border:2px solid #2563eb;background:#eff6ff;color:#1d4ed8}.ais-choice{width:100%;min-height:76px;margin-top:8px;padding:12px;border:1px solid #dbe4ef;border-radius:15px;background:#f8fafc;color:#0f172a;box-shadow:none;display:flex;align-items:center;gap:12px;text-align:left}.ais-choice:active{background:#eaf1ff}.ais-choice:disabled,.ais-color:disabled{opacity:.46}.ais-choice svg{width:28px;height:28px;flex:0 0 28px;fill:none;stroke:#2563eb;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.ais-choice span{display:flex;flex-direction:column;gap:3px}.ais-choice b{font-size:14px}.ais-choice small{color:#64748b;font-size:11px;line-height:1.3}.ais-status{min-height:18px;margin-top:10px;text-align:center;color:#2563eb;font-size:12px;font-weight:800}#aceilInstallerPreview{position:fixed;inset:0;z-index:2147483100;background:#edf2f8;display:grid;grid-template-rows:auto 1fr auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.ais-preview-head{height:56px;padding:8px 12px;background:#fff;border-bottom:1px solid #dbe4ef;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.ais-preview-head button{justify-self:start;border:0;border-radius:11px;padding:9px 12px;background:#f1f5f9;color:#0f172a;font-weight:800}.ais-preview-body{overflow:auto;padding:12px}.ais-preview-body img{display:block;width:100%;height:auto;background:#fff;border-radius:14px;box-shadow:0 8px 26px rgba(15,23,42,.14)}.ais-preview-actions{display:flex;gap:9px;padding:10px 12px max(12px,env(safe-area-inset-bottom));background:#fff;border-top:1px solid #dbe4ef}.ais-preview-actions button{flex:1;min-height:46px;border:1px solid #bfdbfe;border-radius:13px;background:#eff6ff;color:#1d4ed8;font-weight:850}.ais-preview-actions .primary{background:#2563eb;color:#fff}@media(min-width:600px){#aceilInstallerShareModal{align-items:center}}';document.head.appendChild(style);
    var modal=document.createElement("div");modal.id="aceilInstallerShareModal";modal.innerHTML='<div class="ais-card" role="dialog" aria-modal="true"><div class="ais-head"><h3 data-title></h3><button type="button" class="ais-close">×</button></div><div class="ais-sub" data-sub></div><div class="ais-color-label" data-color-label></div><div class="ais-colors"><button type="button" class="ais-color" data-harpoon="white"><i></i><span></span></button><button type="button" class="ais-color" data-harpoon="black"><i></i><span></span></button></div><button type="button" class="ais-choice" data-mode="blank" disabled><svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg><span><b></b><small></small></span></button><button type="button" class="ais-choice" data-mode="project" disabled><svg viewBox="0 0 24 24"><path d="M4 19V5h16v14z"/><path d="M8 15V9h8v6M12 9V5"/></svg><span><b></b><small></small></span></button><div class="ais-status" data-status></div></div>';document.body.appendChild(modal);
    modal.querySelector(".ais-close").onclick=function(){closeChooser(true)};modal.addEventListener("click",function(event){if(event.target===modal)closeChooser(true)});modal.querySelectorAll("[data-harpoon]").forEach(function(button){button.onclick=function(){selectedHarpoonColor=button.dataset.harpoon;modal.querySelectorAll("[data-harpoon]").forEach(function(item){item.classList.toggle("active",item===button)});modal.querySelectorAll("[data-mode]").forEach(function(item){item.disabled=false});setStatus("")}});modal.querySelectorAll("[data-mode]").forEach(function(button){button.onclick=function(){buildAndShare(button.dataset.mode)}});translate();
  }
  function setStatus(value){var el=document.querySelector("#aceilInstallerShareModal [data-status]");if(el)el.textContent=value||""}
  function openChooser(){ensureUi();translate();selectedHarpoonColor="";setStatus("");var modal=document.getElementById("aceilInstallerShareModal");modal.querySelectorAll("[data-harpoon]").forEach(function(button){button.classList.remove("active")});modal.querySelectorAll("[data-mode]").forEach(function(button){button.disabled=true});modal.classList.add("open");try{if(typeof window.closeA·CEILRoomMenu==="function")window.closeA·CEILRoomMenu()}catch(_){}}
  function closeChooser(clear){var modal=document.getElementById("aceilInstallerShareModal");if(modal&&!busy||clear===false&&modal)modal.classList.remove("open");if(clear)setStatus("")}
  function translate(){
    var modal=document.getElementById("aceilInstallerShareModal"),button=document.getElementById("aceilInstallerShareAction");
    if(modal){modal.querySelector("[data-title]").textContent=t("title");modal.querySelector("[data-sub]").textContent=t("sub");modal.querySelector("[data-color-label]").textContent=t("harpoon");modal.querySelector('[data-harpoon="white"] span').textContent=t("white");modal.querySelector('[data-harpoon="black"] span').textContent=t("black");var blank=modal.querySelector('[data-mode="blank"]'),project=modal.querySelector('[data-mode="project"]');blank.querySelector("b").textContent=t("blank");blank.querySelector("small").textContent=t("blankHint");project.querySelector("b").textContent=t("project");project.querySelector("small").textContent=t("projectHint")}
    if(button){button.querySelector("b").textContent=t("menu");button.querySelector("small").textContent=t("hint")}
  }
  function installMenu(){
    var menu=document.getElementById("A·CEILRoomMenuPopup");if(!menu||document.getElementById("aceilInstallerShareAction"))return;
    var button=document.createElement("button");button.type="button";button.id="aceilInstallerShareAction";button.className="rm-room-menu-action";button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M9 15h6M12 12v6"/></svg><span><b></b><small></small></span>';button.onclick=openChooser;
    var separator=menu.querySelector(".rm-room-menu-separator");menu.insertBefore(button,separator||menu.lastChild);translate();
  }
  function boot(){ensureUi();installMenu();translate()}
  document.addEventListener("A·CEIL-language-changed",translate);document.addEventListener("keydown",function(event){if(event.key==="Escape"&&!busy)closeChooser(true)});
  window.A_CEIL_OpenInstallerShare=openChooser;window.A_CEIL_InstallerShare={open:openChooser,build:buildAndShare,preset:preset,cleanObject:cleanObject,reportObject:reportObject};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
