(function(){
"use strict";
if(window.__aceilCeCatalogManagerV1)return;window.__aceilCeCatalogManagerV1=true;
var KEY="aceil_ce_catalog_prefs_v1";
var DEFAULT_LABELS={linear:"Лінійне освітлення",chandelier:"Люстра",spot:"Точкові",double_spot:"Подвійний точковий світильник",vent:"Витяжка",track:"Трекове освітлення"};
function read(){try{var x=JSON.parse(localStorage.getItem(KEY)||"{}");return x&&typeof x==="object"?x:{}}catch(_){return{}}}
function save(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch(_){}}
function keyFor(card){
 var c=card.getAttribute("onclick")||"",id=card.getAttribute("data-custom-ce");
 if(id)return "custom:"+id;if(/rmOpenLinearLighting/.test(c))return"linear";if(/rmStartChandelier/.test(c))return"chandelier";if(/rmStartDoubleSpot/.test(c))return"double_spot";if(/rmStartSpotFlow/.test(c))return"spot";if(/rmCeVent/.test(c))return"vent";if(/rmCeTrack/.test(c))return"track";return"";
}
function syncLightTypeLabel(key,label){
 var id=key.indexOf("custom:")===0?key.slice(7):key;if(id==="linear"||id==="track")return;
 try{var a=Array.isArray(window.lightTypes)?window.lightTypes:JSON.parse(localStorage.getItem("lightTypes_v1")||"[]");if(!Array.isArray(a))return;var t=a.find(function(x){return x&&String(x.id)===id});if(t){t.label=label;localStorage.setItem("lightTypes_v1",JSON.stringify(a));window.lightTypes=a;try{lightTypes=a}catch(_){}}}catch(_){ }
}
window.aceilCatalogLabel=function(key,fallback){var p=read();return p.labels&&p.labels[key]||fallback};
function cards(grid){return Array.prototype.slice.call(grid.children).map(function(w){return w.classList&&w.classList.contains("rm-ce-custom-wrap")?w.querySelector(".rm-ce-card"):w}).filter(function(x){return x&&x.classList.contains("rm-ce-card")})}
function wrapper(card){return card.parentElement&&card.parentElement.classList.contains("rm-ce-custom-wrap")?card.parentElement:card}
function apply(){
 var grid=document.querySelector("#rmLightStartModal .rm-ce-grid");if(!grid)return;var p=read(),list=cards(grid),map={};
 list.forEach(function(card){var k=keyFor(card);if(!k)return;card.dataset.catalogKey=k;map[k]=wrapper(card);var b=card.querySelector("b");if(b&&p.labels&&p.labels[k])b.textContent=p.labels[k]});
 var order=(p.order||[]).filter(function(k){return map[k]});Object.keys(map).forEach(function(k){if(order.indexOf(k)<0)order.push(k)});order.forEach(function(k){grid.appendChild(map[k])});
 if(grid.classList.contains("rm-ce-edit-mode"))decorate(grid);
}
function decorate(grid){
 cards(grid).forEach(function(card){var k=card.dataset.catalogKey||keyFor(card);if(!k)return;var w=wrapper(card);if(w.querySelector(".aceil-cat-tools"))return;w.style.position="relative";var tools=document.createElement("div");tools.className="aceil-cat-tools";tools.innerHTML='<button type="button" data-a="up" title="Вище">↑</button><button type="button" data-a="down" title="Нижче">↓</button><button type="button" data-a="rename" title="Змінити назву">✎</button>';
 tools.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();var a=e.target&&e.target.dataset.a;if(!a)return;if(a==="rename")rename(k,card);else move(k,a==="up"?-1:1)});w.appendChild(tools);
 card.setAttribute("draggable","true");card.addEventListener("dragstart",function(e){e.dataTransfer.setData("text/aceil-catalog",k);e.dataTransfer.effectAllowed="move"});card.addEventListener("dragover",function(e){e.preventDefault()});card.addEventListener("drop",function(e){e.preventDefault();var from=e.dataTransfer.getData("text/aceil-catalog");if(from&&from!==k)dropBefore(from,k)});
 });
}
function currentOrder(){var grid=document.querySelector("#rmLightStartModal .rm-ce-grid");return grid?cards(grid).map(function(c){return c.dataset.catalogKey||keyFor(c)}).filter(Boolean):[]}
function setOrder(o){var p=read();p.order=o;save(p);apply()}
function move(k,d){var o=currentOrder(),i=o.indexOf(k),j=i+d;if(i<0||j<0||j>=o.length)return;var t=o[i];o[i]=o[j];o[j]=t;setOrder(o)}
function dropBefore(from,to){var o=currentOrder(),a=o.indexOf(from),b=o.indexOf(to);if(a<0||b<0)return;o.splice(a,1);b=o.indexOf(to);o.splice(b,0,from);setOrder(o)}
function rename(k,card){var b=card.querySelector("b"),cur=b?b.textContent:(DEFAULT_LABELS[k]||"");var v=prompt("Нова назва елемента:",cur);if(v==null)return;v=String(v).trim();if(!v)return;var p=read();p.labels=p.labels||{};p.labels[k]=v;save(p);syncLightTypeLabel(k,v);apply()}
window.aceilResetCeCatalogV1=function(){if(!confirm("Відновити стандартні назви та порядок елементів?"))return;localStorage.removeItem(KEY);location.reload()};
var css=document.createElement("style");css.textContent='\
.rm-double-orient-modal{max-width:310px!important;border-radius:24px!important}.rm-double-orient-head{padding:16px 18px 8px!important}.rm-double-orient-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 18px 18px}.rm-double-orient-btn{height:78px;border:1px solid #dbe4ef;background:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(15,23,42,.06)}.rm-double-orient-btn:active{transform:scale(.97);background:#f8fafc}.rm-double-icon{display:flex;gap:5px;align-items:center;justify-content:center}.rm-double-icon.vertical{flex-direction:column}.rm-double-icon i{display:block;width:22px;height:22px;border:2.5px solid #2563eb;border-radius:50%;position:relative}.rm-double-icon i:after{content:"";position:absolute;width:5px;height:5px;border-radius:50%;background:#2563eb;left:50%;top:50%;transform:translate(-50%,-50%)}.aceil-cat-tools{position:absolute;right:8px;top:7px;z-index:5;display:flex;gap:4px}.aceil-cat-tools button{width:30px;height:30px;border:1px solid #dbe4ef;border-radius:9px;background:#fff;color:#334155;font-weight:800;box-shadow:0 2px 7px rgba(15,23,42,.08)}.rm-ce-edit-mode .rm-ce-card{padding-right:108px!important}.rm-ce-edit-mode .rm-ce-custom-wrap .rm-ce-card{padding-right:108px!important}@media(max-width:600px){.rm-double-orient-modal{max-width:286px!important}.rm-double-orient-btn{height:70px}.rm-double-icon i{width:20px;height:20px}.aceil-cat-tools{right:6px;top:6px}.aceil-cat-tools button{width:28px;height:28px}}';document.head.appendChild(css);
var obs=new MutationObserver(function(){apply()});obs.observe(document.documentElement,{childList:true,subtree:true});
var old=window.rmRenderCeilingElementsV318;if(typeof old==="function"){window.rmRenderCeilingElementsV318=function(){var r=old.apply(this,arguments);setTimeout(apply,0);return r}}
setTimeout(apply,300);
})();
