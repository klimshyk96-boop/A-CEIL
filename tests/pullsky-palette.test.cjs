const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/nomenclature/165-aceil-color-catalog.js','utf8'),context);
const registry=context.window.ACEIL_COLOR_CATALOG_BY_SERIES,premium=registry.premium;
assert.equal(premium.length,137);assert.equal(new Set(premium.map(x=>x.code)).size,137);
assert.deepEqual(['lak','mat','satin'].map(t=>premium.filter(x=>x.texture===t&&x.swatchSource==='PullSky').length),[78,28,17]);
assert.equal(premium.find(x=>x.code==='M303').swatch,'#ffffff');assert.equal(premium.find(x=>x.code==='L303').swatch,'#ffffff');
assert.deepEqual(Array.from(premium.find(x=>x.code==='M303').filmWidths,w=>[w.nominal,w.max]),[[3.6,3.6],[5.1,5.6],[5.8,6.2]],'existing roll calculations are preserved');
assert.deepEqual(Array.from(registry.classic.find(x=>x.code==='M303').filmWidths,w=>w.nominal),[3.6,5.1]);assert.equal(registry.kralton.length,25);
for(const k of registry.kralton){const sample=premium.find(p=>p.code===k.code&&p.texture===k.texture);assert.ok(sample);assert.equal(k.swatch,sample.swatch);assert.equal(k.swatchSource,'Premium');assert.deepEqual(Array.from(k.filmWidths,w=>[w.nominal,w.max]),k.texture==='lak'?[[3.6,3.6],[5,5]]:[[3.6,3.6],[5,5],[6,6]]);}
for(const code of ['L180','L606','L315','L215','M100','M315','M412','M201','M602','S319','S305','S309','S311']){
 const row=premium.find(x=>x.code===code);assert.ok(row?.filmWidths.length,code+' has sourced roll widths');assert.ok(row.filmWidths.every(w=>w.nominal!==4),'the existing 4 m exclusion is preserved');assert.ok(row.filmWidths.every(w=>w.nominal===w.max),'new codes never invent working stretch');
}
assert.equal(context.window.ACEIL_FILM_PRICING.mat.narrow,380);assert.equal(context.window.ACEIL_FILM_PRICING.mat.wide,420);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);await page.evaluate(()=>window.A_CEILColorPicker.open());
  await page.locator('#acp2Tabs button').filter({hasText:'Глянець'}).click();assert.equal(await page.locator('#acp2Grid .acp2-swatch').count(),premium.filter(c=>c.texture==='lak').length);
  const spans=await page.locator('#acp2Grid .acp2-swatch').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).backgroundColor!=='rgba(0, 0, 0, 0)'||getComputedStyle(n).backgroundImage!=='none'));assert.ok(spans);
  await page.locator('#acp2Search').fill('L180');assert.equal(await page.locator('#acp2Grid .acp2-chip').count(),1);assert.ok((await page.locator('#acp2Grid .acp2-swatch').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('56, 64, 103'));
  await page.locator('#acp2Grid .acp2-chip').click();await page.locator('#acp2Confirm').click();assert.equal(await page.evaluate(()=>window.A_CEILColorPicker.current().code),'L180');
  await page.evaluate(()=>{closed=true;realPts=[{x:0,y:0},{x:450,y:0},{x:450,y:600},{x:0,y:600}];lengths=[450,600,450,600];document.getElementById('area').textContent='27';window.A_CEILColorPicker.select('L315','premium')});
  const counted=await page.evaluate(()=>window.A_CEILColorPicker.audit().items.filter(x=>x.qty>0));assert.equal(counted.length,1);assert.equal(counted[0].filmWidth,5);assert.equal(counted[0].qty,27);assert.equal(counted[0].price,420);
  await page.evaluate(()=>window.A_CEILColorPicker.open());await page.locator('#acp2Tabs button').filter({hasText:'Глянець'}).click();await page.screenshot({path:'/tmp/aceil-pullsky-'+width+'.png'});
  assert.ok(await page.locator('#aceilColorPickerModalV2 .acp2-card').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'no horizontal overflow');
  await page.locator('#acp2Manufacturer').selectOption('KRALTON');
  assert.equal(await page.locator('#acp2Grid .acp2-chip').count(),12);
  await page.locator('#acp2Search').fill('M313');await page.locator('#acp2Grid [data-code="M313"]').click();await page.locator('#acp2Confirm').click();
  const kr=await page.evaluate(()=>({material:A_CEILColorPicker.material(),rates:ACEILGetFilmPricing('kralton')}));assert.equal(kr.material.seriesId,'kralton');assert.equal(kr.material.swatch,registry.kralton.find(k=>k.code==='M313').swatch);assert.equal(kr.rates.mat.wide,600);
  await page.reload();await reveal(page);assert.equal(await page.evaluate(()=>ACEIL_COLOR_CATALOG_BY_SERIES.kralton.find(c=>c.code==='M313').swatch),kr.material.swatch);
  await page.goto('http://aceil.test/calculator/?demo=1');await page.locator('[data-step="1"]').click();await page.locator('#openFilmPalette').click();await page.locator('[data-film-texture=lak]').click();assert.equal(await page.locator('#filmColorGrid .palette-swatch').count(),78);
  await page.locator('#filmColorSearch').fill('L315');await page.locator('#filmColorGrid [data-film-code=L315]').click();assert.ok((await page.locator('#filmName').textContent()).includes('L315'));
  assert.deepEqual(errors,[]);await page.close();console.log('PASS PullSky swatches, new code selection, sourced roll width, unchanged prices and client palette '+width+'px');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
