(function(){
"use strict";
if(window.__aceilColorPickerV3)return;
window.__aceilColorPickerV3=true;

function gid(x){return document.getElementById(x)}
function items(){try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems}catch(_){window.__diagSilent&&window.__diagSilent(_)}return Array.isArray(window.elemItems)?window.elemItems:[]}
function groups(){try{if(typeof elemGroups!=="undefined"&&Array.isArray(elemGroups))return elemGroups}catch(_){window.__diagSilent&&window.__diagSilent(_)}return Array.isArray(window.elemGroups)?window.elemGroups:[]}
function esc(s){try{if(typeof escapeHtml==="function")return escapeHtml(s)}catch(_){window.__diagSilent&&window.__diagSilent(_)}return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function norm(v){return String(v||"").trim().toLowerCase()}
function autoCountEnabled(){try{return !window.A_CEIL_AutoCount||typeof window.A_CEIL_AutoCount.isEnabled!=="function"||window.A_CEIL_AutoCount.isEnabled()}catch(_){return true}}
function seriesList(){return(Array.isArray(window.ACEIL_FILM_SERIES)?window.ACEIL_FILM_SERIES:[]).filter(function(s){return s&&s.active!==false})}
function seriesById(id){return seriesList().find(function(s){return s.id===id})||{id:"premium",name:"Premium",manufacturer:"MSD"}}
function catalog(seriesId){var all=window.ACEIL_COLOR_CATALOG_BY_SERIES||{};if(Array.isArray(all[seriesId]))return all[seriesId];return seriesId==="premium"&&Array.isArray(window.ACEIL_COLOR_CATALOG)?window.ACEIL_COLOR_CATALOG:[]}
function pricing(seriesId){if(typeof window.ACEILGetFilmPricing==="function")return window.ACEILGetFilmPricing(seriesId)||{};var all=window.ACEIL_FILM_PRICING_BY_SERIES||{};return all[seriesId]||(seriesId==="premium"?window.ACEIL_FILM_PRICING:{})||{}}
function texLabels(){return window.ACEIL_TEXTURE_LABELS||{lak:"Глянець",mat:"Мат",satin:"Сатин"}}
function baseWidthCandidates(entry){if(entry&&Array.isArray(entry.filmWidths)&&entry.filmWidths.length)return entry.filmWidths.map(function(w){return{nominal:Number(w.nominal)||0,max:Number(w.max)||Number(w.nominal)||0,priceKey:w.priceKey||'narrow'}}).filter(function(w){return w.nominal>0&&w.max>0});var out=[{nominal:3.6,max:3.6,priceKey:'narrow'}];if(entry&&entry.wide510)out.push({nominal:5.1,max:5.6,priceKey:'wide'});return out}
function widthCandidates(entry){
 var out=baseWidthCandidates(entry);if(!entry)return out;
 var series=entry.seriesId||'premium',saved=window.__A·CEILNomenCatalogV339||{};
 (Array.isArray(saved.items)?saved.items:[]).concat(items()).forEach(function(it){
  if(!it||!(Number(it.filmWidth)>0)||itemFilmCode(it)!==entry.code||itemFilmSeries(it)!==series)return;
  if(entry.custom){var customWidth=out.find(function(w){return Math.abs(w.nominal-Number(it.filmWidth))<1e-6});if(customWidth&&it.icon){customWidth.icon=it.icon;customWidth.iconUserSelected=!!it.iconUserSelected;}return;}
  if(it.filmIconDefinition===true){var iconWidth=out.find(function(w){return Math.abs(w.nominal-Number(it.filmWidth))<1e-6});if(iconWidth){if(it.icon){iconWidth.icon=it.icon;iconWidth.iconUserSelected=!!it.iconUserSelected;}return;}}
  if(it.filmWidthDefinition!==true&&it.filmPickerManaged===true){var standard=out.find(function(w){return Math.abs(w.nominal-Number(it.filmWidth))<1e-6});if(standard){if(it.icon){standard.icon=it.icon;standard.iconUserSelected=!!it.iconUserSelected;}return;}}
  var w=out.find(function(w){return Math.abs(w.nominal-Number(it.filmWidth))<1e-6});
  if(!w){w={nominal:Number(it.filmWidth),max:Number(it.filmMaxWidth)||Number(it.filmWidth),priceKey:'custom_'+String(it.filmWidth)};out.push(w);}
  if(Number.isFinite(Number(it.price)))w.price=Number(it.price);
  if(it.icon){w.icon=it.icon;w.iconUserSelected=!!it.iconUserSelected;}
 });return out.sort(function(a,b){return a.nominal-b.nominal;});
}
// Recognize film entered through the ordinary “+” form, including older saved rows.
/* Позиція пам'ятає cid кольору: якщо код кольору змінився (розв'язання колізії при синхронізації),
   код у позиції оновлюється, а не вказує на інший колір. */
function healFilmCid(it){
 if(!it)return false;
 var series=itemFilmSeries(it),list=catalog(series);
 if(it.filmCid){
  var e=list.find(function(c){return c&&c.cid===it.filmCid});
  if(e&&it.colorCode!==e.code){it.colorCode=e.code;if(e.displayCode&&e.displayCode!==e.code)it.filmDisplayCode=e.displayCode;return true}
  return false;
 }
 /* Позиція зі старого проєкту (без cid): колір визначаємо за назвою, яку вона зберегла. */
 if(!(it.filmPickerManaged===true||Number(it.filmWidth)>0))return false;
 var customs=list.filter(function(c){return c&&c.custom&&c.cid});if(!customs.length)return false;
 var disp=String(it.filmDisplayCode||'').trim().toLowerCase();
 if(!disp){
  var nm=String(it.name||'').toLowerCase(),best='';
  customs.forEach(function(c){var d=String(c.displayCode||'').toLowerCase();if(d&&nm.indexOf(d+' ')===0&&d.length>best.length)best=d});
  disp=best;
 }
 if(!disp)return false;
 var code=String(it.colorCode||'').toUpperCase(),here=customs.find(function(c){return c.code===code});
 if(here&&String(here.displayCode||'').toLowerCase()===disp){it.filmCid=here.cid;if(!it.filmDisplayCode&&here.displayCode!==here.code)it.filmDisplayCode=here.displayCode;return true}
 /* Код тепер означає інший колір (або зник): шукаємо колір, для якого позицію створено. */
 var tex=it.colorTexture,cand=customs.filter(function(c){return String(c.displayCode||'').toLowerCase()===disp&&(!tex||c.texture===tex)});
 if(cand.length===1){it.colorCode=cand[0].code;it.filmCid=cand[0].cid;it.filmDisplayCode=cand[0].displayCode;return true}
 return false;
}
function prepareFilmItem(it){var healed=healFilmCid(it),changed=prepareFilmItemBase(it);return healed||changed}
function prepareFilmItemBase(it){
 if(!it)return false;
 var g=groups().find(function(g){return g&&String(g.id)===String(it.groupId)});
 if(!g||!(g.filmSeriesId||g.roomScopedKind==='film-color'||/плів|полотно|film/i.test(g.name||'')))return false;
 var code=itemFilmCode(it),series=itemFilmSeries(it),entry=catalogEntry(code,series);
 if(!entry)return false;
 var named=String(it.name||'').match(/[MLS]\d{3}\s+(\d+(?:[.,]\d+)?)\s*м/i);
 var width=Number(it.filmWidth)||named&&Number(named[1].replace(',','.'));
 if(!(width>0))return false;
 var before=JSON.stringify(it);
 it.filmWidth=width;it.colorCode=code;it.seriesId=series;it.filmSeriesId=series;it.colorTexture=entry.texture;it.unit='м²';
 if(it.filmPickerManaged!==true)it.filmWidthDefinition=true;
 if(!it.iconUserSelected&&(!it.icon||it.icon==='🔧'||it.icon==='📦'||it.icon==='🎨'))it.icon='svg:selected-film-roll';
 return JSON.stringify(it)!==before;
}
function captureFilmDefinitions(){
 var catalog=window.__A·CEILNomenCatalogV339;if(!catalog)catalog=window.__A·CEILNomenCatalogV339={items:[],groups:[]};
 if(!Array.isArray(catalog.items))catalog.items=[];if(!Array.isArray(catalog.groups))catalog.groups=[];
 items().forEach(function(it){
  if(!it||!(Number(it.filmWidth)>0))return;
  var code=itemFilmCode(it),series=itemFilmSeries(it),entry=catalogEntry(code,series);if(!entry)return;
  var standard=baseWidthCandidates(entry).some(function(w){return Math.abs(w.nominal-Number(it.filmWidth))<1e-6});
  if(it.filmPickerManaged===true&&standard&&it.filmWidthDefinition!==true&&!it.iconUserSelected&&(!it.icon||it.icon==='🎨'||it.icon==='svg:selected-film-roll'))return;
  var definition=JSON.parse(JSON.stringify(it));definition.colorCode=code;definition.seriesId=series;definition.filmSeriesId=series;definition.colorTexture=entry.texture;
  if(it.filmPickerManaged===true&&standard&&it.filmWidthDefinition!==true)definition.filmIconDefinition=true;
  definition.filmWidthDefinition=true;definition.filmPickerManaged=false;definition.roomScoped=false;delete definition.roomScopedKind;delete definition.filmRoomSelected;definition.qty=0;definition.manualQtyOverride=false;
  var existing=catalog.items.findIndex(function(row){return row&&row.filmWidthDefinition===true&&itemFilmCode(row)===code&&itemFilmSeries(row)===series&&Number(row.filmWidth)===Number(it.filmWidth)});
  if(existing>=0){definition.id=catalog.items[existing].id;catalog.items[existing]=definition;}else catalog.items.push(definition);
  var group=groups().find(function(g){return g&&String(g.id)===String(it.groupId)});
  if(group&&!catalog.groups.some(function(g){return g&&String(g.id)===String(group.id)})){var copy=JSON.parse(JSON.stringify(group));delete copy.roomScoped;delete copy.roomScopedKind;catalog.groups.push(copy);}
 });return catalog;
}
// One material policy for the list, live total, stored-room reports and variants.
// Unknown catalogue entries stay shared; explicit item/group settings take precedence.
function validCeilingMaterial(value){return ['pvc','fabric','shared'].indexOf(value)>=0?value:''}
function itemCeilingMaterial(it,allGroups){
 if(!it)return 'shared';
 var group=(allGroups||groups()).find(function(g){return g&&String(g.id)===String(it.groupId)});
 if(it.filmPickerManaged===true||Number(it.filmWidth)>0){
  var entry=catalogEntry(itemFilmCode(it),it.seriesId||it.filmSeriesId||group&&group.filmSeriesId||'premium');
  var texture=it.colorTexture||entry&&entry.texture;
  if(texture)return texture==='fabric'?'fabric':'pvc';
 }
 var explicit=validCeilingMaterial(it.ceilingMaterial)||validCeilingMaterial(group&&group.ceilingMaterial);
 if(explicit)return explicit;
 function named(value){
  var name=String(value||'').toLowerCase();
  if(/захист|захисн|укрит|накрит|пакув|карниз|люстр|світиль|шинопров|світлов.*ліні|камер|датчик|витяж|вентиляц|робота на висот|прибиран|достав/.test(name))return 'shared';
  if(/тканин|тканев|текстил|descor|дескор|clipso|кліпсо|cerutti|черутті/.test(name))return 'fabric';
  if(/плівк|пленк|пвх|pvc|гарпун|маскувальн|вставк|парящ|тіньов|тенев|алюм[іи]н.*проф|проф[іи]л.*\bh\b/.test(name))return 'pvc';
  return '';
 }
 var own=named(it.name),inGroup=named(group&&group.name);
 if(own)return own;
 if(inGroup)return inGroup;
 if(['main_profile','white_insert','floating_profile','shadow_profile','floating_corners','shadow_corners'].indexOf(it.source)>=0)return 'pvc';
 return 'shared';
}
function ceilingKind(state){var material=filmMaterial(state);return material&&material.texture==='fabric'?'fabric':'pvc'}
function applicableItems(list,allGroups,state){
 list=Array.isArray(list)?list:items();allGroups=Array.isArray(allGroups)?allGroups:groups();
 var kind=ceilingKind(state||{elemItems:list,elemGroups:allGroups});
 return list.filter(function(it){var type=itemCeilingMaterial(it,allGroups);return type==='shared'||type===kind});
}
var _showAllCeilingMaterials=false,_filterCeilingKind=null;
function updateMaterialFilter(kind,hiddenCount){
 var bar=gid('elemMaterialFilter'),label=gid('elemMaterialFilterLabel'),toggle=gid('elemMaterialFilterToggle'),hint=gid('elemMaterialFilterHint');
 if(!bar)return;
 bar.hidden=!items().length;
 if(label)label.textContent=(kind==='fabric'?'Тканинна стеля':'Стеля ПВХ')+(hiddenCount?' · '+hiddenCount+' поз. іншого типу':'');
 if(toggle){toggle.textContent=_showAllCeilingMaterials?'Лише для цієї стелі':'Показати все';toggle.setAttribute('aria-pressed',String(_showAllCeilingMaterials));}
 if(hint)hint.hidden=!(_showAllCeilingMaterials&&hiddenCount);
}
function resetMaterialFilter(){_showAllCeilingMaterials=false;_filterCeilingKind=null}
function toggleMaterialFilter(){_showAllCeilingMaterials=!_showAllCeilingMaterials;if(typeof renderElemList==='function')renderElemList()}
function filmView(){
 var cur=currentFilm(),all=items(),allGroups=groups(),kind=ceilingKind();
 if(_filterCeilingKind!==kind){_showAllCeilingMaterials=false;_filterCeilingKind=kind;}
 var visible=all.filter(function(it){return !cur.code||!it||!(it.filmPickerManaged===true||Number(it.filmWidth)>0)||!/^[MLS]\d{3}$/.test(itemFilmCode(it))||itemFilmCode(it)===cur.code&&itemFilmSeries(it)===cur.seriesId});
 var compatible=applicableItems(visible,allGroups,{elemItems:all,elemGroups:allGroups});
 updateMaterialFilter(kind,visible.length-compatible.length);
 if(!_showAllCeilingMaterials)visible=compatible;
 return {items:visible,groups:allGroups.filter(function(group){
  var own=all.filter(function(it){return it&&String(it.groupId)===String(group.id)});
  if(own.length)return own.some(function(it){return visible.indexOf(it)>=0});
  if(group.filmCode)return group.filmCode===cur.code&&group.filmSeriesId===cur.seriesId;
  var type=validCeilingMaterial(group.ceilingMaterial)||itemCeilingMaterial({groupId:group.id},allGroups);
  return _showAllCeilingMaterials||type==='shared'||type===kind;
 })};
}


var _activeSeries="premium",_activeTexture="",_searchQuery="";
var POPULAR_STORAGE_KEY="aceil_film_popular_codes_v2";
function catalogEntry(code,seriesId){return catalog(seriesId||_activeSeries).find(function(c){return c&&c.code===code})||null}
function popularCodes(){var defaults=Array.isArray(window.ACEIL_POPULAR_CODES)?window.ACEIL_POPULAR_CODES:[];try{var saved=JSON.parse(localStorage.getItem(POPULAR_STORAGE_KEY)||"null");if(saved&&Array.isArray(saved[_activeSeries]))return saved[_activeSeries].filter(function(code){return!!catalogEntry(code)}).slice(0,4)}catch(_){window.__diagSilent&&window.__diagSilent(_)}return defaults.filter(function(code){return!!catalogEntry(code)}).slice(0,4)}
function savePopularCodes(list){list=list.filter(function(code,i,arr){return!!catalogEntry(code)&&arr.indexOf(code)===i}).slice(0,4);try{var all=JSON.parse(localStorage.getItem(POPULAR_STORAGE_KEY)||"{}")||{};all[_activeSeries]=list;localStorage.setItem(POPULAR_STORAGE_KEY,JSON.stringify(all))}catch(_){window.__diagSilent&&window.__diagSilent(_)}renderPopular();renderGrid()}
function togglePopular(code){var list=popularCodes(),idx=list.indexOf(code);if(idx>=0)list.splice(idx,1);else{if(list.length>=4)list.shift();list.push(code)}savePopularCodes(list);try{if(typeof showToast==="function")showToast(idx>=0?"☆ Прибрано з популярних":"★ Додано до популярних",1700)}catch(_){window.__diagSilent&&window.__diagSilent(_)}}

function dispCode(seriesId,code){return typeof window.ACEILFilmDisplayCode==='function'?window.ACEILFilmDisplayCode(seriesId,code):code}
function itemFilmCode(it){if(it&&it.filmDisplayCode&&/^[MLS]\d{3}$/.test(String(it.colorCode||'')))return String(it.colorCode).toUpperCase();var match=String(it&&it.name||'').toUpperCase().match(/\b[MLS]\d{3}\b/);return match?match[0]:String(it&&it.colorCode||'').toUpperCase()}
function itemFilmSeries(it){var g=groups().find(function(g){return g&&String(g.id)===String(it&&it.groupId)});return it&& (it.seriesId||it.filmSeriesId)||g&&g.filmSeriesId||'premium'}
function filmMaterial(state){
 var list=state&&Array.isArray(state.elemItems)?state.elemItems:state?[]:items();
 list=list.filter(function(it){return it&&(it.filmPickerManaged===true||Number(it.filmWidth)>0)&&/^[MLS]\d{3}$/.test(itemFilmCode(it))});
 var chosen=list.find(function(it){return it.filmRoomSelected===true&&Number(it.qty)>0})||list.find(function(it){return Number(it.qty)>0})||list.find(function(it){return it.filmRoomSelected===true})||list.find(function(it){return it.filmSelected})||list[0];
 if(!chosen)return null;
 var code=itemFilmCode(chosen),series=chosen.seriesId||chosen.filmSeriesId||'premium',entry=catalogEntry(code,series),texture=chosen.colorTexture||entry&&entry.texture||'',textureLabel=texLabels()[texture]||texture;
 var display=chosen.filmDisplayCode||dispCode(series,code),seriesName=chosen.filmSeriesName||seriesById(series).name;
 return {code:code,displayCode:display,seriesId:series,texture:texture,textureLabel:textureLabel,label:[display,textureLabel,seriesName].filter(Boolean).join(' · '),swatch:chosen.filmSwatch||entry&&entry.swatch||null};
}
function swatchFill(ctx,swatch,x,y,width){
 var colors=String(swatch||'').match(/#[0-9a-f]{6}/ig);if(!colors||!colors.length)return '#e5e7eb';
 if(colors.length===1)return colors[0];
 var gradient=ctx.createLinearGradient(x,y,x+width,y);colors.forEach(function(color,i){gradient.addColorStop(i/(colors.length-1),color)});return gradient;
}
function updateButtonSwatch(btn,widthEl,entry){
 var swatch=entry&&entry.swatch||'',hex=swatch.match(/#[0-9a-f]{6}/i),color='';
 if(hex){var h=hex[0];color=(parseInt(h.slice(1,3),16)*299+parseInt(h.slice(3,5),16)*587+parseInt(h.slice(5,7),16)*114)/1000<145?'#ffffff':'#0f172a';}
 btn.style.background=swatch;btn.style.color=color;widthEl.style.color=color;
}
function currentFilm(){var list=items().filter(function(it){return it&&(it.filmPickerManaged===true||Number(it.filmWidth)>0)&&/^[MLS]\d{3}$/.test(itemFilmCode(it))}),any=list.find(function(it){return it.filmRoomSelected===true})||list.find(function(it){return Number(it.qty)>0})||list[0];return any?{code:itemFilmCode(any),seriesId:itemFilmSeries(any)}:{code:null,seriesId:'premium'}}
function currentColorItems(){var cur=currentFilm();return items().filter(function(it){return it&&(it.filmPickerManaged===true||Number(it.filmWidth)>0)&&itemFilmCode(it)===cur.code&&itemFilmSeries(it)===cur.seriesId})}

function findOrCreateFilmGroup(seriesId,code){var list=groups(),g=list.find(function(x){return x&&x.filmSeriesId===seriesId&&x.filmCode===code});if(!g)g=list.find(function(x){if(!x||x.filmCode&&x.filmCode!==code)return false;var own=items().filter(function(it){return String(it.groupId)===String(x.id)&&Number(it.filmWidth)>0});return own.length&&own.every(function(it){return itemFilmCode(it)===code&&itemFilmSeries(it)===seriesId})});var meta=seriesById(seriesId),name='Плівка '+meta.name;if(g){if(!g.name)g.name=name;g.roomScoped=true;g.roomScopedKind='film-color';g.filmSeriesId=seriesId;g.filmCode=code;var idx=list.indexOf(g);if(idx>0){list.splice(idx,1);list.unshift(g)}return g.id}g={id:'g_film_'+seriesId+'_'+code+'_'+Date.now(),name:name+' · '+dispCode(seriesId,code),collapsed:false,roomScoped:true,roomScopedKind:'film-color',filmSeriesId:seriesId,filmCode:code};list.unshift(g);return g.id}
function isFilmCandidateInGroup(it,groupId){return!!it&&String(it.groupId)===String(groupId)&&(it.filmPickerManaged===true||Number(it.filmWidth)>0)}
function pinFilmGroupFirst(){var list=groups(),cur=currentFilm();if(!list.length)return;var idx=list.findIndex(function(g){return g&&g.filmCode===cur.code&&g.filmSeriesId===cur.seriesId});if(idx>0){var g=list.splice(idx,1)[0];list.unshift(g)}}

function chooseColor(code,texture,seriesId,silent){seriesId=seriesId||_activeSeries;var entry=catalogEntry(code,seriesId);if(!entry)return;captureFilmDefinitions();texture=entry.texture;var arr=items(),groupId=findOrCreateFilmGroup(seriesId,code),prices=pricing(seriesId)[texture]||{};var selectedGroup=groups().find(function(g){return g.id===groupId});if(selectedGroup)selectedGroup.collapsed=false;if(entry.custom){for(var removeIndex=arr.length-1;removeIndex>=0;removeIndex--){var row=arr[removeIndex];if(row&&row.filmPickerManaged===true&&itemFilmCode(row)===code&&itemFilmSeries(row)===seriesId&&!entry.filmWidths.some(function(w){return Math.abs(Number(w.nominal)-Number(row.filmWidth))<1e-6}))arr.splice(removeIndex,1);}}var stamp="e"+Date.now();widthCandidates(entry).forEach(function(w,idx){var existing=arr.find(function(it){return isFilmCandidateInGroup(it,groupId)&&itemFilmCode(it)===code&&Math.abs(Number(it.filmWidth)-w.nominal)<1e-6});if(existing){if(entry.custom){existing.filmSwatch=entry.swatch||null;existing.filmSeriesName=seriesById(seriesId).name;existing.filmMaxWidth=w.max;existing.colorCode=code;if(entry.cid)existing.filmCid=entry.cid;}if((entry.custom||entry.displayCode&&entry.displayCode!==code)&&existing.filmPickerManaged===true){existing.filmDisplayCode=entry.displayCode;existing.name=entry.displayCode+" "+w.nominal+"м"}if(existing.filmPickerManaged===true||existing.filmIconDefinition===true)existing.price=Number.isFinite(w.price)?w.price:Number(prices[w.priceKey])||0;return;}arr.push({id:stamp+String.fromCharCode(97+idx),groupId:groupId,icon:w.icon||"svg:selected-film-roll",iconUserSelected:!!w.iconUserSelected,name:dispCode(seriesId,code)+" "+w.nominal+"м",filmDisplayCode:entry.displayCode&&entry.displayCode!==code?entry.displayCode:undefined,filmCid:entry.cid||undefined,qty:0,unit:"м²",price:Number.isFinite(w.price)?w.price:Number(prices[w.priceKey])||0,inputMode:"manual",source:"",sourceVariant:"",filmSwatch:entry.custom?entry.swatch:undefined,filmSeriesName:entry.custom?seriesById(seriesId).name:undefined,filmWidth:w.nominal,filmMaxWidth:w.max,filmSelected:true,colorCode:code,colorTexture:texture,seriesId:seriesId,filmSeriesId:seriesId,filmPickerManaged:true,filmWidthDefinition:w.priceKey.indexOf("custom_")===0,roomScoped:true,roomScopedKind:"film-color"})});arr.forEach(function(it){if((it.filmPickerManaged===true||Number(it.filmWidth)>0)&&/^[MLS]\d{3}$/.test(itemFilmCode(it))){var selected=itemFilmCode(it)===code&&itemFilmSeries(it)===seriesId;if(it.filmPickerManaged===true)it.filmRoomSelected=selected;else delete it.filmRoomSelected;if(!selected){it.qty=0;it.autoZero=true}}});if(autoCountEnabled()){try{if(typeof autoFillNomenclature==="function")autoFillNomenclature({silent:true})}catch(_){window.__diagSilent&&window.__diagSilent(_)}enforceSmallestFilmRoll()}syncFilmDisplayWidth();try{if(typeof renderElemList==="function")renderElemList()}catch(_){window.__diagSilent&&window.__diagSilent(_)}try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(_){window.__diagSilent&&window.__diagSilent(_)}try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(_){window.__diagSilent&&window.__diagSilent(_)}try{if(typeof saveState==="function")saveState()}catch(_){window.__diagSilent&&window.__diagSilent(_)}try{if(typeof window.saveCurrentRoom==="function"&&window._activeObjectId!=null)Promise.resolve(window.saveCurrentRoom({silent:true,skipCloud:true})).catch(function(e){window.__diagSilent&&window.__diagSilent(e)})}catch(_){window.__diagSilent&&window.__diagSilent(_)}if(!silent)closePicker();updateButton();try{if(!silent&&typeof showToast==="function"){var p=prices[widthCandidates(entry)[0].priceKey];showToast("🎨 "+seriesById(seriesId).name+" "+dispCode(seriesId,code)+(Number(p)>0?"":" · задайте ціну"),2800)}}catch(_){window.__diagSilent&&window.__diagSilent(_)}}

function requiredWidthCm(){try{if(typeof getRequiredFilmWidthMeters==="function")return(Number(getRequiredFilmWidthMeters())||0)*100}catch(_){window.__diagSilent&&window.__diagSilent(_)}return 0}
function selectedWidth(entry,needCm){return widthCandidates(entry).filter(function(w){return needCm<=w.max*100+1e-6}).sort(function(a,b){return a.nominal-b.nominal||a.max-b.max})[0]||null}
function formatMeters(v){var n=Math.round((Number(v)||0)*100)/100;return String(n).replace(".",",")}
function enforceSmallestFilmRoll(){var need=requiredWidthCm()/100,list=currentColorItems();if(!list.length||!(need>0))return;var fitting=list.filter(function(it){var max=Number(it.filmMaxWidth)||Number(it.filmWidth)||0;return max+1e-6>=need}).sort(function(a,b){return(Number(a.filmWidth)||0)-(Number(b.filmWidth)||0)||(Number(a.filmMaxWidth)||0)-(Number(b.filmMaxWidth)||0)}),chosen=fitting[0]||null,area=0;try{area=Number(typeof getProjectAreaMeters==="function"?getProjectAreaMeters():0)||0}catch(_){window.__diagSilent&&window.__diagSilent(_)}items().forEach(function(it){if(it&&Number(it.filmWidth)>0&&it.manualQtyOverride!==true&&(itemFilmCode(it)!==currentFilm().code||itemFilmSeries(it)!==currentFilm().seriesId)){it.qty=0;it.autoFilled=true;it.autoZero=true}});list.forEach(function(it){it.qty=chosen&&it===chosen&&area>0?Math.round(area*100)/100:0;it.autoFilled=true;it.autoZero=!(Number(it.qty)>0)})}
function syncFilmDisplayWidth(){var need=requiredWidthCm()/100;if(!(need>0))return;currentColorItems().forEach(function(it){delete it.displayFilmWidth;it.name=(it.filmDisplayCode||it.colorCode||String(it.name||"").split(" ")[0])+" "+formatMeters(Number(it.filmWidth)||0)+"м"})}
function ensureDefaultFilm(){var hasFilm=items().some(function(it){return it&&(it.filmPickerManaged===true||Number(it.filmWidth)>0)});if(!hasFilm&&catalogEntry("M303","premium"))chooseColor("M303","mat","premium",true);else{var cur=currentFilm();if(cur.code)findOrCreateFilmGroup(cur.seriesId,cur.code)}}
function ensureCompleteFilmWidthSet(){var cur=currentFilm();if(!cur.code)return;var entry=catalogEntry(cur.code,cur.seriesId),expected=widthCandidates(entry);if(!entry||!expected.length)return;var groupId=findOrCreateFilmGroup(cur.seriesId,cur.code),actual=items().filter(function(it){return isFilmCandidateInGroup(it,groupId)&&String(it.colorCode||String(it.name||"").split(" ")[0]).toUpperCase()===cur.code}),complete=actual.length>=expected.length&&expected.every(function(w){return actual.some(function(it){return Math.abs((Number(it.filmWidth)||0)-w.nominal)<1e-6&&Math.abs((Number(it.filmMaxWidth)||Number(it.filmWidth)||0)-w.max)<1e-6})});if(!complete)chooseColor(cur.code,entry.texture,cur.seriesId,true)}
function buildButton(){var host=document.querySelector(".canvas-container");if(!host)return false;if(gid("aceilColorPickerBtn"))return true;var btn=document.createElement("button");btn.type="button";btn.id="aceilColorPickerBtn";btn.innerHTML='<span class="acpb-icon">🎨</span><span class="acpb-code" id="acpbCode">Колір</span><span class="acpb-width" id="acpbWidth">обрати</span>';btn.addEventListener("click",openPicker);host.appendChild(btn);return true}
function updateButton(){var codeEl=gid("acpbCode"),widthEl=gid("acpbWidth"),btn=gid("aceilColorPickerBtn");if(!codeEl||!widthEl||!btn)return;var cur=currentFilm();if(!cur.code){codeEl.textContent="Колір";widthEl.textContent="обрати";btn.classList.remove("acpb-error");updateButtonSwatch(btn,widthEl,null);return}var meta=seriesById(cur.seriesId);codeEl.textContent=(meta.name==="Premium"?"":meta.name+" ")+dispCode(cur.seriesId,cur.code);var need=requiredWidthCm(),entry=catalogEntry(cur.code,cur.seriesId),w=selectedWidth(entry,need);updateButtonSwatch(btn,widthEl,entry);if(need<=0){widthEl.textContent="AUTO";btn.classList.remove("acpb-error")}else if(w){widthEl.textContent=formatMeters(need/100)+" м";btn.classList.remove("acpb-error")}else{widthEl.textContent="немає ширини";btn.classList.add("acpb-error")}}

function installPickerStyles(){if(gid("aceilFilmSeriesPickerStyles"))return;var s=document.createElement("style");s.id="aceilFilmSeriesPickerStyles";s.textContent="#aceilColorPickerModalV2 .acp2-series{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 12px}#aceilColorPickerModalV2 .acp2-series button{min-width:0;padding:9px 4px;border:1px solid #dbe4f0;border-radius:11px;background:#f8fafc;color:#475569;font-size:12px;font-weight:900;box-shadow:none}#aceilColorPickerModalV2 .acp2-series button.active{background:#dbeafe;border-color:#60a5fa;color:#1d4ed8}#aceilColorPickerModalV2 .acp2-chip{min-width:0;overflow:hidden}#aceilColorPickerModalV2 .acp2-star{background:#fff;border:1px solid #dbe4f0;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center}#aceilColorPickerModalV2 .acp2-swatch{display:block;height:42px;width:100%;margin-bottom:7px;border:1px solid rgba(15,23,42,.16);border-radius:7px;box-sizing:border-box}#aceilColorPickerModalV2 .acp2-source{margin:12px 0 0;font-size:11px;color:#64748b}#aceilColorPickerModalV2 .acp2-source a{color:inherit}#aceilColorPickerModalV2 .acp2-photo{display:block;width:100%;height:90px;object-fit:cover;border-radius:7px;margin-bottom:6px}#aceilColorPickerModalV2 .acp2-chip:has(.acp2-photo) .acp2-chip-code{white-space:normal;overflow-wrap:anywhere;font-size:12px;min-height:29px}#aceilColorPickerModalV2 .acp2-chip-marks{flex-wrap:wrap}#aceilColorPickerModalV2 .acp2-chip-code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}";document.head.appendChild(s)}
function buildModal(){if(gid("aceilColorPickerModalV2"))return;installPickerStyles();var modal=document.createElement("div");modal.id="aceilColorPickerModalV2";modal.innerHTML='<div class="acp2-card"><div class="acp2-head"><div><div class="acp2-title">Плівка / полотно</div><div class="acp2-sub" id="acp2Sub"></div></div><button type="button" class="acp2-x" id="acp2Close">×</button></div><div class="acp2-body"><div class="acp2-label">Серія</div><div class="acp2-series" id="acp2Series"></div><div class="acp2-label acp2-pop-label"><span>Популярні</span><small>★ оберіть до 4</small></div><div class="acp2-popular" id="acp2Popular"></div><label class="acp2-search"><span>⌕</span><input id="acp2Search" type="text" inputmode="search" placeholder="Пошук: 303, глянець, мат…" autocomplete="off" autocapitalize="off" spellcheck="false"></label><div class="acp2-tabs" id="acp2Tabs"></div><div class="acp2-grid" id="acp2Grid"></div></div></div>';document.body.appendChild(modal);gid("acp2Close").addEventListener("click",closePicker);gid("acp2Search").addEventListener("input",function(){_searchQuery=this.value;_activeTexture="";renderTabs();renderGrid()});modal.addEventListener("click",function(e){if(e.target===modal)closePicker()});installManualUi()}
function renderSeries(){var host=gid("acp2Series");if(!host)return;host.innerHTML=seriesList().map(function(s){return'<button type="button" class="'+(s.id===_activeSeries?'active':'')+'" onclick="window.__aceilColorPickerSeries(\''+esc(s.id)+'\')">'+esc(s.name)+'</button>'}).join("");var meta=seriesById(_activeSeries),sub=gid("acp2Sub");if(sub)sub.textContent=(meta.manufacturer||"")+" · "+catalog(_activeSeries).length+" кольорів/фактур"}
function renderPopular(){var host=gid("acp2Popular");if(!host)return;var current=currentFilm(),list=catalog(_activeSeries).filter(function(c){return popularCodes().indexOf(c.code)!==-1});host.innerHTML=list.length?list.map(function(c){return'<button type="button" class="acp2-pop-btn'+(c.code===current.code&&current.seriesId===_activeSeries?' active':'')+'" onclick="window.__aceilColorPickerChoose(\''+c.code+'\',\''+c.texture+'\',\''+_activeSeries+'\')">'+esc(c.displayCode||c.code)+'</button>'}).join(""):'<span style="font-size:11px;color:#94a3b8">Позначте кольори зірочкою</span>'}
function renderTabs(){var host=gid("acp2Tabs");if(!host)return;var labels=texLabels();host.innerHTML=["lak","mat","satin","fabric"].map(function(t){var count=catalog(_activeSeries).filter(function(c){return c.texture===t}).length;if(!count)return"";return'<button type="button" class="acp2-tab'+(t===_activeTexture?' active':'')+'" onclick="window.__aceilColorPickerTab(\''+t+'\')">'+esc(labels[t]||t)+' <span>'+count+'</span></button>'}).join("")}
var TEXTURE_WORDS={"глянець":"lak","глянц":"lak","лак":"lak","мат":"mat","матов":"mat","сатин":"satin"};
function renderGrid(){var host=gid("acp2Grid");if(!host)return;var q=norm(_searchQuery).replace(/\s+/g,""),list,all=catalog(_activeSeries);if(q){var wt="";Object.keys(TEXTURE_WORDS).forEach(function(w){if(q.indexOf(w)===0)wt=TEXTURE_WORDS[w]});list=all.filter(function(c){return c.code.toLowerCase().indexOf(q)!==-1||norm(c.displayCode).replace(/\s+/g,"").indexOf(q)!==-1||norm(c.colorName).replace(/\s+/g,"").indexOf(q)!==-1||(wt&&c.texture===wt)})}else if(_activeTexture)list=all.filter(function(c){return c.texture===_activeTexture});else list=[];if(!list.length){host.innerHTML='<div class="acp2-empty">'+(q?'Нічого не знайдено':(all.length?'Оберіть фактуру вище або скористайтесь пошуком':'Для цього виробника ще немає кольорів — натисніть «Додати вручну»'))+'</div>';return}var current=currentFilm(),favorites=popularCodes();host.innerHTML=list.map(function(c){var marks=widthCandidates(c).map(function(w){return'<span>'+Math.round(w.max*100)+'</span>'}).join(""),tex=q?'<div class="acp2-chip-tex">'+esc(c.colorName||texLabels()[c.texture]||"")+'</div>':"";return'<button type="button" class="acp2-chip'+(c.code===current.code&&current.seriesId===_activeSeries?' active':'')+'" onclick="window.__aceilColorPickerChoose(\''+c.code+'\',\''+c.texture+'\',\''+_activeSeries+'\')"><span class="acp2-star'+(favorites.indexOf(c.code)>=0?' active':'')+'" role="button" onclick="event.preventDefault();event.stopPropagation();window.__aceilColorPickerTogglePopular(\''+c.code+'\');return false">'+(favorites.indexOf(c.code)>=0?'★':'☆')+'</span>'+(c.photo?'<img class="acp2-photo" src="'+esc(c.photo)+'" alt="'+esc(c.displayCode||c.code)+' — фото полотна" loading="lazy">':'')+(c.swatch?'<span class="acp2-swatch" style="background:'+esc(c.swatch)+'" aria-hidden="true"></span>':'')+(c.custom?'<span class="acp2-edit" role="button" title="Редагувати" onclick="event.preventDefault();event.stopPropagation();window.__aceilColorPickerManual(\''+esc(c.code)+'\');return false">✎</span>':'')+'<div class="acp2-chip-code">'+esc(c.displayCode||c.code)+'</div>'+(!q&&c.colorName?'<div class="acp2-chip-tex">'+esc(c.colorName)+'</div>':'')+tex+'<div class="acp2-chip-marks">'+marks+'</div></button>'}).join("")}
function openPicker(e){if(e){e.preventDefault();e.stopPropagation()}buildModal();var cur=currentFilm();_activeSeries=seriesList().some(function(s){return s.id===cur.seriesId})?cur.seriesId:"premium";_searchQuery="";_activeTexture="";var input=gid("acp2Search");if(input)input.value="";renderSeries();renderPopular();renderTabs();renderGrid();gid("aceilColorPickerModalV2").classList.add("open");if(input)setTimeout(function(){input.focus()},180);return false}
function closePicker(){var m=gid("aceilColorPickerModalV2");if(m)m.classList.remove("open");if(typeof closeManualForm==="function"&&gid("acp2Form"))closeManualForm()}

/* ===== Ручне додавання: виробник / колір / ширина ===== */
var _form=null;
function manualApi(){return window.ACEILCustomFilm||null}
function installManualStyles(){
 if(gid("aceilManualFilmStyles"))return;
 var s=document.createElement("style");s.id="aceilManualFilmStyles";
 s.textContent="#aceilColorPickerModalV2 .acp2-manual-add{width:100%;margin:14px 0 0;padding:12px;border:1.5px dashed #93c5fd;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:13px;font-weight:900;box-shadow:none}"
 +"#aceilColorPickerModalV2 .acp2-edit{position:absolute;left:5px;top:5px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;border:1px solid #dbe4f0;color:#475569;font-size:11px}"
 +"#aceilColorPickerModalV2 .acp2-form{display:none}#aceilColorPickerModalV2 .acp2-form.open{display:block}"
 +"#aceilColorPickerModalV2 .acp2-f-lbl{display:block;margin:0 0 10px;font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.03em}"
 +"#aceilColorPickerModalV2 .acp2-f-lbl input,#aceilColorPickerModalV2 .acp2-f-lbl select{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1.5px solid #dbe4f0;border-radius:11px;background:#fff;color:#0f172a;font-size:15px;font-weight:800;text-transform:none;letter-spacing:0}"
 +"#aceilColorPickerModalV2 .acp2-f-lbl input[type=color]{height:42px;padding:3px}#aceilColorPickerModalV2 .acp2-f-lbl input:disabled{background:#f1f5f9;color:#64748b}"
 +"#aceilColorPickerModalV2 .acp2-f-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}"
 +"#aceilColorPickerModalV2 .acp2-wrow{display:grid;grid-template-columns:1fr 1fr 1fr 34px;gap:6px;align-items:end;margin-bottom:8px}#aceilColorPickerModalV2 .acp2-wrow label{display:block;margin:0;font-size:10px;font-weight:900;color:#64748b}"
 +"#aceilColorPickerModalV2 .acp2-wrow input{display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:9px 6px;border:1.5px solid #dbe4f0;border-radius:10px;font-size:15px;font-weight:800;color:#0f172a;background:#fff;min-width:0}"
 +"#aceilColorPickerModalV2 .acp2-wrow button{height:38px;border:0;border-radius:10px;background:#fee2e2;color:#b91c1c;font-weight:900;padding:0;box-shadow:none}"
 +"#aceilColorPickerModalV2 .acp2-f-hint{margin:0 0 10px;font-size:11px;color:#64748b;line-height:1.35}#aceilColorPickerModalV2 .acp2-f-err{display:none;margin:0 0 10px;padding:9px 11px;border-radius:10px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:800}"
 +"#aceilColorPickerModalV2 .acp2-f-actions{display:flex;gap:8px;margin-top:6px}#aceilColorPickerModalV2 .acp2-f-actions button{flex:1;padding:12px;border-radius:12px;border:0;font-size:14px;font-weight:900;box-shadow:none}"
 +"#aceilColorPickerModalV2 .acp2-f-save{background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff}#aceilColorPickerModalV2 .acp2-f-cancel{background:#f1f5f9;color:#475569}#aceilColorPickerModalV2 .acp2-f-del{flex:0 0 auto!important;background:#fee2e2;color:#b91c1c}"
 +"#aceilColorPickerModalV2 .acp2-addw{width:100%;padding:9px;border:1.5px dashed #cbd5e1;border-radius:11px;background:#f8fafc;color:#475569;font-size:12px;font-weight:900;box-shadow:none;margin-bottom:12px}";
 document.head.appendChild(s);
}
function installManualUi(){
 var card=document.querySelector("#aceilColorPickerModalV2 .acp2-card"),body=document.querySelector("#aceilColorPickerModalV2 .acp2-body");
 if(!card||!body||gid("acp2Form"))return;
 installManualStyles();
 var add=document.createElement("button");add.type="button";add.className="acp2-manual-add";add.id="acp2ManualAdd";add.textContent="＋ Додати вручну: виробник / колір / ширина";
 add.addEventListener("click",function(){openManualForm()});
 body.appendChild(add);
 var form=document.createElement("div");form.className="acp2-form";form.id="acp2Form";card.appendChild(form);
 form.addEventListener("click",onFormClick);
}
function widthRowHtml(w){
 w=w||{};
 function f(v){return v==null||v===""?"":String(v).replace(".",",")}
 return '<div class="acp2-wrow"><label>Ширина, м<input data-f="nominal" type="text" inputmode="decimal" placeholder="3,6" value="'+esc(f(w.nominal))+'"></label>'
  +'<label>Макс. роб., м<input data-f="max" type="text" inputmode="decimal" placeholder="= ширині" value="'+esc(f(w.max&&w.max!==w.nominal?w.max:""))+'"></label>'
  +'<label>Ціна, грн/м²<input data-f="price" type="text" inputmode="decimal" placeholder="0" value="'+esc(f(w.price))+'"></label>'
  +'<button type="button" data-act="rm" title="Прибрати ширину">×</button></div>';
}
function openManualForm(code){
 var api=manualApi();if(!api)return;buildModal();
 var editing=code?api.getColor(_activeSeries,code):null,meta=seriesById(_activeSeries),custom=api.isCustomSeries(_activeSeries);
 var manufacturers=[];seriesList().forEach(function(s){var m=s.manufacturer||s.name;if(m&&manufacturers.indexOf(m)<0)manufacturers.push(m)});
 var collection=custom&&meta.name!==meta.manufacturer?String(meta.name).slice(String(meta.manufacturer).length).trim():"";
 var texture=editing?editing.texture:(_activeTexture||"mat"),digits=editing?(editing.display||editing.code):"";
 var swatch=editing&&editing.swatch?editing.swatch:"#ffffff";
 _form={seriesId:editing?_activeSeries:null,originalCode:editing?editing.code:null};
 var widths=editing?editing.widths:[{nominal:"3,6",max:"",price:""}];
 var h='<div class="acp2-head"><div><div class="acp2-title">'+(editing?"Редагувати колір":"Нова плівка")+'</div><div class="acp2-sub">Виробник · колір · ширини з цінами</div></div><button type="button" class="acp2-x" data-act="cancel">×</button></div>'
  +'<label class="acp2-f-lbl">Виробник<input id="acp2FMan" type="text" list="acp2FManList" maxlength="40" placeholder="Наприклад: Descor" autocomplete="off" value="'+esc(custom?meta.manufacturer:"")+'"'+(editing?' disabled':'')+'></label>'
  +'<datalist id="acp2FManList">'+manufacturers.map(function(m){return'<option value="'+esc(m)+'">'}).join("")+'</datalist>'
  +'<label class="acp2-f-lbl">Серія / колекція (необов’язково)<input id="acp2FCol" type="text" maxlength="40" placeholder="Наприклад: Premium" autocomplete="off" value="'+esc(collection)+'"'+(editing?' disabled':'')+'></label>'
  +'<div class="acp2-f-row"><label class="acp2-f-lbl">Фактура<select id="acp2FTex"><option value="lak"'+(texture==="lak"?" selected":"")+'>Глянець</option><option value="mat"'+(texture==="mat"?" selected":"")+'>Мат</option><option value="satin"'+(texture==="satin"?" selected":"")+'>Сатин</option><option value="fabric"'+(texture==="fabric"?" selected":"")+'>Тканина</option></select></label>'
  +'<label class="acp2-f-lbl">Код кольору<input id="acp2FCode" type="text" maxlength="20" placeholder="A12 / PS-204" autocomplete="off" value="'+esc(digits)+'"></label></div>'
  +'<div class="acp2-f-row"><label class="acp2-f-lbl">Опис (необов’язково)<input id="acp2FName" type="text" maxlength="40" placeholder="Білий" autocomplete="off" value="'+esc(editing?editing.colorName:"")+'"></label>'
  +'<label class="acp2-f-lbl">Колір зразка<input id="acp2FSwatch" type="color" value="'+esc(swatch)+'"></label></div>'
  +'<div class="acp2-label">Ширини полотна</div><p class="acp2-f-hint">«Макс. роб.» — до якої ширини кімнати це полотно можна використати (наприклад, 5,1 → 5,6). Якщо порожньо — дорівнює ширині. Для тканини ціна задається окремо для кожного кольору й ширини; для плівки — для фактури й ширини серії.</p>'
  +'<div id="acp2FWidths">'+widths.map(widthRowHtml).join("")+'</div><button type="button" class="acp2-addw" data-act="addw">＋ Ще ширина</button>'
  +'<div class="acp2-f-err" id="acp2FErr"></div>'
  +'<div class="acp2-f-actions">'+(editing?'<button type="button" class="acp2-f-del" data-act="del">🗑</button>':'')+'<button type="button" class="acp2-f-cancel" data-act="cancel">Скасувати</button><button type="button" class="acp2-f-save" data-act="save">Зберегти й обрати</button></div>';
 var form=gid("acp2Form");form.innerHTML=h;form.classList.add("open");
 var body=document.querySelector("#aceilColorPickerModalV2 .acp2-body"),head=document.querySelector("#aceilColorPickerModalV2 .acp2-card > .acp2-head");
 if(body)body.style.display="none";if(head)head.style.display="none";
 gid("aceilColorPickerModalV2").classList.add("open");
}
function closeManualForm(){
 var form=gid("acp2Form");if(form){form.classList.remove("open");form.innerHTML=""}
 var body=document.querySelector("#aceilColorPickerModalV2 .acp2-body"),head=document.querySelector("#aceilColorPickerModalV2 .acp2-card > .acp2-head");
 if(body)body.style.display="";if(head)head.style.display="";_form=null;
}
function showFormError(msg){var el=gid("acp2FErr");if(!el)return;el.textContent=msg;el.style.display="block";try{el.scrollIntoView({block:"nearest"})}catch(_){}}
function onFormClick(e){
 var t=e.target.closest&&e.target.closest("[data-act]");if(!t)return;
 var act=t.getAttribute("data-act"),api=manualApi();
 if(act==="cancel"){closeManualForm();renderGrid();return}
 if(act==="addw"){var host=gid("acp2FWidths"),d=document.createElement("div");d.innerHTML=widthRowHtml({});host.appendChild(d.firstChild);return}
 if(act==="rm"){var row=t.closest(".acp2-wrow"),host2=gid("acp2FWidths");if(host2.children.length>1)row.remove();else row.querySelectorAll("input").forEach(function(i){i.value=""});return}
 if(act==="del"&&_form&&_form.originalCode){
  if(!confirm("Видалити колір "+_form.originalCode+" з каталогу?\nУже додані до проєктів позиції залишаться."))return;
  api.deleteColor(_form.seriesId,_form.originalCode);closeManualForm();renderSeries();renderPopular();renderTabs();renderGrid();return;
 }
 if(act==="save"){
  var widths=[].map.call(gid("acp2FWidths").querySelectorAll(".acp2-wrow"),function(r){
   function v(n){return r.querySelector('[data-f="'+n+'"]').value.trim()}
   return {nominal:v("nominal"),max:v("max"),price:v("price")};
  }).filter(function(w){return w.nominal||w.max||w.price});
  var man=gid("acp2FMan"),col=gid("acp2FCol");
  try{
   var res=api.saveColor({seriesId:_form&&_form.seriesId,originalCode:_form&&_form.originalCode,manufacturer:man.value,collection:col.value,
    texture:gid("acp2FTex").value,display:gid("acp2FCode").value,colorName:gid("acp2FName").value,swatch:gid("acp2FSwatch").value,widths:widths});
   _activeSeries=res.seriesId;closeManualForm();
   try{window.dispatchEvent(new CustomEvent("aceil:film-pricing-saved"))}catch(_){}
   chooseColor(res.code,res.texture,res.seriesId);
  }catch(err){showFormError(err&&err.message||"Не вдалося зберегти.")}
 }
}
window.__aceilColorPickerManual=function(code){openManualForm(code)};
window.__aceilColorPickerChoose=chooseColor;window.__aceilColorPickerTogglePopular=togglePopular;
window.__aceilColorPickerSeries=function(id){_activeSeries=id;_activeTexture="";_searchQuery="";var input=gid("acp2Search");if(input)input.value="";renderSeries();renderPopular();renderTabs();renderGrid()};
window.__aceilColorPickerTab=function(t){_activeTexture=t;_searchQuery="";var input=gid("acp2Search");if(input)input.value="";renderTabs();renderGrid()};

function totalCorners(){var inner=parseInt((gid("inCorners")||{}).textContent,10)||0,outer=parseInt((gid("outCorners")||{}).textContent,10)||0,n=inner+outer;if(!n)try{var p=(typeof pts!=="undefined"&&Array.isArray(pts))?pts:window.pts;if(Array.isArray(p))n=p.length}catch(_){window.__diagSilent&&window.__diagSilent(_)}return n}
function updateCornerHeader(){var el=gid("rpcLights"),inner=parseInt((gid("inCorners")||{}).textContent,10)||0,outer=parseInt((gid("outCorners")||{}).textContent,10)||0;if(!el)return;el.textContent=String(inner+outer);var detail=gid("rpcCornersBreakdown");if(!detail){detail=document.createElement("span");detail.id="rpcCornersBreakdown";detail.className="rpc-corners-breakdown";el.insertAdjacentElement("afterend",detail)}detail.innerHTML='<span class="rpc-corner-in">ВН '+inner+'</span><i>·</i><span class="rpc-corner-out">ЗОВ '+outer+'</span>';detail.title="Внутрішні: "+inner+" · Зовнішні: "+outer;detail.setAttribute("aria-label",detail.title)}
function installCornerHeader(){(function(p){if(p)p.stage("cornerHeader",{after:function(){updateCornerHeader();}})})(window["A\u00b7CEIL"]&&window["A\u00b7CEIL"].pipeline&&window["A\u00b7CEIL"].pipeline.get("rpcUpdate"));var oldBadge=window.updateLightBadge;if(typeof oldBadge==="function"&&!oldBadge.__cornerHeader){var badge=function(){var r=oldBadge.apply(this,arguments);updateCornerHeader();return r};badge.__cornerHeader=true;window.updateLightBadge=badge;try{updateLightBadge=badge}catch(_){}}[gid("inCorners"),gid("outCorners")].forEach(function(n){if(n&&typeof MutationObserver==="function")new MutationObserver(updateCornerHeader).observe(n,{childList:true,characterData:true,subtree:true})});document.addEventListener("click",function(){setTimeout(updateCornerHeader,130)},true);updateCornerHeader()}
function installRoomHooks(){var oldLoad=window._loadRoomToCanvas||((typeof _loadRoomToCanvas==="function")?_loadRoomToCanvas:null);if(typeof oldLoad==="function"&&!oldLoad.__colorPickerV3){var loadWrap=function(){var r=oldLoad.apply(this,arguments);scheduleAutoRefresh();updateCornerHeader();return r};loadWrap.__colorPickerV3=true;window._loadRoomToCanvas=loadWrap;try{_loadRoomToCanvas=loadWrap}catch(_){}}var areaNode=gid("area");if(areaNode&&typeof MutationObserver==="function"&&!window.__aceilColorPickerAreaObs){window.__aceilColorPickerAreaObs=new MutationObserver(scheduleAutoRefresh);window.__aceilColorPickerAreaObs.observe(areaNode,{childList:true,characterData:true,subtree:true})}}
var _autoRefreshTimer=null;function recalculateFilm(){if(typeof window.A_CEIL_NormalizeFilmGroups==='function')window.A_CEIL_NormalizeFilmGroups();ensureDefaultFilm();ensureCompleteFilmWidthSet();pinFilmGroupFirst();if(autoCountEnabled()){try{if(typeof autoFillNomenclature==="function")autoFillNomenclature({silent:true})}catch(_){window.__diagSilent&&window.__diagSilent(_)}pinFilmGroupFirst();enforceSmallestFilmRoll()}syncFilmDisplayWidth();updateButton()}function scheduleAutoRefresh(){clearTimeout(_autoRefreshTimer);_autoRefreshTimer=setTimeout(recalculateFilm,80)}
function boot(){if(!buildButton())return;installRoomHooks();installCornerHeader();recalculateFilm();setTimeout(recalculateFilm,500);setTimeout(recalculateFilm,1500)}
window.A_CEILColorPicker={view:filmView,applicableItems:applicableItems,itemMaterialType:itemCeilingMaterial,ceilingKind:ceilingKind,resetMaterialFilter:resetMaterialFilter,toggleMaterialFilter:toggleMaterialFilter,material:filmMaterial,swatchFill:swatchFill,prepareItem:prepareFilmItem,captureDefinitions:captureFilmDefinitions,open:openPicker,close:closePicker,select:function(code,seriesId){seriesId=seriesId||"premium";var c=catalogEntry(String(code||"").toUpperCase(),seriesId);if(c)chooseColor(c.code,c.texture,seriesId)},current:currentFilm,audit:function(){var cur=currentFilm(),entry=catalogEntry(cur.code,cur.seriesId),need=requiredWidthCm();return{code:cur.code,seriesId:cur.seriesId,neededWidthCm:need,widths:widthCandidates(entry),items:currentColorItems().map(function(it){return{name:it.name,seriesId:it.seriesId,filmWidth:it.filmWidth,filmMaxWidth:it.filmMaxWidth,qty:it.qty,price:it.price}})}}};
window.addEventListener("keydown",function(e){if(e.key==="Escape")closePicker()});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();var _bootTries=0,_bootTimer=setInterval(function(){_bootTries++;if(gid("aceilColorPickerBtn")||_bootTries>20){clearInterval(_bootTimer);return}boot()},250);
})();
