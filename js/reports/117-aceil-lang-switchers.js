/* Перемикачі мов A·CEIL: екран авторизації + меню після входу.
   Уся логіка перекладу — в A·CEIL.i18n; тут лише UI перемикачів. */
(function(){
"use strict";
var LANGS=[["uk","🇺🇦 Українська"],["en","🇬🇧 English"],["pl","🇵🇱 Polski"]];

function i18n(){return window.A·CEIL&&window.A·CEIL.i18n;}


function activateLanguage(code){
  var api=i18n();
  if(!api||typeof api.setLanguage!=="function")return false;
  try{
    api.setLanguage(code);
    updateLangButtons();
    /* Reload from the Ukrainian source DOM. This reliably restores UK and
       applies EN/PL after dynamic UI patches have already modified text nodes. */
    setTimeout(function(){ location.reload(); },40);
  }catch(e){
    try{showToast("Помилка мови: "+String(e&&e.message||e));}catch(_e){window.__diagSilent&&window.__diagSilent(_e)}
    return false;
  }
  return true;
}
function updateLangButtons(){
  var api=i18n();if(!api)return;
  var code=api.getLanguage().toUpperCase();
  var b1=document.getElementById("rmAuthLangBtn");
  if(b1)b1.textContent=code;
  var b2=document.getElementById("rmAppLangBtn");
  if(b2)b2.textContent=code;
}

/* --- Екран авторизації: наявні #rmAuthLangBtn / #rmLangSheet --- */
function wireAuthSwitcher(){
  var btn=document.getElementById("rmAuthLangBtn"),
      sheet=document.getElementById("rmLangSheet");
  if(!btn||!sheet||btn.__rmWired)return;
  btn.__rmWired=true;
  btn.addEventListener("click",function(e){
    e.stopPropagation();
    sheet.hidden=!sheet.hidden;
  });
  sheet.addEventListener("click",function(e){
    var x=e.target.closest("button[data-lang]");
    if(!x)return;
    sheet.hidden=true;
    activateLanguage(x.dataset.lang);
  });
  document.addEventListener("click",function(e){
    if(!sheet.hidden&&!e.target.closest("#rmLangSheet")&&!e.target.closest("#rmAuthLangBtn"))sheet.hidden=true;
  });
}

/* --- Перемикач після входу: кнопка в кокпіті поруч із "Проєкти" --- */
function ensureAppSwitcher(){
  if(document.getElementById("rmAppLangBtn"))return;
  var host=document.querySelector("#rpCockpit .rpc-tools");
  if(!host)return;
  var btn=document.createElement("button");
  btn.type="button";
  btn.id="rmAppLangBtn";
  btn.setAttribute("aria-label","Вибір мови");
  btn.textContent="UA";
  var sheet=document.createElement("div");
  sheet.id="rmAppLangSheet";
  sheet.hidden=true;
  sheet.style.cssText="position:fixed;z-index:10050;width:190px;padding:7px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 18px 45px rgba(15,23,42,.18)";
  LANGS.forEach(function(l){
    var b=document.createElement("button");
    b.type="button";
    b.dataset.lang=l[0];
    b.textContent=l[1];
    b.style.cssText="display:block;width:100%;padding:11px 12px;text-align:left;border:0;border-radius:10px;background:transparent;color:#0f172a;box-shadow:none;font-size:14px;font-weight:800";
    sheet.appendChild(b);
  });
  document.body.appendChild(sheet);
  btn.addEventListener("click",function(e){
    e.stopPropagation();
    if(sheet.hidden){
      var r=btn.getBoundingClientRect();
      sheet.style.top=Math.round(r.bottom+6)+"px";
      sheet.style.left=Math.round(Math.max(8,Math.min(r.left,window.innerWidth-198)))+"px";
      sheet.hidden=false;
    }else sheet.hidden=true;
  });
  sheet.addEventListener("click",function(e){
    var x=e.target.closest("button[data-lang]");
    if(!x)return;
    sheet.hidden=true;
    activateLanguage(x.dataset.lang);
  });
  document.addEventListener("click",function(e){
    if(!sheet.hidden&&!e.target.closest("#rmAppLangSheet")&&e.target!==btn)sheet.hidden=true;
  });
  host.appendChild(btn);
  updateLangButtons();
}

function init(){
  wireAuthSwitcher();
  ensureAppSwitcher();
  updateLangButtons();
  var api=i18n();
  if(api)api.onChange(updateLangButtons);
  /* кокпіт може рендеритися пізніше — пробуємо ще раз */
  var tries=0,tm=setInterval(function(){
    ensureAppSwitcher();
    if(document.getElementById("rmAppLangBtn")||++tries>20)clearInterval(tm);
  },500);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
