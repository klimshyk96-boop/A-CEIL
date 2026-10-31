(function(){
"use strict";
if(window.A_CEIL_CloudProjectTrash)return;
function client(){try{return (typeof _sb!=="undefined"&&_sb)||window._sb||null}catch(_){return window._sb||null}}
function user(){try{return (typeof _sbUser!=="undefined"&&_sbUser)||window._sbUser||null}catch(_){return window._sbUser||null}}
function missing(error){return /aceil_(?:list|restore|purge|trash)_project|schema cache|could not find the function/i.test(String(error&&error.message||error||""));}
async function rpc(name,args){
 var sb=client(),u=user();if(!sb||!u)throw new Error("Хмара недоступна");
 var result=await sb.rpc(name,args||{});if(result&&result.error){var error=result.error;if(missing(error))error.aceilTrashUnavailable=true;throw error;}return result?result.data:null;
}
function rows(data){
 if(!Array.isArray(data))return[];
 return data.filter(function(row){return row&&row.project&&row.project_id;}).map(function(row){
  var project=JSON.parse(JSON.stringify(row.project));project.id=project.id||row.project_id;project._dbId=project._dbId||row.project_id;
  return {cloud:true,project_id:String(row.project_id),project:project,deletedAt:new Date(row.deleted_at).getTime()||Date.now(),expiresAt:new Date(row.expires_at).getTime()||0};
 });
}
async function list(){return rows(await rpc("aceil_list_project_trash"));}
async function restore(id){
 var restored=await rpc("aceil_restore_project",{p_project_id:id});
 try{if(typeof loadProjectsFromCloud==="function")await loadProjectsFromCloud();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
 try{window.dispatchEvent(new CustomEvent("aceil:project-recovered",{detail:{source:"cloud-trash",id:String(restored||id)}}));}catch(_){window.__diagSilent&&window.__diagSilent(_)}
 return {ok:true,id:String(restored||id)};
}
async function purge(id){return {ok:!!(await rpc("aceil_purge_project_trash",{p_project_id:id}))};}
window.A_CEIL_CloudProjectTrash=Object.freeze({list:list,restore:restore,purge:purge});
})();
