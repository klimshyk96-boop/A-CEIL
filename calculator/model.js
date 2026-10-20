(function(root){
 'use strict';
 const slots=['film','classic','shadow','floating','white','black','chandelier','spot','cornice','classicCorners','shadowCorners','floatingCorners','led','linear'];
 const number=v=>Number(String(v??'').trim().replace(',','.'));
 const round=v=>Math.round((v+Number.EPSILON)*100)/100;
 function product(item,key){
  if(!item||typeof item!=='object')throw Error('Некоректна позиція у прайсі.');
  const price=number(item.price);if(!Number.isFinite(price)||price<0||price>1000000)throw Error('Некоректний прайс у посиланні.');
  const out={name:String(item.name||key).slice(0,100),price};
  if(key==='film'&&Array.isArray(item.widths)&&item.widths.length){
   if(item.widths.length>10)throw Error('Забагато ширин полотна.');
   out.widths=item.widths.map(w=>{const nominal=number(w.nominal),max=number(w.max),price=number(w.price);if(!(nominal>0&&nominal<=15&&max>0&&max<=15&&Number.isFinite(price)&&price>=0&&price<=1000000))throw Error('Некоректна ширина або ціна полотна.');return{nominal,max,price};}).sort((a,b)=>a.nominal-b.nominal);
  }
  if(['classic','shadow','floating'].includes(key)){
   if(['pvc','aluminium'].includes(item.material))out.material=item.material;
   if(['white','black'].includes(item.color))out.color=item.color;
   if(item.cornerPrice!=null){const rate=number(item.cornerPrice);if(!Number.isFinite(rate)||rate<0||rate>1000000)throw Error('Некоректна ціна кутів.');out.cornerPrice=rate;}
  }
  return out;
 }
 function profileVariant(item,key){
  const name=String(item&&item.name||'');if(key==='classic')return item.material||(/пвх|pvc/i.test(name)?'pvc':'aluminium');if(item.color)return item.color;
  const white=/біл|white/i.test(name),black=/чорн|black/i.test(name);return white!==black?(white?'white':'black'):'standard';
 }
 function config(raw){
  if(!raw||raw.version!==1)throw Error('Посилання має невідомий формат. Попросіть менеджера створити нове.');
  const out={version:1,company:String(raw.company||'A·CEIL').slice(0,80),date:String(raw.date||'').slice(0,10),minimum:Math.max(0,Math.min(100000,number(raw.minimum)||0)),demo:raw.demo===true,items:{}};
  for(const key of slots){const item=raw.items&&raw.items[key];if(item)out.items[key]=product(item,key);}
  out.options={};let optionCount=0;
  for(const key of slots){const list=raw.options&&raw.options[key];if(!list)continue;if(!Array.isArray(list)||list.length>12)throw Error('Оберіть не більше 12 варіантів в одній категорії.');
   const seen=new Set();out.options[key]=list.map((item,i)=>{const id=String((item&&item.id)??i).slice(0,80);if(seen.has(id))throw Error('Повторний варіант у прайсі.');seen.add(id);return{id,...product(item,key)};});
   optionCount+=list.length;if(list.length&&!out.items[key])out.items[key]=product(out.options[key][0],key);
  }
  if(optionCount>60)throw Error('Оберіть до 60 позицій загалом для клієнтського калькулятора.');
  if(!out.items.film||!out.items.classic||!out.items.classicCorners)throw Error('У посиланні немає ціни плівки, базового профілю або його кутів.');
  return out;
 }
 function estimate(raw,catalog){
  const c=config(catalog),s=raw||{},errors=[],rows=[];
  function value(key,min,max,integer){const n=number(s[key]);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))){errors.push(key);return 0;}return n;}
  const mode=s.mode==='manual'?'manual':'rectangle';let area,perimeter;
  if(mode==='rectangle'){const width=value('width',.3,50),length=value('length',.3,50);area=round(width*length);perimeter=round(2*(width+length));}
  else{area=value('area',.1,2500);perimeter=value('perimeter',1,300);if(area&&perimeter&&perimeter*perimeter+0.01<4*Math.PI*area)errors.push('geometry');}
  const corners=mode==='rectangle'?4:value('corners',3,50,true),chandelier=value('chandelier',0,100,true),spot=value('spot',0,200,true);
  const profile=['classic','shadow','floating'].includes(s.profile)?s.profile:'classic';
  const insert=profile==='classic'&&['white','black'].includes(s.insert)?s.insert:'none';
  const cornice=s.cornice===true?value('corniceLength',.1,50):0;
  function selected(key){const options=c.options[key]||[],choice=String(s[key+'Option']||'');return options.length?(choice?options.find(it=>it.id===choice):options[0]):c.items[key];}
  function row(key,qty,unit,label,override){if(qty<=0)return;const item=override||selected(key);if(!item){errors.push('price:'+key);return;}rows.push({key,name:label||item.name,qty:round(qty),unit,price:item.price,total:round(qty*item.price)});}
  let film=null;const filmItem=selected('film');
  if(filmItem&&filmItem.widths?.length){
   const required=mode==='rectangle'?Math.min(number(s.width),number(s.length)):value('roomWidth',.3,50);
   const roll=required>0&&Number.isFinite(required)?filmItem.widths.find(w=>w.max+1e-9>=required):null;film={required,roll:roll||null,legacy:false};
   if(!roll)errors.push('filmSpan');else row('film',area,'м²',filmItem.name+' · полотно '+roll.nominal+' м',{...filmItem,price:roll.price});
  }else{film={legacy:true};row('film',area,'м²');}
  row(profile,perimeter,'м');
  if(insert!=='none')row(insert,perimeter,'м');
  // Match A·CEIL: all profile corners are counted. A free first four can be
  // represented by a zero retail corner rate, never silently assumed here.
  const chosenProfile=selected(profile),cornerItem=c.items[profile+'Corners'];
  if(cornerItem)row(profile+'Corners',corners,'шт',null,chosenProfile?.cornerPrice!=null?{...cornerItem,price:chosenProfile.cornerPrice}:null);
  row('chandelier',chandelier,'шт');row('spot',spot,'шт');row('cornice',cornice,'м');
  if(s.linearEnabled===true)row('linear',value('linearLength',.1,100),'м');
  if(profile==='floating')row('led',perimeter,'м');
  const subtotal=round(rows.reduce((a,r)=>a+r.total,0)),minimum=round(Math.max(0,c.minimum-subtotal));
  if(minimum)rows.push({key:'minimum',name:'Доплата до мінімального замовлення',qty:1,unit:'посл.',price:minimum,total:minimum});
  return{valid:errors.length===0,errors,area,perimeter,corners,rows,total:round(subtotal+minimum),profile,insert,film};
 }
 function encode(value){const bytes=new TextEncoder().encode(JSON.stringify(value));return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function decode(value){if(typeof value!=='string'||value.length>24000||!/^[\w-]+$/.test(value))throw Error('Посилання пошкоджено або завелике.');const text=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(text,c=>c.charCodeAt(0))));}
 function link(base,c,state){const url=new URL('/calculator/',base),payload=encode({config:config(c),state:state||null});if(payload.length>24000)throw Error('Посилання завелике. Зменште кількість варіантів у прайсі.');url.hash=payload;return url.href;}
 const api={slots,number,config,estimate,encode,decode,link,profileVariant};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ACEILClientCalc=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
