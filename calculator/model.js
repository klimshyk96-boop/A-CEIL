(function(root){
 'use strict';
 const slots=['film','classic','shadow','floating','white','black','chandelier','spot','doubleSpot','cornice','classicCorners','shadowCorners','floatingCorners','led','linear'];
 const number=v=>Number(String(v??'').trim().replace(',','.'));
 const round=v=>Math.round((v+Number.EPSILON)*100)/100;
 function product(item,key){
  if(!item||typeof item!=='object')throw Error('Некоректна позиція у прайсі.');
  const price=number(item.price);if(!Number.isFinite(price)||price<0||price>1000000)throw Error('Некоректний прайс у посиланні.');
  const out={name:String(item.name||key).slice(0,100),price};
  if(item.requiresQuote===true)out.requiresQuote=true;
  if(key==='film'&&['premium','classic','kralton'].includes(item.series))out.series=item.series;
  if(key==='film'&&Array.isArray(item.widths)&&item.widths.length){
   if(item.widths.length>10)throw Error('Забагато ширин полотна.');
   out.widths=item.widths.map(w=>{const nominal=number(w.nominal),max=number(w.max),price=number(w.price);if(!(nominal>0&&nominal<=15&&max>0&&max<=15&&Number.isFinite(price)&&price>=0&&price<=1000000))throw Error('Некоректна ширина або ціна полотна.');return{nominal,max,price,...(w.requiresQuote===true?{requiresQuote:true}:{})};}).sort((a,b)=>a.nominal-b.nominal);
  }
  if(key==='cornice'){if(['surface','hidden','wide','single'].includes(item.corniceType))out.corniceType=item.corniceType;if(['white','black'].includes(item.color))out.color=item.color;}
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
 function filmSeries(item){if(item.series)return item.series;const name=String(item.name||'');return /kralton|кралтон/i.test(name)?'kralton':/classic|класік|класик/i.test(name)?'classic':/premium|преміум/i.test(name)?'premium':'other';}
 function corniceKind(item){if(item.corniceType)return item.corniceType;const name=String(item.name||'')+' '+String(item.source||'');return /широк|wide/i.test(name)?'wide':/одноряд|single|uno|уно/i.test(name)?'single':/наклад|surface/i.test(name)?'surface':/прихов|hidden|ніша/i.test(name)?'hidden':'other';}
 function corniceColor(item){const explicit=String(item.color||item.sourceVariant||'').trim().toLowerCase();if(/^(white|білий|біла|#fff|#ffffff)$/.test(explicit))return 'white';if(/^(black|чорний|чорна|#000|#000000)$/.test(explicit))return 'black';const suffix=String(item.source||'').toLowerCase().match(/:(white|black)$/);return suffix?suffix[1]:profileVariant({name:String(item.name||'')+' '+String(item.source||'')+' '+String(item.sourceVariant||'')},'cornice');}
 const seriesIds=['premium','classic','kralton'],textures=['mat','lak','satin'],rateKeys=['narrow','mid','wide','extraWide'];
 function filmSelection(s,c,palette=root.ACEIL_COLOR_CATALOG_BY_SERIES){
  if(!s.filmCode||!c.filmCatalog)return null;
  const series=s.filmSeriesId,entry=palette?.[series]?.find(e=>e.code===s.filmCode),rates=c.filmCatalog[series]?.[entry?.texture];if(!entry||!rates)return null;
  const bands=entry.filmWidths?.length?entry.filmWidths:[{nominal:3.6,max:3.6,priceKey:'narrow'},...(entry.wide510?[{nominal:5.1,max:5.6,priceKey:'wide'}]:[])];
  const widths=bands.map(w=>{const key=series+':'+entry.code+':'+w.nominal,price=c.filmOverrides?.[key]??rates[w.priceKey]??0;return{nominal:w.nominal,max:w.max,price,requiresQuote:!(price>0)};});
  return{name:({premium:'MSD Premium',classic:'MSD Classic',kralton:'Kralton'})[series]+' · '+entry.code+' · '+({mat:'Мат',lak:'Глянець',satin:'Сатин'})[entry.texture]+(entry.colorName?' · '+entry.colorName:''),series,code:entry.code,texture:entry.texture,price:widths[0].price,widths};
 }
 function contour(raw){
  if(!Array.isArray(raw)||raw.length<3||raw.length>24)return null;
  const p=raw.map(v=>({x:number(v?.x),y:number(v?.y)}));if(p.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y)||v.x<0||v.y<0||v.x>50||v.y>50))return null;
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),between=(a,b,c)=>Math.abs(cross(a,b,c))<1e-8&&c.x>=Math.min(a.x,b.x)-1e-8&&c.x<=Math.max(a.x,b.x)+1e-8&&c.y>=Math.min(a.y,b.y)-1e-8&&c.y<=Math.max(a.y,b.y)+1e-8;
  let area=0,perimeter=0;
  for(let i=0;i<p.length;i++){
   const a=p[i],b=p[(i+1)%p.length],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<.1)return null;area+=a.x*b.y-a.y*b.x;perimeter+=len;
   if(Math.abs(cross(p[(i+p.length-1)%p.length],a,b))<1e-8)return null;
   for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;const c=p[j],d=p[(j+1)%p.length];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||between(a,b,c)||between(a,b,d)||between(c,d,a)||between(c,d,b))return null;}
  }
  area=Math.abs(area)/2;if(area<.1||area>2500||perimeter>300)return null;
  const width=Math.max(...p.map(v=>v.x))-Math.min(...p.map(v=>v.x)),height=Math.max(...p.map(v=>v.y))-Math.min(...p.map(v=>v.y));
  return{points:p,area:round(area),perimeter:round(perimeter),corners:p.length,span:Math.min(width,height)};
 }
 function config(raw){
  if(!raw||raw.version!==1)throw Error('Посилання має невідомий формат. Попросіть менеджера створити нове.');
  const out={version:1,company:String(raw.company||'A·CEIL').slice(0,80),date:String(raw.date||'').slice(0,10),minimum:Math.max(0,Math.min(100000,number(raw.minimum)||0)),demo:raw.demo===true,items:{}};
  if(raw.filmCatalog){
   out.filmCatalog={};
   for(const series of seriesIds){if(!raw.filmCatalog[series])continue;out.filmCatalog[series]={};for(const texture of textures){if(!raw.filmCatalog[series][texture])continue;const rates={};for(const key of rateKeys){const v=raw.filmCatalog[series][texture][key];if(v==null)continue;const n=number(v);if(!Number.isFinite(n)||n<0||n>1000000)throw Error('Некоректний тариф плівки.');rates[key]=n;}out.filmCatalog[series][texture]=rates;}}
   out.filmOverrides={};const overrides=Object.entries(raw.filmOverrides||{});if(overrides.length>400)throw Error('Забагато індивідуальних тарифів плівки.');
   for(const [key,v] of overrides){if(!/^(premium|classic|kralton):[MLS]\d{3}:\d{1,2}(\.\d{1,2})?$/.test(key))throw Error('Некоректний код тарифу плівки.');const n=number(v);if(!Number.isFinite(n)||n<0||n>1000000)throw Error('Некоректний тариф плівки.');out.filmOverrides[key]=n;}
  }
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
 function estimate(raw,catalog,palette){
  const c=config(catalog),s=raw||{},errors=[],rows=[];
  function value(key,min,max,integer){const n=number(s[key]);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))){errors.push(key);return 0;}return n;}
  const mode=['manual','contour'].includes(s.mode)?s.mode:'rectangle';let area,perimeter,shape;
  if(mode==='rectangle'){const width=value('width',.3,50),length=value('length',.3,50);area=round(width*length);perimeter=round(2*(width+length));}
  else if(mode==='contour'){shape=contour(s.points);if(!shape)errors.push('contour');area=shape?.area||0;perimeter=shape?.perimeter||0;}
  else{area=value('area',.1,2500);perimeter=value('perimeter',1,300);if(area&&perimeter&&perimeter*perimeter+0.01<4*Math.PI*area)errors.push('geometry');}
  const corners=mode==='rectangle'?4:mode==='contour'?shape?.corners||0:value('corners',3,50,true),chandelier=value('chandelier',0,100,true),spot=value('spot',0,200,true);
  const profile=['classic','shadow','floating'].includes(s.profile)?s.profile:'classic';
  const insert=profile==='classic'&&['white','black'].includes(s.insert)?s.insert:'none';
  const cornice=s.cornice===true?value('corniceLength',.1,50):0;
  function selected(key){const options=c.options[key]||[],choice=String(s[key+'Option']||'');return options.length?(choice?options.find(it=>it.id===choice):options[0]):c.items[key];}
  function row(key,qty,unit,label,override){if(qty<=0)return;const item=override||selected(key);if(!item){errors.push('price:'+key);return;}rows.push({key,name:label||item.name,qty:round(qty),unit,price:item.requiresQuote?null:item.price,total:item.requiresQuote?null:round(qty*item.price)});}
  let film=null;const filmItem=s.filmCode&&c.filmCatalog?filmSelection(s,c,palette):selected('film');
  if(s.filmCode&&c.filmCatalog&&!filmItem)errors.push('price:film');
  if(filmItem&&filmItem.widths?.length){
   const required=mode==='rectangle'?Math.min(number(s.width),number(s.length)):mode==='contour'?shape?.span||0:value('roomWidth',.3,50);
   const roll=required>0&&Number.isFinite(required)?filmItem.widths.find(w=>w.max+1e-9>=required):null;film={required,roll:roll||null,legacy:false};
   if(!roll)errors.push('filmSpan');else row('film',area,'м²',filmItem.name+' · полотно '+roll.nominal+' м',{...filmItem,price:roll.price,requiresQuote:roll.requiresQuote===true});
  }else{film={legacy:true,quote:filmItem?.requiresQuote===true};row('film',area,'м²');}
  row(profile,perimeter,'м');
  if(insert!=='none')row(insert,perimeter,'м');
  // Match A·CEIL: all profile corners are counted. A free first four can be
  // represented by a zero retail corner rate, never silently assumed here.
  const chosenProfile=selected(profile),cornerItem=c.items[profile+'Corners'];
  if(cornerItem)row(profile+'Corners',corners,'шт',null,chosenProfile?.cornerPrice!=null?{...cornerItem,price:chosenProfile.cornerPrice}:null);
  row('chandelier',chandelier,'шт');row('spot',spot,'шт');row('cornice',cornice,'м');
  if(s.doubleSpot!=null&&s.doubleSpot!=='')row('doubleSpot',value('doubleSpot',0,100,true),'шт');
  if(s.linearEnabled===true)row('linear',value('linearLength',.1,100),'м');
  if(profile==='floating')row('led',perimeter,'м');
  const quoteRequired=rows.filter(r=>r.price===null).map(r=>r.name),complete=quoteRequired.length===0;
  const subtotal=round(rows.reduce((a,r)=>a+(r.total||0),0)),minimum=complete?round(Math.max(0,c.minimum-subtotal)):0;
  if(minimum)rows.push({key:'minimum',name:'Доплата до мінімального замовлення',qty:1,unit:'посл.',price:minimum,total:minimum});
  return{valid:errors.length===0,complete,quoteRequired,errors,area,perimeter,corners,rows,total:round(subtotal+minimum),profile,insert,film};
 }
 function encode(value){const bytes=new TextEncoder().encode(JSON.stringify(value));return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function decode(value){if(typeof value!=='string'||value.length>24000||!/^[\w-]+$/.test(value))throw Error('Посилання пошкоджено або завелике.');const text=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(text,c=>c.charCodeAt(0))));}
 function link(base,c,state){const url=new URL('/calculator/',base),payload=encode({config:config(c),state:state||null});if(payload.length>24000)throw Error('Посилання завелике. Зменште кількість варіантів у прайсі.');url.hash=payload;return url.href;}
 const api={slots,number,config,estimate,encode,decode,link,profileVariant,filmSeries,corniceKind,corniceColor,filmSelection,contour};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ACEILClientCalc=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
