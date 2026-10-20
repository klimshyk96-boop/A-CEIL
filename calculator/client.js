(function(){
 'use strict';const M=window.ACEILClientCalc,$=s=>document.getElementById(s),form=$('form');
 window.addEventListener('hashchange',()=>location.reload());
 let catalog,mode='rectangle';const initial={width:'4',length:'5',area:'',perimeter:'',corners:'4',profile:'classic',insert:'white',chandelier:'1',spot:'0',cornice:false,corniceLength:'3',mode:'rectangle'};
 initial.doubleSpot='0';initial.linearDetails='';initial.linearEnabled=false;initial.linearLength='3';initial.roomWidth='';M.slots.forEach(key=>initial[key+'Option']='');
 const demo={version:1,demo:true,company:'A·CEIL · тестовий калькулятор',date:'2026-10-20',minimum:0,items:Object.fromEntries(Object.entries({film:['Плівка MSD Premium',380],classic:['Алюмінієвий профіль',200],shadow:['Тіньовий профіль',550],floating:['Парящий профіль',750],white:['Біла вставка',60],black:['Чорна вставка',60],chandelier:['Монтаж люстри',350],spot:['Монтаж точкового світильника',200],cornice:['Прихований карниз',1000],classicCorners:['Кути базового профілю',100],shadowCorners:['Кути тіньового профілю',200],floatingCorners:['Кути парящого профілю',250],led:['LED підсвічування',500]}).map(([key,[name,price]])=>[key,{name,price}]))};
 function status(text){$('status').textContent=text;}
 function values(){const d=Object.fromEntries(new FormData(form));return{...d,mode,cornice:form.elements.cornice.checked,linearEnabled:form.elements.linearEnabled.checked};}
 function restore(state){if(!state||typeof state!=='object')return;for(const key of Object.keys(initial)){const v=state[key],el=form.elements.namedItem(key);if(v==null||!el)continue;if(key.endsWith('Option')){if(v==='')continue;if(!Array.from(el.options).some(o=>o.value===String(v))){const missing=document.createElement('option');missing.value=String(v);missing.textContent='Варіант недоступний';el.append(missing);}}if(key==='cornice'||key==='linearEnabled')el.checked=v===true;else el.value=String(v).slice(0,key==='linearDetails'?160:80);}mode=state.mode==='manual'?'manual':'rectangle';}
 function productFields(){
  const targets={film:['filmChoices','Плівка'],classic:['profileChoices','Базовий профіль'],shadow:['profileChoices','Тіньовий профіль'],floating:['profileChoices','Парящий профіль'],white:['insertChoices','Біла вставка'],black:['insertChoices','Чорна вставка'],led:['profileChoices','Підсвічування парящого профілю'],chandelier:['lightChoices','Люстра / монтаж'],spot:['lightChoices','Точковий світильник / монтаж'],doubleSpot:['lightChoices','Подвійний точковий / монтаж'],cornice:['corniceChoices','Карниз'],linear:['linearChoices','Світлова лінія']};
  for(const [key,[target,title]] of Object.entries(targets)){
   const choices=catalog.options[key]?.length?catalog.options[key]:(catalog.items[key]?[{id:'',...catalog.items[key]}]:[]);if(!choices.length)continue;
   const label=document.createElement('label'),select=document.createElement('select');label.textContent=title;label.dataset.productSlot=key;select.name=key+'Option';if(['chandelier','spot','doubleSpot'].includes(key)&&choices.length===1)label.dataset.singleLight='';
   for(const item of choices){const option=document.createElement('option');option.value=item.id;option.textContent=item.widths?.length?item.name:item.name+' · '+(item.requiresQuote?'Уточнити':money(item.price))+'/'+(key==='film'?'м²':['chandelier','spot','doubleSpot'].includes(key)?'шт':'м');select.append(option);}label.append(select);$(target).append(label);
  }
  for(const family of ['classic','shadow','floating']){
   const box=document.createElement('div');box.dataset.profileControls=family;box.append(Object.assign(document.createElement('p'),{className:'field-title',textContent:family==='classic'?'Матеріал профілю':'Колір профілю'}));
   const buttons=document.createElement('div');buttons.className='variant-buttons';
   const choices=catalog.options[family]?.length?catalog.options[family]:(catalog.items[family]?[{id:'',...catalog.items[family]}]:[]);
   for(const [variant,title] of family==='classic'?[['aluminium','Алюмінієвий'],['pvc','ПВХ']]:[['white','Білий'],['black','Чорний']]){
    const button=document.createElement('button');button.type='button';button.dataset.profileFamily=family;button.dataset.profileVariant=variant;
    if(family!=='classic'){const dot=document.createElement('span');dot.className='color-dot '+variant;button.append(dot);}button.append(document.createTextNode(title));
    button.disabled=!choices.some(it=>M.profileVariant(it,family)===variant);if(button.disabled)button.title='Цього варіанта немає у збереженому прайсі';
    button.onclick=()=>{const item=choices.find(it=>M.profileVariant(it,family)===variant),select=form.elements.namedItem(family+'Option');if(item&&select){select.value=item.id;calculate();}};buttons.append(button);
   }
   box.append(buttons);$('profileControls').append(box);
  }
 }

 function choices(key){return catalog.options[key]?.length?catalog.options[key]:(catalog.items[key]?[{id:'',...catalog.items[key]}]:[]);}
 function choose(key,test){const item=choices(key).find(test),select=form.elements.namedItem(key+'Option');if(item&&select){select.value=item.id;calculate();}}
 function rangeControls(){
  for(const [series,title] of [['premium','Premium'],['classic','Classic'],['kralton','Kralton']]){
   const b=document.createElement('button');b.type='button';b.textContent=title;b.dataset.filmSeries=series;b.disabled=!choices('film').some(it=>M.filmSeries(it)===series);b.onclick=()=>choose('film',it=>M.filmSeries(it)===series);$('filmSeriesControls').append(b);
  }
  const types=document.createElement('div');types.className='variant-buttons cornice-types';
  for(const [kind,title] of [['surface','Накладний'],['hidden','Прихований'],['wide','Широкий'],['single','Однорядний']]){
   const b=document.createElement('button');b.type='button';b.textContent=title;b.dataset.corniceKind=kind;b.disabled=!choices('cornice').some(it=>M.corniceKind(it)===kind);b.onclick=()=>choose('cornice',it=>M.corniceKind(it)===kind);types.append(b);
  }
  $('corniceControls').append(types);
  const colors=document.createElement('div');colors.className='variant-buttons';colors.id='corniceColors';
  for(const [color,title] of [['white','Білий'],['black','Чорний']]){
   const b=document.createElement('button');b.type='button';b.textContent=title;b.dataset.corniceColor=color;b.onclick=()=>{const current=choices('cornice').find(it=>it.id===values().corniceOption);if(current)choose('cornice',it=>M.corniceKind(it)===M.corniceKind(current)&&M.profileVariant(it,'cornice')===color);};colors.append(b);
  }
  $('corniceControls').append(colors);
 }
 function syncRange(key,group,selector,classify){
  const list=choices(key),select=form.elements.namedItem(key+'Option'),item=list.find(it=>it.id===values()[key+'Option']);if(!item)return;
  const category=classify(item);document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',b.dataset[group]===category));
  for(const o of select.options){const it=list.find(it=>it.id===o.value);o.hidden=!!it&&classify(it)!==category;}
  select.closest('label').hidden=list.filter(it=>classify(it)===category).length<2;
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
  $('corniceControls').hidden=!s.cornice;
  $('corniceChoices').hidden=!s.cornice;$('linearFields').hidden=!s.linearEnabled;
  document.querySelectorAll('[data-profile-controls]').forEach(el=>el.hidden=el.dataset.profileControls!==s.profile);
  form.querySelectorAll('[data-product-slot]').forEach(el=>{const key=el.dataset.productSlot;el.hidden=el.hasAttribute('data-single-light')?true:['classic','shadow','floating'].includes(key)?s.profile!==key:key==='led'?s.profile!=='floating':['white','black'].includes(key)?s.profile!=='classic'||s.insert!==key:false;});
  const profileOptions=catalog.options[s.profile]?.length?catalog.options[s.profile]:(catalog.items[s.profile]?[{id:'',...catalog.items[s.profile]}]:[]),profileItem=profileOptions.find(it=>it.id===s[s.profile+'Option']);
  if(profileItem){
   const variant=M.profileVariant(profileItem,s.profile);document.querySelectorAll('[data-profile-family]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.profileFamily===s.profile&&b.dataset.profileVariant===variant));
   const select=form.elements.namedItem(s.profile+'Option'),group=select?.closest('label'),matching=profileOptions.filter(it=>M.profileVariant(it,s.profile)===variant);
   if(group)group.hidden=matching.length<2;for(const option of select?.options||[]){const item=profileOptions.find(it=>it.id===option.value);option.hidden=!!item&&M.profileVariant(item,s.profile)!==variant;}
   $('profileCurrent').textContent=profileItem.name+' · '+money(profileItem.price)+'/м'+(variant==='standard'?' · колір уточнюється':'');
  }else $('profileCurrent').textContent='Виберіть доступний профіль';
  syncRange('film','filmSeries','[data-film-series]',M.filmSeries);
  syncRange('cornice','corniceKind','[data-cornice-kind]',M.corniceKind);
  const corn=choices('cornice').find(it=>it.id===s.corniceOption),kind=corn&&M.corniceKind(corn),color=corn&&M.profileVariant(corn,'cornice');
  $('corniceColors').hidden=kind==='surface'||!kind;
  document.querySelectorAll('[data-cornice-color]').forEach(b=>{b.disabled=!choices('cornice').some(it=>M.corniceKind(it)===kind&&M.profileVariant(it,'cornice')===b.dataset.corniceColor);b.setAttribute('aria-pressed',b.dataset.corniceColor===color);});
  for(const el of form.querySelectorAll('input'))el.setAttribute('aria-invalid',r.errors.includes(el.name)?'true':'false');
  $('areaMetric').textContent=r.area>0?r.area.toLocaleString('uk-UA')+' м²':'—';$('perimeterMetric').textContent=r.perimeter>0?r.perimeter.toLocaleString('uk-UA')+' м':'—';
  $('total').textContent=r.valid?(r.complete?money(r.total):'Потрібне уточнення'):'Уточніть дані';$('error').hidden=r.valid;
  $('quoteNote').hidden=!r.valid||r.complete;$('quoteNote').textContent='Ціну потрібно уточнити: '+r.quoteRequired.join(', ')+'. Відома частина: '+money(r.total)+'. Це не повна вартість замовлення.';
  $('miniTotal').textContent=r.valid?(r.complete?money(r.total):'Потрібне уточнення'):'Уточніть дані';
  const selectedFilm=(catalog.options.film||[]).find(it=>it.id===s.filmOption)||catalog.items.film;$('filmName').textContent=selectedFilm?.name||'Оберіть плівку';
  $('error').textContent=r.errors.includes('geometry')?'Площа не узгоджується з периметром. Перевірте заміри.':r.errors.includes('roomWidth')?'Вкажіть ширину кімнати для підбору полотна.':r.errors.includes('filmSpan')?'Для такої ширини немає придатного полотна у вибраній плівці. Потрібна перевірка менеджера.':r.errors.some(e=>e.startsWith('price:'))?'Для обраної позиції немає ціни. Зверніться до менеджера.':'Перевірте поля: потрібні додатні розміри та цілі кількості від 0.';
  $('filmRule').textContent=r.film?.legacy&&r.film.quote?'Ціну цієї плівки уточнить менеджер.':r.film?.legacy?'У цьому посиланні немає тарифів за шириною. Показана фіксована ціна; попросіть менеджера оновити прайс.':r.film?.roll?'Для ширини '+r.film.required.toLocaleString('uk-UA')+' м підібрано полотно '+r.film.roll.nominal.toLocaleString('uk-UA')+' м · '+(r.film.roll.requiresQuote?'ціну уточнить менеджер':money(r.film.roll.price)+'/м²')+'.':'Немає придатної ширини полотна — уточніть розміри або зверніться до менеджера.';
  $('filmRule').classList.toggle('warning',!!r.film?.legacy||!r.film?.roll);
  $('rows').replaceChildren();
  if(r.valid)for(const row of r.rows){const el=document.createElement('div');el.className='row';const info=document.createElement('span'),detail=document.createElement('small'),total=document.createElement('b');info.textContent=row.name;detail.textContent=row.qty+' '+row.unit+(row.price===null?' · ціну уточнити':' × '+money(row.price));info.append(detail);total.textContent=row.total===null?'Уточнити':money(row.total);el.append(info,total);$('rows').append(el);}
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
  if(!payload){demo.items.linear={name:'Світлова лінія з LED',price:1500};demo.options={film:[{id:'matte',name:'MSD Premium · біла матова M303',price:380,widths:[{nominal:3.6,max:3.6,price:380},{nominal:5.1,max:5.6,price:420},{nominal:5.8,max:6.2,price:420}]},{id:'satin',name:'MSD Premium · біла сатинова S303',price:380,widths:[{nominal:3.6,max:3.6,price:380},{nominal:5.1,max:5.6,price:420}]}],classic:[{id:'aluminium',name:'Базовий алюмінієвий профіль',material:'aluminium',price:200},{id:'pvc',name:'Базовий профіль ПВХ',material:'pvc',price:150}],shadow:[{id:'shadow-black',name:'Тіньовий профіль чорний',color:'black',price:550},{id:'shadow-white',name:'Тіньовий профіль білий',color:'white',price:600}],floating:[{id:'floating-black',name:'Парящий профіль чорний',color:'black',price:750},{id:'floating-white',name:'Парящий профіль білий',color:'white',price:800}],cornice:[{id:'hidden',name:'Карниз прихований',price:1000},{id:'uno',name:'Карниз UNO',price:1750}]};}
  if(!payload){
   demo.options.film.push({id:'classic-film',series:'classic',name:'MSD Classic · біла матова M303',price:0,requiresQuote:true,widths:[{nominal:3.6,max:3.6,price:0,requiresQuote:true},{nominal:5.1,max:5.6,price:0,requiresQuote:true}]},{id:'kralton-film',series:'kralton',name:'Kralton · біла матова M303',price:500,widths:[{nominal:3.6,max:3.6,price:500},{nominal:5,max:5,price:550},{nominal:6,max:6,price:600}]});
   demo.items.doubleSpot={name:'Подвійний точковий / монтаж',price:0,requiresQuote:true};
   demo.options.cornice=[];
   for(const [kind,title] of [['surface','Накладний'],['hidden','Прихований'],['wide','Широкий'],['single','Однорядний']])for(const color of kind==='surface'?['']:['white','black'])demo.options.cornice.push({id:kind+'-'+color,name:'Карниз '+title.toLowerCase()+(color?' · '+(color==='white'?'білий':'чорний'):''),corniceType:kind,color,price:0,requiresQuote:true});
  }
  catalog=M.config(payload?payload.config:demo);productFields();rangeControls();restore(initial);
  let draft;try{draft=JSON.parse(sessionStorage.getItem('aceil-client-draft:'+M.encode(catalog))||'null');}catch(_){}
  const restored=payload&&payload.state||draft;restore(restored);for(const key of ['chandelier','spot','doubleSpot'])if(restored?.[key]==null&&catalog.items[key]?.requiresQuote)form.elements.namedItem(key).value='0';$('company').textContent=catalog.company;$('demoNotice').hidden=!catalog.demo;$('priceDate').textContent='Прайс у посиланні: '+(catalog.date||'дата не вказана')+'. Оновлення цін — за новим посиланням від менеджера.';
  for(const p of ['classic','shadow','floating']){const el=form.querySelector('[name=profile][value='+p+']');el.disabled=!catalog.items[p]||!catalog.items[p+'Corners']||(p==='floating'&&!catalog.items.led);}
  for(const key of ['white','black'])form.elements.insert.querySelector('[value='+key+']').disabled=!catalog.items[key];
  if(!catalog.items[values().insert])form.elements.insert.value=catalog.items.white?'white':'none';
  if(!form.querySelector('[name=profile]:checked')||form.querySelector('[name=profile]:checked').disabled)form.elements.profile.value='classic';
  for(const key of ['spot','doubleSpot','chandelier','cornice'])if(!catalog.items[key]){form.elements[key].disabled=true;if(key==='cornice')form.elements[key].checked=false;else form.elements[key].value='0';}
  form.elements.linearEnabled.disabled=!catalog.items.linear;if(!catalog.items.linear)form.elements.linearEnabled.checked=false;
  $('missingExtras').textContent=['spot','chandelier','cornice'].some(k=>!catalog.items[k])?'Недоступні позиції ще не додані менеджером до цього прайсу.':'';
  $('calculator').hidden=false;calculate();
 }catch(e){$('unavailable').hidden=false;$('unavailableText').textContent=e.message;return;}
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',calculate);form.addEventListener('change',calculate);
 $('viewEstimate').onclick=()=>$('estimate').scrollIntoView({behavior:'smooth',block:'start'});
 document.querySelector('.brand').onclick=e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{const r=M.estimate(values(),catalog);if(b.dataset.mode==='manual'&&mode==='rectangle'&&r.valid){form.elements.area.value=r.area;form.elements.perimeter.value=r.perimeter;form.elements.roomWidth.value=Math.min(M.number(form.elements.namedItem('width').value),M.number(form.elements.namedItem('length').value));}mode=b.dataset.mode;calculate();});
 $('save').onclick=async()=>{const url=showLink();status(await copy(url)?'Посилання скопійовано. Воно зберігає поточні параметри й ціни.':'Скопіюйте посилання з поля нижче.');};
 function requestText(){const r=M.estimate(values(),catalog);if(!r.valid)throw Error('Перевірте розміри.');return['Прошу перевірити попередній розрахунок стелі.',...[$('name').value.trim(),$('phone').value.trim()].filter(Boolean),r.area+' м² · периметр '+r.perimeter+' м',...r.rows.map(row=>row.name+': '+row.qty+' '+row.unit+' — '+(row.total===null?'Уточнити':money(row.total))),r.complete?'Попередня сума: '+money(r.total):'Повну вартість потрібно уточнити. Відома частина: '+money(r.total),values().linearEnabled&&values().linearDetails?'Світлова лінія: '+values().linearDetails:'',$('comment').value.trim(),currentLink()].filter(Boolean).join('\n');}
 $('share').onclick=async()=>{const text=requestText();if(navigator.share){try{await navigator.share({title:'Попередній розрахунок стелі',text});status('Розрахунок передано в обраний застосунок. Надсилання підтвердіть у ньому.');return;}catch(e){if(e.name==='AbortError'){status('Надсилання скасовано.');return;}}}$('requestFallback').hidden=false;$('requestFallback').value=text;status(await copy(text)?'Текст скопійовано. Вставте його в повідомлення своєму менеджеру.':'Скопіюйте текст нижче та надішліть своєму менеджеру.');};
 $('copyRequest').onclick=async()=>{const text=requestText();$('requestFallback').value=text;$('requestFallback').hidden=false;status(await copy(text)?'Текст скопійовано. Надішліть його менеджеру.':'Виділіть і скопіюйте текст нижче.');};
})();
