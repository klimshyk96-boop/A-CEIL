
(function(){
"use strict";
window.A·CEILStorageAuditV340=function(){
  try{
    var r=window.A·CEIL&&window.A·CEIL.StorageRepair;
    var repo=window.A·CEIL&&window.A·CEIL.ProjectRepository;
    var keys=r&&r.keyBytes?r.keyBytes():{};
    var rows=Object.keys(keys).map(function(k){return {key:k,kb:Math.round(keys[k]/1024)};}).sort(function(a,b){return b.kb-a.kb;});
    return {
      ok:true,
      totalKB:r&&r.storageBytes?Math.round(r.storageBytes()/1024):null,
      projectCache:repo&&repo.cacheInfo?repo.cacheInfo():null,
      biggest:rows.slice(0,12)
    };
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
};
try{
  setTimeout(function(){
    var r=window.A·CEIL&&window.A·CEIL.StorageRepair;
    if(!r||!r.storageBytes)return;
    var kb=Math.round(r.storageBytes()/1024);
    if(kb>3800&&typeof showToast==="function")showToast("⚠️ Локальний кеш Safari: "+kb+" KB");
  },2500);
}catch(_){}
})();
