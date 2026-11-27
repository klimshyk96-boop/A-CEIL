/* A·CEIL admin/support on-demand facade.
 * Core app, projects and drawing run without parsing the owner-only admin UI.
 * Preserve the global APIs needed by authentication and DEMO contacts.
 * Full admin implementation is the unchanged 166-aceil-admin.js. */
(function(){
"use strict";
if(window.__A_CEIL_ADMIN_LAZY_BOOT)return;
window.__A_CEIL_ADMIN_LAZY_BOOT=true;
var running=null;
var currentScript=document.currentScript;
var version="";
try{
  version=new URL(currentScript&&currentScript.src||"",document.baseURI).searchParams.get("v")||"";
}catch(_){}
var url=new URL("/js/admin/166-aceil-admin.js",location.origin);
if(version)url.searchParams.set("v",version);
function errorText(e){
  try{window.__diagSilent&&window.__diagSilent(e)}catch(_){}
  try{if(typeof window.showToast==="function")window.showToast("Модуль адміністрування недоступний. Повторіть спробу.")}catch(_){}
}
function loaded(){
  return window.A_CEIL_Admin!==adminFacade&&window.A_CEIL_Admin&&typeof window.A_CEIL_Admin.open==="function";
}
function ensure(){
  if(loaded())return Promise.resolve(window.A_CEIL_Admin);
  if(running)return running;
  running=new Promise(function(resolve,reject){
    var script=document.createElement("script");
    script.src=url.href;
    script.async=true;
    script.onload=function(){
      if(loaded())resolve(window.A_CEIL_Admin);
      else reject(new Error("Admin script did not register its API"));
    };
    script.onerror=function(){
      script.remove();
      reject(new Error("Admin script unavailable"));
    };
    try{document.head.appendChild(script)}catch(e){reject(e)}
  }).catch(function(e){
    running=null;
    errorText(e);
    throw e;
  });
  return running;
}
function invoke(which,method,args){
  return ensure().then(function(){
    var api=window[which];
    if(!api||typeof api[method]!=="function")throw new Error(which+"."+method+" unavailable");
    return api[method].apply(api,args);
  });
}
function supportLink(key,value){
  value=String(value||"").trim();
  if(!value)return "";
  if(key==="phone"){
    var digits=value.replace(/[^+0-9]/g,"");
    return /^\+?[0-9]{6,18}$/.test(digits)?"tel:"+digits:"";
  }
  if(key==="email")
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?"mailto:"+encodeURIComponent(value):"";
  if(key==="telegram"){
    if(/^@?[a-z0-9_]{5,32}$/i.test(value))return "https://t.me/"+value.replace(/^@/,"");
    return /^https:\/\/t\.me\/[a-z0-9_+/.-]+$/i.test(value)?value:"";
  }
  if(key==="whatsapp"){
    if(/^\+?[0-9 ()-]{6,40}$/.test(value))return "https://wa.me/"+value.replace(/\D/g,"");
    return /^https:\/\/wa\.me\/[0-9]+(?:\?[^\s]*)?$/i.test(value)?value:"";
  }
  if(key==="viber"){
    if(/^\+?[0-9 ()-]{6,40}$/.test(value))return "viber://chat?number="+encodeURIComponent(value.replace(/[^+0-9]/g,""));
    return /^(?:viber:\/\/[^\s]+|https:\/\/[^\s]+)$/i.test(value)?value:"";
  }
  if(["facebook","instagram","website","extra_url"].includes(key))
    return /^https:\/\/[a-z0-9][a-z0-9._-]*(?:[/?#][^\s]*)?$/i.test(value)?value:"";
  return "";
}
var adminFacade={
  open:function(){return invoke("A_CEIL_Admin","open",arguments)},
  refreshOwner:function(){return invoke("A_CEIL_Admin","refreshOwner",arguments)},
  reset:function(){return invoke("A_CEIL_Admin","reset",arguments)},
  close:function(){return invoke("A_CEIL_Admin","close",arguments)}
};
var supportFacade={
  link:supportLink,
  open:function(){return invoke("A_CEIL_Support","open",arguments)},
  close:function(){return invoke("A_CEIL_Support","close",arguments)}
};
window.A_CEIL_Admin=adminFacade;
window.A_CEIL_Support=supportFacade;
window.A_CEIL_LoadAdmin=ensure;
})();