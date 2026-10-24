const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(1700);
 const catalog=await page.evaluate(()=>ACEIL_COLOR_CATALOG_BY_SERIES['descor-premium']);
 assert.deepEqual(catalog.map(c=>c.displayCode),['WEISS 450','NATURWEISS 469','SCHWARZ 264','STAR GRAU ALU 167','STAR SHWARZ 164']);
 assert.deepEqual(catalog.map(c=>c.filmWidths.map(w=>w.nominal)),[[3.1,3.5,4.1,4.5,5.05],[3.1,3.5,4.1,4.5,5.05],[3.1,4.1,5.05],[5.05],[5.05]]);
 assert.ok(catalog.every(c=>c.texture==='fabric'&&c.filmWidths.every(w=>w.nominal===w.max)));assert.equal(new Set(catalog.flatMap(c=>c.filmWidths.map(w=>w.priceKey))).size,15);
 for(const c of catalog){assert.ok(fs.statSync(require('node:path').join(__dirname,'..',c.photo)).size>1000);}
 await page.evaluate(()=>{A_CEILColorPicker.open();__aceilColorPickerSeries('descor-premium');__aceilColorPickerTab('fabric');});
 assert.equal(await page.locator('#acp2Grid .acp2-chip').count(),5);assert.equal(await page.locator('#acp2Grid img').count(),5);
 await page.locator('#acp2Grid .acp2-chip').last().scrollIntoViewIfNeeded();
 // Locally bundled supplier photographs load without external calls.
 await page.waitForFunction(()=>[...document.querySelectorAll('#acp2Grid img')].every(i=>i.complete&&i.naturalWidth>0));
 await page.screenshot({path:'/tmp/aceil-descor-'+width+'.png'});
 const base=await page.evaluate(()=>{resetAllSilent();pts=[{x:100,y:100},{x:500,y:100},{x:500,y:600},{x:100,y:600}];realPts=[{x:0,y:0},{x:400,y:0},{x:400,y:500},{x:0,y:500}];lengths=[400,500,400,500];closed=true;document.getElementById('area').textContent='20';elemItems=[];elemGroups=[];A_CEILColorPicker.select('M951','descor-premium');renderElemList();return {audit:A_CEILColorPicker.audit(),material:A_CEILColorPicker.material()};});
 assert.equal(base.material.textureLabel,'Тканина');assert.ok(base.material.label.includes('WEISS 450'));assert.equal(base.material.swatch,'#ffffff');assert.deepEqual(base.audit.items.filter(i=>i.qty>0).map(i=>[i.filmWidth,i.qty,i.price]),[[4.1,20,0]]);
 await page.evaluate(()=>{A_CEILColorPicker.open();__aceilColorPickerSeries('descor-premium');__aceilColorPickerManual('M951');});
 assert.equal(await page.locator('#acp2FTex').inputValue(),'fabric');
 await page.locator('#acp2FWidths .acp2-wrow').nth(2).locator('[data-f="price"]').fill('650');await page.locator('#acp2Form [data-act="save"]').click();
 const updated=await page.evaluate(()=>{const E=A_CEIL_EstimateVariants,state={pts,realPts,lengths,closed,elemItems,elemGroups},room={id:'r',name:'Тканина',area:20,state:JSON.stringify(state)},project={rooms:[room]};const v=E.createVariant(project,{scope:'all',changes:{film:{mode:'replace',seriesId:'descor-premium',code:'M951'}}});const items=E.computeRoomItems(project,room,v.variant.id).items;const old=A_CEILColorPicker.material(state);return {active:elemItems.filter(i=>i.qty>0&&i.filmWidth),virtual:items.filter(i=>i.qty>0&&i.filmWidth),photo:ACEILCustomFilm.getColor('descor-premium','M951').photo,otherRates:ACEILGetFilmPricing('descor-premium').fabric.M952_w410,old};});
 assert.equal(updated.active[0].price,650);assert.equal(updated.virtual.length,1);assert.equal(updated.virtual[0].price,650);assert.equal(updated.virtual[0].qty,20);assert.equal(updated.otherRates,0,'price of Weiss must not change Naturweiss');assert.equal(updated.old.textureLabel,'Тканина');assert.ok(updated.photo.endsWith('/450.jpg'));
 await page.evaluate(()=>ACEILCustomFilm.deleteColor('descor-premium','M955'));
 await page.reload();await reveal(page);await page.waitForTimeout(1700);
 const reloaded=await page.evaluate(()=>({colors:ACEIL_COLOR_CATALOG_BY_SERIES['descor-premium'].map(c=>c.code),price:ACEILGetFilmPricing('descor-premium').fabric.M951_w410,photo:ACEILCustomFilm.getColor('descor-premium','M951').photo}));
 assert.equal(reloaded.colors.length,4);assert.ok(!reloaded.colors.includes('M955'));assert.equal(reloaded.price,650);assert.ok(reloaded.photo);assert.deepEqual(errors,[]);await page.close();console.log('PASS DESCOR import, photographs, fabric widths, independent prices, variants and reload '+width+'px');
}
const migrated=await open(browser,390,1,undefined,async page=>page.addInitScript(()=>localStorage.setItem('aceil_custom_film_v1',JSON.stringify({v:1,series:[{id:'existing-descor',manufacturer:'Descor',collection:'Premium',name:'Descor Premium'}],colors:[{seriesId:'existing-descor',code:'M901',display:'WEISS 450',texture:'fabric',swatch:'#eeeeee',widths:[{nominal:4.1,max:4.1,price:999}]}]}))));
 const preserved=await migrated.page.evaluate(()=>({series:ACEIL_FILM_SERIES.filter(s=>s.manufacturer.toLowerCase()==='descor'),color:ACEILCustomFilm.getColor('existing-descor','M901'),count:ACEIL_COLOR_CATALOG_BY_SERIES['existing-descor'].length}));
 assert.equal(preserved.series.length,1);assert.equal(preserved.count,5);assert.equal(preserved.color.widths[0].price,999);assert.equal(preserved.color.swatch,'#eeeeee');assert.ok(preserved.color.photo.endsWith('/450.jpg'));await migrated.page.close();console.log('PASS pre-existing DESCOR catalogue retained without duplicate series or price overwrite');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
