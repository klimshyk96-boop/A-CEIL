const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const fixture={version:1,catalogue:true,company:'Test',minimum:5500,groups:[{id:'g',name:'Моя група'}],products:[{id:'power',name:'Блок',price:800,unit:'шт',groupId:'g',basis:'manual'},{id:'film',name:'Плівка',price:380,unit:'м²',groupId:'g',basis:'area',widths:[{nominal:3.6,max:3.6,price:380},{nominal:5.1,max:5.6,price:420}]}]};
const room={width:4,length:5};
assert.equal(M.config(fixture).items.classic,undefined);assert.equal(M.estimate(room,fixture).total,0);
assert.equal(M.estimate({...room,selectedProducts:{power:{qty:'2'}}},{...fixture,minimum:0}).total,1600);
assert.equal(M.estimate({...room,selectedProducts:{power:{qty:'0.5'}}},fixture).valid,false);
assert.equal(M.estimate({...room,selectedProducts:{missing:{qty:1}}},fixture).valid,false);
assert.equal(M.estimate({...room,selectedProducts:{film:{qty:null}}},fixture).total,8400);
assert.equal(M.estimate({...room,mode:'manual',area:20,perimeter:18,corners:4,roomWidth:'',selectedProducts:{film:{qty:null}}},fixture).valid,false);
assert.equal(M.estimate({...room,selectedProducts:{power:{qty:1}}},{...fixture,products:[{...fixture.products[0],requiresQuote:true}]}).complete,false);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(()=>{
   elemGroups=[{id:'profiles',name:'Мої профілі',collapsed:false},{id:'extras',name:'Комплектуючі',collapsed:false}];
   elemItems=[{id:'shadow',groupId:'profiles',name:'Тіньовий чорний',unit:'м',price:550},{id:'power',groupId:'extras',name:'Блок живлення 24В 200Вт',unit:'шт',price:800,costPrice:1},{id:'corn',groupId:'extras',name:'Карниз UNO',unit:'м',price:1700},{id:'custom',groupId:'extras',name:'Моя довільна позиція',unit:'кг',price:333},{id:'quote',groupId:'extras',name:'Позиція без ціни',unit:'шт',price:null},{id:'private',groupId:'extras',name:'Не для клієнта',unit:'шт',price:9999}];
   window['__A·CEILNomenCatalogV339']={groups:elemGroups,items:elemItems};
   const old={version:1,company:'Test',items:{film:{name:'Old',price:1},classic:{name:'Old',price:1},classicCorners:{name:'Old',price:1}}};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({company:'Test',__productRules:5,__selection:{},__catalog:old}));document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(e=>e.open=true);
  });
  for(const id of ['shadow','power','corn','custom','quote'])await page.locator('[data-client-item='+id+'] input').check();
  await page.locator('#aceilClientSetup [type=submit]').click();assert.ok((await page.locator('#aceilClientSetup output').textContent()).includes('Вибір збережено'));
  const shared=await page.locator('#aceilClientSetup input[readonly]').inputValue(),cfg=M.decode(new URL(shared).hash.slice(1)).config;
  assert.equal(cfg.catalogue,true);assert.equal(cfg.items.film,undefined);assert.equal(cfg.items.classic,undefined);assert.equal(cfg.products.length,5);assert.ok(!JSON.stringify(cfg).includes('costPrice'));assert.ok(!JSON.stringify(cfg).includes('Не для клієнта'));
  await page.goto(shared.replace('https://a-ceil.pp.ua','http://aceil.test'));await page.locator('[data-step="1"]').click();
  assert.deepEqual(await page.locator('.nomen-group>summary').allTextContents(),['Мої профілі','Комплектуючі']);assert.equal(await page.locator('#total').textContent(),'Оберіть позиції');
  const row=name=>page.locator('[data-nomen-product="'+cfg.products.find(it=>it.name===name).id+'"]');
  const sum=async()=>Number((await page.locator('#total').textContent()).replace(/\s|грн/g,'').replace(',','.'));
  await row('Тіньовий чорний').locator('[type=checkbox]').check();assert.equal(await sum(),9900);
  await row('Блок живлення 24В 200Вт').locator('[type=checkbox]').check();assert.equal(await sum(),10700);
  await row('Карниз UNO').locator('[type=checkbox]').check();await row('Карниз UNO').locator('input:not([type=checkbox])').fill('2.5');assert.equal(await sum(),14950);
  await row('Моя довільна позиція').locator('[type=checkbox]').check();await row('Моя довільна позиція').locator('input:not([type=checkbox])').fill('1.25');assert.equal(await sum(),15366.25);
  await row('Позиція без ціни').locator('[type=checkbox]').check();assert.equal(await page.locator('#total').textContent(),'Потрібне уточнення');await row('Позиція без ціни').locator('[type=checkbox]').uncheck();
  await page.locator('[data-step="0"]').click();await page.locator('[name=width]').fill('5');await page.locator('[data-step="1"]').click();assert.equal(await sum(),16466.25);
  await row('Тіньовий чорний').locator('[type=checkbox]').uncheck();assert.equal(await sum(),5466.25);
  await page.locator(width===390?'#viewEstimate':'#viewEstimateDesktop').click();await page.locator('#save').click();const saved=await page.locator('#savedLink').inputValue();await page.goto('about:blank');await page.goto(saved);await page.locator('[data-step="1"]').click();assert.equal(await sum(),5466.25);assert.equal(await row('Карниз UNO').locator('input:not([type=checkbox])').inputValue(),'2.5');
  await page.screenshot({path:'/tmp/aceil-nomen-client-'+width+'.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();console.log('PASS owner whitelist with no base kit, arbitrary products, quantities, real prices, groups, quotes and saved calculation '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
