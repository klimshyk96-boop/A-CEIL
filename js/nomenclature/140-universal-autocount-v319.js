
(function(){
"use strict";
if(window.__rmUniversalAutocountV319)return;
window.__rmUniversalAutocountV319=true;

function norm(v){
  return String(v==null?"":v).toLowerCase()
    .replace(/[’'`"]/g,"")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .replace(/\s+/g," ").trim();
}
function esc(v){
  return String(v==null?"":v).replace(/[&<>"']/g,function(ch){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
  });
}
function getLightTypes(){
  try{if(Array.isArray(window.lightTypes))return window.lightTypes.slice()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{var a=JSON.parse(localStorage.getItem("lightTypes_v1")||"[]");return Array.isArray(a)?a:[]}catch(_){return[]}
}
function getLightMarks(){
  try{if(typeof lightMarks!=="undefined"&&Array.isArray(lightMarks))return lightMarks}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.lightMarks)?window.lightMarks:[];
}
function getWallMarks(){
  try{if(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks))return wallMarks}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.wallMarks)?window.wallMarks:[];
}
function getWallPresetNames(){
  var out=[],seen={};
  function add(v){
    var label=String(v&&typeof v==="object"?(v.name||v.title||v.label||""):v||"").trim();
    var k=norm(label);if(!k||seen[k])return;seen[k]=1;out.push(label);
  }
  try{
    if(typeof window.rwe2WallPresetRead==="function"){
      var a=window.rwe2WallPresetRead();if(Array.isArray(a))a.forEach(add);
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  ["A·CEIL_wall_presets_v32","wallElementPresets_v1"].forEach(function(key){
    try{var a=JSON.parse(localStorage.getItem(key)||"[]");if(Array.isArray(a))a.forEach(add)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  });
  return out;
}
function wallProfileColor(m){
  if(!m)return "";
  if(m.profileColor==="white"||m.profileColor==="black")return m.profileColor;
  var n=norm(m.type||m.name||m.title||"");
  if(/(^| )біл/.test(n))return "white";
  if(/(^| )чорн/.test(n))return "black";
  return "";
}
function colorFromName(name){
  var n=norm(name);
  if(/(^| )біл/.test(n))return "white";
  if(/(^| )чорн/.test(n))return "black";
  return "";
}
function stripColorWords(name){
  return norm(name)
    .split(" ")
    .filter(function(w){return !/^біл/.test(w)&&!/^чорн/.test(w)})
    .join(" ");
}
function wallColorSource(label,color){
  return "walltypecolor:"+color+":"+encodeURIComponent(label);
}
function getLinear(){
  try{if(typeof linearElements!=="undefined"&&Array.isArray(linearElements))return linearElements}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.linearElements)?window.linearElements:[];
}
function getElemItems(){
  try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemItems)?window.elemItems:[];
}
function linearTypeLabel(el){
  var key=String(el&&el.elementType||"");
  var labels={
    lightLine:"Світлова лінія",
    magneticTrack:"Магнітний трек",
    surfaceTrack:"Накладний трек",
    custom:"Інший"
  };
  return labels[key]||String(el&&el.label||el&&el.name||key);
}
function dynamicSources(){
  var out=[];
  getLightTypes().forEach(function(t){
    if(!t||!t.id||!String(t.label||"").trim())return;
    out.push({
      key:"lighttype:"+String(t.id),
      label:String(t.label)+" (кількість)",
      icon:String(t.icon||"◉"),
      unit:"шт"
    });
  });

  var seenWall={};
  function addWallSources(label){
    label=String(label||"").trim();
    var nk=norm(label);if(!nk||seenWall[nk])return;seenWall[nk]=1;
    /* Загальний варіант залишаємо для сумісності та елементів без кольору. */
    out.push({key:"walltype:"+encodeURIComponent(label),label:label+" — всі кольори",icon:"━",unit:"м"});
    /* v3.33: одна заготовка -> окремі джерела за вибраним кольором профілю. */
    out.push({key:wallColorSource(label,"white"),label:label+" — Білий",icon:"⚪",unit:"м"});
    out.push({key:wallColorSource(label,"black"),label:label+" — Чорний",icon:"⚫",unit:"м"});
  }
  getWallPresetNames().forEach(addWallSources);
  /* Типи, які є на плані, теж лишаються доступними, навіть якщо заготовку видалили. */
  getWallMarks().forEach(function(m){
    addWallSources(String(m&&m.type||m&&m.name||m&&m.title||"").trim());
  });

  var seenLinear={};
  getLinear().forEach(function(el){
    var key=String(el&&el.elementType||"custom");
    var label=linearTypeLabel(el);
    var sk=key+"|"+norm(label); if(seenLinear[sk])return; seenLinear[sk]=1;
    out.push({key:"lineartype:"+encodeURIComponent(key),label:label+" (довжина)",icon:"▱",unit:"м"});
  });
  return out;
}
function computeSource(source){
  source=String(source||"");
  if(source==="ventilation"){
    return {
      qty:getLightMarks().filter(function(m){
        var id=String(m&&m.type||"").toLowerCase();
        return id==="vent"||id==="exhaust"||id==="hood";
      }).length,
      unit:"шт"
    };
  }
  if(source.indexOf("lighttype:")===0){
    var id=source.slice(10);
    return {qty:getLightMarks().filter(function(m){return String(m&&m.type||"")===id}).length,unit:"шт"};
  }
  if(source.indexOf("walltypecolor:")===0){
    var rest=source.slice(14),sep=rest.indexOf(":");
    if(sep<0)return null;
    var color=rest.slice(0,sep),label="";
    try{label=decodeURIComponent(rest.slice(sep+1))}catch(_){label=rest.slice(sep+1)}
    var n=norm(label),cm=0;
    getWallMarks().forEach(function(m){
      var ml=norm(m&&m.type||m&&m.name||m&&m.title||"");
      if(ml===n&&wallProfileColor(m)===color)cm+=Number(m&&m.lenCm)||0;
    });
    return {qty:Math.round(cm)/100,unit:"м"};
  }
  if(source.indexOf("walltype:")===0){
    var label="";try{label=decodeURIComponent(source.slice(9))}catch(_){label=source.slice(9)}
    var n=norm(label),cm=0;
    getWallMarks().forEach(function(m){
      var ml=norm(m&&m.type||m&&m.name||m&&m.title||"");
      if(ml===n)cm+=Number(m&&m.lenCm)||0;
    });
    return {qty:Math.round(cm)/100,unit:"м"};
  }
  if(source.indexOf("lineartype:")===0){
    var key="";try{key=decodeURIComponent(source.slice(11))}catch(_){key=source.slice(11)}
    var cm=0;
    getLinear().forEach(function(el){
      if(String(el&&el.elementType||"")!==key)return;
      var v=Number(el&&el.totalLengthCm);
      if(!isFinite(v)||v<=0){
        v=(Array.isArray(el&&el.segments)?el.segments:[]).reduce(function(s,x){return s+(Number(x)||0)},0);
      }
      cm+=v||0;
    });
    return {qty:Math.round(cm)/100,unit:"м"};
  }
  return null;
}
function exactAutoSourceForName(name){
  var n=norm(name); if(!n)return null;

  var matches=[];
  getLightTypes().forEach(function(t){
    if(t&&norm(t.label)===n)matches.push({source:"lighttype:"+String(t.id),unit:"шт"});
  });

  var wallNames={};
  getWallPresetNames().forEach(function(label){if(label)wallNames[label]=1;});
  getWallMarks().forEach(function(m){
    var label=String(m&&m.type||m&&m.name||m&&m.title||"").trim();
    if(label)wallNames[label]=1;
  });
  var wantedColor=colorFromName(name),wantedBase=stripColorWords(name);
  Object.keys(wallNames).forEach(function(label){
    if(wantedColor){
      if(stripColorWords(label)===wantedBase){
        matches.push({source:wallColorSource(label,wantedColor),unit:"м"});
      }
    }else if(norm(label)===n){
      matches.push({source:"walltype:"+encodeURIComponent(label),unit:"м"});
    }
  });

  var linearKeys={};
  getLinear().forEach(function(el){
    var label=linearTypeLabel(el);
    if(norm(label)===n){
      var key=String(el&&el.elementType||"custom");
      linearKeys[key]=1;
    }
  });
  Object.keys(linearKeys).forEach(function(key){
    matches.push({source:"lineartype:"+encodeURIComponent(key),unit:"м"});
  });

  return matches.length===1?matches[0]:null;
}
function applyUniversal(opts){
  opts=opts||{};
  var changed=0;
  getElemItems().forEach(function(it){
    if(!it)return;
    if(it.manualQtyOverride===true)return;
    var src=String(it.source||"");
    var dynamic=computeSource(src);
    if(dynamic){
      it.qty=dynamic.qty;
      it.unit=dynamic.unit;
      it.autoFilled=true;
      it.autoZero=!(Number(dynamic.qty)>0);
      it.universalAuto=true;
      changed++;
      return;
    }
    if(src)return; // explicit old source has priority

    var auto=exactAutoSourceForName(it.name);
    if(!auto)return;
    var val=computeSource(auto.source);
    if(!val)return;
    it.qty=val.qty;
    it.unit=val.unit;
    it.autoFilled=true;
    it.autoZero=!(Number(val.qty)>0);
    it.universalAuto=true;
    it.autoMatchedSource=auto.source;
    changed++;
  });

  if(changed){
    try{if(typeof renderElemList==="function")renderElemList()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    if(!opts.noSave){try{if(typeof saveState==="function")saveState()}catch(_){window.__diagSilent&&window.__diagSilent(_)}}
  }
  return changed;
}
window.rmUniversalAutoCountV319=applyUniversal;

/* Existing AutoFill button also applies all dynamic sources. */
var prevAuto=window.autoFillNomenclature||(typeof autoFillNomenclature==="function"?autoFillNomenclature:null);
if(typeof prevAuto==="function"){
  window.autoFillNomenclature=function(){
    var r=prevAuto.apply(this,arguments);
    applyUniversal({noSave:false});
    return r;
  };
  try{autoFillNomenclature=window.autoFillNomenclature}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* Add dynamic sources to the manual source selector whenever an item is edited. */
function fillEditDynamicSources(){
  var sel=document.getElementById("editElemSource");if(!sel)return;
  Array.prototype.slice.call(sel.querySelectorAll("optgroup[data-v319]")).forEach(function(x){x.remove()});
  var srcs=dynamicSources(); if(!srcs.length)return;
  var group=document.createElement("optgroup");
  group.label="Елементи з плану";
  group.setAttribute("data-v319","1");
  srcs.forEach(function(s){
    var o=document.createElement("option");o.value=s.key;o.textContent=s.icon+" "+s.label;group.appendChild(o);
  });
  sel.appendChild(group);
}
var prevOpenEdit=window.openEditElemModal||(typeof openEditElemModal==="function"?openEditElemModal:null);
if(typeof prevOpenEdit==="function"){
  window.openEditElemModal=function(id){
    fillEditDynamicSources();
    var r=prevOpenEdit.apply(this,arguments);
    var items=getElemItems(),it=items.find(function(x){return x&&x.id===id});
    var sel=document.getElementById("editElemSource");
    if(sel&&it&&it.source)sel.value=it.source;
    return r;
  };
  try{openEditElemModal=window.openEditElemModal}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* Quick-source menu gets the same dynamic sources. */
var prevQuick=window.openQuickSourceMenu||(typeof openQuickSourceMenu==="function"?openQuickSourceMenu:null);
if(typeof prevQuick==="function"){
  window.openQuickSourceMenu=function(id){
    var r=prevQuick.apply(this,arguments);
    var list=document.getElementById("quickSourceList");if(!list)return r;
    var it=getElemItems().find(function(x){return x&&x.id===id}),current=String(it&&it.source||"");
    var srcs=dynamicSources();
    if(srcs.length){
      var sep=document.createElement("div");
      sep.style.cssText="font-size:10px;font-weight:950;color:#94a3b8;margin:7px 3px 2px;text-transform:uppercase;letter-spacing:.05em";
      sep.textContent="Елементи з плану";
      list.appendChild(sep);
      srcs.forEach(function(s){
        var b=document.createElement("button");
        b.type="button";
        b.className="qs-btn"+(current===s.key?" active":"");
        b.dataset.aceilSource=s.key;
        b.dataset.aceilDynamic="1";
        b.innerHTML="<span>"+esc(s.icon)+" "+esc(s.label)+"</span>"+(current===s.key?'<span class="qs-check">✓</span>':"");
        b.addEventListener("click",function(){
          var item=getElemItems().find(function(x){return x&&x.id===id});
          if(item){
            item.source=s.key;
            var v=computeSource(s.key);
            if(v){item.qty=v.qty;item.unit=v.unit;item.autoFilled=true;item.autoZero=!(Number(v.qty)>0)}
          }
          try{if(typeof closeModal==="function")closeModal("quickSourceModal")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
          applyUniversal();
        });
        list.appendChild(b);
      });
    }
    return r;
  };
  try{openQuickSourceMenu=window.openQuickSourceMenu}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

/* When a new custom ceiling element is created, bind same-named nomenclature rows immediately. */
var prevSaveNew=window.rmSaveNewCeilingElementV318;
if(typeof prevSaveNew==="function"){
  window.rmSaveNewCeilingElementV318=function(){
    var name=String(document.getElementById("rmNceNameV318")&&document.getElementById("rmNceNameV318").value||"").trim();
    var before=getLightTypes().map(function(t){return String(t.id)});
    var r=prevSaveNew.apply(this,arguments);
    var after=getLightTypes(),created=after.find(function(t){return before.indexOf(String(t.id))<0&&norm(t.label)===norm(name)});
    if(created){
      getElemItems().forEach(function(it){
        if(it&&!it.source&&norm(it.name)===norm(created.label)){
          it.source="lighttype:"+String(created.id);
          it.unit="шт";
        }
      });
      applyUniversal();
    }
    return r;
  };
}

/* Recalculate after common plan changes without changing manual quantities. */
var guard=false;
function schedule(){
  if(guard)return;
  clearTimeout(window.__rmV319Timer);
  window.__rmV319Timer=setTimeout(function(){
    guard=true;
    try{applyUniversal({noSave:true})}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    guard=false;
  },60);
}
var oldBadge=window.updateLightBadge;
if(typeof oldBadge==="function"){
  window.updateLightBadge=function(){var r=oldBadge.apply(this,arguments);schedule();return r};
  try{updateLightBadge=window.updateLightBadge}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
/* v3.25: НЕ перемальовуємо номенклатуру на кожен draw().
   Автопідрахунок точок запускається через updateLightBadge, а ручний ввід більше не втрачає фокус. */
setTimeout(function(){applyUniversal({noSave:true})},300);
})();
