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
// The previous facade called ensure() on EVERY auth refresh, even for
// a normal signed-in user. That defeated the whole point of lazy admin,
// adding another script download + evaluation to the mobile startup.
var checking=null;
var sequence=0;
function currentUser(){
  try{return (typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}
  catch(_){return window._sbUser||null}
}
function client(){
  try{return (typeof _sb!=="undefined"&&_sb)||window._sb||null}
  catch(_){return window._sb||null}
}
function headerActions(){
  var top=document.querySelector("#rpCockpit .rpc-top");
  if(!top)return null;
  var actions=document.getElementById("A_CEIL_HeaderActions");
  if(!actions){
    actions=document.createElement("div");
    actions.id="A_CEIL_HeaderActions";actions.className="aceil-head-actions";
  }
  var right=top.querySelector(".rpc-head-right")||document.getElementById("rpcStatus");
  if(actions.parentNode!==top||actions.nextSibling!==right)
    top.insertBefore(actions,right||null);
  if(!document.getElementById("A_CEIL_HeaderLogout")){
    var logout=document.createElement("button");
    logout.type="button";logout.id="A_CEIL_HeaderLogout";
    logout.className="aceil-head-action aceil-head-logout";
    logout.title="Вийти з акаунта";
    logout.setAttribute("aria-label","Вийти з акаунта");
    logout.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M10 12h10m-4-4 4 4-4 4"/></svg>';
    logout.onclick=function(){
      if(typeof window.rpcLogout==="function")window.rpcLogout();
      else if(typeof window.signOut==="function")window.signOut();
    };
    actions.appendChild(logout);
  }
  var old=document.querySelector("#rpCockpit .rpc-tools .rpc-logout");
  if(old)old.remove();
  return actions;
}
function ownerButton(yes){
  var existing=document.getElementById("A_CEIL_OwnerAdminButton");
  if(!yes){
    if(existing)existing.remove();
    return;
  }
  if(existing)return;
  var actions=headerActions();
  if(!actions)return;
  var button=document.createElement("button");
  button.type="button";button.id="A_CEIL_OwnerAdminButton";
  button.className="aceil-head-action aceil-head-admin";
  button.title="Адміністрування";
  button.setAttribute("aria-label","Адміністрування");
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 16h7M14 19h4M19 14v4"/></svg><span id="aceilAdminDebugBadge" class="aceil-admin-debug-badge" hidden>0</span>';
  button.onclick=function(){return window.A_CEIL_Admin.open()};
  actions.insertBefore(button,actions.firstChild);
}
function refreshOwner(authUser){
  if(loaded())return window.A_CEIL_Admin.refreshOwner(authUser);
  // UI state only; all privileged calls remain guarded by server RPC.
  var u=authUser||currentUser(),c=client();
  var id=u&&u.id?String(u.id):"";
  ownerButton(false);
  if(!id||!c||typeof c.rpc!=="function")return Promise.resolve(false);
  headerActions();
  if(checking&&checking.id===id)return checking.promise;
  var ticket=++sequence;
  var promise=Promise.resolve().then(function(){
    return c.rpc("admin_list_users");
  }).then(function(result){
    if(ticket!==sequence)return false;
    var latest=currentUser();
    if(latest&&String(latest.id)!==id)return false;
    if(result&&result.error)return false;
    var rows=Array.isArray(result&&result.data)?result.data:[];
    var row=rows.find(function(p){return String(p.user_id||p.id||"")===id});
    var ok=!!(row&&row.app_role==="owner"&&row.is_active===true);
    ownerButton(ok);
    return ok;
  }).catch(function(e){
    try{window.__diagSilent&&window.__diagSilent(e)}catch(_){}
    return false;
  }).finally(function(){if(checking&&checking.id===id)checking=null});
  checking={id:id,promise:promise};
  return promise;
}
function reset(){
  ++sequence;checking=null;ownerButton(false);
  if(loaded())return window.A_CEIL_Admin.reset();
  return false;
}
var adminFacade={
  open:function(){return invoke("A_CEIL_Admin","open",arguments)},
  refreshOwner:refreshOwner,
  reset:reset,
  close:function(){
    if(loaded())return window.A_CEIL_Admin.close();
    return false;
  }
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