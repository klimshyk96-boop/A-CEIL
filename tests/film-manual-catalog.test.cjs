const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 const {page,errors}=await open(browser,390);await reveal(page);await page.waitForTimeout(2600);
 await page.evaluate(()=>{localStorage.removeItem('aceil_custom_film_v1');window.__A·CEILNomenCatalogV339={items:[],groups:[]};elemItems=[];elemGroups=[];});
 await page.evaluate(()=>window.A_CEILColorPicker.open());
 await page.locator('#acp2Gear').click();await page.locator('#acp2ManualAdd').click();
 // Validation: no manufacturer
 await page.locator('#acp2FCode').fill('PS-204');await page.locator('#acp2Form [data-act="save"]').click();
 assert.match(await page.locator('#acp2FErr').innerText(),/виробника/);
 // Manufacturer + colour + two widths with prices
 await page.locator('#acp2FMan').fill('Descor');await page.locator('#acp2FCol').fill('Lux');
 await page.locator('#acp2FTex').selectOption('mat');await page.locator('#acp2FName').fill('Айворі');
 const rows=page.locator('#acp2FWidths .acp2-wrow');
 await rows.nth(0).locator('[data-f="nominal"]').fill('3,6');await rows.nth(0).locator('[data-f="price"]').fill('510');
 await page.locator('#acp2Form [data-act="addw"]').click();
 await rows.nth(1).locator('[data-f="nominal"]').fill('5,1');await rows.nth(1).locator('[data-f="max"]').fill('5,6');await rows.nth(1).locator('[data-f="price"]').fill('620');
 await page.locator('#acp2Form [data-act="save"]').click();
 await page.waitForTimeout(600);
 const res=await page.evaluate(()=>{const it=elemItems.filter(x=>x.filmDisplayCode==='PS-204');return{
  series:window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux'),
  items:it.map(x=>({n:x.name,w:x.filmWidth,max:x.filmMaxWidth,p:x.price,s:x.seriesId,sel:x.filmRoomSelected})),
  group:elemGroups.map(g=>g.name),mat:window.A_CEILColorPicker.material&&window.A_CEILColorPicker.material(),
  stored:JSON.parse(localStorage.getItem('aceil_custom_film_v1')).colors.filter(c=>c.seriesId===window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux').id).length}});
 assert.equal(res.series.name,'Descor Lux');assert.equal(res.series.manufacturer,'Descor');
 assert.equal(res.items.length,2);
 assert.deepEqual(res.items.map(x=>[x.w,x.max,x.p]).sort((a,b)=>a[0]-b[0]),[[3.6,3.6,510],[5.1,5.6,620]]);
 assert.ok(res.items.every(x=>x.sel===true));assert.equal(res.stored,1);
 assert.match(res.mat.code,/^M9\d\d$/);assert.equal(res.mat.label.split(' · ')[0],'PS-204');assert.ok(res.items.every(x=>/^PS-204 (3\.6|5\.1)м$/.test(x.n)),JSON.stringify(res.items));assert.equal(res.mat.seriesId,res.series.id);
 // Survives reload of the registry (persisted catalogue)
 const again=await page.evaluate(()=>{const id=window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux').id;
  return{cat:window.ACEIL_COLOR_CATALOG_BY_SERIES[id].map(c=>c.code),price:window.ACEILGetFilmPricing(id).mat}});
 assert.equal(again.cat.length,1);assert.match(again.cat[0],/^M9\d\d$/);assert.equal(again.price.w360,510);assert.equal(again.price.w510,620);
 // Edit: change a price, picked up by the item
 await page.evaluate(()=>window.A_CEILColorPicker.open());
 await page.evaluate(()=>window.__aceilColorPickerSeries(window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux').id));
 await page.evaluate(()=>window.__aceilColorPickerManual(window.ACEIL_COLOR_CATALOG_BY_SERIES[window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux').id][0].code));
 assert.equal(await page.locator('#acp2FMan').isDisabled(),true);
 await page.locator('#acp2FWidths .acp2-wrow').nth(0).locator('[data-f="price"]').fill('530');
 await page.locator('#acp2Form [data-act="save"]').click();await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>elemItems.find(x=>x.filmDisplayCode==='PS-204'&&x.filmWidth===3.6).price),530);
 // Built-in series are untouched
 assert.ok(await page.evaluate(()=>window.ACEIL_FILM_SERIES.filter(s=>!s.custom).map(s=>s.id).join()==='premium,classic,kralton'));
 // Same code, other texture -> separate internal code; duplicate in same texture is an update
 await page.evaluate(()=>{const id=window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux').id;const w=[{nominal:'3,2',max:'',price:'400'}];window.ACEILCustomFilm.saveColor({manufacturer:'Descor',collection:'Lux',texture:'lak',display:'PS-204',widths:w});window.ACEILCustomFilm.saveColor({manufacturer:'Descor',collection:'Lux',texture:'lak',display:'ps-204',widths:w});});
 const cat=await page.evaluate(()=>window.ACEIL_COLOR_CATALOG_BY_SERIES[window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux').id].map(c=>[c.code[0],c.displayCode]));
 assert.deepEqual(cat.map(x=>x.join(':')).sort(),['L:ps-204','M:PS-204']);
 // Delete
 await page.evaluate(()=>{const id=window.ACEIL_FILM_SERIES.find(s=>s.name==='Descor Lux').id;window.ACEILCustomFilm.deleteSeries(id)});
 assert.equal(await page.evaluate(()=>window.ACEIL_FILM_SERIES.some(s=>s.name==='Descor Lux')),false);
 assert.deepEqual(errors,[]);
 console.log('film-manual-catalog OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
