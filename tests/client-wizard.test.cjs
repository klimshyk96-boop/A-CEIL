const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const points=[{x:0,y:0},{x:4,y:0},{x:4,y:2},{x:2,y:2},{x:2,y:5},{x:0,y:5}];
assert.deepEqual([M.contour(points).area,M.contour(points).perimeter,M.contour(points).corners,M.contour(points).span],[14,18,6,4]);
for(const p of [[{x:0,y:0},{x:4,y:4},{x:0,y:4},{x:4,y:0}],points.slice(0,2),[...points,points[0]],[{x:0,y:0},{x:4,y:0},{x:2,y:0},{x:0,y:4}]])assert.equal(M.contour(p),null);
const catalog={version:1,company:'Test',items:{film:{name:'Premium',series:'premium',price:400,widths:[{nominal:5,max:5,price:400}]},classic:{name:'Al',price:200},classicCorners:{name:'Corners',price:100}}};
const state={mode:'contour',points,profile:'classic',insert:'none',chandelier:0,spot:0};
assert.equal(M.estimate(state,catalog).total,9800);assert.equal(M.estimate({...state,points:[]},catalog).valid,false);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await page.goto('http://aceil.test/calculator/?demo=1');const review=()=>page.locator(width===390?'#viewEstimate':'#viewEstimateDesktop').click();
  assert.equal(await page.locator('[data-panel="0"]').isVisible(),true);assert.equal(await page.locator('[data-panel="1"]').isVisible(),false);
  await page.screenshot({path:'/tmp/aceil-wizard-room-'+width+'.png',fullPage:true});
  await page.locator('[name=width]').fill('');await page.locator('#stepNext').click();assert.equal(await page.locator('[data-panel="0"]').isVisible(),true);assert.equal(await page.locator('#stepError').isVisible(),true);
  await page.locator('[name=width]').fill('4');await page.locator('#stepNext').click();assert.equal(await page.locator('[data-panel="1"]').isVisible(),true);
  await page.screenshot({path:'/tmp/aceil-wizard-ceiling-'+width+'.png',fullPage:true});
  await page.locator('#stepNext').click();assert.equal(await page.locator('[data-panel="2"]').isVisible(),true);
  assert.equal(await page.locator('[data-extra-panel=spot]').isVisible(),false);await page.locator('[data-extra=spot]').click();assert.equal(await page.locator('[data-extra-panel=spot]').isVisible(),true);
  await page.locator('[name=spot]').fill('4');await page.locator('[data-extra=spot]').click();assert.equal(await page.locator('[name=spot]').inputValue(),'0');assert.equal(await page.locator('[data-extra-panel=spot]').isVisible(),false);
  await page.locator('[data-extra=cornice]').click();await page.locator('[data-cornice-kind=hidden]').click();await page.locator('[data-cornice-color=black]').click();
  await page.screenshot({path:'/tmp/aceil-wizard-extras-'+width+'.png',fullPage:true});
  await page.locator('[data-extra=cornice]').click();await page.locator('[data-step="0"]').click();await page.locator('[data-mode=contour]').click();
  const canvas=page.locator('#contourCanvas'),bounds=await canvas.boundingBox();
  for(const p of [{x:.5,y:.5},{x:4.5,y:.5},{x:4.5,y:2.5},{x:2.5,y:2.5},{x:2.5,y:5.5},{x:.5,y:5.5}])await canvas.click({position:{x:p.x/6*bounds.width,y:p.y/6*bounds.height}});
  await page.locator('#contourClose').click();assert.equal(await page.locator('#areaMetric').textContent(),'14 м²');assert.equal(await page.locator('#perimeterMetric').textContent(),'18 м');
  await page.screenshot({path:'/tmp/aceil-wizard-contour-'+width+'.png',fullPage:true});
  await page.locator('#stepNext').click();await review();assert.equal(await page.locator('#estimateDialog').evaluate(el=>el.open),true);
  await page.locator('#save').click();const saved=await page.locator('#savedLink').inputValue();assert.equal(M.decode(new URL(saved).hash.slice(1)).state.points.length,6);
  await page.goto('about:blank');await page.goto(saved);assert.equal(await page.locator('#areaMetric').textContent(),'14 м²');assert.equal(await page.locator('#contourFields').isVisible(),true);
  await review();await page.locator('#reviewRequest').click();assert.equal(await page.locator('#name').isVisible(),true);await page.keyboard.press('Escape');
  const token='a'.repeat(32);let price=400;
  await page.route('**/rest/v1/rpc/aceil_get_client_calculator',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...catalog,items:{...catalog.items,film:{...catalog.items.film,price,widths:[{nominal:5,max:5,price}]}}})}));
  await page.goto('http://aceil.test/calculator/?c='+token);assert.equal(await page.locator('#total').textContent(),'12 000 грн');
  price=500;await page.reload();assert.equal(await page.locator('#total').textContent(),'14 000 грн','same public link reads current prices');
  await review();await page.locator('#save').click();const cloudSaved=await page.locator('#savedLink').inputValue();assert.equal(new URL(cloudSaved).searchParams.get('c'),token);assert.equal(M.decode(new URL(cloudSaved).hash.slice(1)).config,undefined);
  await page.route('**/rest/v1/rpc/aceil_get_client_calculator',route=>route.fulfill({status:503,body:'offline'}));await page.reload();assert.equal(await page.locator('#unavailable').isVisible(),true,'never silently substitute demo/stale prices when cloud read fails');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();console.log('PASS wizard, optional extras, contour, restore and current cloud prices '+width+'px');
 }
 // Publish contract uses a controlled RPC fixture, not a live database write.
 const {page,errors}=await open(browser,390);await reveal(page);
 await page.evaluate(()=>{
  elemItems=[{id:'f',name:'Плівка Premium',source:'area',unit:'м²',price:380,costPrice:3},{id:'f2',name:'Плівка сатин',source:'area',unit:'м²',price:500},{id:'p',name:'Профіль',source:'main_profile',unit:'м',price:200},{id:'c',name:'Кути',source:'corners',unit:'шт',price:100}];
  _sb={rpc:async()=>({error:{code:'PGRST202'}})};document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(el=>el.open=true);
 });
 await page.locator('#aceilClientSetup [name=film]').selectOption('f');await page.locator('#aceilClientSetup [name=filmOptions][value=f]').check();await page.locator('#aceilClientSetup [name=filmOptions][value=f2]').check();await page.locator('#aceilClientSetup [type=submit]').click();
 const first=await page.locator('#aceilClientSetup input[readonly]').inputValue(),cfg=M.decode(new URL(first).hash.slice(1)).config,filmId=cfg.options.film.find(it=>it.name==='Плівка Premium').id;
 await page.locator('[data-publish-calculator]').click();assert.ok((await page.locator('#aceilClientSetup output').textContent()).includes('ще не ввімкнено'));assert.equal(await page.locator('#aceilClientSetup input[readonly]').inputValue(),first);
 await page.evaluate(()=>{window.published=[];_sb={rpc:async(name,args)=>{window.published.push({name,args});return{data:'b'.repeat(32),error:null};}};});
 await page.locator('[data-publish-calculator]').click();const publicUrl=await page.locator('#aceilClientSetup input[readonly]').inputValue();assert.equal(new URL(publicUrl).searchParams.get('c'),'b'.repeat(32));assert.equal(new URL(publicUrl).hash,'');
 await page.locator('#aceilClientSetup>details>summary').click();await page.evaluate(()=>document.querySelectorAll('#aceilClientSetup details').forEach(el=>el.open=true));await page.locator('#aceilClientSetup [name=film]').selectOption('f2');await page.locator('#aceilClientSetup [type=submit]').click();await page.locator('[data-publish-calculator]').click();
 assert.equal(await page.locator('#aceilClientSetup input[readonly]').inputValue(),publicUrl);const published=await page.evaluate(()=>window.published);assert.equal(published[1].args.p_config.options.film.find(it=>it.name==='Плівка Premium').id,filmId,'reordering products must preserve selection identity');assert.ok(!JSON.stringify(published).includes('costPrice'));
 await page.screenshot({path:'/tmp/aceil-wizard-owner.png',fullPage:false});assert.deepEqual(errors,[]);await page.close();console.log('PASS owner cloud publication failure, stable URL, stable product IDs and retail-only export');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
