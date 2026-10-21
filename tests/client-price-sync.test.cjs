const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{
  const {page,errors}=await open(browser,390);await reveal(page);
  await page.evaluate(()=>{
   _sbUser={id:'sync-owner'};window._nomenCloudLoaded=true;
   elemGroups=[{id:'g',name:'Мої профілі',collapsed:false}];
   elemItems=[{id:'shadow',groupId:'g',name:'Тіньовий чорний',unit:'м',price:550,costPrice:20},{id:'secret',groupId:'g',name:'Приватна позиція',unit:'м',price:999}];
   window['__A·CEILNomenCatalogV339']={groups:structuredClone(elemGroups),items:structuredClone(elemItems)};
   window.publications=[];window.rejectPrices=false;
   _sb={..._sb,from:()=>({upsert:async()=>({error:null})}),rpc:async(name,args)=>{if(name!=='aceil_save_client_calculator')return {data:[],error:null};if(window.rejectPrices)return {error:{code:'OFFLINE'}};window.publications.push(structuredClone(args.p_config));return {data:'c'.repeat(32),error:null};}};
   document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(e=>e.open=true);
  });
  for(const checkbox of await page.locator('[data-client-item] input[type=checkbox]').all())await checkbox.uncheck();
  await page.locator('[data-client-item="shadow"] input[type=checkbox]').check();
  await page.locator('#aceilClientSetup [type=submit]').click();
  await page.locator('[data-publish-calculator]').click();
  const link=await page.locator('#aceilClientSetup input[readonly]').inputValue();
  assert.equal(new URL(link).searchParams.get('c'),'c'.repeat(32));
  await page.evaluate(async()=>{elemItems.find(i=>i.id==='shadow').price=650;await saveNomenclatureToCloud();});
  await page.waitForFunction(()=>window.publications.at(-1)?.products?.[0]?.price===650);
  assert.equal(await page.evaluate(()=>window.publications.at(-1).products.length),1);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.publications).includes('costPrice')),false);
  // Changing the selected assortment automatically republishes it.
  await page.locator('#aceilClientSetup [data-owner-settings]>summary').click();
  await page.locator('[data-client-item="secret"] input[type=checkbox]').check();
  await page.locator('#aceilClientSetup [type=submit]').click();
  await page.waitForFunction(()=>window.publications.at(-1).products.length===2);
  assert.equal(await page.locator('#aceilClientSetup input[readonly]').inputValue(),link);
  // Failed writes remain pending, then retry when the connection returns.
  await page.evaluate(async()=>{window.rejectPrices=true;elemItems.find(i=>i.id==='shadow').price=750;await saveNomenclatureToCloud();});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('aceil-client-preset:sync-owner')).__cloudSyncError);
  assert.equal(await page.evaluate(()=>window.publications.at(-1).products.find(p=>p.name==='Тіньовий чорний').price),650);
  await page.evaluate(()=>{window.rejectPrices=false;window.dispatchEvent(new Event('online'));});
  await page.waitForFunction(()=>window.publications.at(-1).products.find(p=>p.name==='Тіньовий чорний').price===750);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('aceil-client-preset:sync-owner')).__cloudSyncError),'');
  const count=await page.evaluate(()=>window.publications.length);
  await page.evaluate(()=>{_sbUser={id:'different-owner'};window.dispatchEvent(new CustomEvent('aceil:nomenclature-saved',{detail:{userId:'sync-owner'}}));});
  // Flush the debounce window without a real network call.
  await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.publications.length),count);
  assert.deepEqual(errors,[]);
  console.log('PASS saved nomenclature → current selected retail prices, stable link, selection save, retry and account isolation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
