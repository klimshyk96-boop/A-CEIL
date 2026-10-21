const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(()=>{
   elemGroups=[{id:'g',name:'Комплектуючі',collapsed:false}];elemItems=Array.from({length:45},(_,i)=>({id:'p'+i,groupId:'g',name:'Позиція '+i,unit:'шт',price:100+i}));
   window['__A·CEILNomenCatalogV339']={groups:elemGroups,items:elemItems};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({__productRules:5,__selection:{}}));
   document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(e=>e.open=true);
  });
  await page.locator('[data-client-item="p0"] input').check();
  await page.locator('[data-owner-filter=selected]').click();
  await page.locator('.owner-content').evaluate(e=>e.scrollTop=e.scrollHeight);
  const back=page.locator('.owner-footer').getByRole('button',{name:'← Назад',exact:true}),save=page.locator('.owner-footer [type=submit]');
  for(const button of [back,save]){assert.equal(await button.isVisible(),true);const rect=await button.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=1000);}
  await save.click();assert.ok((await page.locator('#aceilClientSetup output').textContent()).includes('Вибір збережено'));
  await page.locator('[data-owner-settings]').evaluate(e=>e.open=true);await page.locator('[data-owner-links]').evaluate(e=>e.open=false);await page.locator('[data-owner-filter=all]').click();await page.locator('.owner-category').last().scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/aceil-owner-compact-'+width+'.png',fullPage:false});
  await back.click();assert.equal(await page.locator('#aceilClientSetup').evaluate(e=>e.open),false);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS compact owner settings, selected filter, visible back/save footer and form submission '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
