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
  dialog.append(style,text('h2','Калькулятор для клієнта'),text('p','Виберіть позиції зі свого прайсу. Посилання міститиме лише ці назви та роздрібні ціни, без доступу до кабінету. Ціни фіксуються на момент створення посилання.'));
  const form=document.createElement('form');let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}');}catch(_){}
  let rs={};try{rs=_loadRS();}catch(_){}
  const company=text('label','Назва компанії'),companyInput=document.createElement('input');companyInput.name='company';companyInput.maxLength=80;companyInput.value=saved.company||rs.companyName||'A·CEIL';company.append(companyInput);form.append(company);
  const list=items().filter(it=>it&&Number.isFinite(Number(it.price))&&Number(it.price)>=0);
  fields.forEach(([key,label,source,unit])=>{
   const wrap=text('label',label),select=document.createElement('select');select.name=key;const empty=text('option','Не пропонувати');empty.value='';select.append(empty);
   const pool=list.filter(it=>unitOf(it)===unit);pool.forEach((it)=>{const option=text('option',it.name+' · '+Number(it.price)+' грн');option.value=String(it.id);select.append(option);});
   const candidates=source?pool.filter(it=>it.source===source&&(key!=='white'&&key!=='black'||(it.sourceVariant||'white')===key)):[];
   // An ambiguous price selection always requires the owner to choose.
   const chosen=pool.find(it=>String(it.id)===String(saved[key]))||(candidates.length===1?candidates[0]:null);
   if(chosen)select.value=String(chosen.id);if(['film','classic','classicCorners'].includes(key)){select.required=true;empty.textContent='Оберіть обов’язкову позицію';}
   wrap.append(select);form.append(wrap);
  });
  const minLabel=text('label','Мінімальне замовлення, грн (0 — без обмеження)'),minimum=document.createElement('input');minimum.name='minimum';minimum.type='number';minimum.min=0;minimum.max=100000;minimum.value=saved.minimum||0;minLabel.append(minimum);form.append(minLabel);
  form.append(text('p','Тіньовий і парящий профілі доступні клієнту лише з ціною їхніх кутів; для парящого також потрібна LED. Якщо кути включені в профіль, виберіть окрему позицію кутів із ціною 0. Карниз у цій версії додається окремо, без автоматичного віднімання від периметра профілю.'));
  const submit=text('button','Створити посилання');submit.type='submit';const close=text('button','Закрити');close.type='button';close.onclick=()=>dialog.close();form.append(submit,close);
  const output=document.createElement('output'),result=document.createElement('div');form.append(output,result);dialog.append(form);document.body.append(dialog);
  form.onsubmit=async e=>{
   e.preventDefault();result.replaceChildren();output.textContent='';const data=Object.fromEntries(new FormData(form)),catalog={version:1,company:data.company,date:new Date().toISOString().slice(0,10),minimum:Number(data.minimum),items:{}};
   for(const [key] of fields){const item=list.find(it=>String(it.id)===data[key]);if(item)catalog.items[key]={name:item.name,price:Number(item.price)};}
   try{
    const url=window.ACEILClientCalc.link(location.href,catalog);localStorage.setItem(storageKey(),JSON.stringify(data));
    const label=text('label','Посилання для клієнта'),input=document.createElement('input');input.value=url;input.readOnly=true;label.append(input);result.append(label);
    const preview=text('a','Відкрити калькулятор');preview.href=url;preview.target='_blank';preview.rel='noopener';const copy=text('button','Скопіювати');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);output.textContent='Посилання скопійовано.';}catch(_){input.focus();input.select();output.textContent='Скопіюйте виділене посилання.';}};result.append(preview,copy);output.textContent='Готово. Перевірте розрахунок перед надсиланням клієнту.';
   }catch(err){output.textContent=err.message;}
  };dialog.showModal();
 }
 function install(){const menu=document.getElementById('elemMenu');if(!menu||document.getElementById('aceilClientSetupButton'))return;const button=text('button','Калькулятор для клієнта');button.type='button';button.id='aceilClientSetupButton';button.onclick=()=>{if(typeof closeElemMenu==='function')closeElemMenu();open();};menu.prepend(button);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
