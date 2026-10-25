const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page}=await open(browser,width);
 // a browser that still holds the provisional EURO series from the first draft
 await page.addInitScript(()=>{try{if(!localStorage.getItem('aceil_custom_film_v1'))localStorage.setItem('aceil_custom_film_v1',JSON.stringify({v:1,series:[{id:'euro',manufacturer:'EURO',collection:'',name:'EURO'}],colors:[{seriesId:'euro',code:'M961',display:'Teqtum euro',texture:'fabric',widths:[{nominal:3.6,max:3.6,price:0}]}],euroImported:true}))}catch(_){}});
 await reveal(page);await page.waitForTimeout(1500);
 const r=await page.evaluate(()=>{
  const ids=ACEIL_FILM_SERIES.map(s=>s.id),cat=id=>ACEIL_COLOR_CATALOG_BY_SERIES[id]||[];
  const euro=cat('teqtum-euro'),km2=cat('teqtum-km2'),lum=cat('lumfer');
  const tex=t=>euro.filter(c=>c.texture===t).map(c=>c.displayCode||c.code);
  const out={ids,names:ACEIL_FILM_SERIES.filter(s=>/teqtum|lumfer/i.test(s.id)).map(s=>s.name+'|'+s.manufacturer),
   lak:tex('lak'),mat:tex('mat'),satin:tex('satin'),w:[...new Set(euro.flatMap(c=>c.filmWidths.map(w=>w.nominal)))],
   km2:km2.map(c=>[c.code,c.texture,c.swatch&&c.swatch.length>0,c.filmWidths.map(w=>w.nominal).join('/')]),lum:lum.map(c=>c.displayCode||c.code),
   prices:[...euro,...km2,...lum].every(c=>c.filmWidths.every(w=>!(w.price>0))),
   swatch:euro.find(c=>c.displayCode==='Чорнильно чорний').swatch};
  A_CEILColorPicker.select(euro.find(c=>c.texture==='satin').code,'teqtum-euro');
  out.rows=elemItems.filter(i=>i.seriesId==='teqtum-euro').map(i=>i.filmWidth);
  return out;});
 assert.ok(!r.ids.includes('euro'),'provisional EURO series is gone');
 assert.deepEqual(r.names.sort(),['Lumfer|Lumfer','TEQTUM Euro|TEQTUM','TEQTUM KM2|TEQTUM']);
 const colours=['Біла білизна','Жовто-бежевий','Біла морська троянда','Темно-сірий','Білий креповий шовк','Біла тінь','Бежева макадамія','Коричнева ніч','Білий атлас','Помірно сірий','Бежевий сандал','Чорнильно чорний'];
 for(const t of ['lak','mat','satin'])assert.deepEqual(r[t],colours,t);
 assert.deepEqual(r.w.sort(),[3.6,4.5]);
 assert.deepEqual(r.km2.map(x=>x[0]),['M303','M305','M347','M501']);
 assert.ok(r.km2.every(x=>x[1]==='mat'&&x[2]===true&&x[3]==='3.2/5'),JSON.stringify(r.km2));
 assert.deepEqual(r.lum,['Lumfer']);assert.ok(r.prices,'no prices yet');
 assert.equal(r.swatch.toLowerCase(),'#0d0d0d');assert.deepEqual(r.rows.sort(),[3.6,4.5]);
 console.log('PASS TEQTUM Euro/KM2 and Lumfer series, RAL colours, textures, widths, no prices '+width+'px');}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
