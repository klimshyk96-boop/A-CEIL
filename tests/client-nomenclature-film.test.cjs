const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.waitForTimeout(2500); /* let startup timers (film group autofill) finish before the test replaces nomenclature state */
  await page.evaluate(()=>{
   elemGroups=[{id:'profiles',name:'Мої профілі',collapsed:false}];elemItems=[{id:'s',groupId:'profiles',name:'Тіньовий чорний',unit:'м',price:550}];window['__A·CEILNomenCatalogV339']={groups:elemGroups,items:elemItems};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({__productRules:5,__selection:{},__catalog:{version:1,catalogue:true,company:'Test',groups:[{id:'profiles',name:'Мої профілі'}],products:[{id:'old',name:'Old',unit:'м',price:1,basis:'manual',groupId:'profiles'}]}}));document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(e=>e.open=true);
  });
  assert.equal(await page.locator('[data-owner-films]>summary').textContent(),'Плівка');
  for(const series of ['premium','classic','kralton'])assert.equal(await page.locator('[data-client-item="film:'+series+':M303"] input').isVisible(),true,'film available without any room film row or film group');
  await page.locator('[data-client-item="film:premium:M303"] input').check();await page.locator('#aceilClientSetup [type=submit]').click();
  const link=await page.locator('#aceilClientSetup input[readonly]').inputValue(),cfg=M.decode(new URL(link).hash.slice(1)).config,film=cfg.products[0];
  assert.equal(cfg.products.length,1);assert.equal(film.series,'premium');assert.equal(film.code,'M303');assert.equal(film.texture,'mat');assert.equal(cfg.groups[0].name,'Плівка');
  await page.goto(link);await page.locator('[data-step="1"]').click();const row=page.locator('[data-nomen-product="'+film.id+'"]');const chooser=page.locator('[data-film-chooser]'),colors=chooser.getByLabel('Колір',{exact:true});await chooser.getByRole('checkbox',{name:'Плівка',exact:true}).check();assert.deepEqual(await chooser.getByLabel('Серія',{exact:true}).locator('option').allTextContents(),['Premium','Classic','Kralton']);await chooser.getByLabel('Фактура',{exact:true}).selectOption('lak');assert.equal(await colors.inputValue(),'L303');await chooser.getByLabel('Серія',{exact:true}).selectOption('kralton');assert.equal(await chooser.getByLabel('Серія',{exact:true}).inputValue(),'kralton');await chooser.getByLabel('Серія',{exact:true}).selectOption('classic');await chooser.getByLabel('Серія',{exact:true}).selectOption('premium');await chooser.getByLabel('Фактура',{exact:true}).selectOption('mat');
  const sum=async()=>Number((await page.locator('#total').textContent()).replace(/\s|грн/g,'').replace(',','.'));
  assert.equal(await sum(),8400,'4m room uses 5.1 roll at 420/m²');
  const paletteCount=await page.evaluate(()=>ACEIL_COLOR_CATALOG_BY_SERIES.premium.filter(e=>e.texture==='mat').length);assert.equal(await colors.locator('option').count(),paletteCount);
  assert.ok((await colors.locator('option').allTextContents()).some(t=>t.includes('M309')));await colors.selectOption('M309');assert.equal(await page.locator('#save').isDisabled(),true,'a colour without a wide roll must not be quoted as fitting');
  await colors.selectOption('M303');assert.equal(await sum(),8400);
  await page.locator('[data-step="0"]').click();await page.locator('[name=width]').fill('3.6');await page.locator('[data-step="1"]').click();assert.equal(await sum(),6840,'3.6m room uses the narrow 380/m² rate');
  await colors.selectOption('M309');await row.locator('input[inputmode=decimal]').fill('10');assert.equal(await sum(),3800);assert.equal(await colors.inputValue(),'M309');
  await page.locator(width===390?'#viewEstimate':'#viewEstimateDesktop').click();await page.locator('#save').click();const saved=await page.locator('#savedLink').inputValue();await page.goto('about:blank');await page.goto(saved);await page.locator('[data-step="1"]').click();assert.equal(await colors.inputValue(),'M309');assert.equal(await sum(),3800);
  await page.screenshot({path:'/tmp/aceil-film-catalogue-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);await page.close();console.log('PASS film available without room selection, three series, full palette, roll pricing, width fit and saved colour '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
