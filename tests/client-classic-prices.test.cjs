const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{
  const {page,errors}=await open(browser,390);await reveal(page);
  await page.evaluate(()=>{
   elemGroups=[{id:'film',name:'Плівка Classic',filmSeriesId:'classic'}];
   elemItems=[{id:'old-zero',groupId:'film',name:'M303 5.1м',filmWidth:5.1,unit:'м²',price:0}];
   window['__A·CEILNomenCatalogV339']={groups:elemGroups,items:elemItems};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({__productRules:5,__selection:{}}));
   document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(e=>e.open=true);
  });
  await page.locator('[data-client-item="film:classic:M303"] input[type=checkbox]').check();
  await page.getByLabel('Classic Мат 3,6 м',{exact:true}).fill('321');
  await page.getByLabel('Classic Мат 5,1 м',{exact:true}).fill('432');
  // Prices persist immediately, even without saving the assortment form.
  await page.reload();await reveal(page);
  await page.evaluate(()=>{document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(e=>e.open=true);});
  assert.equal(await page.getByLabel('Classic Мат 3,6 м',{exact:true}).inputValue(),'321');
  assert.equal(await page.getByLabel('Classic Мат 5,1 м',{exact:true}).inputValue(),'432');
  await page.locator('[data-client-item="film:classic:M303"] input[type=checkbox]').check();
  await page.locator('#aceilClientSetup [type=submit]').click();
  const link=await page.locator('#aceilClientSetup input[readonly]').inputValue(),cfg=M.decode(new URL(link).hash.slice(1)).config;
  assert.equal(cfg.filmCatalog.classic.mat.narrow,321);assert.equal(cfg.filmCatalog.classic.mat.wide,432);
  assert.equal(cfg.filmOverrides['classic:M303:5.1'],undefined,'stale zero must not override the saved tariff');
  await page.goto(link);await page.locator('[data-step="1"]').click();
  const chooser=page.locator('[data-film-chooser]');await chooser.getByRole('checkbox',{name:'Плівка',exact:true}).check();
  assert.ok((await page.locator('#total').textContent()).includes('8 640'),'20 m² × 432');
  await page.locator('[data-step="0"]').click();await page.locator('[name=width]').fill('3');await page.locator('[data-step="1"]').click();
  assert.ok((await page.locator('#total').textContent()).includes('4 815'),'15 m² × 321');
  await page.goto('http://aceil.test/');await reveal(page);
  await page.evaluate(()=>{
   A_CEILColorPicker.select('M303','classic');
   const item=elemItems.find(i=>i.seriesId==='classic'&&i.filmWidth===5.1);updateElemPrice(item.id,'567');
   A_CEILColorPicker.select('M303','classic');
  });
  assert.equal(await page.evaluate(()=>elemItems.find(i=>i.seriesId==='classic'&&i.filmWidth===5.1).price),567);
  await page.reload();await reveal(page);await page.evaluate(()=>A_CEILColorPicker.select('M303','classic'));
  assert.equal(await page.evaluate(()=>elemItems.find(i=>i.seriesId==='classic'&&i.filmWidth===5.1).price),567,'editing a real film row survives a full reload and colour recreation');
  assert.deepEqual(errors,[]);console.log('PASS owner Classic tariff inputs → saved palette → correct narrow/wide client totals; stale zero ignored');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
