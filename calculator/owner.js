(function(){
 'use strict';
 const fields=[['film','Плівка, грн/м²','area','area'],['classic','Класичний профіль, грн/м','main_profile','meter'],['classicCorners','Кути класичного профілю, грн/шт','corners','piece'],['shadow','Тіньовий профіль, грн/м','shadow_profile','meter'],['shadowCorners','Кути тіньового профілю, грн/шт','shadow_corners','piece'],['floating','Парящий профіль, грн/м','floating_profile','meter'],['floatingCorners','Кути парящого профілю, грн/шт','floating_corners','piece'],['led','LED для парящого профілю, грн/м','','meter'],['white','Біла вставка, грн/м','white_insert','meter'],['black','Чорна вставка, грн/м','white_insert','meter'],['chandelier','Люстра, грн/шт','chandelier','piece'],['spot','Точковий світильник, грн/шт','spot','piece'],['cornice','Прихований карниз, грн/м','','meter']];
 function items(){try{return Array.isArray(elemItems)?elemItems:[];}catch(_){return [];}}
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
  const list=items().filter(it=>it&&Number.isFinite(Number(it.price))&&Number(it.price)>=0);
  fields.forEach(([key,label,source,unit])=>{
   const wrap=text('label',label),select=document.createElement('select');select.name=key;const empty=text('option','Не пропонувати');empty.value='';select.append(empty);
   const pool=list.filter(it=>unitOf(it)===unit);pool.forEach((it)=>{const option=text('option',it.name+' · '+Number(it.price)+' грн');option.value=String(it.id);select.append(option);});
   let candidates=source?pool.filter(it=>it.source===source&&(key!=='white'&&key!=='black'||(it.sourceVariant||'white')===key)):[];
   if(key==='film'){const selected=pool.filter(it=>it.filmSelected===true);if(selected.length===1)candidates=selected;}
   if(!source){const pattern=key==='led'?/^LED монохром$|^LED підсвічування$|^LED стрічка$/i:/^Карниз прихований(?: 1)?$/i;candidates=pool.filter(it=>pattern.test(String(it.name||'').trim()));}
   // An ambiguous price selection always requires the owner to choose.
   const chosen=pool.find(it=>String(it.id)===String(saved[key]))||(candidates.length===1?candidates[0]:null);
   if(chosen)select.value=String(chosen.id);if(['film','classic','classicCorners'].includes(key)){select.required=true;empty.textContent='Оберіть обов’язкову позицію';}
   wrap.append(select);form.append(wrap);
  });
  const minLabel=text('label','Мінімальне замовлення, грн (0 — без обмеження)'),minimum=document.createElement('input');minimum.name='minimum';minimum.type='number';minimum.min=0;minimum.max=100000;minimum.value=saved.minimum||0;minLabel.append(minimum);form.append(minLabel);
  form.append(text('p','Тіньовий і парящий профілі доступні клієнту лише з ціною їхніх кутів; для парящого також потрібна LED. Якщо кути включені в профіль, виберіть окрему позицію кутів із ціною 0. Карниз у цій версії додається окремо, без автоматичного віднімання від периметра профілю.'));
  const submit=text('button','Зберегти прайс');submit.type='submit';form.append(submit);settings.append(form);
  const close=text('button','Закрити');close.type='button';close.onclick=()=>dialog.close();dialog.append(quick,settings,output,close);document.body.append(dialog);
  form.onsubmit=async e=>{
   e.preventDefault();output.textContent='';const data=Object.fromEntries(new FormData(form)),catalog={version:1,company:data.company,date:new Date().toISOString().slice(0,10),minimum:Number(data.minimum),items:{}};
   for(const [key] of fields){const item=list.find(it=>String(it.id)===data[key]);if(item)catalog.items[key]={name:item.name,price:Number(item.price)};}
   try{
    const clean=window.ACEILClientCalc.config(catalog);localStorage.setItem(storageKey(),JSON.stringify({...data,__catalog:clean}));ready(clean);output.textContent='Прайс збережено. Готове посилання буде доступне при наступному відкритті.';
   }catch(err){output.textContent=err.message;}
  };dialog.showModal();
 }
 function install(){const menu=document.getElementById('elemMenu');if(!menu||document.getElementById('aceilClientSetupButton'))return;const button=text('button','Калькулятор для клієнта');button.type='button';button.id='aceilClientSetupButton';button.onclick=()=>{if(typeof closeElemMenu==='function')closeElemMenu();open();};menu.prepend(button);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
