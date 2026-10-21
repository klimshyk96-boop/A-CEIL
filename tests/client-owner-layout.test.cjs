const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(()=>{
   elemGroups=[{id:'old-film',name:'Плівка Premium',collapsed:false},{id:'g',name:'Комплектуючі',collapsed:false}];elemItems=Array.from({length:45},(_,i)=>({id:'p'+i,groupId:'g',name:'Позиція '+i,unit:'шт',price:100+i}));
   elemItems.unshift({id:'old-width',groupId:'old-film',name:'M303 3,6м',colorCode:'M303',filmWidth:3.6,unit:'м²',price:380});
   window['__A·CEILNomenCatalogV339']={groups:elemGroups,items:elemItems};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({__productRules:5,__selection:{}}));
   document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(e=>e.open=true);
  });
  const films=page.locator('[data-owner-films]');
  assert.equal(await films.count(),1);
  assert.deepEqual(await films.locator('.owner-film-series>summary').allTextContents(),['Класік','Преміум','Кралтон']);
  assert.equal(await page.locator('[data-group="old-film"]').count(),0,'no separate legacy film group');
  assert.equal(await page.locator('.owner-item').evaluateAll(rows=>rows.filter(row=>row.dataset.clientItem.startsWith('film:')&&!row.closest('[data-owner-films]')).length),0,'all films in one section');
  assert.equal(await films.locator('[data-client-item="film:premium:M303"]').count(),1,'width rows do not duplicate film');
  assert.ok(!(await films.locator('.owner-item strong').allTextContents()).some(name=>/Premium|Classic|Kralton|MSD|KRALTON/.test(name)),'rows only show texture and colour');
  await films.locator('[data-film-series=premium]').evaluate(e=>e.open=true);await films.evaluate(e=>e.open=true);
  await films.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/aceil-film-groups-'+width+'.png'});
  await page.locator('[data-client-item="p0"] input').check();
  await page.locator('[data-owner-filter=selected]').click();
  await page.locator('.owner-content').evaluate(e=>e.scrollTop=e.scrollHeight);
  const back=page.locator('.owner-footer').getByRole('button',{name:'← Назад',exact:true}),save=page.locator('.owner-footer [type=submit]');
  for(const button of [back,save]){assert.equal(await button.isVisible(),true);const rect=await button.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=1000);}
  await save.click();assert.ok((await page.locator('#aceilClientSetup output').textContent()).includes('Вибір збережено'));
  await page.locator('[data-owner-settings]').evaluate(e=>e.open=true);await page.locator('[data-owner-links]').evaluate(e=>e.open=false);await page.locator('[data-owner-filter=all]').click();await page.locator('.owner-category').last().scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/aceil-owner-compact-'+width+'.png',fullPage:false});
  await back.click();assert.equal(await page.locator('[data-owner-settings]').evaluate(e=>e.open),false,'back returns to actions');
  await back.click();assert.equal(await page.locator('#aceilClientSetup').evaluate(e=>e.open),false);
  await page.evaluate(()=>{
   const key='aceil-client-preset:local',saved=JSON.parse(localStorage.getItem(key));saved.__cloudToken='a'.repeat(32);localStorage.setItem(key,JSON.stringify(saved));
   navigator.share=async payload=>{window.sharedCalculator=payload;};document.getElementById('aceilClientSetupButton').click();
  });
  assert.equal(await page.locator('[data-owner-settings]').evaluate(e=>e.open),false);
  assert.equal(await page.locator('[data-publish-calculator]').count(),0,'no publish/update button for a ready cloud calculator');
  assert.equal(await page.locator('.owner-footer [type=submit]').isVisible(),false,'no save button outside editing');
  assert.equal(await page.locator('[data-owner-links] input[readonly]').isVisible(),false,'no technical link field');
  assert.deepEqual(await page.locator('.owner-main-actions').getByRole('link').allTextContents(),['Відкрити']);
  await page.getByRole('button',{name:'Надіслати',exact:true}).click();
  assert.equal(await page.evaluate(()=>new URL(window.sharedCalculator.url).searchParams.get('c')),'a'.repeat(32));
  assert.ok((await page.locator('#aceilClientSetup').boundingBox()).height<500,'ready menu is compact');
  await page.screenshot({path:'/tmp/aceil-owner-actions-'+width+'.png'});
  await page.locator('[data-owner-settings]>summary').click();await page.locator('.owner-footer [type=submit]').waitFor({state:'visible'});
  await back.click();await back.click();
  assert.deepEqual(errors,[]);await page.close();console.log('PASS compact owner settings, selected filter, visible back/save footer and form submission '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
