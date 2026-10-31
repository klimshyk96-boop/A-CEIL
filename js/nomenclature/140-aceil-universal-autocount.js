
(function(){
"use strict";
if(window.__rmUniversalAutocountV319)return;
window.__rmUniversalAutocountV319=true;

/* Names repeat across profile/insert/corner matching in the same calculation.
   Cache strings, not item results: renaming or editing a source stays immediate. */
var normalizedNames=new Map();
function norm(v){
  var text=String(v==null?"":v);
  if(normalizedNames.has(text))return normalizedNames.get(text);
  var value=text.toLowerCase()
    .replace(/[’'`"]/g,"")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .replace(/\s+/g," ").trim();
  if(normalizedNames.size>=1024)normalizedNames.clear();
  normalizedNames.set(text,value);
  return value;
}
function esc(v){
  return String(v==null?"":v).replace(/[&<>"']/g,function(ch){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
  });
}
function autoCountEnabled(){
  try{
    return !window.A_CEIL_AutoCount||typeof window.A_CEIL_AutoCount.isEnabled!=="function"||window.A_CEIL_AutoCount.isEnabled();
  }catch(_){return true}
}
function getLightTypes(){
  try{if(typeof lightTypes!=="undefined"&&Array.isArray(lightTypes))return lightTypes.slice()}catch(_){}
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
function sameWallType(actual,expected){
  var a=norm(actual),e=norm(expected);
  if(!a||!e)return false;
  if(a===e)return true;
  /* A preset can contain the profile colour in its title while the wall mark
     stores that colour separately in profileColor. */
  return stripColorWords(a)===stripColorWords(e);
}
function wallColorSource(label,color){
  return "walltypecolor:"+color+":"+encodeURIComponent(label);
}
function getLinear(){
  try{if(typeof linearElements!=="undefined"&&Array.isArray(linearElements))return linearElements}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.linearElements)?window.linearElements:[];
}
function getCeilingCornices(){
  return Array.isArray(window.ceilingCornices)?window.ceilingCornices:[];
}
function ceilingCorniceLengthM(profileName,color){
  var wanted=norm(profileName||""),wantedColor=String(color||"").toLowerCase(),cm=0;
  getCeilingCornices().forEach(function(item){
    if(!item)return;
    var profile=norm(item.profileName||"UNO");
    if(wanted&&profile!==wanted)return;
    if(wantedColor&&String(item.color||"white").toLowerCase()!==wantedColor)return;
    var saved=Number(item.totalLengthM);
    if(isFinite(saved)&&saved>0)cm+=saved*100;
    else cm+=(Number(item.lengthA)||0)+(item.shape==="L"?(Number(item.lengthB)||0):0);
  });
  return Math.round(cm)/100;
}
function ceilingCorniceCornerCount(profileName){
  var wanted=norm(profileName||""),count=0;
  getCeilingCornices().forEach(function(item){
    if(!item)return;var profile=norm(item.profileName||"UNO");if(wanted&&profile!==wanted)return;
    var manual=Number(item.cornerCount);
    if(item.cornerCount!=null&&isFinite(manual)&&manual>=0)count+=manual;
    else if(item.shape==="L")count+=1;else if(item.shape==="U")count+=2;
  });
  return count;
}
function ceilingCorniceBreakCount(profileName){
  var wanted=norm(profileName||""),count=0;
  getCeilingCornices().forEach(function(item){
    if(!item)return;var profile=norm(item.profileName||"UNO");if(wanted&&profile!==wanted)return;
    /* Для стельового UNO обидва кінці завжди є технологічними обривами. */
    count+=2;
  });
  return count;
}
function wallCorniceBreakCount(){
  var count=0,marks=getWallMarks();
  marks.forEach(function(m){
    if(!m||norm(m.type||m.name||m.title||"").indexOf("карниз")<0)return;
    if(m.forceBreaks===true){count+=2;return;}
    var side=Number(m.sideIndex)||0,sideLen=0;
    try{sideLen=typeof _sideLenCm==="function"?Number(_sideLenCm(side))||0:(Array.isArray(lengths)?Number(lengths[side])||0:0)}catch(_){sideLen=0}
    if(!(sideLen>0)){count+=2;return;}
    var tolerance=Math.max(1,sideLen*.003),start=Number(m.offsetCm)||0,end=start+(Number(m.lenCm)||0);
    if(start>tolerance)count++;
    if(end<sideLen-tolerance)count++;
  });
  return count;
}
function getElemItems(){
  try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return Array.isArray(window.elemItems)?window.elemItems:[];
}
function linearTypeLabel(el){
  var key=String(el&&el.elementType||"");
  try{
    var registry=window.A_CEIL_LinearTypes;
    if(registry&&typeof registry.label==="function"){
      var registered=registry.label(key);
      if(registered)return registered;
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var labels={
    lightLine:"Світлова лінія",
    magneticTrack:"Магнітний шинопровід",
    surfaceTrack:"Накладний шинопровід",
    recessedTrack:"Вмонтований шинопровід",
    custom:"Інший"
  };
  return labels[key]||String(el&&el.label||el&&el.name||key);
}
function dynamicSources(){
  var out=[];
  out.push({key:"ceilingcornice:uno",label:"Карниз UNO (за вибраним кольором)",icon:"⌜",unit:"м"});
  out.push({key:"ceilingcornicecorners:uno",label:"Кути UNO (кількість)",icon:"⌞",unit:"шт"});
  out.push({key:"ceilingcornicebreaks:uno",label:"Обриви UNO (кількість)",icon:"✂️",unit:"шт"});
  out.push({key:"lineartrack:fixtures",label:"Трековий світильник (кількість)",icon:"◉",unit:"шт"});
  out.push({key:"lineartrack:corners",label:"Кут трека (кількість)",icon:"⌞",unit:"шт"});
  getLightTypes().forEach(function(t){
    if(!t||!t.id||/^(linear_|ceiling_bathroomCornice$)/.test(String(t.id))||!String(t.label||"").trim())return;
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

  if(typeof window.linearSourceOptions==='function')out=out.concat(window.linearSourceOptions());
  /* Custom legacy linear types remain available without mixing the four lighting families. */
  if(getLinear().some(function(el){return el&&el.elementType==='custom';}))
    out.push({key:'lineartype:custom',label:'Інший лінійний елемент — довжина',icon:'━',unit:'м'});
  return out;
}
// This choice lives in the current room's nomenclature copy. Aluminium is the
// normal default. A full shadow/floating contour is also inferred after
// AutoFill when it replaces the full perimeter and the base row becomes zero.
function contourPerimeterM(state){
  var curve=window.A·CEILCurveGeometryV306&&window.A·CEILCurveGeometryV306.measureState(state);
  if(curve)return curve.perimeterCm/100;
  if(state&&typeof state==="object"){
    if(state.circleMode&&Number(state.circleDiamCm)>0)return Math.PI*Number(state.circleDiamCm)/100;
    if(Array.isArray(state.lengths)&&state.lengths.length)return state.lengths.reduce(function(sum,value){return sum+(Number(value)||0)},0)/100;
  }
  try{
    if(typeof circleMode!=="undefined"&&circleMode&&typeof circleDiamCm!=="undefined"&&circleDiamCm>0)return Math.PI*circleDiamCm/100;
    if(typeof lengths!=="undefined"&&Array.isArray(lengths)&&lengths.length)return lengths.reduce(function(sum,value){return sum+(Number(value)||0)},0)/100;
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{var value=parseFloat(String(document.getElementById("per")&&document.getElementById("per").textContent||"0").replace(",","."));return isFinite(value)?value:0}catch(_){return 0}
}
function contourSourceOfItem(item){
  var source=String(item&&(item.source||item.autoMatchedSource)||'');
  if(/^(main_profile|shadow_profile|floating_profile|corners|shadow_corners|floating_corners)$/.test(source))return source;
  var label=!source&&item?String(item.name||''):'';
  if(source==='full_perimeter'&&item)label=String(item.name||'');
  if(source.indexOf('walltype:')===0)label=source.slice(9);
  else if(source.indexOf('walltypecolor:')===0){var rest=source.slice(14),colon=rest.indexOf(':');if(colon>=0)label=rest.slice(colon+1);}
  try{label=decodeURIComponent(label);}catch(_){}
  label=norm(label);
  if(/обрив|демонтаж/.test(label))return '';
  var corner=/кут/.test(label),family=label.indexOf('тіньов')>=0?'shadow':label.indexOf('парящ')>=0?'floating':'';
  if(family)return corner?family+'_corners':(!item.unit||/^(м|м.п.)$/.test(item.unit)?family+'_profile':'');
  if(corner)return /базов|класич/.test(label)||/^фіксаці[яї] кут(ів|а)$/.test(label)?'corners':'';
  if(/^(профіль (h|н)( |$)|профіль базов|базов.*профіль|алюмінієв.*профіль (h|н)( |$))/.test(label))return 'main_profile';
  return '';
}
function explicitContourProfile(list,draft){
  /* Aluminium is the remainder of the contour, not an overriding "whole
     contour" choice. Older saved rooms can still contain
     fullContourSelected=true on the main profile. Ignoring that stale flag is
     essential: otherwise a shadow/floating wall is never subtracted from the
     aluminium profile or from the insert. Only a special profile may replace
     the whole contour explicitly. */
  if(draft&&draft.fullContourSelected&&/^(shadow_profile|floating_profile)$/.test(contourSourceOfItem(draft)))return draft;
  return list.find(function(it){return it&&it.fullContourSelected&&/^(shadow_profile|floating_profile)$/.test(contourSourceOfItem(it))})||null;
}
function inferredContourProfile(list,state){
  var perimeter=contourPerimeterM(state);if(!(perimeter>0))return null;
  var baseRows=list.filter(function(it){return it&&contourSourceOfItem(it)==="main_profile"});
  var base=baseRows.reduce(function(sum,it){return sum+(Number(it.qty)||0)},0);
  if(base>.01)return null;
  /* H was zeroed by hand: that is an explicit decision, so a special profile
     that already holds the whole perimeter is the contour even when its row
     lost the manual flag (older saves, reopen, cloud restore). */
  var baseManualZero=baseRows.some(function(it){return it.manualQtyOverride===true});
  var marks=state&&Array.isArray(state.wallMarks)?state.wallMarks:getWallMarks();
  var hasProfileMarks=marks.some(function(m){
    var source=String(m&&m.profileSource||m&&m.autoCountSource||"");
    var name=norm(m&&m.type||m&&m.name||m&&m.title||"");
    return /^(shadow_profile|floating_profile)$/.test(source)||name.indexOf("тіньов")>=0||name.indexOf("парящ")>=0;
  });
  var families=["shadow_profile","floating_profile"].map(function(source){
    var rows=list.filter(function(it){return it&&contourSourceOfItem(it)===source}),total=rows.reduce(function(sum,it){return sum+(Number(it.qty)||0)},0),keyword=source==="shadow_profile"?"тіньов":"парящ";
    var marked=marks.filter(function(m){return m&&norm(m.type||m.name||m.title).indexOf(keyword)>=0}).reduce(function(sum,m){return sum+(Number(m.lenCm)||0)},0)/100;
    return {total:total,marked:marked,manual:rows.some(function(it){return it.manualQtyOverride===true}),positive:rows.filter(function(it){return Number(it.qty)>0;}).length,item:rows.sort(function(a,b){return (Number(b.qty)||0)-(Number(a.qty)||0)})[0]};
  }).filter(function(entry){
    var tolerance=Math.max(.02,perimeter*.002);
    /* A manual full-perimeter quantity identifies an unmarked contour.
       Once even one wall is marked, the
       wall geometry is authoritative. This prevents a stale manual 12 m row
       from turning a new 3 m shadow wall into a full shadow contour. */
    return entry.item&&entry.positive===1&&Math.abs(entry.total-perimeter)<=tolerance&&(
      Math.abs(entry.marked-perimeter)<=tolerance||(!hasProfileMarks&&(entry.manual||baseManualZero))
    );
  });
  return families.length===1?families[0].item:null;
}

function profileFamilyOfMark(mark){
  if(!mark)return "";
  var source=String(mark.profileSource||mark.autoCountSource||"");
  if(source==="shadow_profile"||source==="floating_profile")return source;
  var name=norm(mark.type||mark.name||mark.title||"");
  if(name.indexOf("тіньов")>=0)return "shadow_profile";
  if(name.indexOf("парящ")>=0)return "floating_profile";
  return "";
}
function profileVariantOfItem(item){
  var variant=String(item&&item.sourceVariant||"");
  if(!variant&&item&&String(item.source||"").indexOf("walltypecolor:")===0)variant=String(item.source).slice(14).split(":")[0];
  return variant==="white"||variant==="black"?variant:colorFromName(item&&item.name||"");
}
function profileMarksFor(family,variant,ctx){
  var marks=ctx&&Array.isArray(ctx.marksWall)?ctx.marksWall:getWallMarks();
  return marks.filter(function(mark){
    return profileFamilyOfMark(mark)===family&&(!variant||wallProfileColor(mark)===variant);
  });
}
function currentSideLengths(ctx){
  if(ctx&&Array.isArray(ctx.lengths))return ctx.lengths;
  try{if(typeof lengths!=="undefined"&&Array.isArray(lengths))return lengths}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return [];
}
function currentCornersTotal(ctx){
  if(ctx&&ctx.cornersTotal!=null&&isFinite(Number(ctx.cornersTotal)))return Math.max(0,Number(ctx.cornersTotal));
  try{if(typeof circleMode!=="undefined"&&circleMode)return 0}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    if(typeof closed!=="undefined"&&closed&&typeof pts!=="undefined"&&Array.isArray(pts))return pts.length;
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    var inside=Number(document.getElementById("inCorners")&&document.getElementById("inCorners").textContent)||0;
    var outside=Number(document.getElementById("outCorners")&&document.getElementById("outCorners").textContent)||0;
    if(inside+outside>0)return inside+outside;
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return 0;
}
function mergedProfileLengthCm(marks,ctx){
  var bySide={},loose=0,sideLengths=currentSideLengths(ctx);
  marks.forEach(function(mark){
    var len=Math.max(0,Number(mark&&mark.lenCm)||0);if(!(len>0))return;
    var side=Number(mark.sideIndex);
    if(!isFinite(side)||side<0){loose+=len;return;}
    var sideLen=Math.max(0,Number(sideLengths[side])||0),start=Math.max(0,Number(mark.offsetCm)||0),end=start+len;
    if(sideLen>0){start=Math.min(start,sideLen);end=Math.min(Math.max(start,end),sideLen);}
    (bySide[side]||(bySide[side]=[])).push([start,end]);
  });
  Object.keys(bySide).forEach(function(side){
    var intervals=bySide[side].sort(function(a,b){return a[0]-b[0]}),start=null,end=null;
    intervals.forEach(function(pair){
      if(start===null){start=pair[0];end=pair[1];return;}
      if(pair[0]<=end+.01){end=Math.max(end,pair[1]);return;}
      loose+=Math.max(0,end-start);start=pair[0];end=pair[1];
    });
    if(start!==null)loose+=Math.max(0,end-start);
  });
  return loose;
}
function profileCornerSet(marks,ctx){
  var set={},sideLengths=currentSideLengths(ctx),total=currentCornersTotal(ctx);
  marks.forEach(function(mark){
    var side=Number(mark&&mark.sideIndex),sideLen=Math.max(0,Number(sideLengths[side])||0);
    if(!isFinite(side)||side<0||!(sideLen>0)||!(total>0))return;
    var start=Math.max(0,Number(mark.offsetCm)||0),end=start+Math.max(0,Number(mark.lenCm)||0),tolerance=Math.max(1,sideLen*.003);
    if(start<=tolerance)set[((side%total)+total)%total]=1;
    if(end>=sideLen-tolerance)set[(side+1)%total]=1;
  });
  return set;
}
function mergeCornerSets(target,source){Object.keys(source||{}).forEach(function(key){target[key]=1});return target;}
function profileRowsFor(source){return getElemItems().filter(function(row){return row&&contourSourceOfItem(row)===source&&!row.manualQtyOverride;});}
function profileRowIsChosen(source,item,variant){
  var rows=profileRowsFor(source),colored=rows.filter(function(row){return !!profileVariantOfItem(row);}),pool;
  if(colored.length){
    if(!variant)return false;
    pool=colored.filter(function(row){return profileVariantOfItem(row)===variant;});
  }else pool=rows.filter(function(row){return !profileVariantOfItem(row);});
  return !pool.length||String(pool[0].id)===String(item&&item.id);
}
function insertRowIsChosen(item){
  var rows=getElemItems().filter(function(row){return row&&row.source==="white_insert";});
  if(!rows.length)return true;
  var selected=rows.filter(function(row){return row.insertSelected===true;});
  if(selected.length>1)return false;
  var chosen=selected[0];
  if(!chosen){
    var white=rows.filter(function(row){return profileVariantOfItem(row)==="white";});
    chosen=white.length===1?white[0]:(rows.length===1?rows[0]:null);
  }
  return !!chosen&&String(chosen.id)===String(item&&item.id);
}
function manualInsertExtraCm(ctx){
  var groups={},extra=0;
  getElemItems().forEach(function(row){
    var family=contourSourceOfItem(row);
    if(!row||!row.manualQtyOverride||!(Number(row.qty)>0)||! /^(shadow_profile|floating_profile)$/.test(family))return;
    var variant=profileVariantOfItem(row),key=family+":"+variant;
    if(!groups[key])groups[key]={family:family,variant:variant,cm:0};
    groups[key].cm+=Number(row.qty)*100;
  });
  Object.keys(groups).forEach(function(key){var g=groups[key];if(!profileMarksFor(g.family,g.variant,ctx).length)extra+=g.cm;});
  return extra;
}
function partialContourQty(source,item,ctx){
  var relevant=/^(main_profile|shadow_profile|floating_profile|corners|shadow_corners|floating_corners|white_insert)$/;
  if(!relevant.test(source))return null;
  var perimeterCm=Math.max(0,Number(ctx&&ctx.perimeterCm)||contourPerimeterM()*100),cornersTotal=currentCornersTotal(ctx);
  var shadow=profileMarksFor("shadow_profile","",ctx),floating=profileMarksFor("floating_profile","",ctx),special=shadow.concat(floating);
  var specialCm=Math.min(perimeterCm,mergedProfileLengthCm(special,ctx));
  if(source==="main_profile")return Math.round(Math.max(0,perimeterCm-specialCm))/100;
  if(source==="white_insert")return insertRowIsChosen(item)?Math.round(Math.max(0,perimeterCm-specialCm-manualInsertExtraCm(ctx)))/100:0;
  var family=source.indexOf("shadow_")===0?"shadow_profile":"floating_profile",variant=profileVariantOfItem(item);
  if(source===family){
    if(!profileRowIsChosen(source,item,variant))return 0;
    return Math.round(mergedProfileLengthCm(profileMarksFor(family,variant,ctx),ctx))/100;
  }
  var familyCorners=profileCornerSet(profileMarksFor(family,variant,ctx),ctx);
  if(source===(family==="shadow_profile"?"shadow_corners":"floating_corners")){
    if(!profileRowIsChosen(source,item,variant))return 0;
    return Object.keys(familyCorners).length;
  }
  if(source==="corners"){
    var claimed=mergeCornerSets(profileCornerSet(shadow,ctx),profileCornerSet(floating,ctx));
    return Math.max(0,cornersTotal-Object.keys(claimed).length);
  }
  return null;
}
function presetColorFor(selected,presets,state){
  var source=contourSourceOfItem(selected);
  if(!selected||source==='main_profile')return '#1d1d1f';
  var valid=function(value){return /^#[0-9a-f]{3,8}$/i.test(String(value||''));};
  var preset=presets.find(function(p){return p&&p.name===selected.fullContourPresetName&&valid(p.color);});
  if(preset)return preset.color;
  var keyword=source==='shadow_profile'?'тіньов':'парящ',variant=profileVariantOfItem(selected),marks=state&&Array.isArray(state.wallMarks)?state.wallMarks:getWallMarks();
  var mark=marks.find(function(m){return m&&norm(m.type||m.name||m.title).indexOf(keyword)>=0&&(!variant||wallProfileColor(m)===variant)&&valid(m.color);});
  if(mark)return mark.color;
  var family=presets.filter(function(p){return p&&norm(p.name).indexOf(keyword)>=0&&valid(p.color);});
  // Physical black/white is separate from the colour used to annotate the plan.
  // Prefer a variant preset; an uncoloured family preset applies to both variants.
  preset=variant?(family.find(function(p){return colorFromName(p.name)===variant;})
    ||family.find(function(p){return !colorFromName(p.name);})):family[0];
  return preset&&preset.color||selected.fullContourColor||'#1d1d1f';
}
function activeWholeContourProfile(draft,collection,state){
  var list=Array.isArray(collection)?collection:getElemItems();
  return explicitContourProfile(list,draft)||inferredContourProfile(list,state);
}
function manualContourStyle(list){
  var base=list.filter(function(it){return it&&contourSourceOfItem(it)==='main_profile';});
  if(!base.length||!base.some(function(it){return it.manualQtyOverride===true;})
    ||base.some(function(it){return (Number(it.qty)||0)!==0;}))return null;
  var chosen=list.filter(function(it){return it&&Number(it.qty)>0
    &&/^(shadow_profile|floating_profile)$/.test(contourSourceOfItem(it));});
  var manual=chosen.filter(function(it){return it.manualQtyOverride===true;});
  if(manual.length)chosen=manual;
  else chosen=chosen.filter(function(it){return !it.autoFilled;});
  return chosen.length===1?chosen[0]:null;
}
function contourProfile(draft,collection,state){
  var list=Array.isArray(collection)?collection:getElemItems(),selected=(draft&&draft.fullContourSelected?explicitContourProfile(list,draft):null)||manualContourStyle(list)||explicitContourProfile(list,draft)||inferredContourProfile(list,state),whole=!!selected;
  if(!selected)selected=list.find(function(it){return it&&contourSourceOfItem(it)==="main_profile"})||{id:"__base_aluminium__",source:"main_profile",name:"Базовий алюмінієвий профіль"};
  var presets=typeof window.rwe2WallPresetRead==="function"?window.rwe2WallPresetRead():[];
  presets=Array.isArray(presets)?presets:[];
  var color=presetColorFor(selected,presets,state);
  if(!/^#[0-9a-f]{3,8}$/i.test(color))color="#1d1d1f";
  return {item:selected,source:contourSourceOfItem(selected)||selected.source,color:color,label:selected.name||"Базовий алюмінієвий профіль",whole:whole};
}
window.aceilContourProfile=contourProfile;
window.aceilContourProfileColor=function(){var p=contourProfile();return p?p.color:"#1d1d1f";};
// The ↔ button beside a metre item means "use the whole perimeter". For a
// contour profile it is also the user's explicit profile choice, not merely a
// copied number. Keep that decision in the room state so H, insert and corners
// are reconciled immediately and survive save/reopen.
window.A_CEIL_SelectWholeContourItem=function(item){
  var source=contourSourceOfItem(item),special=/^(shadow_profile|floating_profile)$/.test(source);
  if(!special&&source!=="main_profile")return false;
  var changed=false;
  getElemItems().forEach(function(row){
    if(!row)return;
    var selected=special&&row===item;
    if(!!row.fullContourSelected!==selected){row.fullContourSelected=selected;changed=true;}
  });
  return changed;
};
(function(original){
  if(typeof original!=="function"||original.__contourProfileChoice)return;
  var wrapped=function(itemId){
    var item=getElemItems().find(function(row){return row&&String(row.id)===String(itemId);});
    if(item)window.A_CEIL_SelectWholeContourItem(item);
    return original.apply(this,arguments);
  };
  wrapped.__contourProfileChoice=true;window.setElemFromPerimeter=wrapped;
  try{setElemFromPerimeter=wrapped;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
})(window.setElemFromPerimeter);
window.aceilWholeContourCompute=function(source,item,ctx){
  var selected=(/corners$/.test(source)?manualContourStyle(getElemItems()):null)||activeWholeContourProfile(item),profile=selected?{item:selected,source:contourSourceOfItem(selected)||selected.source}:null,relevant=/^(main_profile|shadow_profile|floating_profile|corners|shadow_corners|floating_corners|white_insert)$/;
  if(!relevant.test(source))return null;
  if(source==="white_insert"&&manualContourStyle(getElemItems()))return 0;
  if(!profile)return partialContourQty(source,item,ctx);
  var circle=typeof circleMode!=="undefined"&&circleMode;
  var ready=circle?typeof circleDiamCm!=="undefined"&&circleDiamCm>0:typeof closed!=="undefined"&&closed&&typeof pts!=="undefined"&&pts.length>=3;
  var per=ready?(circle?Math.PI*circleDiamCm:ctx?ctx.perimeterCm:typeof getProjectPerimeterMeters==="function"?getProjectPerimeterMeters()*100:0):0;
  var count=ready&&!circle?currentCornersTotal(ctx):0;
  if(source==="white_insert")return insertRowIsChosen(item)&&profile.source==="main_profile"?Math.round(per)/100:0;
  if(/_profile$/.test(source))return source===profile.source&&String(item.id)===String(profile.item.id)?Math.round(per)/100:0;
  var cornerSource={main_profile:"corners",shadow_profile:"shadow_corners",floating_profile:"floating_corners"}[profile.source];
  var variant=profileVariantOfItem(profile.item);
  var rows=getElemItems().filter(function(row){return row&&contourSourceOfItem(row)===cornerSource;});
  var chosen=rows.find(function(row){return profileVariantOfItem(row)===variant;})||rows.find(function(row){return !profileVariantOfItem(row);});
  return source===cornerSource&&chosen&&String(chosen.id)===String(item.id)?count:0;
};
// A whole-contour replacement owns H, insert and corner quantities even with
// AutoCount off. The room-only backup field preserves their previous values so
// returning to the ordinary contour is reversible.
window.A_CEIL_ReconcileContourInsert=function(){
  var list=getElemItems(),whole=manualContourStyle(list)||explicitContourProfile(list),suppress=!!whole||list.some(function(row){return row&&row.manualQtyOverride&&Number(row.qty)>0&&/^(shadow_profile|floating_profile)$/.test(contourSourceOfItem(row));}),changed=false;
  list.forEach(function(row){
    if(!row)return;
    var source=row.source==="white_insert"?"white_insert":contourSourceOfItem(row);
    if(source!=="white_insert"&&!/^(main_profile|corners|shadow_corners|floating_corners)$/.test(source))return;
    var active=source==="white_insert"?suppress:!!whole;
    if(active){
      if(!row.contourInsertSuppressed){row.contourInsertSuppressed={qty:Number(row.qty)||0,manual:row.manualQtyOverride===true};changed=true;}
      var qty=source==="main_profile"?0:window.aceilWholeContourCompute(source,row);
      if(Number(row.qty)!==qty){row.qty=qty;changed=true;}
      row.autoZero=!(Number(row.qty)>0);
    }else if(row.contourInsertSuppressed){
      var previous=row.contourInsertSuppressed;delete row.contourInsertSuppressed;
      row.qty=previous.manual?previous.qty:window.aceilWholeContourCompute(source,row);
      row.autoZero=!(Number(row.qty)>0);changed=true;
    }
    if(changed&&typeof document!=="undefined"){
      var el=document.getElementById("emrow_"+row.id),input=el&&el.querySelector(".em-qty-input");
      if(input)input.value=Number(row.qty)>0?row.qty:"";
      if(typeof updateLineTotalDOM==="function")updateLineTotalDOM(row);
    }
  });
  return changed;
};
function computeSource(source,item,linearSummary){
  source=String(source||"");
  var contourQty=window.aceilWholeContourCompute(source,item);
  if(contourQty!==null)return {qty:contourQty,unit:/corners$/.test(source)?"шт":"м"};
  if(typeof window.computeLinearSource==='function'){var linear=window.computeLinearSource(source,null,linearSummary);if(linear)return linear;}
  if(source==="lineartrack:fixtures"||source==="lineartrack:corners"){
    var fixtureCount=0,cornerCount=0;
    getLinear().forEach(function(el){
      var key=String(el&&el.elementType||"");
      if(key!=="magneticTrack"&&key!=="surfaceTrack"&&key!=="recessedTrack")return;
      fixtureCount+=Math.max(0,Math.round(Number(el&&el.trackFixtureCount)||0));
      var corners=Number(el&&el.cornerCount);
      if(!isFinite(corners))corners=Math.max(0,(Array.isArray(el&&el.segments)?el.segments.length:1)-1);
      cornerCount+=Math.max(0,Math.round(corners||0));
    });
    return {qty:source==="lineartrack:fixtures"?fixtureCount:cornerCount,unit:"шт"};
  }
  if(source==="cornice_break")return {qty:wallCorniceBreakCount()+ceilingCorniceBreakCount("uno"),unit:"шт"};
  if(source.indexOf("ceilingcornicebreaks:")===0){
    var breakProfile="";try{breakProfile=decodeURIComponent(source.slice(21))}catch(_){breakProfile=source.slice(21)}
    return {qty:ceilingCorniceBreakCount(breakProfile||"uno"),unit:"шт"};
  }
  if(source.indexOf("ceilingcornicecorners:")===0){
    var cornerProfile="";try{cornerProfile=decodeURIComponent(source.slice(22))}catch(_){cornerProfile=source.slice(22)}
    return {qty:ceilingCorniceCornerCount(cornerProfile||"uno"),unit:"шт"};
  }
  if(source.indexOf("ceilingcornice:")===0){
    var rawProfile="";try{rawProfile=decodeURIComponent(source.slice(15))}catch(_){rawProfile=source.slice(15)}
    var profileParts=String(rawProfile||"uno").split(":"),profile=profileParts[0]||"uno",profileColor=profileParts[1]||"";
    if(!profileColor&&item&&(item.sourceVariant==="white"||item.sourceVariant==="black"))profileColor=item.sourceVariant;
    return {qty:ceilingCorniceLengthM(profile,profileColor),unit:"м"};
  }
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
      if(sameWallType(ml,n)&&wallProfileColor(m)===color)cm+=Number(m&&m.lenCm)||0;
    });
    return {qty:Math.round(cm)/100,unit:"м"};
  }
  if(source.indexOf("walltype:")===0){
    var label="";try{label=decodeURIComponent(source.slice(9))}catch(_){label=source.slice(9)}
    var n=norm(label),cm=0;
    getWallMarks().forEach(function(m){
      var ml=norm(m&&m.type||m&&m.name||m&&m.title||"");
      if(sameWallType(ml,n))cm+=Number(m&&m.lenCm)||0;
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
  var contour=contourSourceOfItem({name:name});
  if(contour)return {source:contour,unit:/corners$/.test(contour)?"шт":"м",variant:colorFromName(name)};
  if(n==="кут uno"||n==="кути uno"||n==="кут уно"||n==="кути уно"||n.indexOf("кут до uno")>=0||n.indexOf("кут до уно")>=0){
    return {source:"ceilingcornicecorners:uno",unit:"шт"};
  }
  if(n==="обрив uno"||n==="обриви uno"||n==="обрив уно"||n==="обриви уно"||n.indexOf("обрив карниза uno")>=0||n.indexOf("обрив карнизу uno")>=0||n.indexOf("обрив карниза уно")>=0||n.indexOf("обрив карнизу уно")>=0){
    return {source:"ceilingcornicebreaks:uno",unit:"шт"};
  }
  if(n==="uno"||n==="уно"||n.indexOf("карниз uno")>=0||n.indexOf("карниз уно")>=0){
    var unoColor=colorFromName(name);
    return {source:"ceilingcornice:uno",unit:"м",variant:unoColor||""};
  }

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

  return matches.length===1?matches[0]:null;
}
function applyUniversal(opts){
  opts=opts||{};
  if(!autoCountEnabled())return 0;
  var changed=0,allItems=getElemItems(),linearSummary=typeof window.linearElementsSummary==="function"?window.linearElementsSummary():null;
  var hasColoredUnoRows=allItems.some(function(row){
    if(!row)return false;
    var rowSource=String(row.source||"");
    if(rowSource==="ceilingcornice:uno:white"||rowSource==="ceilingcornice:uno:black")return true;
    if(rowSource==="ceilingcornice:uno"&&(row.sourceVariant==="white"||row.sourceVariant==="black"))return true;
    var rowName=norm(row.name);
    return (rowName.indexOf("uno")>=0||rowName.indexOf("уно")>=0)&&!!colorFromName(row.name);
  });
  allItems.forEach(function(it){
    if(!it)return;
    if(it.manualQtyOverride===true)return;
    var contourSource=contourSourceOfItem(it);
    // Name-only legacy H rows can hold an entered estimate before any plan exists.
    // Binding a default must not erase it while editing an icon or opening the list.
    if(contourSource==="main_profile"&&!it.source&&Number(it.qty)>0
      &&!(typeof closed!=="undefined"&&closed&&typeof pts!=="undefined"&&pts.length>=3)
      &&!(typeof circleMode!=="undefined"&&circleMode&&typeof circleDiamCm!=="undefined"&&circleDiamCm>0))return;
    if(/^(main_profile|corners|shadow_corners|floating_corners)$/.test(contourSource))it.source=contourSource;
    var src=String(it.source||"");
    if(src==="ceilingcornice:uno"&&hasColoredUnoRows&&it.sourceVariant!=="white"&&it.sourceVariant!=="black"){
      it.qty=0;it.unit="м";it.autoFilled=true;it.autoZero=true;it.universalAuto=true;changed++;return;
    }
    var dynamic=computeSource(src,it,linearSummary);
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
    if(auto.variant)it.sourceVariant=auto.variant;
    if(/^(main_profile|corners|shadow_corners|floating_corners)$/.test(auto.source))it.source=auto.source;
    if(auto.source==="ceilingcornice:uno"&&hasColoredUnoRows&&!auto.variant){
      it.qty=0;it.unit="м";it.autoFilled=true;it.autoZero=true;it.universalAuto=true;changed++;return;
    }
    var val=computeSource(auto.source,it);
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
// Read-only preview: never write quantities or rebuild prices on modal open.
window.previewNomenclatureSource=function(source,item){return computeSource(source,item)||(typeof window.previewLegacyNomenclatureSource==="function"?window.previewLegacyNomenclatureSource(source,item):null);};

/* Existing AutoFill button also applies all dynamic sources. */
var afUniversal=window["A\u00b7CEIL"]&&window["A\u00b7CEIL"].autofill;
if(afUniversal)afUniversal.stage("universal",{
  enabled:function(){return autoCountEnabled()},
  skipValue:0,
  after:function(){applyUniversal({noSave:false})}
});

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
/* UNO uses the same Білий/Чорний selector as colored wall elements. */
function ensureFilmEditorFields(){
  var width=document.getElementById("editElemFilmWidth"),selected=document.getElementById("editElemFilmSelected");
  if(!width||!selected)return null;
  var box=document.getElementById("editElemFilmFields");
  if(box)return box;
  var first=width.previousElementSibling,last=selected.parentElement&&selected.parentElement.nextElementSibling;
  if(!first||!last||!first.parentNode||first.parentNode!==last.parentNode)return null;
  box=document.createElement("div");box.id="editElemFilmFields";box.style.display="none";
  first.parentNode.insertBefore(box,first);
  var node=first,after=last.nextSibling;
  while(node&&node!==after){var next=node.nextSibling;box.appendChild(node);node=next;}
  return box;
}
function editedItemIsFilm(){
  var currentId=null;
  try{currentId=typeof _editingElemId!=="undefined"?_editingElemId:window._editingElemId;}catch(_){currentId=window._editingElemId;}
  var item=getElemItems().find(function(x){return x&&String(x.id)===String(currentId);});
  if(!item)return false;
  var groups=[];try{groups=typeof elemGroups!=="undefined"&&Array.isArray(elemGroups)?elemGroups:(Array.isArray(window.elemGroups)?window.elemGroups:[]);}catch(_){groups=Array.isArray(window.elemGroups)?window.elemGroups:[];}
  var groupSelect=document.getElementById("editElemGroup"),groupId=groupSelect?groupSelect.value:item.groupId;
  var group=groups.find(function(g){return g&&String(g.id)===String(groupId);});
  var name=String(group&&group.name||"").toLowerCase();
  if(group)return !!(group.roomScopedKind==="film-color"||group.filmSeriesId||group.seriesId||/плівк|пленк|film|premium|classic|kralton/.test(name));
  return !!(Number(item.filmWidth)>0||Number(item.filmMaxWidth)>0||item.seriesId||item.filmSeriesId);
}
function syncFilmEditorFields(){var box=ensureFilmEditorFields();if(box)box.style.display=editedItemIsFilm()?"block":"none";}
var prevExtraVisibility=window.updateSourceExtraFieldsVisibility||(typeof updateSourceExtraFieldsVisibility==="function"?updateSourceExtraFieldsVisibility:null);
if(typeof prevExtraVisibility==="function"){
  window.updateSourceExtraFieldsVisibility=function(){
    var r=prevExtraVisibility.apply(this,arguments);
    var sel=document.getElementById("editElemSource"),row=document.getElementById("editElemVariantRow");
    if(row&&sel&&String(sel.value||"").indexOf("ceilingcornice:uno")===0)row.style.display="block";
    syncFilmEditorFields();
    return r;
  };
  try{updateSourceExtraFieldsVisibility=window.updateSourceExtraFieldsVisibility}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
var prevOpenEdit=window.openEditElemModal||(typeof openEditElemModal==="function"?openEditElemModal:null);
if(typeof prevOpenEdit==="function"){
  window.openEditElemModal=function(id){
    fillEditDynamicSources();
    var r=prevOpenEdit.apply(this,arguments);
    var items=getElemItems(),it=items.find(function(x){return x&&x.id===id});
    var sel=document.getElementById("editElemSource");
    if(sel&&it&&it.source)sel.value=it.source;
    try{if(typeof updateSourceExtraFieldsVisibility==="function")updateSourceExtraFieldsVisibility()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    syncFilmEditorFields();
    return r;
  };
  try{openEditElemModal=window.openEditElemModal}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
document.addEventListener("change",function(event){if(event.target&&event.target.id==="editElemGroup")syncFilmEditorFields();});
var prevSaveEdit=window.saveElemEdit||(typeof saveElemEdit==="function"?saveElemEdit:null);
if(typeof prevSaveEdit==="function"&&!prevSaveEdit.__filmFieldsV1){
  window.saveElemEdit=function(){
    if(!editedItemIsFilm()){
      var width=document.getElementById("editElemFilmWidth"),selected=document.getElementById("editElemFilmSelected");
      if(width)width.value="";if(selected)selected.checked=false;
    }
    return prevSaveEdit.apply(this,arguments);
  };
  window.saveElemEdit.__filmFieldsV1=true;
  try{saveElemEdit=window.saveElemEdit}catch(_){window.__diagSilent&&window.__diagSilent(_)}
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
            if(autoCountEnabled()){
              var v=computeSource(s.key);
              if(v){item.qty=v.qty;item.unit=v.unit;item.autoFilled=true;item.autoZero=!(Number(v.qty)>0)}
            }
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
/* Wall elements change without updateLightBadge(). Recalculate after their
   save/delete actions as well, otherwise a correctly selected wall source can
   keep the previous zero quantity until another unrelated action occurs. */
var wallSavePipeline=window.A·CEIL&&window.A·CEIL.pipeline&&window.A·CEIL.pipeline.get("rwe2Save");
if(wallSavePipeline)wallSavePipeline.stage("autocount",{after:function(){schedule();}});
var legacyWallSave=window.A·CEIL&&window.A·CEIL.pipeline&&window.A·CEIL.pipeline.get("saveWallEdit");
if(legacyWallSave)legacyWallSave.stage("autocount",{after:function(){schedule();}});
["deleteWallMarkFromEditor"].forEach(function(name){
  var old=window[name];
  if(typeof old!=="function"||old.__v319WallAutocount)return;
  var wrapped=function(){
    var result=old.apply(this,arguments);
    schedule();
    return result;
  };
  wrapped.__v319WallAutocount=true;
  window[name]=wrapped;
  try{
    if(name==="saveWallEdit")saveWallEdit=wrapped;
    else if(name==="deleteWallMarkFromEditor")deleteWallMarkFromEditor=wrapped;
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
});
/* v3.25: НЕ перемальовуємо номенклатуру на кожен draw().
   Автопідрахунок точок запускається через updateLightBadge, а ручний ввід більше не втрачає фокус. */
setTimeout(function(){applyUniversal({noSave:true})},300);
})();
