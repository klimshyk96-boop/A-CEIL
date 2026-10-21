const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(()=>{
   elemGroups=[{id:'lights',name:'Моє світло',collapsed:false},{id:'base',name:'Профіль та монтаж',collapsed:false},{id:'cornices',name:'Ніші / карнизи (прайс)',collapsed:false},{id:'films',name:'Моя плівка',collapsed:false},{id:'empty',name:'Порожня група',collapsed:true}];
   window['__A·CEILNomenCatalogV339']={groups:[{id:'lights',name:'Стара назва'}],items:[]};
   elemItems=[{id:'f',groupId:'films',name:'Плівка Premium',source:'area',unit:'м²',price:380},{id:'p',groupId:'base',name:'Профіль H',source:'main_profile',unit:'м',price:200},{id:'c',groupId:'base',name:'Кути',source:'corners',unit:'шт',price:100},{id:'custom',groupId:'lights',name:'Модель Q',source:'chandelier',unit:'шт',price:777,costPrice:12},{id:'unmapped',name:'Без джерела',unit:'шт',price:111},{id:'bad',name:'Позиція без ціни',unit:'шт',price:null}];
   for(let i=0;i<13;i++)elemItems.push({id:'corn'+i,groupId:'cornices',name:'Карниз прихований білий '+i,unit:'м',price:1000+i});
   const cfg={version:1,company:'Test',items:{film:{name:'Film',price:380},classic:{name:'Profile',price:200},classicCorners:{name:'Corners',price:100}}};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({company:'Test',film:'f',classic:'p',classicCorners:'c',corniceOptions:['corn0'],__productRules:4,__catalog:cfg}));
   document.getElementById('aceilClientSetupButton').click();document.querySelector('#aceilClientSetup [data-owner-settings]').open=true;
  });
  const row=id=>page.locator('[data-client-item="'+id+'"]');
  assert.equal(await row('f').locator('input').isChecked(),true,'legacy primary retained');
  assert.equal(await row('corn0').locator('input').isChecked(),true,'legacy extra retained');
  assert.equal(await row('corn1').locator('input').isChecked(),false,'saved owner assortment is not expanded');
  assert.equal(await row('custom').isVisible(),true,'unknown items are included');
  assert.deepEqual(await page.locator('.owner-category').evaluateAll(groups=>groups.map(g=>g.querySelector('summary').textContent.replace(/ · \d+$/,''))),['Плівка','Моє світло','Профіль та монтаж','Ніші / карнизи (прайс)','Порожня група','Без групи']);
  assert.equal(await page.locator('.owner-item select').count(),0,'no duplicate category assignment');
  assert.equal(await page.locator('[data-group=empty]').evaluate(el=>el.open),false,'saved collapse state is retained');
  assert.equal(await row('corn0').evaluate(el=>el.closest('details').dataset.group),'cornices');
  const originalOrder=await page.locator('[data-group=cornices] .owner-item').evaluateAll(rows=>rows.map(row=>row.dataset.clientItem));
  await row('unmapped').locator('input').check();assert.equal(await row('unmapped').locator('input').isChecked(),true);await row('unmapped').locator('input').uncheck();
  await page.locator('#clientAssortmentSearch').fill('Модель Q');await row('custom').locator('input').check();await page.locator('#clientAssortmentSearch').fill('');
  await page.locator('[data-owner-filter=selected]').click();assert.equal(await row('corn1').isVisible(),false);
  await row('custom').locator('input').uncheck();assert.equal(await row('custom').isVisible(),false);
  await page.locator('[data-owner-filter=all]').click();await row('custom').locator('input').check();
  for(let i=0;i<13;i++)await row('corn'+i).locator('input').check();
  assert.deepEqual(await page.locator('[data-group=cornices] .owner-item').evaluateAll(rows=>rows.map(row=>row.dataset.clientItem)),originalOrder,'checking does not move products');
  await page.locator('#aceilClientSetup [type=submit]').click();
  const url=await page.locator('#aceilClientSetup input[readonly]').inputValue(),cfg=M.decode(new URL(url).hash.slice(1)).config;
  assert.equal(cfg.options.cornice.length,13);assert.equal(cfg.options.chandelier[0].price,777);assert.equal(cfg.items.spot,undefined,'migration does not add unchecked extras');assert.equal(cfg.items.linear,undefined);assert.ok(!JSON.stringify(cfg).includes('costPrice'));assert.ok(!JSON.stringify(cfg).includes('Позиція без ціни'));
  await page.locator('#aceilClientSetup .owner-footer button[type=button]').click();await page.evaluate(()=>{document.getElementById('aceilClientSetupButton').click();document.querySelector('#aceilClientSetup [data-owner-settings]').open=true;});
  assert.equal(await row('custom').locator('input').isChecked(),true);assert.equal(await row('custom').evaluate(el=>el.closest('details').dataset.group),'lights');
  await row('corn0').locator('input').uncheck();await page.locator('#aceilClientSetup [type=submit]').click();
  const next=M.decode(new URL(await page.locator('#aceilClientSetup input[readonly]').inputValue()).hash.slice(1)).config;assert.equal(next.options.cornice.length,12);assert.ok(!next.options.cornice.some(it=>it.name==='Карниз прихований білий 0'));
  await page.locator('#aceilClientSetup [data-owner-settings]>summary').click();await page.locator('#clientAssortmentSearch').fill('Карниз');
  await page.locator('#clientAssortmentSearch').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:'/tmp/aceil-owner-checklist-'+width+'.png',fullPage:false});
  assert.equal(await page.evaluate(()=>{const d=document.getElementById('aceilClientSetup');return d.scrollWidth<=d.clientWidth;}),true,'no dialog overflow');
  await page.evaluate(()=>{window['__A·CEILNomenCatalogV339'].groups=elemGroups;elemGroups=[];document.getElementById('aceilClientSetup').close();document.getElementById('aceilClientSetupButton').click();});
  assert.equal(await page.locator('[data-group=lights]>summary').textContent(),'Моє світло · 1','master groups supply the same names when runtime groups are absent');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS saved group names/order, stable product order, no category menus, prices, search and persisted choices '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
