(function(){
 'use strict';const M=window.ACEILClientCalc,$=s=>document.getElementById(s),form=$('form');
 window.addEventListener('hashchange',()=>location.reload());
 let catalog,mode='rectangle';const initial={width:'4',length:'5',area:'',perimeter:'',corners:'4',profile:'classic',insert:'white',chandelier:'1',spot:'0',cornice:false,corniceLength:'3',mode:'rectangle'};
 initial.linearEnabled=false;initial.linearLength='3';M.slots.forEach(key=>initial[key+'Option']='');
 const demo={version:1,demo:true,company:'A·CEIL · тестовий калькулятор',date:'2026-10-20',minimum:0,items:Object.fromEntries(Object.entries({film:['Плівка MSD Premium',380],classic:['Алюмінієвий профіль',200],shadow:['Тіньовий профіль',550],floating:['Парящий профіль',750],white:['Біла вставка',60],black:['Чорна вставка',60],chandelier:['Монтаж люстри',350],spot:['Монтаж точкового світильника',200],cornice:['Прихований карниз',1000],classicCorners:['Кути базового профілю',100],shadowCorners:['Кути тіньового профілю',200],floatingCorners:['Кути парящого профілю',250],led:['LED підсвічування',500]}).map(([key,[name,price]])=>[key,{name,price}]))};
 function status(text){$('status').textContent=text;}
 function values(){const d=Object.fromEntries(new FormData(form));return{...d,mode,cornice:form.elements.cornice.checked,linearEnabled:form.elements.linearEnabled.checked};}
 function restore(state){if(!state||typeof state!=='object')return;for(const key of Object.keys(initial)){const v=state[key],el=form.elements.namedItem(key);if(v==null||!el)continue;if(key.endsWith('Option')){if(v==='')continue;if(!Array.from(el.options).some(o=>o.value===String(v))){const missing=document.createElement('option');missing.value=String(v);missing.textContent='Варіант недоступний';el.append(missing);}}if(key==='cornice'||key==='linearEnabled')el.checked=v===true;else el.value=String(v).slice(0,80);}mode=state.mode==='manual'?'manual':'rectangle';}
 function productFields(){
  const targets={film:['filmChoices','Плівка'],classic:['profileChoices','Базовий профіль'],shadow:['profileChoices','Тіньовий профіль'],floating:['profileChoices','Парящий профіль'],white:['insertChoices','Біла вставка'],black:['insertChoices','Чорна вставка'],led:['profileChoices','Підсвічування парящого профілю'],chandelier:['lightChoices','Люстра / монтаж'],spot:['lightChoices','Точковий світильник / монтаж'],cornice:['corniceChoices','Карниз'],linear:['linearChoices','Світлова лінія']};
  for(const [key,[target,title]] of Object.entries(targets)){
   const choices=catalog.options[key]?.length?catalog.options[key]:(catalog.items[key]?[{id:'',...catalog.items[key]}]:[]);if(!choices.length)continue;
   const label=document.createElement('label'),select=document.createElement('select');label.textContent=title;label.dataset.productSlot=key;select.name=key+'Option';
   for(const item of choices){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+money(item.price)+'/'+(key==='film'?'м²':['chandelier','spot'].includes(key)?'шт':'м');select.append(option);}label.append(select);$(target).append(label);
  }
 }
 function currentLink(){return M.link(location.href,catalog,values());}
 function showLink(){const url=currentLink();$('savedLink').value=url;$('linkFallback').hidden=false;return url;}
 async function copy(text){if(navigator.clipboard&&navigator.clipboard.writeText){try{await navigator.clipboard.writeText(text);return true;}catch(_){}}return false;}
 const money=v=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(v)+' грн';
 function calculate(){
  const s=values();if(s.profile!=='classic')s.insert='none';const r=M.estimate(s,catalog);
  $('rectangleFields').hidden=mode!=='rectangle';$('manualFields').hidden=mode!=='manual';
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
  $('insertField').hidden=s.profile!=='classic';$('specialHint').hidden=s.profile==='classic';$('corniceField').hidden=!s.cornice;
  $('corniceChoices').hidden=!s.cornice;$('linearFields').hidden=!s.linearEnabled;
  form.querySelectorAll('[data-product-slot]').forEach(el=>{const key=el.dataset.productSlot;el.hidden=['classic','shadow','floating'].includes(key)?s.profile!==key:key==='led'?s.profile!=='floating':['white','black'].includes(key)?s.profile!=='classic'||s.insert!==key:false;});
  for(const el of form.querySelectorAll('input'))el.setAttribute('aria-invalid',r.errors.includes(el.name)?'true':'false');
  $('areaMetric').textContent=r.area>0?r.area.toLocaleString('uk-UA')+' м²':'—';$('perimeterMetric').textContent=r.perimeter>0?r.perimeter.toLocaleString('uk-UA')+' м':'—';
  $('total').textContent=r.valid?money(r.total):'Уточніть дані';$('error').hidden=r.valid;
  $('error').textContent=r.errors.includes('geometry')?'Площа не узгоджується з периметром. Перевірте заміри.':r.errors.some(e=>e.startsWith('price:'))?'Для обраної позиції немає ціни. Зверніться до менеджера.':'Перевірте поля: потрібні додатні розміри та цілі кількості від 0.';
  $('rows').replaceChildren();
  if(r.valid)for(const row of r.rows){const el=document.createElement('div');el.className='row';const info=document.createElement('span'),detail=document.createElement('small'),total=document.createElement('b');info.textContent=row.name;detail.textContent=row.qty+' '+row.unit+' × '+money(row.price);info.append(detail);total.textContent=money(row.total);el.append(info,total);$('rows').append(el);}
  $('save').disabled=$('share').disabled=$('copyRequest').disabled=!r.valid;
  if(mode==='rectangle'&&!r.errors.includes('width')&&!r.errors.includes('length')){
   const w=M.number(s.width),h=M.number(s.length),scale=Math.min(230/w,110/h),rw=w*scale,rh=h*scale,x=(330-rw)/2,y=(190-rh)/2;
   $('plan').innerHTML='<svg viewBox="0 0 330 190" role="img" aria-label="Прямокутник у пропорціях введених розмірів"><rect x="'+x+'" y="'+y+'" width="'+rw+'" height="'+rh+'" rx="1" fill="#f0f5ff" stroke="#2563eb" stroke-width="2"/><text x="165" y="'+(y-12)+'" text-anchor="middle" fill="#475569" font-size="12">'+w+' м</text><text x="'+(x+rw+12)+'" y="100" fill="#475569" font-size="12">'+h+' м</text></svg>';
  }else{$('plan').replaceChildren();$('plan').textContent=mode==='manual'?'Розрахунок за площею та периметром':'Введіть розміри кімнати';}
  try{sessionStorage.setItem('aceil-client-draft:'+M.encode(catalog),JSON.stringify(s));}catch(_){}
  // A changed draft is no longer the previously copied calculation.
  $('linkFallback').hidden=true;return r;
 }
 try{
  const payload=location.hash?M.decode(location.hash.slice(1)):null;
  if(!payload&&new URLSearchParams(location.search).get('demo')!=='1')throw Error('Відкрийте посилання від менеджера — у ньому вже будуть ціни та доступні рішення.');
  if(!payload){demo.items.linear={name:'Світлова лінія з LED',price:1500};demo.options={film:[{id:'matte',name:'Біла матова MSD Premium',price:380},{id:'satin',name:'Біла сатинова MSD Premium',price:400}],cornice:[{id:'hidden',name:'Карниз прихований',price:1000},{id:'uno',name:'Карниз UNO',price:1750}]};}
  catalog=M.config(payload?payload.config:demo);productFields();restore(initial);
  let draft;try{draft=JSON.parse(sessionStorage.getItem('aceil-client-draft:'+M.encode(catalog))||'null');}catch(_){}
  restore(payload&&payload.state||draft);$('company').textContent=catalog.company;$('demoNotice').hidden=!catalog.demo;$('priceDate').textContent='Прайс у посиланні: '+(catalog.date||'дата не вказана')+'. Оновлення цін — за новим посиланням від менеджера.';
  for(const p of ['classic','shadow','floating']){const el=form.querySelector('[name=profile][value='+p+']');el.disabled=!catalog.items[p]||!catalog.items[p+'Corners']||(p==='floating'&&!catalog.items.led);}
  for(const key of ['white','black'])form.elements.insert.querySelector('[value='+key+']').disabled=!catalog.items[key];
  if(!catalog.items[values().insert])form.elements.insert.value=catalog.items.white?'white':'none';
  if(!form.querySelector('[name=profile]:checked')||form.querySelector('[name=profile]:checked').disabled)form.elements.profile.value='classic';
  for(const key of ['spot','chandelier','cornice'])if(!catalog.items[key]){form.elements[key].disabled=true;if(key==='cornice')form.elements[key].checked=false;else form.elements[key].value='0';}
  form.elements.linearEnabled.disabled=!catalog.items.linear;if(!catalog.items.linear)form.elements.linearEnabled.checked=false;
  $('missingExtras').textContent=['spot','chandelier','cornice'].some(k=>!catalog.items[k])?'Недоступні позиції ще не додані менеджером до цього прайсу.':'';
  $('calculator').hidden=false;calculate();
 }catch(e){$('unavailable').hidden=false;$('unavailableText').textContent=e.message;return;}
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',calculate);form.addEventListener('change',calculate);
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{const r=M.estimate(values(),catalog);if(b.dataset.mode==='manual'&&mode==='rectangle'&&r.valid){form.elements.area.value=r.area;form.elements.perimeter.value=r.perimeter;}mode=b.dataset.mode;calculate();});
 $('save').onclick=async()=>{const url=showLink();status(await copy(url)?'Посилання скопійовано. Воно зберігає поточні параметри й ціни.':'Скопіюйте посилання з поля нижче.');};
 function requestText(){const r=M.estimate(values(),catalog);if(!r.valid)throw Error('Перевірте розміри.');return['Прошу перевірити попередній розрахунок стелі.',...[$('name').value.trim(),$('phone').value.trim()].filter(Boolean),r.area+' м² · периметр '+r.perimeter+' м',...r.rows.map(row=>row.name+': '+row.qty+' '+row.unit+' — '+money(row.total)),'Попередня сума: '+money(r.total),$('comment').value.trim(),currentLink()].filter(Boolean).join('\n');}
 $('share').onclick=async()=>{const text=requestText();if(navigator.share){try{await navigator.share({title:'Попередній розрахунок стелі',text});status('Розрахунок передано в обраний застосунок. Надсилання підтвердіть у ньому.');return;}catch(e){if(e.name==='AbortError'){status('Надсилання скасовано.');return;}}}$('requestFallback').hidden=false;$('requestFallback').value=text;status(await copy(text)?'Текст скопійовано. Вставте його в повідомлення своєму менеджеру.':'Скопіюйте текст нижче та надішліть своєму менеджеру.');};
 $('copyRequest').onclick=async()=>{const text=requestText();$('requestFallback').value=text;$('requestFallback').hidden=false;status(await copy(text)?'Текст скопійовано. Надішліть його менеджеру.':'Виділіть і скопіюйте текст нижче.');};
})();
