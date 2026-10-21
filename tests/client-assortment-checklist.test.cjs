const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(()=>{
   elemItems=[{id:'f',name:'Плівка Premium',source:'area',unit:'м²',price:380},{id:'p',name:'Профіль H',source:'main_profile',unit:'м',price:200},{id:'c',name:'Кути',source:'corners',unit:'шт',price:100},{id:'custom',name:'Модель Q',source:'other',unit:'шт',price:777,costPrice:12},{id:'bad',name:'Позиція без ціни',unit:'шт',price:null}];
   for(let i=0;i<13;i++)elemItems.push({id:'corn'+i,name:'Карниз прихований білий '+i,unit:'м',price:1000+i});
   const cfg={version:1,company:'Test',items:{film:{name:'Film',price:380},classic:{name:'Profile',price:200},classicCorners:{name:'Corners',price:100}}};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({company:'Test',film:'f',classic:'p',classicCorners:'c',corniceOptions:['corn0'],__productRules:4,__catalog:cfg}));
   document.getElementById('aceilClientSetupButton').click();document.querySelector('#aceilClientSetup [data-owner-settings]').open=true;
  });
  const row=id=>page.locator('[data-client-item="'+id+'"]');
  assert.equal(await row('f').locator('input').isChecked(),true,'legacy primary retained');
  assert.equal(await row('corn0').locator('input').isChecked(),true,'legacy extra retained');
  assert.equal(await row('corn1').locator('input').isChecked(),false,'saved owner assortment is not expanded');
  assert.equal(await row('custom').isVisible(),true,'unknown items are included');
  await page.locator('#clientAssortmentSearch').fill('Модель Q');await row('custom').locator('input').check();
  await page.locator('#aceilClientSetup [type=submit]').click();assert.ok((await page.locator('#aceilClientSetup output').innerText()).includes('категорію'));
  await row('custom').locator('select').selectOption('chandelier');await page.locator('#clientAssortmentSearch').fill('');
  await page.locator('[data-owner-filter=selected]').click();assert.equal(await row('corn1').isVisible(),false);
  await row('custom').locator('input').uncheck();assert.equal(await row('custom').isVisible(),false);
  await page.locator('[data-owner-filter=all]').click();await row('custom').locator('input').check();
  for(let i=0;i<13;i++)await row('corn'+i).locator('input').check();
  await page.locator('#aceilClientSetup [type=submit]').click();
  const url=await page.locator('#aceilClientSetup input[readonly]').inputValue(),cfg=M.decode(new URL(url).hash.slice(1)).config;
  assert.equal(cfg.options.cornice.length,13);assert.equal(cfg.options.chandelier[0].price,777);assert.equal(cfg.items.spot,undefined,'migration does not add unchecked extras');assert.equal(cfg.items.linear,undefined);assert.ok(!JSON.stringify(cfg).includes('costPrice'));assert.ok(!JSON.stringify(cfg).includes('Позиція без ціни'));
  await page.locator('#aceilClientSetup>button').click();await page.evaluate(()=>{document.getElementById('aceilClientSetupButton').click();document.querySelector('#aceilClientSetup [data-owner-settings]').open=true;});
  assert.equal(await row('custom').locator('input').isChecked(),true);assert.equal(await row('custom').locator('select').inputValue(),'chandelier');
  await row('corn0').locator('input').uncheck();await page.locator('#aceilClientSetup [type=submit]').click();
  const next=M.decode(new URL(await page.locator('#aceilClientSetup input[readonly]').inputValue()).hash.slice(1)).config;assert.equal(next.options.cornice.length,12);assert.ok(!next.options.cornice.some(it=>it.name==='Карниз прихований білий 0'));
  await page.locator('#aceilClientSetup [data-owner-settings]>summary').click();await page.locator('#clientAssortmentSearch').fill('Карниз');
  await page.locator('#clientAssortmentSearch').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:'/tmp/aceil-owner-checklist-'+width+'.png',fullPage:false});
  assert.equal(await page.evaluate(()=>{const d=document.getElementById('aceilClientSetup');return d.scrollWidth<=d.clientWidth;}),true,'no dialog overflow');assert.deepEqual(errors,[]);await page.close();console.log('PASS full catalogue, legacy choices, search, selected filter, assignment, 13 prices, persistence and removal '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
