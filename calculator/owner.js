(function(){
 'use strict';
 const fields=[['film','Плівка, грн/м²','area','area'],['classic','Класичний профіль, грн/м','main_profile','meter'],['classicCorners','Кути класичного профілю, грн/шт','corners','piece'],['shadow','Тіньовий профіль, грн/м','shadow_profile','meter'],['shadowCorners','Кути тіньового профілю, грн/шт','shadow_corners','piece'],['floating','Парящий профіль, грн/м','floating_profile','meter'],['floatingCorners','Кути парящого профілю, грн/шт','floating_corners','piece'],['led','LED для парящого профілю, грн/м','','meter'],['white','Біла вставка, грн/м','white_insert','meter'],['black','Чорна вставка, грн/м','white_insert','meter'],['chandelier','Люстра, грн/шт','chandelier','piece'],['spot','Точковий світильник, грн/шт','spot','piece'],['cornice','Карнизи, грн/м','','meter']];
 function items(){let live=[];try{live=Array.isArray(elemItems)?elemItems:[];}catch(_){}const master=window['__A·CEILNomenCatalogV339']?.items||[],merged=new Map(live.map(it=>[String(it.id),it]));master.forEach(it=>merged.set(String(it.id),it));return [...merged.values()];}
 function isCornice(it){return /карниз|ніша|uno|уно|cornice/i.test(String(it.name||'')+' '+String(it.source||''));}
 function filmTariffs(){
  const filmCatalog={},filmOverrides={},raw=items();
  for(const series of window.ACEIL_FILM_SERIES||[]){if(series.active===false)continue;const rates=window.ACEILGetFilmPricing?.(series.id)||{};filmCatalog[series.id]=rates;
   for(const entry of window.ACEIL_COLOR_CATALOG_BY_SERIES?.[series.id]||[]){const bands=entry.filmWidths?.length?entry.filmWidths:[{nominal:3.6,priceKey:'narrow'},...(entry.wide510?[{nominal:5.1,priceKey:'wide'}]:[])];for(const w of bands){const item=raw.find(it=>it.colorCode===entry.code&&(it.seriesId||it.filmSeriesId||'premium')===series.id&&Math.abs(Number(it.filmWidth)-w.nominal)<1e-6);if(item&&Number(item.price)!==Number(rates[entry.texture]?.[w.priceKey]||0))filmOverrides[series.id+':'+entry.code+':'+w.nominal]=Number(item.price);}}
  }
  return{filmCatalog,filmOverrides};
 }
 function catalogueItems(){
  const raw=items(),out=raw.filter(it=>!(Number(it&&it.filmWidth)>0&&it.colorCode)),series=window.ACEIL_FILM_SERIES||[];
  series.filter(s=>s.active!==false).forEach(s=>{
   const entries=window.ACEIL_COLOR_CATALOG_BY_SERIES?.[s.id]||[],prices=window.ACEILGetFilmPricing?.(s.id)||{};
   const codes=new Set(['M303','L303','S303',...raw.filter(it=>(it.seriesId||it.filmSeriesId||'premium')===s.id).map(it=>it.colorCode).filter(Boolean)]);
   entries.filter(e=>codes.has(e.code)).forEach(e=>{
    const current=raw.filter(it=>it.colorCode===e.code&&(it.seriesId||it.filmSeriesId||'premium')===s.id&&Number(it.filmWidth)>0);
    const bands=e.filmWidths?.length?e.filmWidths:[{nominal:3.6,max:3.6,priceKey:'narrow'},...(e.wide510?[{nominal:5.1,max:5.6,priceKey:'wide'}]:[])];
    const widths=bands.map(w=>{const live=current.find(it=>Math.abs(Number(it.filmWidth)-w.nominal)<1e-6),price=live?Number(live.price):Number(prices[e.texture]?.[w.priceKey]);return{nominal:Number(w.nominal),max:Number(w.max)||Number(w.nominal),price:price>0?price:0,...(!(price>0)?{requiresQuote:true}:{})};}).filter(w=>w.nominal>0&&w.max>0);
    if(!widths.length)return;
    const texture=window.ACEIL_TEXTURE_LABELS?.[e.texture]||e.label||e.texture;
    out.push({id:'film:'+s.id+':'+e.code,name:[s.manufacturer,s.name,texture,e.colorName||e.code].filter(Boolean).join(' · '),series:s.id,unit:'м²',price:widths[0].price,requiresQuote:widths.every(w=>w.requiresQuote),source:'area',widths,filmFamily:true,filmSelected:current.some(it=>it.filmSelected),originalIds:current.map(it=>String(it.id))});
   });
  });
  const M=window.ACEILClientCalc;
  for(const [key,name,source,unit] of [['chandelier','Люстра / монтаж','chandelier','шт'],['spot','Точковий світильник / монтаж','spot','шт'],['doubleSpot','Подвійний точковий світильник / монтаж','double_spot','шт'],['linear','Світлова лінія','linear','м']]){
   if(!out.some(it=>(it.source===source||(key==='doubleSpot'&&it.source==='lighttype:double_spot'))||(key==='doubleSpot'&&/подвійн|double.spot/i.test(it.name))||(key==='linear'&&/^Світлова лінія$/i.test(it.name))))out.push({id:'quote:'+key,name,price:0,requiresQuote:true,source,unit});
  }
  for(const [kind,title] of [['surface','Накладний'],['hidden','Прихований'],['wide','Широкий'],['single','Однорядний']])for(const color of kind==='surface'?['']:['white','black']){
   if(!out.some(it=>isCornice(it)&&unitOf(it)==='meter'&&M.corniceKind(it)===kind&&(!color||M.corniceColor(it)===color)))out.push({id:'quote:cornice:'+kind+':'+color,name:'Карниз '+title.toLowerCase()+(color?' · '+(color==='white'?'білий':'чорний'):''),unit:'м',price:0,requiresQuote:true,corniceType:kind,color});
  }
  return out;
 }
 function exportProduct(it,key,list){
  const out={name:it.name,price:Number(it.price)};
  if(it.requiresQuote)out.requiresQuote=true;
  if(key==='film'&&it.series)out.series=it.series;
  if(key==='cornice'){out.corniceType=window.ACEILClientCalc.corniceKind(it);const color=window.ACEILClientCalc.corniceColor(it);if(['white','black'].includes(color))out.color=color;}
  if(key==='film'&&it.widths)out.widths=it.widths;
  if(['classic','shadow','floating'].includes(key)){
   if(key==='classic')out.material=window.ACEILClientCalc.profileVariant(it,key);
   else{const color=it.sourceVariant||it.profileColor||window.ACEILClientCalc.profileVariant(it,key);if(['white','black'].includes(color))out.color=color;
    const matches=list.filter(row=>row.source===(key==='shadow'?'shadow_corners':'floating_corners')&&row.sourceVariant===color);if(matches.length===1)out.cornerPrice=Number(matches[0].price);
   }
  }
  return out;
 }
 fields.push(['linear','Світлові лінії, грн/м','','meter']);
 fields.push(['doubleSpot','Подвійний точковий, грн/шт','double_spot','piece']);

 function eligible(it,key,source){
  const n=String(it.name||''),src=String(it.source||'');
  if(key==='film')return it.filmFamily||src==='area';
  if(key==='white'||key==='black')return src==='white_insert'&&(it.sourceVariant||'white')===key;
  if(key==='cornice')return isCornice(it);
  if(key==='linear')return /світлов.*ліні/i.test(n)||src==='linear'||src==='lineartype:lightline';
  if(key==='led')return /LED|стрічка/i.test(n)&&!/блок|живлення|контролер/i.test(n);
  if(key==='doubleSpot')return ['double_spot','lighttype:double_spot'].includes(src)||/подвійн|double.spot/i.test(n);
  if(key==='spot')return (src==='spot'||/точков|спот/i.test(n))&&!/подвійн|double.spot/i.test(n);
  if(key==='chandelier')return src==='chandelier'||/люстр/i.test(n);
  return src===source;
 }
 function optionId(key,it){let a=2166136261,b=5381;for(const c of String(it.id)){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}return key+'-'+(a>>>0).toString(16)+(b>>>0).toString(16);}
 function backend(){try{return typeof _sb!=='undefined'?_sb:window._sb;}catch(_){return null;}}
 function storageKey(){let uid='local';try{uid=_sbUser&&_sbUser.id||uid;}catch(_){}return 'aceil-client-preset:'+uid;}
 function unitOf(item){const unit=String(item.unit||'').toLowerCase();return /²|2|кв/.test(unit)?'area':/^(м|м\.|м\/п|м.п.|м.п|пог.м|пог\. м|м.пог|м.пог.)$/.test(unit)?'meter':/шт|од/.test(unit)?'piece':'unknown';}
 function text(tag,value){const node=document.createElement(tag);node.textContent=value;return node;}
 function open(){
  document.getElementById('aceilClientSetup')?.remove();const dialog=document.createElement('dialog');dialog.id='aceilClientSetup';
  const style=text('style','#aceilClientSetup{border:1px solid #dbe4f0;border-radius:20px;padding:22px;width:min(560px,94vw);max-height:88dvh;overflow:auto;color:#17263d;background:#fff}#aceilClientSetup::backdrop{background:#0f172a88}#aceilClientSetup h2{font-size:20px;margin:0 0 12px}#aceilClientSetup p{font-size:13px;color:#64748b;line-height:1.5}#aceilClientSetup label{display:block;font-size:13px;font-weight:700;margin:14px 0}#aceilClientSetup input,#aceilClientSetup select{width:100%;padding:11px;font-size:16px;margin-top:7px;border:1px solid #dbe4f0;border-radius:10px;background:white;color:#17263d}#aceilClientSetup button,#aceilClientSetup a{display:inline-block;padding:12px;margin:6px 6px 0 0;border-radius:10px;border:0;background:#eff5ff;color:#1d4ed8;font-weight:700;font-size:13px;text-decoration:none}#aceilClientSetup button[type=submit]{background:#2563eb;color:white}#aceilClientSetup output{display:block;font-size:13px;margin-top:14px;color:#854d0e}');
  dialog.append(style,text('h2','Калькулятор для клієнта'),text('p','Позначте, що пропонувати клієнтам. Ціни — з вашої номенклатури.'));
  const form=document.createElement('form');let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}');}catch(_){}
  const quick=document.createElement('details'),settings=document.createElement('details'),settingsTitle=text('summary','Що бачить клієнт');quick.dataset.ownerLinks='';settings.dataset.ownerSettings='';settings.append(settingsTitle);settings.style.marginTop='18px';settingsTitle.style.cursor='pointer';settingsTitle.style.fontWeight='700';
  const output=document.createElement('output');output.setAttribute('aria-live','polite');
  function ready(catalog,showLink=false){
   catalog=window.ACEILClientCalc.config(catalog);quick.hidden=false;quick.replaceChildren(text('summary','Посилання для клієнта'));quick.open=showLink;
   const url=saved.__cloudToken?window.ACEILClientCloud.link('https://a-ceil.pp.ua/',saved.__cloudToken):window.ACEILClientCalc.link('https://a-ceil.pp.ua/',catalog),previewUrl=window.ACEILClientCalc.link(location.href,catalog);
   quick.append(text('p','Готовий калькулятор · '+catalog.company));
   const summary=text('p',fields.filter(([key])=>catalog.items[key]).map(([key,label])=>label.split(',')[0]).join(' · '));quick.append(summary);
   const assortment=document.createElement('details');assortment.append(text('summary','Збережений асортимент і ціни'));
   fields.forEach(([key,label])=>{const rows=catalog.options[key]?.length?catalog.options[key]:(catalog.items[key]?[catalog.items[key]]:[]);if(!rows.length)return;assortment.append(text('h4',label));rows.forEach(item=>assortment.append(text('p',item.name+' · '+(item.requiresQuote?'Уточнити':item.price+' грн'))));});quick.append(assortment);
   quick.append(text('p','Прайс збережено '+catalog.date+'. Після зміни цін відкрийте «Що бачить клієнт» і збережіть вибір.'));
   const label=text('label',saved.__cloudToken?'Постійне посилання для клієнтів':'Тестове посилання · збережений прайс'),input=document.createElement('input');input.value=url;input.readOnly=true;label.append(input);quick.append(label);
   const copy=text('button','Скопіювати посилання');copy.type='button';copy.dataset.clientCopy='';copy.style.background='#2563eb';copy.style.color='white';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);output.textContent='Посилання скопійовано.';}catch(_){input.focus();input.select();output.textContent='Скопіюйте виділене посилання.';}};
   const view=text('a','Відкрити калькулятор');view.href=url;view.target='_blank';view.rel='noopener';quick.append(copy,view);
   if(location.hostname!=='a-ceil.pp.ua'){const preview=text('a','Перевірити на тесті');preview.href=previewUrl;preview.target='_blank';preview.rel='noopener';quick.append(preview);}

   const publish=text('button',saved.__cloudToken?'Оновити прайс у постійному посиланні':'Увімкнути постійне посилання');publish.type='button';publish.dataset.publishCalculator='';publish.onclick=async()=>{
    publish.disabled=true;output.textContent='Публікую прайс…';
    try{const token=await window.ACEILClientCloud.publish(backend(),catalog);saved={...saved,__cloudToken:token};localStorage.setItem(storageKey(),JSON.stringify(saved));ready(catalog,true);output.textContent='Актуальний прайс опубліковано. Посилання залишається тим самим.';}catch(error){output.textContent=error.message;}finally{publish.disabled=false;}
   };quick.append(publish);
   quick.append(text('p',saved.__cloudToken?'Збережіть зміни та натисніть «Оновити прайс у постійному посиланні». Клієнтам повторно надсилати посилання не потрібно.':'Тестове посилання фіксує ціни. Постійне посилання потребує ввімкнення хмарного збереження на сервері.'));
   settings.open=!showLink;settingsTitle.textContent='Що бачить клієнт';
  }
  let configured=false;try{if(saved.__catalog){ready(saved.__catalog);configured=true;}}catch(_){}
  if(!configured){settings.open=true;quick.hidden=true;}
  let rs={};try{rs=_loadRS();}catch(_){}
  const company=text('label','Назва компанії'),companyInput=document.createElement('input');companyInput.name='company';companyInput.maxLength=80;companyInput.value=saved.company||rs.companyName||'A·CEIL';company.append(companyInput);form.append(company);
  const list=catalogueItems().filter(Boolean).map(it=>it.price!=null&&String(it.price).trim()!==''&&Number.isFinite(Number(it.price))&&Number(it.price)>=0?it:{...it,price:0,requiresQuote:true});
  const filmId=id=>list.find(it=>String(it.id)===String(id)||it.originalIds?.includes(String(id)))?.id||id;
  if(saved.film)saved.film=filmId(saved.film);if(Array.isArray(saved.filmOptions))saved.filmOptions=saved.filmOptions.map(filmId);
  if(saved.__catalog&&![4,5].includes(saved.__productRules)){settings.open=true;settingsTitle.textContent='Оновити прайс із підбором ширини';output.textContent='Збережіть прайс ще раз, щоб додати Premium, Classic, Kralton, освітлення та варіанти карнизів. Усі кольори доступні з загальної бази; карнизи — за цінами номенклатури.';}
  const selection=new Map(),roles=new Map(),rows=new Map();
  const roleTitle=key=>fields.find(f=>f[0]===key)?.[1].split(',')[0]||'Оберіть категорію';
  function guess(item){return fields.find(([key,,source,unit])=>unitOf(item)===unit&&eligible(item,key,source))?.[0]||'';}
  list.forEach(item=>roles.set(String(item.id),guess(item)));
  if(saved.__productRules===5&&saved.__selection){
   for(const [id,key] of Object.entries(saved.__selection)){const real=String(filmId(id));if(list.some(it=>String(it.id)===real)&&fields.some(f=>f[0]===key)){selection.set(real,key);roles.set(real,key);}}
  }else{
   // Preserve the previous primary and additional selections when upgrading.
   fields.forEach(([key,,source,unit])=>{
    const pool=list.filter(it=>unitOf(it)===unit&&eligible(it,key,source));
    const ids=new Set([saved[key],...(saved[key+'Options']||[])].filter(Boolean).map(String));
    if(!saved.__catalog&&!saved[key]){
     let candidates=source?pool.filter(it=>it.source===source):[];
     if(key==='film'){const active=pool.filter(it=>it.filmSelected);candidates=active.length===1?active:pool.filter(it=>it.id==='film:premium:M303');}
     if(!source)candidates=pool.filter(it=>(key==='led'?/^LED монохром$|^LED підсвічування$|^LED стрічка$/i:key==='linear'?/^Світлова лінія$/i:/^Карниз прихований(?: 1)?$/i).test(it.name));
     if(candidates.length===1)ids.add(String(candidates[0].id));
    }
    if(saved.__productRules!==4){
     if(key==='film')pool.filter(it=>['film:premium:M303','film:classic:M303','film:kralton:M303'].includes(it.id)).forEach(it=>ids.add(String(it.id)));
     if(key==='cornice')pool.filter(it=>window.ACEILClientCalc.corniceKind(it)!=='other').forEach(it=>ids.add(String(it.id)));
     if(['classic','shadow','floating'].includes(key))for(const variant of key==='classic'?['aluminium','pvc']:['white','black']){
      const matches=pool.filter(it=>window.ACEILClientCalc.profileVariant({...it,color:it.sourceVariant},key)===variant);if(matches.length===1)ids.add(String(matches[0].id));
     }
     if(['chandelier','spot','doubleSpot','linear'].includes(key))pool.filter(it=>it.id==='quote:'+key).forEach(it=>ids.add(String(it.id)));
    }
    for(const id of ids)if(list.some(it=>String(it.id)===id)){selection.set(id,key);roles.set(id,key);}
   });
  }
  const toolbar=document.createElement('div');toolbar.className='owner-toolbar';
  const search=document.createElement('input');search.type='search';search.id='clientAssortmentSearch';search.placeholder='Пошук у всій номенклатурі';search.setAttribute('aria-label','Пошук у всій номенклатурі');
  const tabs=document.createElement('div');tabs.className='owner-tabs';let onlySelected=false;
  const all=text('button','Усі'),chosenTab=text('button','Обрані');all.type=chosenTab.type='button';all.dataset.ownerFilter='all';chosenTab.dataset.ownerFilter='selected';tabs.append(all,chosenTab);
  const count=text('p','');count.id='clientAssortmentCount';count.setAttribute('aria-live','polite');toolbar.append(search,tabs,count);form.append(toolbar);
  const groups=new Map(),groupsDef=[['film','Плівки'],['profile','Профілі та кути'],['insert','Вставки'],['light','Освітлення'],['cornice','Карнизи'],['other','Інші позиції']];
  function groupKey(key){return key==='film'?'film':['classic','shadow','floating','classicCorners','shadowCorners','floatingCorners','led'].includes(key)?'profile':['white','black'].includes(key)?'insert':['chandelier','spot','doubleSpot','linear'].includes(key)?'light':key==='cornice'?'cornice':'other';}
  for(const [key,title] of groupsDef){const group=document.createElement('details');group.className='owner-category';group.open=true;group.append(text('summary',title));groups.set(key,group);form.append(group);}
  function refresh(){
   const query=search.value.trim().toLocaleLowerCase('uk');let visible=0;
   rows.forEach(({row,checkbox,category,meta,item},id)=>{
    const key=roles.get(id)||'',checked=selection.has(id);checkbox.checked=checked;checkbox.name=key?key+'Options':'unassigned';category.value=key;
    category.hidden=!checked||!!guess(item);row.classList.toggle('is-selected',checked);meta.textContent=roleTitle(key)+(key==='film'&&item.filmFamily?' · повна палітра серії':'');
    row.hidden=(onlySelected&&!checked)||!(item.name+' '+roleTitle(key)).toLocaleLowerCase('uk').includes(query);if(!row.hidden)visible++;
   });
   groups.forEach(group=>{const matching=[...group.querySelectorAll('.owner-item')].filter(row=>!row.hidden);group.hidden=!matching.length;group.querySelector('summary').textContent=groupsDef.find(g=>g[0]===group.dataset.group)[1]+' · '+matching.length;});
   count.textContent='Обрано '+selection.size+' · показано '+visible+' із '+list.length;all.setAttribute('aria-pressed',String(!onlySelected));chosenTab.setAttribute('aria-pressed',String(onlySelected));
  }
  groups.forEach((group,key)=>group.dataset.group=key);
  for(const item of list){
   const id=String(item.id),key=roles.get(id),row=document.createElement('div');row.className='owner-item';row.dataset.clientItem=id;
   const label=document.createElement('label'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=id;
   const info=document.createElement('span'),name=text('strong',item.name),rate=text('span',item.requiresQuote?'Ціну уточнити':new Intl.NumberFormat('uk-UA').format(Number(item.price))+' грн/'+(item.unit||'од.')),meta=text('small','');rate.className='owner-rate';info.append(name,rate,meta);label.append(checkbox,info);
   const category=document.createElement('select');category.setAttribute('aria-label','Категорія: '+item.name);const empty=text('option','Оберіть категорію');empty.value='';category.append(empty);
   for(const [slot,title,,unit] of fields)if(unitOf(item)===unit){const option=text('option',title.split(',')[0]);option.value=slot;category.append(option);}
   function assign(next){
    roles.set(id,next);if(next.endsWith('Corners'))for(const [other,role] of selection)if(other!==id&&role===next)selection.delete(other);
    selection.set(id,next);groups.get(groupKey(next)).append(row);refresh();
   }
   checkbox.onchange=()=>{if(checkbox.checked)assign(roles.get(id)||'');else{selection.delete(id);refresh();}};
   category.onchange=()=>assign(category.value);
   row.append(label,category);groups.get(groupKey(key)).append(row);rows.set(id,{row,checkbox,category,meta,item});
  }
  all.onclick=()=>{onlySelected=false;refresh();};chosenTab.onclick=()=>{onlySelected=true;refresh();};search.oninput=refresh;refresh();
  form.append(text('p','Галочка — позиція доступна клієнту. Ціни підтягуються з номенклатури. Для невпізнаної позиції оберіть категорію. Кути та LED рахуються автоматично з відповідним профілем; для кожного типу кутів оберіть одну позицію.'));
  const minLabel=text('label','Мінімальне замовлення, грн (0 — без обмеження)'),minimum=document.createElement('input');minimum.name='minimum';minimum.type='number';minimum.min=0;minimum.max=100000;minimum.value=saved.minimum||0;minLabel.append(minimum);form.append(minLabel);
  form.append(text('p','Для тіньового і парящого профілів оберіть кути; для парящого — також підсвічування. Карнизи рахуються як доповнення до стелі.'));
  const submit=text('button','Зберегти вибір');submit.type='submit';form.append(submit);settings.append(form);
  const close=text('button','Закрити');close.type='button';close.onclick=()=>dialog.close();dialog.append(quick,settings,output,close);document.body.append(dialog);
  form.onsubmit=async e=>{
   e.preventDefault();output.textContent='';
   const data={company:companyInput.value,minimum:minimum.value,__selection:Object.fromEntries(selection)},catalog={version:1,company:data.company,date:new Date().toISOString().slice(0,10),minimum:Number(data.minimum),...filmTariffs(),items:{},options:{}};
   for(const [id,key] of selection){
    const item=list.find(it=>String(it.id)===id),field=fields.find(f=>f[0]===key);
    if(!field||unitOf(item)!==field[3]){output.textContent='Оберіть відповідну категорію для «'+item.name+'».';return;}
   }
   for(const [key] of fields){
    const selected=list.filter(it=>selection.get(String(it.id))===key),previous=selected.find(it=>String(it.id)===String(saved[key]));
    if(previous)selected.splice(selected.indexOf(previous),1),selected.unshift(previous);
    data[key]=selected[0]?String(selected[0].id):'';data[key+'Options']=selected.map(it=>String(it.id));
    if(selected.length)catalog.items[key]=exportProduct(selected[0],key,list);
    if(!key.endsWith('Corners')&&selected.length)catalog.options[key]=selected.map(it=>({id:optionId(key,it),...exportProduct(it,key,list)}));
   }
   // An unchecked series must not reappear through the shared colour palette.
   const series=new Set((catalog.options.film||[]).map(it=>window.ACEILClientCalc.filmSeries(it)));
   for(const key of Object.keys(catalog.filmCatalog))if(!series.has(key))delete catalog.filmCatalog[key];
   try{
    const clean=window.ACEILClientCalc.config(catalog);window.ACEILClientCalc.link('https://a-ceil.pp.ua/',clean);saved={...data,__catalog:clean,__productRules:5,...(saved.__cloudToken?{__cloudToken:saved.__cloudToken}:{})};localStorage.setItem(storageKey(),JSON.stringify(saved));ready(clean,true);output.textContent='Вибір збережено. Клієнту доступні лише позначені позиції.';
   }catch(err){output.textContent=err.message;}

  };
  dialog.append(text('style','#aceilClientSetup .owner-toolbar{position:sticky;top:-22px;background:white;z-index:2;padding:10px 0;border-bottom:1px solid #e0e6f0}#aceilClientSetup .owner-tabs{display:flex;gap:8px}#aceilClientSetup .owner-tabs [aria-pressed=true]{background:#2563eb;color:white}#aceilClientSetup .owner-category{border:1px solid #e0e6f0;border-radius:12px;margin:10px 0;padding:0 12px}#aceilClientSetup .owner-category>summary{padding:14px 0;cursor:pointer;font-size:15px;font-weight:750;color:#263d68}#aceilClientSetup .owner-item{border-top:1px solid #edf1f7;padding:10px 0}#aceilClientSetup .owner-item label{display:flex;align-items:flex-start;gap:10px;margin:0;cursor:pointer}#aceilClientSetup .owner-item input[type=checkbox]{appearance:auto;flex:0 0 22px;width:22px;height:22px;margin:2px 0;accent-color:#2563eb}#aceilClientSetup .owner-item label>span{min-width:0;flex:1}#aceilClientSetup .owner-item strong,#aceilClientSetup .owner-rate,#aceilClientSetup .owner-item small{display:block;overflow-wrap:anywhere;line-height:1.4}#aceilClientSetup .owner-rate{color:#264b9b;margin-top:3px}#aceilClientSetup .owner-item small{color:#64748b;font-size:11px;font-weight:400;margin-top:3px}#aceilClientSetup .owner-item select{font-size:13px;padding:8px;margin:8px 0 0 32px;width:calc(100% - 32px)}#aceilClientSetup [hidden]{display:none!important}'));
  dialog.showModal();
 }
 function install(){const menu=document.getElementById('elemMenu');if(!menu||document.getElementById('aceilClientSetupButton'))return;const button=text('button','Калькулятор для клієнта');button.type='button';button.id='aceilClientSetupButton';button.onclick=()=>{if(typeof closeElemMenu==='function')closeElemMenu();open();};menu.prepend(button);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
