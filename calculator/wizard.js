(function(){
 'use strict';
 const $=id=>document.getElementById(id),M=window.ACEILClientCalc;
 let api,step=0,points=[],closed=false;const active=new Set();
 const keys=['chandelier','spot','doubleSpot','cornice','linearEnabled'];
 function state(){return{points:closed?points:[]};}
 function restore(s){const shape=M.contour(s?.points);if(shape){points=shape.points;closed=true;const max=Math.max(...points.flatMap(p=>[p.x,p.y]));$('drawSpan').value=String([6,10,15,25,50].find(v=>v>=max)||50);}}
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
  $('contourFields').hidden=s.mode!=='contour';$('plan').hidden=s.mode==='contour';
  for(const key of keys){
   const el=$('form').elements.namedItem(key),on=['cornice','linearEnabled'].includes(key)?el.checked:Number(el.value)>0;
   if(on)active.add(key);
   document.querySelector('[data-extra="'+key+'"]')?.setAttribute('aria-pressed',String(active.has(key)));
   const panel=document.querySelector('[data-extra-panel="'+key+'"]');if(panel)panel.hidden=!active.has(key);
  }
  if(s.mode==='contour')paint();
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
  $('contourCanvas').addEventListener('click',event=>{
   if(closed)return;const rect=event.currentTarget.getBoundingClientRect(),span=Number($('drawSpan').value),p={x:Math.round((event.clientX-rect.left)/rect.width*span*4)/4,y:Math.round((event.clientY-rect.top)/rect.height*span*4)/4};
   if(points.length>=3&&Math.hypot(p.x-points[0].x,p.y-points[0].y)<span*.05){closeContour();return;}
   if(points.length>=24||points.length&&Math.hypot(p.x-points.at(-1).x,p.y-points.at(-1).y)<.1)return;
   points.push(p);pointFields();api.calculate();
  });
  $('contourUndo').onclick=()=>{if(closed)closed=false;else points.pop();pointFields();api.calculate();};
  $('contourClear').onclick=()=>{points=[];closed=false;pointFields();api.calculate();};
  $('contourClose').onclick=closeContour;$('drawSpan').onchange=paint;
  pointFields();go(0);
 }
 function closeContour(){closed=!!M.contour(points);api.calculate();if(!closed)$('drawStatus').textContent='Потрібно щонайменше три кути без перетинів і без зайвих точок на прямій.';}
 function pointFields(){
  $('pointFields').replaceChildren();points.forEach((p,i)=>{
   const row=document.createElement('div');row.className='point-row';const name=document.createElement('b');name.textContent=String.fromCharCode(65+i);row.append(name);
   for(const [axis,title] of [['x','Зліва, м'],['y','Зверху, м']]){const label=document.createElement('label');label.textContent=title+' · '+String.fromCharCode(65+i);const input=document.createElement('input');input.inputMode='decimal';input.value=p[axis];input.dataset.point=i;input.dataset.axis=axis;input.oninput=()=>{points[i][axis]=M.number(input.value);api.calculate();};label.append(input);row.append(label);}
   $('pointFields').append(row);
  });
 }
 function paint(){
  const svg=$('contourCanvas'),max=Math.max(0,...points.flatMap(p=>[p.x,p.y]).filter(Number.isFinite));
  if(max>Number($('drawSpan').value))$('drawSpan').value=String([6,10,15,25,50].find(v=>v>=max)||50);
  const span=Number($('drawSpan').value),scale=360/span,clean=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),coords=clean.map(p=>p.x*scale+','+p.y*scale).join(' ');
  let markup='<defs><pattern id="roomGrid" width="'+(scale*.25)+'" height="'+(scale*.25)+'" patternUnits="userSpaceOnUse"><path d="M '+(scale*.25)+' 0 H 0 V '+(scale*.25)+'" fill="none" stroke="#dce4ef" stroke-width=".6"/></pattern></defs><rect width="360" height="360" fill="url(#roomGrid)"/>';
  markup+=(closed?'<polygon':'<polyline')+' points="'+coords+'" fill="'+(closed?'#eaf0ff':'none')+'" stroke="#3159c9" stroke-width="2.5" stroke-linejoin="round"/>';
  clean.forEach((p,i)=>{const x=p.x*scale,y=p.y*scale;markup+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="#3159c9"/><text x="'+Math.max(9,Math.min(347,x+9))+'" y="'+Math.max(14,y-9)+'" fill="#17243d" font-size="12" font-weight="700">'+String.fromCharCode(65+i)+'</text>';if(i||closed){const a=clean[(i+clean.length-1)%clean.length],len=Math.hypot(p.x-a.x,p.y-a.y);markup+='<text x="'+((p.x+a.x)*scale/2)+'" y="'+Math.max(14,(p.y+a.y)*scale/2-7)+'" text-anchor="middle" fill="#3159c9" stroke="#fff" stroke-width="3" paint-order="stroke" font-size="11">'+Number(len.toFixed(2))+' м</text>';}});
  svg.innerHTML=markup;$('drawStatus').textContent=closed?(M.contour(points)?'Контур замкнений · розміри в масштабі':'Контур некоректний — перевірте кути.'):points.length?'Кутів: '+points.length+'. Додайте наступний або замкніть контур.':'Торкніться сітки, щоб додати перший кут.';
  $('contourClose').disabled=closed||points.length<3;$('contourUndo').disabled=!points.length;
 }
 window.ACEILClientUI=Object.freeze({state,restore,init,sync});
})();
