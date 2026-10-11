(function(){
"use strict";
if(window.__aceilCeCatalogManagerV2)return; window.__aceilCeCatalogManagerV2=true;
var KEY="aceil_ce_catalog_prefs_v2", applying=false, scheduled=false;
var DEFAULT_LABELS={linear:"Лінійне освітлення",chandelier:"Люстра",spot:"Точкові",double_spot:"Подвійний точковий світильник",vent:"Витяжка",track:"Трекове освітлення",ce_pipe_bypass_lt50:"Обхід труби < 50 мм",ce_pipe_bypass_gt50:"Обхід труби > 50 мм"};
function read(){try{var x=JSON.parse(localStorage.getItem(KEY)||"{}");return x&&typeof x==="object"?x:{}}catch(_){return{}}}
function save(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch(_){}}
function keyFor(card){
  var c=card.getAttribute("onclick")||"",id=card.getAttribute("data-custom-ce");
  if(id)return String(id);
  if(card.id==="ccLauncher")return "ceiling_bathroomCornice";
  if(/rmCeSurfaceTrack/.test(c))return "linear_surfaceTrack";
  if(/rmCeRecessedTrack/.test(c))return "linear_recessedTrack";
  if(/rmCeTrack/.test(c))return "linear_magneticTrack";
  if(/rmOpenLinearLighting/.test(c))return "linear_lightLine";
  if(/rmStartChandelier/.test(c))return "chandelier";
  if(/rmStartDoubleSpot/.test(c))return "double_spot";
  if(/rmStartSpotFlow/.test(c))return "spot";
  if(/rmCeVent/.test(c))return "vent";
  return "";
}
function cards(grid){return Array.prototype.slice.call(grid.children).map(function(w){return w.classList&&w.classList.contains("rm-ce-custom-wrap")?w.querySelector(".rm-ce-card"):w}).filter(function(x){return x&&x.classList.contains("rm-ce-card")})}
function wrapper(card){return card.parentElement&&card.parentElement.classList.contains("rm-ce-custom-wrap")?card.parentElement:card}
function currentTypes(){try{if(typeof lightTypes!=="undefined"&&Array.isArray(lightTypes))return lightTypes;}catch(_){}return Array.isArray(window.lightTypes)?window.lightTypes:[];}
function typeFor(k){return currentTypes().find(function(t){return t&&String(t.id)===k;});}
window.aceilCatalogLabel=function(k,f){var p=read(),t=typeFor(k);return p.labels&&p.labels[k]||t&&t.label||DEFAULT_LABELS[k]||f;};
window.aceilCatalogIcon=function(k,f){var p=read();return p.icons&&p.icons[k]||f;};
function apply(){
  if(applying)return;
  var grid=document.querySelector("#rmLightStartModal .rm-ce-grid");if(!grid)return;
  applying=true;
  try{
    var p=read(),list=cards(grid),map={},keys=[];
    list.forEach(function(card){
      var k=keyFor(card);if(!k)return;
      card.dataset.catalogKey=k;map[k]=wrapper(card);keys.push(k);
      var b=card.querySelector("b"),label=p.labels&&p.labels[k],icon=card.querySelector(".rm-ce-icon"),glyph=p.icons&&p.icons[k];
      if(b&&label&&b.textContent!==label)b.textContent=label;
      if(icon&&glyph&&icon.textContent!==glyph)icon.textContent=glyph;
      // A single edit action owns name, icon, order and deletion.
      if(map[k]!==card)map[k].querySelectorAll(".rm-ce-delete").forEach(function(button){button.remove();});
    });
    var order=(p.order||[]).map(function(k){return k==="linear"?"linear_lightLine":k;}).filter(function(k){return !!map[k];});
    keys.forEach(function(k){if(order.indexOf(k)<0)order.push(k);});
    order.forEach(function(k,i){var node=map[k],at=grid.children[i];if(at!==node)grid.insertBefore(node,at||null);});
    if(grid.classList.contains("rm-ce-edit-mode"))decorate(grid);
  }finally{applying=false;}
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;apply();},0);}
function decorate(grid){cards(grid).forEach(function(card){
  var k=card.dataset.catalogKey||keyFor(card);if(!k)return;
  var w=wrapper(card);if(w.querySelector(".aceil-cat-tools"))return;
  w.style.position="relative";
  var tools=document.createElement("div");tools.className="aceil-cat-tools";
  tools.innerHTML='<button type="button" data-a="up" title="Вище">↑</button><button type="button" data-a="down" title="Нижче">↓</button><button type="button" data-a="edit" title="Редагувати елемент" aria-label="Редагувати елемент">✎</button>';
  tools.onclick=function(e){e.preventDefault();e.stopPropagation();var button=e.target.closest("button"),a=button&&button.dataset.a;if(a==="edit")openEditor(k,card);else if(a)move(k,a==="up"?-1:1);};
  w.appendChild(tools);
});}
function currentOrder(){var g=document.querySelector("#rmLightStartModal .rm-ce-grid");return g?cards(g).map(function(c){return c.dataset.catalogKey||keyFor(c);}).filter(Boolean):[];}
function move(k,d){var o=currentOrder(),i=o.indexOf(k),j=i+d;if(i<0||j<0||j>=o.length)return;var t=o[i];o[i]=o[j];o[j]=t;var p=read();p.order=o;save(p);apply();}
var editingKey=null;
function ensureEditor(){
  var modal=document.getElementById("aceilCatalogEditModal");if(modal)return modal;
  modal=document.createElement("div");modal.id="aceilCatalogEditModal";modal.className="modal-overlay";
  modal.innerHTML='<form class="modal aceil-catalog-editor" role="dialog" aria-modal="true" aria-labelledby="aceilCatalogEditTitle"><div class="aceil-catalog-head"><b id="aceilCatalogEditTitle">Редагувати елемент</b><button type="button" data-action="close" aria-label="Закрити">×</button></div><label for="aceilCatalogEditName">Назва</label><input id="aceilCatalogEditName" required maxlength="100"><label for="aceilCatalogEditIcon">Іконка</label><input id="aceilCatalogEditIcon" maxlength="16" aria-label="Іконка елемента"><div class="aceil-catalog-icons"></div><label for="aceilCatalogEditOrder">Порядок у списку</label><select id="aceilCatalogEditOrder"></select><button type="submit" class="aceil-catalog-save">Зберегти</button><button type="button" id="aceilCatalogEditDelete" class="aceil-catalog-delete">Видалити елемент</button></form>';
  var choices=modal.querySelector(".aceil-catalog-icons");
  ["━","▭","▰","🧲","⌜","⊙","⊙⊙","✶","◉","◌","◆","○","▥","▣","↔","⚙️"].forEach(function(glyph){var b=document.createElement("button");b.type="button";b.textContent=glyph;b.setAttribute("aria-label","Іконка "+glyph);b.onclick=function(){document.getElementById("aceilCatalogEditIcon").value=glyph;};choices.appendChild(b);});
  modal.querySelector("[data-action=close]").onclick=closeEditor;
  modal.onclick=function(e){if(e.target===modal)closeEditor();};
  modal.querySelector("form").onsubmit=function(e){e.preventDefault();saveEditor();};
  modal.querySelector("#aceilCatalogEditDelete").onclick=function(){
    if(!editingKey||typeof window.rmCeDeleteCustomV318!=="function")return;
    if(window.rmCeDeleteCustomV318(editingKey)===true){closeEditor();apply();}
  };
  modal.addEventListener("keydown",function(e){if(e.key==="Escape")closeEditor();});
  document.body.appendChild(modal);return modal;
}
function openEditor(k,card){
  var modal=ensureEditor(),p=read(),t=typeFor(k),b=card.querySelector("b"),icon=card.querySelector(".rm-ce-icon");editingKey=k;
  document.getElementById("aceilCatalogEditName").value=b?b.textContent:window.aceilCatalogLabel(k,k);
  document.getElementById("aceilCatalogEditIcon").value=p.icons&&p.icons[k]||t&&t.icon||icon&&icon.textContent||"◉";
  var select=document.getElementById("aceilCatalogEditOrder"),order=currentOrder();select.replaceChildren();
  order.forEach(function(id,i){var o=document.createElement("option");o.value=i;o.textContent=String(i+1);select.appendChild(o);});select.value=String(order.indexOf(k));
  document.getElementById("aceilCatalogEditDelete").hidden=!card.hasAttribute("data-custom-ce");
  modal.classList.add("open");document.getElementById("aceilCatalogEditName").focus();
}
function closeEditor(){var m=document.getElementById("aceilCatalogEditModal");if(m)m.classList.remove("open");editingKey=null;}
function saveEditor(){
  if(!editingKey)return;
  var k=editingKey,label=document.getElementById("aceilCatalogEditName").value.trim(),icon=document.getElementById("aceilCatalogEditIcon").value.trim();
  if(!label||!icon)return;
  var p=read();p.labels=p.labels||{};p.icons=p.icons||{};p.labels[k]=label;p.icons[k]=icon;
  var order=currentOrder(),from=order.indexOf(k),target=Number(document.getElementById("aceilCatalogEditOrder").value);
  if(from>=0){order.splice(from,1);order.splice(Math.max(0,Math.min(order.length,target)),0,k);}p.order=order;save(p);
  var all=currentTypes(),item=all.find(function(t){return t&&String(t.id)===k;});
  if(item){item.label=label;item.icon=icon;try{localStorage.setItem("lightTypes_v1",JSON.stringify(all));window.lightTypes=all;lightTypes=all;}catch(_){} }
  // Presentation changes never replace stable type IDs or calculation sources.
  try{if(typeof saveState==="function")saveState();}catch(_){}
  closeEditor();if(typeof window.rmRenderCeilingElementsV318==="function")window.rmRenderCeilingElementsV318();apply();
}
window.aceilOpenCatalogEditor=openEditor;
window.aceilResetCeCatalogV2=function(){if(confirm("Відновити стандартні назви та порядок елементів?")){localStorage.removeItem(KEY);location.reload()}};
var css=document.createElement("style");css.textContent='.rm-double-orient-modal{max-width:310px!important;border-radius:24px!important}.rm-double-orient-head{padding:16px 18px 8px!important}.rm-double-orient-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 18px 18px}.rm-double-orient-btn{height:78px;border:1px solid #dbe4ef;background:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(15,23,42,.06)}.rm-double-orient-btn:active{transform:scale(.97);background:#f8fafc}.rm-double-icon{display:flex;gap:5px;align-items:center;justify-content:center}.rm-double-icon.vertical{flex-direction:column}.rm-double-icon i{display:block;width:22px;height:22px;border:2.5px solid #2563eb;border-radius:50%;position:relative}.rm-double-icon i:after{content:"";position:absolute;width:5px;height:5px;border-radius:50%;background:#2563eb;left:50%;top:50%;transform:translate(-50%,-50%)}.aceil-cat-tools{position:absolute;right:8px;top:7px;z-index:5;display:flex;gap:4px}.aceil-cat-tools button{width:30px;height:30px;border:1px solid #dbe4ef;border-radius:9px;background:#fff;color:#334155;font-weight:800}.rm-ce-edit-mode .rm-ce-card{padding-right:108px!important}@media(max-width:600px){.rm-double-orient-modal{max-width:286px!important}.rm-double-orient-btn{height:70px}.rm-double-icon i{width:20px;height:20px}}';document.head.appendChild(css);
var obs=new MutationObserver(schedule);obs.observe(document.body||document.documentElement,{childList:true,subtree:true});
setTimeout(apply,400);
})();
