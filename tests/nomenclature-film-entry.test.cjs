const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(async()=>{
   await openElementsModal();
   // A loaded catalogue with no room-local film must still expose the picker.
   elemGroups=[{id:'profiles',name:'Профілі',collapsed:true}];
   elemItems=[{id:'p',groupId:'profiles',name:'Профіль',unit:'м',price:200,qty:0}];
   renderElemList();renderElemList();
  });
  assert.equal(await page.locator('#aceilNomenFilmChooser').count(),1);
  assert.equal(await page.locator('#aceilNomenFilmOpen').isVisible(),true);
  await page.locator('#aceilNomenFilmOpen').click();
  assert.equal(await page.locator('#aceilColorPickerModalV2').isVisible(),true);
  const series=page.locator('#acp2Series button');
  assert.equal(await series.count(),3);
  await series.filter({hasText:'Kralton'}).click();
  await page.locator('#acp2Tabs button').filter({hasText:'Мат'}).click();
  await page.locator('#acp2Grid .acp2-chip').first().click();
  assert.ok((await page.locator('#aceilNomenFilmOpen').textContent()).includes('Kralton'));
  assert.equal(await page.evaluate(()=>elemItems.some(i=>i.filmPickerManaged&&i.seriesId==='kralton')),true);
  await page.screenshot({path:'/tmp/aceil-main-film-'+width+'.png',fullPage:false});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS main nomenclature film entry after catalogue replacement, rerender and colour choice '+width+'px');
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
