(function(){
  "use strict";
  var KEY="aceil_ui_theme_v1";
  var media=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;

  function normalize(value){return value==="dark"||value==="system"?value:"light"}
  function stored(){try{return normalize(localStorage.getItem(KEY)||"light")}catch(_){return"light"}}
  function resolved(choice){return choice==="system"&&media&&media.matches?"dark":choice==="dark"?"dark":"light"}
  function icon(choice){return choice==="dark"?"☾":choice==="system"?"◐":"☀"}
  function label(choice){return choice==="dark"?"Темна тема":choice==="system"?"Як у системі":"Світла тема"}
  function apply(choice,persist){
    choice=normalize(choice);
    if(persist!==false)try{localStorage.setItem(KEY,choice)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    var actual=resolved(choice),root=document.documentElement;
    root.dataset.aceilThemeChoice=choice;root.dataset.aceilTheme=actual;
    root.style.colorScheme=actual;
    var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=actual==="dark"?"#0b1220":"#f1f6fd";
    document.querySelectorAll("[data-aceil-theme-trigger]").forEach(function(button){
      button.setAttribute("aria-label",label(choice));button.title=label(choice);
      var mark=button.querySelector("[data-theme-icon]");if(mark)mark.textContent=icon(choice);
    });
    document.querySelectorAll("[data-aceil-theme-choice]").forEach(function(button){
      var selected=button.getAttribute("data-aceil-theme-choice")===choice;
      button.classList.toggle("selected",selected);button.setAttribute("aria-pressed",selected?"true":"false");
    });
    return actual;
  }
  function close(){var modal=document.getElementById("A_CEIL_ThemeModal");if(modal)modal.classList.remove("open")}
  function open(){installModal();var modal=document.getElementById("A_CEIL_ThemeModal");if(modal){apply(stored(),false);modal.classList.add("open")}}
  function buttonHtml(extra){return '<button type="button" class="'+extra+'" data-aceil-theme-trigger aria-label="Тема"><span data-theme-icon aria-hidden="true">'+icon(stored())+'</span></button>'}
  function installButtons(){
    var actions=document.getElementById("A_CEIL_HeaderActions");
    if(actions&&!actions.querySelector("[data-aceil-theme-trigger]")){
      var wrap=document.createElement("div");wrap.innerHTML=buttonHtml("aceil-head-action aceil-head-theme");
      actions.insertBefore(wrap.firstChild,actions.firstChild);
    }
    var compact=document.querySelector(".header-actions-row");
    if(compact&&!compact.querySelector("[data-aceil-theme-trigger]")){
      var holder=document.createElement("div");holder.innerHTML=buttonHtml("header-icon-btn theme-btn");
      var logout=compact.querySelector(".logout-btn");compact.insertBefore(holder.firstChild,logout||null);
    }
    document.querySelectorAll("[data-aceil-theme-trigger]").forEach(function(button){
      if(button.dataset.themeBound)return;button.dataset.themeBound="1";button.addEventListener("click",open);
    });
    apply(stored(),false);
  }
  function installModal(){
    if(document.getElementById("A_CEIL_ThemeModal"))return;
    var modal=document.createElement("div");modal.id="A_CEIL_ThemeModal";modal.className="aceil-theme-overlay";
    modal.innerHTML='<div class="aceil-theme-sheet" role="dialog" aria-modal="true" aria-labelledby="aceilThemeTitle"><div class="aceil-theme-head"><div><h3 id="aceilThemeTitle">Вигляд застосунку</h3><p>Оберіть тему інтерфейсу</p></div><button type="button" class="aceil-theme-close" aria-label="Закрити">×</button></div><div class="aceil-theme-options"><button type="button" data-aceil-theme-choice="light"><span>☀</span><b>Світла</b><small>Звичний світлий інтерфейс</small><i>✓</i></button><button type="button" data-aceil-theme-choice="dark"><span>☾</span><b>Темна</b><small>Комфортно ввечері</small><i>✓</i></button><button type="button" data-aceil-theme-choice="system"><span>◐</span><b>Як у системі</b><small>Автоматично за iPhone або ПК</small><i>✓</i></button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector(".aceil-theme-close").addEventListener("click",close);
    modal.addEventListener("click",function(event){if(event.target===modal)close()});
    modal.querySelectorAll("[data-aceil-theme-choice]").forEach(function(button){button.addEventListener("click",function(){apply(button.getAttribute("data-aceil-theme-choice"),true);setTimeout(close,140)})});
    apply(stored(),false);
  }
  if(media){var onSystem=function(){if(stored()==="system")apply("system",false)};if(media.addEventListener)media.addEventListener("change",onSystem);else if(media.addListener)media.addListener(onSystem)}
  document.addEventListener("keydown",function(event){if(event.key==="Escape")close()});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){installModal();installButtons()});else{installModal();installButtons()}
  var observer=new MutationObserver(function(){installButtons()});observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(installButtons,100);setTimeout(installButtons,700);setTimeout(installButtons,1800);
  window.A_CEILTheme={get:stored,set:function(choice){return apply(choice,true)},open:open,close:close};
})();
