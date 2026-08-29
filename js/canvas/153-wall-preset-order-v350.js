
(function(){
"use strict";
function gid(id){return document.getElementById(id)}
function read(){
  try{
    var a=typeof window.rwe2WallPresetRead==="function"?window.rwe2WallPresetRead():[];
    return Array.isArray(a)?a.map(function(p){return typeof p==="string"?{name:p,color:"#f97316"}:{name:String(p&&p.name||"").trim(),color:p&&p.color||"#f97316"}}).filter(function(p){return p.name}):[];
  }catch(_){return[]}
}
function write(a){
  if(typeof window.rwe2WallPresetWrite==="function")return window.rwe2WallPresetWrite(a);
  try{localStorage.setItem("A·CEIL_wall_presets_v32",JSON.stringify(a||[]))}catch(_){}
  return a||[];
}
function render(selected){
  if(typeof window.rwe2WallPresetRender==="function")window.rwe2WallPresetRender(selected||"");
}
function ensureOrderField(){
  var modal=gid("rwePresetEditModal"); if(!modal)return null;
  var existing=gid("rwePresetEditOrder"); if(existing)return existing;
  var actions=modal.querySelector(".rwe-preset-edit-actions");
  if(!actions)return null;
  var wrap=document.createElement("div");
  wrap.id="rwePresetEditOrderWrap";
  wrap.innerHTML='<label class="rwe2-label">Порядок відображення</label><select id="rwePresetEditOrder"></select>';
  actions.parentNode.insertBefore(wrap,actions);
  return gid("rwePresetEditOrder");
}
function fillOrder(currentName){
  var sel=ensureOrderField(); if(!sel)return;
  var a=read(),idx=a.findIndex(function(p){return p.name===currentName});
  sel.innerHTML=a.map(function(_,i){return '<option value="'+i+'">'+(i+1)+'</option>'}).join("");
  sel.value=String(idx>=0?idx:Math.max(0,a.length-1));
}
var oldOpen=window.rweOpenPresetEdit;
window.rweOpenPresetEdit=function(){
  var r=typeof oldOpen==="function"?oldOpen.apply(this,arguments):undefined;
  setTimeout(function(){
    var n=String(window.__rweEditingPresetName||gid("rwe2Preset")&&gid("rwe2Preset").value||"").trim();
    fillOrder(n);
  },0);
  return r;
};
try{rweOpenPresetEdit=window.rweOpenPresetEdit}catch(_){}

/* Save edit + requested display position through the final writer.
   This preserves the array order locally AND in cloud sort_order. */
window.rweSavePresetEdit=function(){
  var oldName=String(window.__rweEditingPresetName||"").trim();
  var newName=String(gid("rwePresetEditName")&&gid("rwePresetEditName").value||"").trim();
  var color=gid("rwePresetEditColor")&&gid("rwePresetEditColor").value||"#f97316";
  if(!oldName||!newName){if(typeof showToast==="function")showToast("Вкажіть назву");return}
  var a=read(),oldIdx=a.findIndex(function(p){return p.name===oldName});
  if(a.some(function(p,i){return i!==oldIdx&&p.name.toLowerCase()===newName.toLowerCase()})){
    if(typeof showToast==="function")showToast("Така заготовка вже є");return;
  }
  var item={name:newName,color:color};
  if(oldIdx>=0)a.splice(oldIdx,1); else oldIdx=a.length;
  var order=gid("rwePresetEditOrder"),target=order?parseInt(order.value,10):oldIdx;
  if(!Number.isFinite(target))target=oldIdx;
  target=Math.max(0,Math.min(a.length,target));
  a.splice(target,0,item);
  write(a); render(newName);
  if(gid("rwe2Name"))gid("rwe2Name").value=newName;
  if(typeof window.rwe2SetColor==="function")try{window.rwe2SetColor(color)}catch(_){}
  if(typeof window.rweClosePresetEdit==="function")window.rweClosePresetEdit();
  try{if(typeof saveState==="function")saveState()}catch(_){}
  if(typeof showToast==="function")showToast("✓ Заготовку збережено. Позиція: "+(target+1));
};
try{rweSavePresetEdit=window.rweSavePresetEdit}catch(_){}

/* Critical fix: delete via FINAL writer, not the old local-only writer.
   Existing _wallPresetPushToCloud receives the new list, so reload cannot
   resurrect a deleted cloud preset. */
window.rweDeletePreset=function(){
  var name=String(gid("rwe2Preset")&&gid("rwe2Preset").value||gid("rwe2Name")&&gid("rwe2Name").value||"").trim();
  if(!name){if(typeof showToast==="function")showToast("Оберіть заготовку");return}
  var a=read();
  if(!a.some(function(p){return p.name===name})){if(typeof showToast==="function")showToast("Заготовку не знайдено");return}
  if(!confirm('Видалити заготовку "'+name+'"?'))return;
  var next=a.filter(function(p){return p.name!==name});
  write(next); render("");
  if(gid("rwe2Preset"))gid("rwe2Preset").value="";
  if(gid("rwe2Name"))gid("rwe2Name").value="";
  try{if(typeof saveState==="function")saveState()}catch(_){}
  if(typeof showToast==="function")showToast("✓ Заготовку видалено");
};
try{rweDeletePreset=window.rweDeletePreset}catch(_){}
})();
