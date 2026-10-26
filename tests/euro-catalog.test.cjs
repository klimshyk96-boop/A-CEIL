const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page}=await open(browser,width,1,undefined,async p=>{await p.addInitScript(()=>{try{if(!localStorage.getItem('aceil_custom_film_v1'))localStorage.setItem('aceil_custom_film_v1',JSON.stringify({v:1,series:[{id:'euro',manufacturer:'EURO',collection:'',name:'EURO'},{id:'teqtum-euro',manufacturer:'TEQTUM',collection:'Euro',name:'TEQTUM Euro'}],colors:[...[['M961','Teqtum euro',[3.6,4.5]],['M962','Teqtum KM2',[3.2,5]],['M963','Lumfer',[3.05,4.5]]].map(([code,display,w])=>({seriesId:'euro',code,display,texture:'fabric',colorName:'Білий',swatch:'#ffffff',widths:w.map(n=>({nominal:n,max:n,price:0}))})),{seriesId:'teqtum-euro',code:'S901',display:'Біла білизна',texture:'satin',colorName:'RAL 110 96 02',swatch:'#fcfcf9',widths:[{nominal:3.6,max:3.6,price:0},{nominal:4.5,max:4.5,price:0}]},{seriesId:'teqtum-euro',code:'M904',display:'Темно-сірий',texture:'mat',widths:[{nominal:3.6,max:3.6,price:777}]}],teqtumImported:true,teqtumRev:1}))}catch(_){}});});
 await reveal(page);await page.waitForTimeout(1500);
 const r=await page.evaluate(()=>{
  const ids=ACEIL_FILM_SERIES.map(s=>s.id),cat=id=>ACEIL_COLOR_CATALOG_BY_SERIES[id]||[];
  const euro=cat('teqtum-euro'),km2=cat('teqtum-km2'),lum=cat('lumfer');
  const tex=t=>euro.filter(c=>c.texture===t).map(c=>c.displayCode||c.code);
  const out={ids,names:ACEIL_FILM_SERIES.filter(s=>/teqtum|lumfer/i.test(s.id)).map(s=>s.name+'|'+s.manufacturer),
   lak:tex('lak'),mat:tex('mat'),satin:tex('satin'),w:[...new Set(euro.flatMap(c=>c.filmWidths.map(w=>w.nominal)))],
   km2:km2.map(c=>[c.code,c.texture,c.swatch&&c.swatch.length>0,c.filmWidths.map(w=>w.nominal).join('/')]),lum:lum.map(c=>c.displayCode||c.code),
   prices:[...euro,...km2,...lum].filter(c=>c.code!=='M904').every(c=>c.filmWidths.every(w=>!(w.price>0))),
   old:euro.filter(c=>c.code==='S901'||c.code==='M904').map(c=>c.code),
   swatch:euro.find(c=>c.displayCode==='Чорнильний чорний').swatch};
  A_CEILColorPicker.select(euro.find(c=>c.texture==='satin').code,'teqtum-euro');
  out.rows=elemItems.filter(i=>i.seriesId==='teqtum-euro').map(i=>i.filmWidth);
  return out;});
 assert.ok(!r.ids.includes('euro'),'provisional EURO series is gone');
 assert.ok(!r.old.includes('S901'),'unpriced row of the earlier draft is dropped');assert.ok(r.old.includes('M904'),'a row that has a price is kept');
 assert.deepEqual(r.names.sort(),['Lumfer|Lumfer','TEQTUM Euro|TEQTUM','TEQTUM KM2|TEQTUM']);
 const mm=['Білий шовковий креп','Білий атлас','Біла лілія','Бежевий макадамія','Бежевий сандал','Жовто-бежевий','Білосніжний','Тіньовий білий','Середній сірий','Темно-сірий','Нічний коричневий','Чорнильний чорний'];
 for(const t of ['lak','mat'])assert.deepEqual([...r[t]].sort(),[...mm].sort(),t);
 assert.deepEqual(r.satin,['Білий шовковий креп','Білосніжний'],'satin: only two colours');
 assert.deepEqual(r.w.sort(),[3.6,4.5]);
 assert.deepEqual(r.km2.map(x=>x[0]),['M303','M305','M347','M501']);
 assert.ok(r.km2.every(x=>x[1]==='mat'&&x[2]===true&&x[3]==='3.2/5'),JSON.stringify(r.km2));
 assert.deepEqual(r.lum,['Lumfer']);assert.ok(r.prices,'no prices yet');
 assert.equal(r.swatch.toLowerCase(),'#262626');assert.deepEqual(r.rows.sort(),[3.6,4.5]);
 console.log('PASS TEQTUM Euro/KM2 and Lumfer series, RAL colours, textures, widths, no prices '+width+'px');}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
