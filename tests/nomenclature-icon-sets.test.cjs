const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(()=>{elemGroups=[{id:'icons',name:'Профілі'}];elemItems=[{id:'icon-item',groupId:'icons',name:'Профіль H',icon:'🔧',unit:'м',price:185,qty:2}];openElementsModal();openEmojiPickerForItem('icon-item');});
  assert.deepEqual(await page.locator('[data-nom-icon-set]').allTextContents(),['Лаконічний','Технічний','Інші SVG']);
  for(const set of ['laconic','technical']){
   await page.locator('[data-nom-icon-set='+set+']').click();
   const panel=page.locator('[data-nom-icon-panel='+set+']');
   assert.equal(await panel.locator('button').count(),18);
   assert.equal(await panel.locator('svg').count(),18);
   assert.equal(await panel.isVisible(),true);
   await panel.getByRole('button',{name:'Профілі',exact:true}).click();
   assert.equal(await page.evaluate(()=>elemItems[0].icon),'svg:'+set+'-profile');
   assert.equal(await page.locator('#emrow_icon-item .em-icon svg').count(),1);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ceiling_v18')).elemItems[0].icon),'svg:'+set+'-profile');
   assert.deepEqual(await page.evaluate(()=>[elemItems[0].price,elemItems[0].qty]),[185,2]);
   await page.evaluate(()=>openEmojiPickerForItem('icon-item'));
   assert.equal(await page.locator('[data-nom-icon-set='+set+']').getAttribute('aria-pressed'),'true');
   for(const key of ['light-line','light-line-corner','surface-track','recessed-track','magnetic-track','track-light','surface-cornice','hidden-cornice','wide-cornice','single-cornice']){
    const button=panel.locator('button[onclick="selectNomenclatureSvgIcon(\''+set+'-'+key+'\')"]');
    assert.equal(await button.count(),1);
    await button.click();
    assert.equal(await page.evaluate(()=>elemItems[0].icon),'svg:'+set+'-'+key);
    assert.equal(await page.locator('#emrow_icon-item .em-icon svg').count(),1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ceiling_v18')).elemItems[0].icon),'svg:'+set+'-'+key);
    assert.deepEqual(await page.evaluate(()=>[elemItems[0].price,elemItems[0].qty]),[185,2]);
    await page.evaluate(()=>openEmojiPickerForItem('icon-item'));
    assert.equal(await page.locator('[data-nom-icon-set='+set+']').getAttribute('aria-pressed'),'true');
   }
  }
  await page.screenshot({path:'/tmp/aceil-icon-sets-'+width+'.png'});
  await page.locator('[data-nom-icon-set=existing]').click();assert.ok(await page.locator('[data-nom-icon-panel=existing] button').count()>20);
  await page.locator('[data-nom-icon-panel=existing] button').first().click();assert.equal(await page.evaluate(()=>elemItems[0].icon),'svg:profile');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS both SVG sets, preview, selection persistence and existing icons '+width+'px');
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
