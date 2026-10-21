const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);
  await page.goto('http://aceil.test/calculator/?demo=1');
  await page.locator('[data-step="2"]').click();await page.locator('[data-extra="cornice"]').click();
  await page.locator('[name="corniceLength"]').fill('2.5');
  for(const [index,price] of [1750,1750,2200,2200,1700,1700,650,1700,1700].entries()){
   await page.evaluate(index=>{const select=document.querySelector('[name="corniceOption"]');select.value='cornice-'+index;select.dispatchEvent(new Event('change',{bubbles:true}));},index);
   const info=await page.locator('#cornicePrice').innerText();
   assert.ok(info.replaceAll(/\s/g,'').includes(String(price)+'грн/м'),info);
   assert.ok(info.replaceAll(/\s/g,'').includes(String(price*2.5)+'грн'),info);
   assert.equal(await page.locator('#cornicePrice').isVisible(),true);
   if([0,1,7,8].includes(index))assert.equal(await page.locator('[name="corniceOption"]').isVisible(),true,'Hidden and UNO models must both be selectable');
  }
  await page.screenshot({path:'/tmp/aceil-cornice-retail-'+width+'.png',fullPage:true});
  await page.locator('[data-extra="cornice"]').click();assert.equal(await page.locator('#cornicePrice').isVisible(),false);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS nine owner cornice rates and visible length totals '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
