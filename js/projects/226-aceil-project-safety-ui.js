(function(){
"use strict";
if(window.__A_CEIL_PROJECT_SAFETY_UI)return;
window.__A_CEIL_PROJECT_SAFETY_UI=true;
function root(){return window["A·CEIL"]||{}}
function api(){return root().ProjectSafety||window.A_CEIL_ProjectSafety||null}
function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function fmt(ts){if(!ts)return"—";try{return new Date(ts).toLocaleString("uk-UA",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(_){return"—"}}
function ensureStyle(){
 if(document.getElementById("aceilProjectSafetyStyle"))return;
 var s=document.createElement("style");s.id="aceilProjectSafetyStyle";
 s.textContent="#projectsModal>.modal{width:100vw!important;height:100dvh!important;max-width:none!important;max-height:100dvh!important;border-radius:0!important}#projectsModal>.modal>div:first-child{padding:calc(env(safe-area-inset-top) + 8px) 8px 7px!important}#projectsModal h3,#projectsModal button[onclick='openNewObjectModal()']{display:none!important}#projectsModal>.modal>div:first-child>div:first-child>div:last-child{margin-left:auto!important}#projectsModal #projectsList{padding:5px 0 calc(env(safe-area-inset-bottom) + 8px)!important}#projectsModal .rp-project-card{width:100%!important;margin:0 0 8px!important;border-radius:0!important;box-shadow:0 2px 8px rgba(15,23,42,.07)!important}#aceilProjectSafetyBar{margin:0 6px 6px;padding:5px 7px;border:1px solid #dbeafe;border-radius:9px;background:#f8fbff;color:#475569;font-size:9px;font-weight:750;display:flex;align-items:center;gap:4px;flex-wrap:wrap;line-height:1.15}#aceilProjectSafetyBar b{color:#0f172a}#aceilProjectSafetyBar button{border:0;border-radius:7px;padding:4px 6px;background:#e0ecff;color:#1d4ed8;font-size:9px;font-weight:900;box-shadow:none}#aceilSafetyTrash{position:fixed;inset:0;z-index:2147483200;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:10px}#aceilSafetyTrash>div{width:min(520px,96vw);max-height:78vh;overflow:auto;background:#fff;border-radius:22px;padding:16px;box-sizing:border-box}#aceilSafetyTrash h3{margin:0 0 6px}.aceil-safety-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid #eef2f7}.aceil-safety-row small{display:block;color:#64748b;margin-top:3px}.aceil-safety-row button{border:0;border-radius:10px;padding:8px 10px;background:#dcfce7;color:#15803d;font-weight:900}";
 document.head.appendChild(s);
}
async function render(){
 var list=document.getElementById("projectsList"),safety=api();if(!list||!safety)return;
 ensureStyle();var bar=document.getElementById("aceilProjectSafetyBar");
 if(!bar){bar=document.createElement("div");bar.id="aceilProjectSafetyBar";list.parentNode.insertBefore(bar,list)}
 try{
  var st=await safety.status(),pending=typeof getPendingQueue==="function"?getPendingQueue().length:0;
  bar.innerHTML="<span>"+(pending?"⏳ <b>"+pending+"</b> очікує":"🛡️ Захист")+"</span><span><b>"+fmt(st.currentAt)+"</b></span><button type=\"button\" data-safety-previous>Копія</button><button type=\"button\" data-safety-trash>Кошик "+st.trashCount+"</button>";
  bar.querySelector("[data-safety-previous]").onclick=restorePrevious;
  bar.querySelector("[data-safety-trash]").onclick=openTrash;
 }catch(e){bar.textContent="🛡️ Локальний захист активний"}
}
async function restorePrevious(){
 var safety=api();if(!safety||!confirm("Відновити попередню локальну копію проєктів? Поточні проєкти не видаляться."))return;
 var result=await safety.restore("previous");
 if(typeof showToast==="function")showToast(result.ok?"♻️ Попередню копію відновлено":"Попередньої копії немає",3500);
 try{if(typeof renderProjects==="function")renderProjects()}catch(_){}
 render();
}
async function openTrash(){
 var safety=api();if(!safety)return;var rows=await safety.listTrash(),old=document.getElementById("aceilSafetyTrash");if(old)old.remove();
 var modal=document.createElement("div");modal.id="aceilSafetyTrash";
 modal.innerHTML="<div><div style=\"display:flex;justify-content:space-between;align-items:center;gap:10px\"><div><h3>Кошик проєктів</h3><small>Видалені копії зберігаються до 30 днів</small></div><button type=\"button\" data-close style=\"border:0;background:#f1f5f9;border-radius:10px;padding:8px 11px\">×</button></div><div data-list>"+(rows.length?"":"<p style=\"color:#64748b\">Кошик порожній</p>")+"</div></div>";
 var host=modal.querySelector("[data-list]");
 rows.forEach(function(row){
  var p=row.project||{},id=p.id||p._dbId||p._localId||"",el=document.createElement("div");el.className="aceil-safety-row";
  el.innerHTML="<div><b>"+esc(p.name||"Без назви")+"</b><small>Видалено "+fmt(row.deletedAt)+"</small></div><button type=\"button\">Відновити</button>";
  el.querySelector("button").onclick=async function(){this.disabled=true;var result=await safety.restoreTrash(id);if(result.ok){modal.remove();if(typeof showToast==="function")showToast(result.alreadyPresent?"✓ Проєкт уже є у списку":"♻️ Проєкт відновлено та поставлено в чергу хмари",4000);try{if(typeof renderProjects==="function")renderProjects()}catch(_){}}else this.disabled=false;render()};
  host.appendChild(el);
 });
 modal.querySelector("[data-close]").onclick=function(){modal.remove()};modal.addEventListener("click",function(e){if(e.target===modal)modal.remove()});document.body.appendChild(modal);
}
function installDeleteBridge(){
 var previous=window.deleteProject;
 if(typeof previous!=="function"||previous.__safetyDeleteBridge)return;
 var wrapped=function(id,btn){
  var repository=root().ProjectRepository;
  if(!repository||typeof repository.list!=="function"||typeof repository.remove!=="function")return previous.apply(this,arguments);
  var project=repository.list({clone:true}).find(function(p){return[p&&p.id,p&&p._dbId,p&&p._localId].some(function(value){return value!=null&&String(value)===String(id)})});
  if(!project)return previous.apply(this,arguments);
  var remove=async function(){
   var reference=project.id!=null?project.id:(project._dbId!=null?project._dbId:project._localId);
   if(!repository.remove(reference))return false;
   try{if(typeof renderProjects==="function")renderProjects()}catch(_){}
   if(project._dbId!=null&&typeof window.addToPendingQueue==="function"){
    window.addToPendingQueue({type:"delete",payload:{localId:project.id||project._localId||null,dbId:project._dbId},addedAt:Date.now()});
    try{if(typeof window.flushPendingQueue==="function")await window.flushPendingQueue()}catch(_){}
   }else if(typeof window.removeFromPendingQueue==="function"){
    [project.id,project._localId].filter(function(value){return value!=null}).forEach(window.removeFromPendingQueue);
   }
   var safety=api();try{if(safety&&typeof safety.flush==="function")await safety.flush()}catch(_){}
   await render();
   return true;
  };
  var confirmFn=window.confirmTap||typeof confirmTap==="function"&&confirmTap;
  return typeof confirmFn==="function"?confirmFn(btn,"⚠️ Ще раз — видалити",remove):remove();
 };
 wrapped.__safetyDeleteBridge=true;window.deleteProject=wrapped;try{deleteProject=wrapped}catch(_){}
}
function install(){
 var old=window.openProjectsModal;if(typeof old==="function"&&!old.__safetyUi){var wrap=function(){var r=old.apply(this,arguments);setTimeout(render,0);return r};wrap.__safetyUi=true;window.openProjectsModal=wrap;try{openProjectsModal=wrap}catch(_){}}
 installDeleteBridge();
 window.addEventListener("aceil:sync-status-change",render);window.addEventListener("aceil:project-recovered",render);window.addEventListener("aceil:user-storage-changed",render);
 setTimeout(render,500);
}
window.A_CEIL_ProjectSafetyUI={render:render,trash:openTrash,restorePrevious:restorePrevious};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
