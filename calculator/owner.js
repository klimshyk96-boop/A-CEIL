(function(){
 'use strict';
 const fields=[['film','Плівка, грн/м²','area','area'],['classic','Класичний профіль, грн/м','main_profile','meter'],['classicCorners','Кути класичного профілю, грн/шт','corners','piece'],['shadow','Тіньовий профіль, грн/м','shadow_profile','meter'],['shadowCorners','Кути тіньового профілю, грн/шт','shadow_corners','piece'],['floating','Парящий профіль, грн/м','floating_profile','meter'],['floatingCorners','Кути парящого профілю, грн/шт','floating_corners','piece'],['led','LED для парящого профілю, грн/м','','meter'],['white','Біла вставка, грн/м','white_insert','meter'],['black','Чорна вставка, грн/м','white_insert','meter'],['chandelier','Люстра, грн/шт','chandelier','piece'],['spot','Точковий світильник, грн/шт','spot','piece'],['cornice','Прихований карниз, грн/м','','meter']];
 function items(){try{return Array.isArray(elemItems)?elemItems:[];}catch(_){return [];}}
 function catalogueItems(){
  const raw=items(),out=raw.filter(it=>!(Number(it&&it.filmWidth)>0&&it.colorCode)),series=window.ACEIL_FILM_SERIES||[];
  series.filter(s=>s.active!==false).forEach(s=>{
   const entries=window.ACEIL_COLOR_CATALOG_BY_SERIES?.[s.id]||[],prices=window.ACEILGetFilmPricing?.(s.id)||{};
   const codes=new Set(['M303','L303','S303',...raw.filter(it=>(it.seriesId||it.filmSeriesId||'premium')===s.id).map(it=>it.colorCode).filter(Boolean)]);
   entries.filter(e=>codes.has(e.code)).forEach(e=>{
    const current=raw.filter(it=>it.colorCode===e.code&&(it.seriesId||it.filmSeriesId||'premium')===s.id&&Number(it.filmWidth)>0);
    const bands=e.filmWidths?.length?e.filmWidths:[{nominal:3.6,max:3.6,priceKey:'narrow'},...(e.wide510?[{nominal:5.1,max:5.6,priceKey:'wide'}]:[])];
    const widths=bands.map(w=>{const live=current.find(it=>Math.abs(Number(it.filmWidth)-w.nominal)<1e-6),price=live?Number(live.price):Number(prices[e.texture]?.[w.priceKey]);return{nominal:Number(w.nominal),max:Number(w.max)||Number(w.nominal),price};}).filter(w=>w.nominal>0&&w.max>0&&Number.isFinite(w.price)&&w.price>0);
    if(!widths.length)return;
    const texture=window.ACEIL_TEXTURE_LABELS?.[e.texture]||e.label||e.texture;
    out.push({id:'film:'+s.id+':'+e.code,name:[s.manufacturer,s.name,texture,e.colorName||e.code].filter(Boolean).join(' · '),unit:'м²',price:widths[0].price,source:'area',widths,filmFamily:true,filmSelected:current.some(it=>it.filmSelected),originalIds:current.map(it=>String(it.id))});
   });
  });
  return out;
 }
 function exportProduct(it,key,list){
  const out={name:it.name,price:Number(it.price)};
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
 function storageKey(){let uid='local';try{uid=_sbUser&&_sbUser.id||uid;}catch(_){}return 'aceil-client-preset:'+uid;}
 function unitOf(item){const unit=String(item.unit||'').toLowerCase();return /²|2|кв/.test(unit)?'area':/^(м|м\.|м\/п|м.п.|м.п|пог.м|пог\. м|м.пог|м.пог.)$/.test(unit)?'meter':/шт|од/.test(unit)?'piece':'unknown';}
 function text(tag,value){const node=document.createElement(tag);node.textContent=value;return node;}
 function open(){
  document.getElementById('aceilClientSetup')?.remove();const dialog=document.createElement('dialog');dialog.id='aceilClientSetup';
  const style=text('style','#aceilClientSetup{border:1px solid #dbe4f0;border-radius:20px;padding:22px;width:min(560px,94vw);max-height:88dvh;overflow:auto;color:#17263d;background:#fff}#aceilClientSetup::backdrop{background:#0f172a88}#aceilClientSetup h2{font-size:20px;margin:0 0 12px}#aceilClientSetup p{font-size:13px;color:#64748b;line-height:1.5}#aceilClientSetup label{display:block;font-size:13px;font-weight:700;margin:14px 0}#aceilClientSetup input,#aceilClientSetup select{width:100%;padding:11px;font-size:16px;margin-top:7px;border:1px solid #dbe4f0;border-radius:10px;background:white;color:#17263d}#aceilClientSetup button,#aceilClientSetup a{display:inline-block;padding:12px;margin:6px 6px 0 0;border-radius:10px;border:0;background:#eff5ff;color:#1d4ed8;font-weight:700;font-size:13px;text-decoration:none}#aceilClientSetup button[type=submit]{background:#2563eb;color:white}#aceilClientSetup output{display:block;font-size:13px;margin-top:14px;color:#854d0e}');
  dialog.append(style,text('h2','Калькулятор для клієнта'),text('p','Клієнт сам обирає профіль, вставку, світло та карниз у готовому калькуляторі. Налаштуйте прайс один раз, далі просто копіюйте посилання.'));
  const form=document.createElement('form');let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}');}catch(_){}
  const quick=document.createElement('section'),settings=document.createElement('details'),settingsTitle=text('summary','Налаштувати прайс');settings.append(settingsTitle);settings.style.marginTop='18px';settingsTitle.style.cursor='pointer';settingsTitle.style.fontWeight='700';
  const output=document.createElement('output');output.setAttribute('aria-live','polite');
  function ready(catalog){
   catalog=window.ACEILClientCalc.config(catalog);quick.replaceChildren();
   const url=window.ACEILClientCalc.link('https://a-ceil.pp.ua/',catalog),previewUrl=window.ACEILClientCalc.link(location.href,catalog);
   quick.append(text('p','Готовий калькулятор · '+catalog.company));
   const summary=text('p',fields.filter(([key])=>catalog.items[key]).map(([key,label])=>label.split(',')[0]).join(' · '));quick.append(summary);
   const assortment=document.createElement('details');assortment.append(text('summary','Збережений асортимент і ціни'));
   fields.forEach(([key,label])=>{const rows=catalog.options[key]?.length?catalog.options[key]:(catalog.items[key]?[catalog.items[key]]:[]);if(!rows.length)return;assortment.append(text('h4',label));rows.forEach(item=>assortment.append(text('p',item.name+' · '+item.price+' грн')));});quick.append(assortment);
   quick.append(text('p','Прайс збережено '+catalog.date+'. Для нового клієнта повторно налаштовувати нічого не потрібно. Після зміни цін відкрийте «Змінити прайс» і збережіть їх.'));
   const label=text('label','Посилання для клієнта · без Vercel'),input=document.createElement('input');input.value=url;input.readOnly=true;label.append(input);quick.append(label);
   const copy=text('button','Скопіювати посилання');copy.type='button';copy.dataset.clientCopy='';copy.style.background='#2563eb';copy.style.color='white';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);output.textContent='Посилання скопійовано.';}catch(_){input.focus();input.select();output.textContent='Скопіюйте виділене посилання.';}};
   const view=text('a','Відкрити калькулятор');view.href=url;view.target='_blank';view.rel='noopener';quick.append(copy,view);
   if(location.hostname!=='a-ceil.pp.ua'){const preview=text('a','Перевірити на тесті');preview.href=previewUrl;preview.target='_blank';preview.rel='noopener';quick.append(preview);}
   settings.open=false;settingsTitle.textContent='Змінити прайс';
  }
  let configured=false;try{if(saved.__catalog){ready(saved.__catalog);configured=true;}}catch(_){}
  if(!configured){settings.open=true;quick.append(text('p','Одноразове налаштування: перевірте зіставлення з номенклатурою нижче. Надалі тут буде кнопка копіювання готового посилання.'));}
  let rs={};try{rs=_loadRS();}catch(_){}
  const company=text('label','Назва компанії'),companyInput=document.createElement('input');companyInput.name='company';companyInput.maxLength=80;companyInput.value=saved.company||rs.companyName||'A·CEIL';company.append(companyInput);form.append(company);
  const list=catalogueItems().filter(it=>it&&Number.isFinite(Number(it.price))&&Number(it.price)>=0);
  const filmId=id=>list.find(it=>String(it.id)===String(id)||it.originalIds?.includes(String(id)))?.id||id;
  if(saved.film)saved.film=filmId(saved.film);if(Array.isArray(saved.filmOptions))saved.filmOptions=saved.filmOptions.map(filmId);
  if(saved.__catalog&&saved.__productRules!==2){settings.open=true;settingsTitle.textContent='Оновити прайс із підбором ширини';output.textContent='Збережіть прайс ще раз, щоб нове посилання враховувало ширини плівки та варіанти профілів.';}
  fields.forEach(([key,label,source,unit])=>{
   const wrap=text('label',label),select=document.createElement('select');select.name=key;const empty=text('option',key.endsWith('Corners')?'Не пропонувати':'Без основної позиції');empty.value='';select.append(empty);
   const pool=list.filter(it=>unitOf(it)===unit);pool.forEach((it)=>{const option=text('option',it.name+' · '+Number(it.price)+' грн');option.value=String(it.id);select.append(option);});
   let candidates=source?pool.filter(it=>it.source===source&&(key!=='white'&&key!=='black'||(it.sourceVariant||'white')===key)):[];
   if(key==='film'){const selected=pool.filter(it=>it.filmSelected===true);if(selected.length===1)candidates=selected;else if(!saved.film){const white=pool.find(it=>it.id==='film:premium:M303');if(white)candidates=[white];}}
   if(!source){const pattern=key==='led'?/^LED монохром$|^LED підсвічування$|^LED стрічка$/i:key==='linear'?/^Світлова лінія$/i:/^Карниз прихований(?: 1)?$/i;candidates=pool.filter(it=>pattern.test(String(it.name||'').trim()));}
   // An ambiguous price selection always requires the owner to choose.
   const chosen=pool.find(it=>String(it.id)===String(saved[key]))||(candidates.length===1?candidates[0]:null);
   if(chosen)select.value=String(chosen.id);if(['film','classic','classicCorners'].includes(key)){select.required=true;empty.textContent='Оберіть обов’язкову позицію';}
   wrap.append(select);form.append(wrap);
   if(!key.endsWith('Corners')){
    const extra=document.createElement('details'),summary=text('summary','Додаткові варіанти для клієнта'),search=document.createElement('input'),options=document.createElement('div');extra.dataset.assortment=key;summary.style.cursor='pointer';search.type='search';search.placeholder='Знайти позицію у номенклатурі';search.setAttribute('aria-label','Пошук: '+label);extra.append(summary,search,options);
    const selected=new Set(Array.isArray(saved[key+'Options'])?saved[key+'Options'].map(String):[]);
    if(['classic','shadow','floating'].includes(key)&&saved.__productRules!==2){const family=pool.filter(it=>it.source===source);for(const variant of key==='classic'?['aluminium','pvc']:['white','black']){const matches=family.filter(it=>window.ACEILClientCalc.profileVariant({...it,color:it.sourceVariant},key)===variant);if(matches.length===1)selected.add(String(matches[0].id));}}
    pool.forEach(item=>{const row=text('label',''),checkbox=document.createElement('input');row.style.display='flex';row.style.alignItems='center';row.style.gap='8px';checkbox.type='checkbox';checkbox.name=key+'Options';checkbox.value=String(item.id);checkbox.checked=selected.has(String(item.id));checkbox.style.width='20px';checkbox.style.margin='0';row.append(checkbox,text('span',item.name+' · '+Number(item.price)+' грн'));options.append(row);});
    search.oninput=()=>{const q=search.value.toLocaleLowerCase('uk');Array.from(options.children).forEach(row=>row.style.display=row.textContent.toLocaleLowerCase('uk').includes(q)?'flex':'none');};
    form.append(extra);
   }
  });
  form.append(text('p','Позиція у верхньому списку — варіант за замовчуванням. Позначте додаткові плівки, карнизи, світильники та світлові лінії, які клієнт зможе обирати. Якщо основну позицію не обрано, першою буде перша позначена; якщо не обрано нічого — категорія недоступна клієнту. Ціни беруться з номенклатури; редагуйте ціну у самій позиції й збережіть прайс тут повторно. Для всіх варіантів одного типу профілю використовується спільна обрана ставка кутів.'));
  const minLabel=text('label','Мінімальне замовлення, грн (0 — без обмеження)'),minimum=document.createElement('input');minimum.name='minimum';minimum.type='number';minimum.min=0;minimum.max=100000;minimum.value=saved.minimum||0;minLabel.append(minimum);form.append(minLabel);
  form.append(text('p','Тіньовий і парящий профілі доступні клієнту лише з ціною їхніх кутів; для парящого також потрібна LED. Якщо кути включені в профіль, виберіть окрему позицію кутів із ціною 0. Карниз у цій версії додається окремо, без автоматичного віднімання від периметра профілю.'));
  const submit=text('button','Зберегти прайс');submit.type='submit';form.append(submit);settings.append(form);
  const close=text('button','Закрити');close.type='button';close.onclick=()=>dialog.close();dialog.append(quick,settings,output,close);document.body.append(dialog);
  form.onsubmit=async e=>{
   e.preventDefault();output.textContent='';const fd=new FormData(form),data=Object.fromEntries(fd),catalog={version:1,company:data.company,date:new Date().toISOString().slice(0,10),minimum:Number(data.minimum),items:{},options:{}};
   for(const [key] of fields){const item=list.find(it=>String(it.id)===data[key]);if(item)catalog.items[key]=exportProduct(item,key,list);}
   for(const [key] of fields){
    if(key.endsWith('Corners'))continue;data[key+'Options']=fd.getAll(key+'Options');
    const ids=Array.from(new Set([data[key],...data[key+'Options']].filter(Boolean))),chosen=ids.map(id=>list.find(it=>String(it.id)===id)).filter(Boolean);
    if(chosen.length)catalog.options[key]=chosen.map((it,i)=>({id:key+'-'+i,...exportProduct(it,key,list)}));
   }
   try{
    const clean=window.ACEILClientCalc.config(catalog);window.ACEILClientCalc.link('https://a-ceil.pp.ua/',clean);localStorage.setItem(storageKey(),JSON.stringify({...data,__catalog:clean,__productRules:2}));ready(clean);output.textContent='Прайс, ширини плівки й доступні варіанти збережено.';
   }catch(err){output.textContent=err.message;}
  };dialog.showModal();
 }
 function install(){const menu=document.getElementById('elemMenu');if(!menu||document.getElementById('aceilClientSetupButton'))return;const button=text('button','Калькулятор для клієнта');button.type='button';button.id='aceilClientSetupButton';button.onclick=()=>{if(typeof closeElemMenu==='function')closeElemMenu();open();};menu.prepend(button);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
