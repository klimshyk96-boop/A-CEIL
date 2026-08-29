
(function(){
"use strict";
function parseMaybe(s){try{return typeof s==="string"?JSON.parse(s):s;}catch(e){return null;}}
function collect(obj,groups,items,depth,seen){
  if(obj==null||typeof obj!=="object"||depth>8)return;
  if(seen.indexOf(obj)>=0)return; seen.push(obj);
  if(Array.isArray(obj)){for(var i=0;i<obj.length;i++)collect(obj[i],groups,items,depth+1,seen);return;}
  if(Array.isArray(obj.elemGroups))obj.elemGroups.forEach(function(g){if(g&&g.id!=null)groups.push(g);});
  if(Array.isArray(obj.elemItems))obj.elemItems.forEach(function(it){if(it&&typeof it==="object")items.push(it);});
  for(var k in obj){if(!Object.prototype.hasOwnProperty.call(obj,k))continue;var v=obj[k];if(v&&typeof v==="object")collect(v,groups,items,depth+1,seen);}
}
/* Підняти всю номенклатуру з локальних станів (ceiling_v18 + усі проєкти/кімнати) у живий elemItems/elemGroups. Лише додає відсутнє; наявне не чіпає. */
window.rmRaiseNomenclature=function(opts){
  try{
    if(typeof elemItems==="undefined"||typeof elemGroups==="undefined")return 0;
    var gAll=[],iAll=[],seen=[];
    try{collect(parseMaybe(localStorage.getItem("ceiling_v18")),gAll,iAll,0,seen);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{var list=(typeof projects==="function")?projects():[];collect(list,gAll,iAll,0,seen);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    var haveG={};elemGroups.forEach(function(g){if(g&&g.id!=null)haveG[g.id]=true;});
    var addedG=0;
    gAll.forEach(function(g){if(g&&g.id!=null&&!haveG[g.id]){haveG[g.id]=true;elemGroups.push({id:g.id,name:g.name||"Група",collapsed:!!g.collapsed});addedG++;}});
    function keyOf(it){return it.id!=null?("#"+it.id):("n:"+String(it.name||"").trim().toLowerCase()+"|u:"+(it.unit||"")+"|g:"+(it.groupId==null?"":it.groupId));}
    var haveI={};elemItems.forEach(function(it){if(it)haveI[keyOf(it)]=true;});
    var addedI=0;
    iAll.forEach(function(it){
      if(!it)return;var k=keyOf(it);if(haveI[k])return;haveI[k]=true;
      var c;try{c=JSON.parse(JSON.stringify(it));}catch(e){return;}
      if(!c.unit)c.unit="\u0448\u0442";if(c.groupId===undefined)c.groupId=null;if(c.price===undefined)c.price=0;if(!c.inputMode)c.inputMode="manual";if(!c.icon)c.icon="\ud83d\udce6";
      elemItems.push(c);addedI++;
    });
    try{window.elemItems=elemItems;window.elemGroups=elemGroups;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    if(addedG||addedI){
      try{if(document.getElementById("elemList")&&typeof renderElemList==="function")renderElemList();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try{if(typeof saveState==="function")saveState();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    }
    if(opts&&opts.toast){try{if(typeof showToast==="function")showToast("\u2705 \u041d\u043e\u043c\u0435\u043d\u043a\u043b\u0430\u0442\u0443\u0440\u0443 \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043e: +"+addedI+" \u043f\u043e\u0437., +"+addedG+" \u0433\u0440\u0443\u043f");}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
    return addedI+addedG;
  }catch(e){return 0;}
};
function raiseOnce(){try{if(localStorage.getItem("A·CEIL_nomen_raised_v2")==="1")return;window.rmRaiseNomenclature({toast:true});localStorage.setItem("A·CEIL_nomen_raised_v2","1");}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
if(document.readyState==="complete")setTimeout(raiseOnce,1200);
else window.addEventListener("load",function(){setTimeout(raiseOnce,1200);},{once:true});
})();
