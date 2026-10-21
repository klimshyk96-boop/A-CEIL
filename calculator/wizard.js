(function(){
 'use strict';
 const $=id=>document.getElementById(id),M=window.ACEILClientCalc;
 let api,step=0;const active=new Set();
 const keys=['chandelier','spot','doubleSpot','cornice','linearEnabled'];
 function state(){return{};}
 function restore(s){
  if(s?.mode!=='contour')return s;
  $('oldContourNotice').hidden=false;
  return{...s,mode:'manual',points:[],area:'',perimeter:'',roomWidth:'',corners:'4'};
 }
 function go(next){
  const errors=M.estimate(api.values(),api.catalog).errors.filter(k=>['width','length','area','perimeter','corners','roomWidth','geometry','contour'].includes(k));
  if(next>0&&errors.length){if(step!==0)go(0);$('stepError').hidden=false;$('stepError').textContent=errors.includes('contour')?'Замкніть контур без перетинів.':'Перевірте розміри кімнати.';return;}
  step=Math.max(0,Math.min(api.catalog.catalogue?1:2,next));$('stepError').hidden=true;
  document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=Number(el.dataset.panel)!==step);
  document.querySelectorAll('[data-step]').forEach(b=>{if(Number(b.dataset.step)===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  $('stepBack').hidden=step===0;$('stepNext').textContent=api.catalog.catalogue?['Обрати позиції →','Переглянути розрахунок →'][step]:['Обрати стелю →','Додати деталі →','Переглянути розрахунок →'][step];
  document.querySelector('[data-panel="'+step+'"] h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
 }
 function openEstimate(){const box=$('estimateDialog');if(!box.open){box.append($('estimate'));box.showModal();}}
 function sync(s){
  $('plan').hidden=false;
  for(const key of keys){
   const el=$('form').elements.namedItem(key),on=['cornice','linearEnabled'].includes(key)?el.checked:Number(el.value)>0;
   if(on)active.add(key);
   document.querySelector('[data-extra="'+key+'"]')?.setAttribute('aria-pressed',String(active.has(key)));
   const panel=document.querySelector('[data-extra-panel="'+key+'"]');if(panel)panel.hidden=!active.has(key);
  }
 }
 function init(context){
  api=context;const form=$('form');
  const icons={chandelier:'<path d="M8 20h24M20 5v5M12 10h16l6 12H6zM20 22v8M13 30h14"/>',spot:'<ellipse cx="20" cy="15" rx="13" ry="6"/><path d="M7 15v5c0 8 26 8 26 0v-5M15 31v3M25 31v3"/>',doubleSpot:'<rect x="3" y="10" width="34" height="18" rx="6"/><circle cx="12" cy="19" r="5"/><circle cx="28" cy="19" r="5"/>',linearEnabled:'<path d="m7 29 9-18 9 18 8-18M6 33h28"/>',cornice:'<path d="M5 9h30M9 9v24M31 9v24M9 15h22M14 16v17M20 16v17M26 16v17"/>'};
  for(const [key,title,slot] of [['chandelier','Люстра','chandelier'],['spot','Точкові','spot'],['doubleSpot','Подвійні','doubleSpot'],['linearEnabled','Світлова лінія','linear'],['cornice','Карниз','cornice']]){
   const b=document.createElement('button');b.type='button';b.className='extra-card';b.dataset.extra=key;b.setAttribute('aria-pressed','false');b.disabled=!api.catalog.items[slot];
   b.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true">'+icons[key]+'</svg><b>'+title+'</b><span class="extra-mark">+</span>';
   b.onclick=()=>{const el=form.elements.namedItem(key),on=!active.has(key);if(on)active.add(key);else active.delete(key);if(['cornice','linearEnabled'].includes(key))el.checked=on;else el.value=on?'1':'0';api.calculate();};$('extraCards').append(b);
  }
  document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>go(Number(b.dataset.step)));
  $('stepNext').onclick=()=>step===(api.catalog.catalogue?1:2)?openEstimate():go(step+1);$('stepBack').onclick=()=>go(step-1);
  $('viewEstimate').onclick=$('viewEstimateDesktop').onclick=openEstimate;
  const close=document.createElement('button');close.type='button';close.className='modal-close';close.textContent='← Повернутися до вибору';close.onclick=()=>$('estimateDialog').close();$('estimateDialog').prepend(close);
  $('estimateDialog').addEventListener('close',()=>$('estimateHome').append($('estimate')));
  $('reviewRequest').onclick=()=>{openEstimate();document.querySelector('.contact').open=true;$('name').focus();};
  go(0);
 }
 window.ACEILClientUI=Object.freeze({state,restore,init,sync});
})();
