const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page}=await open(browser,width);await reveal(page);await page.waitForTimeout(1500);
 await page.evaluate(()=>{try{localStorage.removeItem('aceil_film_recent_v1')}catch(_){}A_CEILColorPicker.open()});
 const M='#aceilColorPickerModalV2';
 assert.ok(await page.locator(M+' .acp2-pop-btn').count()<=3,'at most 3 popular');
 assert.ok((await page.locator(M+' .acp2-pop-label small').first().textContent()).includes('до 3'));
 assert.ok(await page.locator('#acp2Grid .acp2-chip').count()>20,'colours are shown at once, without choosing a texture');
 assert.equal(await page.locator('#acp2ManualAdd').isVisible(),false,'manual add lives in the gear menu');
 const order=await page.evaluate(()=>{const y=id=>document.getElementById(id).getBoundingClientRect().top;return y('acp2Series')<y('acp2Search')&&y('acp2Search')<y('acp2Popular')});assert.ok(order,'series, search, popular order');
 assert.ok(await page.locator('#acp2Series').evaluate(n=>n.getBoundingClientRect().height<60),'series are a single strip');
 await page.locator('#acp2Tabs button').filter({hasText:'Мат'}).click();const mat=await page.locator('#acp2Grid .acp2-chip').count();
 await page.locator('#acp2Tabs button').filter({hasText:'Мат'}).click();assert.ok(await page.locator('#acp2Grid .acp2-chip').count()>mat,'second click clears the filter');
 await page.screenshot({path:'/tmp/claude-0/picker-'+width+'.png'});
 await page.locator('#acp2Gear').click();assert.equal(await page.locator('#acp2ManualAdd').isVisible(),true);assert.equal(await page.locator('#acp2DeleteMaker').isVisible(),true);
 await page.locator('#acp2Gear').click();assert.equal(await page.locator('#acp2ManualAdd').isVisible(),false,'gear toggles');
 await page.evaluate(()=>A_CEILColorPicker.select('S303','premium'));
 await page.evaluate(()=>A_CEILColorPicker.open());
 const recent=await page.evaluate(()=>JSON.parse(localStorage.getItem('aceil_film_recent_v1')||'[]'));
 assert.ok(Array.isArray(recent));
 assert.ok(await page.locator(M).evaluate(n=>n.querySelector('.acp2-card').scrollWidth<=n.querySelector('.acp2-card').clientWidth+1),'no horizontal overflow');
 console.log('PASS film picker menu '+width+'px');}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
