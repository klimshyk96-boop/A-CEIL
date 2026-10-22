/* Local object creation and compatibility entry points. Cloud writes are owned
   by ProjectPersistence and the canonical pending queue. */
(function(){
  function getProjectsSafe(){return window.A·CEIL.ProjectRepository.list();}
  function setProjectsSafe(items){return window.A·CEIL.ProjectRepository.replaceAll(items||[]);}
  window.createObject=function(){const name=document.getElementById("newObjName").value.trim(),addr=document.getElementById("newObjAddr").value.trim(),phone=document.getElementById("newObjPhone").value.trim(),comment=document.getElementById("newObjComment").value.trim();if(!name)return void showToast("Введіть назву об'єкту");const obj={id:"obj_"+Date.now(),_dbId:null,projectType:"apartment",multiRoom:!0,name:name,addr:addr,phone:phone,comment:comment,date:(new Date).toLocaleDateString("uk-UA"),thumb:"",rooms:[],state:JSON.stringify({schemaVersion:window.A·CEILProjectSchema?window.A·CEILProjectSchema.CURRENT_VERSION:3,projectType:"apartment",multiRoom:!0,rooms:[]})},projects=getProjectsSafe();projects.unshift(obj),setProjectsSafe(projects),closeNewObjectModal(),closeModal("projectsModal"),_activeObjectId=obj.id,openObjectRooms(obj.id),showToast("🏠 Обʼєкт створено локально. У хмару піде після першої кімнати.")};try{createObject=window.createObject}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}
  window._syncObjectToCloud=async function(obj){
    const persistence=window.A·CEIL&&window.A·CEIL.ProjectPersistence;
    return persistence ? persistence.syncProject(obj) : false;
  };
  try{_syncObjectToCloud=window._syncObjectToCloud;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  window._updateObjectInCloud=window._syncObjectToCloud;
  try{_updateObjectInCloud=window._updateObjectInCloud;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
})();
