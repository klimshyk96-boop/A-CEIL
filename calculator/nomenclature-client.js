(function(){
 'use strict';
 function init({catalog,payload,cloudId}){
  const M=window.ACEILClientCalc,U=window.ACEILClientUI,$=id=>document.getElementById(id),form=$('form'),rows=new Map();let mode='rectangle',selected={};
  const money=v=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(v)+' грн';
  const node=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
  const panel=document.querySelector('[data-panel="1"]');panel.replaceChildren(node('h1','Оберіть потрібні позиції'),node('p','Позначте потрібне та вкажіть кількість. Розрахунок використовує прайс вашого майстра.'));
  const second=document.querySelector('[data-step="1"]');second.replaceChildren(node('span','2'),document.createTextNode(' Позиції'));document.querySelector('[data-step="2"]').hidden=true;
  const unavailable=node('p','');unavailable.className='notice';unavailable.hidden=true;panel.append(unavailable);
  const groups=new Map();for(const group of catalog.groups){const box=document.createElement('details');box.className='nomen-group';box.open=true;box.append(node('summary',group.name));groups.set(group.id,box);panel.append(box);}
  for(const item of catalog.products){
   const box=document.createElement('div');box.className='nomen-product';box.dataset.nomenProduct=item.id;
   const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label',item.name);const title=node('span',item.name);label.append(check,title);
   const rate=node('p','');rate.className='hint';const quantity=document.createElement('label');quantity.textContent='Кількість, '+item.unit;const input=document.createElement('input');input.inputMode='decimal';input.setAttribute('aria-label','Кількість: '+item.name);input.disabled=true;quantity.append(input);
   const reset=node('button',item.basis==='area'?'За площею':item.basis==='perimeter'?'За периметром':'За кількістю кутів');reset.type='button';reset.className='text-button';reset.hidden=item.basis==='manual';
   const total=node('b','');total.className='nomen-line-total';box.append(label,rate,quantity,reset,total);
   let filmControls,filmSelect;
   if(item.series&&catalog.filmCatalog?.[item.series]){
    filmControls=document.createElement('div');filmControls.hidden=true;filmControls.className='nomen-film';const search=document.createElement('input');search.type='search';search.placeholder='Код або назва кольору';search.setAttribute('aria-label','Пошук кольору: '+item.name);
    const color=document.createElement('label');color.textContent='Колір плівки';filmSelect=document.createElement('select');filmSelect.setAttribute('aria-label','Колір: '+item.name);color.append(filmSelect);filmControls.append(search,color);box.insertBefore(filmControls,quantity);
    const entries=(window.ACEIL_COLOR_CATALOG_BY_SERIES?.[item.series]||[]).filter(e=>!item.texture||e.texture===item.texture);
    function options(){const code=selected[item.id]?.filmCode||item.code||entries[0]?.code,q=search.value.trim().toLocaleLowerCase('uk');filmSelect.replaceChildren();for(const entry of entries)if(entry.code===code||(entry.code+' '+(entry.colorName||'')+' '+(entry.label||'')).toLocaleLowerCase('uk').includes(q)){const option=node('option',entry.code+' · '+(entry.colorName||entry.label));option.value=entry.code;filmSelect.append(option);}filmSelect.value=code;}
    search.oninput=options;filmSelect.oninput=filmSelect.onchange=()=>{if(selected[item.id]){selected[item.id]={...selected[item.id],filmCode:filmSelect.value};calculate();}};options();
   }
   check.oninput=check.onchange=()=>{if(check.checked)selected[item.id]=selected[item.id]||{qty:null,...(item.code?{filmCode:item.code}:{})};else delete selected[item.id];calculate();};
   input.oninput=()=>{selected[item.id]={...selected[item.id],qty:input.value};calculate();};reset.onclick=()=>{if(check.checked){selected[item.id]={...selected[item.id],qty:null};calculate();}};
   const group=groups.get(item.groupId)||groups.get('')||panel;group.append(box);rows.set(item.id,{item,box,title,check,rate,input,quantity,reset,total,filmControls,filmSelect});
  }
  const filmRows=[...rows.values()].filter(row=>row.item.series&&catalog.filmCatalog?.[row.item.series]);
  let syncFilmControls=()=>{};
  if(filmRows.length){
   const box=node('section','');box.className='nomen-group compact-film';box.dataset.filmChooser='';
   const label=node('label',''),enabled=document.createElement('input');enabled.type='checkbox';enabled.setAttribute('aria-label','Плівка');label.append(enabled,node('strong','Плівка'));box.append(label);
   const fields=node('div','');fields.className='film-choice-fields';box.append(fields);
   function select(labelText){const label=node('label',labelText),input=document.createElement('select');input.setAttribute('aria-label',labelText);label.append(input);fields.append(label);return input;}
   const series=select('Серія'),texture=select('Фактура'),color=select('Колір');
   for(const [id,name] of [['premium','Premium'],['classic','Classic'],['kralton','Kralton']]){const option=node('option',name);option.value=id;option.disabled=!catalog.filmCatalog?.[id];series.append(option);}
   const initial=filmRows[0].item;series.value=initial.series;let lastCode=initial.code;
   function colors(code){code=code||({mat:'M303',lak:'L303',satin:'S303'})[texture.value];color.replaceChildren();for(const entry of window.ACEIL_COLOR_CATALOG_BY_SERIES?.[series.value]||[])if(entry.texture===texture.value){const option=node('option',entry.code+' · '+(entry.colorName||entry.label||''));option.value=entry.code;color.append(option);}if([...color.options].some(o=>o.value===code))color.value=code;}
   function textures(value,code){texture.replaceChildren();for(const [id,name] of [['lak','Глянець'],['mat','Мат'],['satin','Сатин']]){const option=node('option',name);option.value=id;option.disabled=!catalog.filmCatalog?.[series.value]?.[id];texture.append(option);}texture.value=[...texture.options].some(o=>o.value===value&&!o.disabled)?value:[...texture.options].find(o=>!o.disabled)?.value||'mat';colors(code);}
   function apply(){const previous=filmRows.find(row=>selected[row.item.id]),qty=previous?selected[previous.item.id].qty:null;for(const row of filmRows)delete selected[row.item.id];if(enabled.checked){const target=filmRows.find(row=>row.item.series===series.value&&row.item.texture===texture.value)||filmRows[0];selected[target.item.id]={qty,filmSeriesId:series.value,filmCode:color.value};}calculate();}
   enabled.oninput=enabled.onchange=apply;series.oninput=series.onchange=()=>{enabled.checked=true;textures(texture.value);apply();};texture.oninput=texture.onchange=()=>{enabled.checked=true;colors();apply();};color.oninput=color.onchange=()=>{enabled.checked=true;apply();};
   for(const row of filmRows)box.append(row.box);
   panel.insertBefore(box,[...groups.values()][0]||unavailable.nextSibling);
   for(const group of groups.values())if(!group.querySelector('.nomen-product'))group.hidden=true;
   syncFilmControls=()=>{const active=filmRows.find(row=>selected[row.item.id]),choice=active&&selected[active.item.id];enabled.checked=!!active;if(active){series.value=choice.filmSeriesId||active.item.series;lastCode=choice.filmCode||active.item.code;const entry=window.ACEIL_COLOR_CATALOG_BY_SERIES?.[series.value]?.find(e=>e.code===lastCode);textures(entry?.texture||active.item.texture,lastCode);}for(const row of filmRows)row.box.hidden=row!==active;};
   textures(initial.texture,lastCode);
  }
  function values(){return{...Object.fromEntries(new FormData(form)),mode,selectedProducts:selected};}
  function restore(state){if(!state||typeof state!=='object')return;state=U.restore(state);mode=state.mode==='manual'?'manual':'rectangle';for(const key of ['width','length','area','perimeter','corners','roomWidth'])if(state[key]!=null)form.elements.namedItem(key).value=String(state[key]).slice(0,30);if(state.selectedProducts&&typeof state.selectedProducts==='object')selected=state.selectedProducts;}
  function currentLink(){return cloudId?window.ACEILClientCloud.link(location.href,cloudId,values()):M.link(location.href,catalog,values());}
  function calculate(){
   const s=values(),r=M.estimate(s,catalog);$('rectangleFields').hidden=mode!=='rectangle';$('manualFields').hidden=mode!=='manual';
   document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
   $('areaMetric').textContent=r.area+' м²';$('perimeterMetric').textContent=r.perimeter+' м';
   $('total').textContent=$('miniTotal').textContent=!r.valid?'Перевірте дані':!Object.keys(selected).length?'Оберіть позиції':r.complete?money(r.total):'Потрібне уточнення';
   $('error').hidden=r.valid;$('error').textContent='Перевірте розміри та кількості. Для плівки також перевірте ширину кімнати й доступне полотно.';
   $('quoteNote').hidden=r.complete;$('quoteNote').textContent='Ціну потрібно уточнити: '+r.quoteRequired.join(', ')+'. Відома частина: '+money(r.total)+'.';
   unavailable.hidden=!r.errors.some(e=>e.startsWith('product:'));unavailable.textContent='У збереженому розрахунку є недоступна позиція. Зверніться до майстра для оновлення посилання.';
   for(const [id,row] of rows){const choice=selected[id],result=r.rows.find(it=>it.id===id);row.title.textContent=result?.name||row.item.name;row.check.setAttribute('aria-label',row.title.textContent);row.check.checked=!!choice;row.quantity.hidden=!choice;if(row.filmControls){row.filmControls.hidden=!choice;row.filmSelect.value=choice?.filmCode||row.item.code||row.filmSelect.value;}row.input.disabled=!choice;row.input.value=choice?.qty??({area:r.area,perimeter:r.perimeter,corners:r.corners})[row.item.basis]??1;row.input.setAttribute('aria-invalid',String(r.errors.includes('quantity:'+id)));row.reset.hidden=!choice||row.item.basis==='manual';row.rate.textContent=result?.price!=null?money(result.price)+'/'+row.item.unit:row.item.requiresQuote?'Ціну уточнити':money(row.item.price)+'/'+row.item.unit;row.total.textContent=!choice?'':result?result.total===null?'Уточнити':money(result.total):'Перевірте дані';}
   syncFilmControls();
   $('rows').replaceChildren();for(const item of r.rows){const div=document.createElement('div');div.className='row';div.append(node('span',item.name+' · '+item.qty+' '+item.unit),node('b',item.total===null?'Уточнити':money(item.total)));$('rows').append(div);}
   $('save').disabled=$('share').disabled=$('copyRequest').disabled=!r.valid||!Object.keys(selected).length;
   if(mode==='rectangle'){const w=M.number(s.width),h=M.number(s.length);if(w>0&&h>0){const scale=Math.min(230/w,110/h),x=(330-w*scale)/2,y=(190-h*scale)/2;$('plan').innerHTML='<svg viewBox="0 0 330 190" aria-label="План у масштабі"><rect x="'+x+'" y="'+y+'" width="'+w*scale+'" height="'+h*scale+'" fill="#f0f5ff" stroke="#2563eb" stroke-width="2"/></svg>';}}
   if(mode==='manual')$('plan').textContent='Розрахунок за площею та периметром';
   try{sessionStorage.setItem('aceil-client-draft:'+M.encode(catalog),JSON.stringify(s));}catch(_){}$('linkFallback').hidden=true;U.sync(s);return r;
  }
  let draft;try{draft=JSON.parse(sessionStorage.getItem('aceil-client-draft:'+M.encode(catalog))||'null');}catch(_){}restore(payload?.state||draft);
  $('company').textContent=catalog.company;$('demoNotice').hidden=!catalog.demo;$('priceDate').textContent='Прайс: '+(catalog.date||'дата не вказана');$('loading').hidden=true;$('calculator').hidden=false;
  U.init({catalog,values,calculate});calculate();form.onsubmit=e=>e.preventDefault();form.addEventListener('input',calculate);form.addEventListener('change',calculate);
  document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{const r=M.estimate(values(),catalog);if(button.dataset.mode==='manual'&&mode==='rectangle'&&r.valid){form.elements.area.value=r.area;form.elements.perimeter.value=r.perimeter;form.elements.roomWidth.value=Math.min(M.number(form.elements.namedItem('width').value),M.number(form.elements.namedItem('length').value));}mode=button.dataset.mode;calculate();});
  async function copy(value){try{await navigator.clipboard.writeText(value);return true;}catch(_){return false;}}
  $('save').onclick=async()=>{const url=currentLink();$('savedLink').value=url;$('linkFallback').hidden=false;$('status').textContent=await copy(url)?'Посилання скопійовано.':'Скопіюйте посилання з поля.';};
  function request(){const r=M.estimate(values(),catalog);return['Прошу перевірити розрахунок.',...[$('name').value.trim(),$('phone').value.trim()].filter(Boolean),r.area+' м² · '+r.perimeter+' м',...r.rows.map(row=>row.name+': '+row.qty+' '+row.unit+' — '+(row.total===null?'Уточнити':money(row.total))),r.complete?'Попередня сума: '+money(r.total):'Відома частина: '+money(r.total),$('comment').value.trim(),currentLink()].filter(Boolean).join('\n');}
  $('copyRequest').onclick=async()=>{const value=request();$('requestFallback').value=value;$('requestFallback').hidden=false;$('status').textContent=await copy(value)?'Текст скопійовано.':'Скопіюйте текст нижче.';};
  $('share').onclick=async()=>{const value=request();if(navigator.share){try{await navigator.share({title:'Попередній розрахунок',text:value});return;}catch(e){if(e.name==='AbortError')return;}}$('requestFallback').value=value;$('requestFallback').hidden=false;};
 }
 window.ACEILClientNomenclature=Object.freeze({init});
})();
