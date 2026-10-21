const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const cfg={version:1,items:{film:{name:'M303',price:380,widths:[{nominal:3.6,max:3.6,price:380},{nominal:5.1,max:5.6,price:420},{nominal:5.8,max:6.2,price:450}]},classic:{name:'Al',price:200},classicCorners:{name:'Кути',price:100}}};
const base={mode:'rectangle',width:4,length:8,profile:'classic',insert:'none',chandelier:0,spot:0,cornice:false};
for(const [width,nominal,price] of [[3.6,3.6,380],[3.6001,5.1,420],[5.6,5.1,420],[5.6001,5.8,450],[6.2,5.8,450]]){
 const r=M.estimate({...base,width},cfg);assert.equal(r.valid,true);assert.equal(r.film.roll.nominal,nominal);assert.equal(r.rows.find(r=>r.key==='film').price,price);
}
assert.equal(M.estimate({...base,width:6.2001},cfg).valid,false);
assert.equal(M.estimate({...base,width:8,length:4},cfg).film.roll.nominal,5.1,'rotating the rectangle keeps required cross width');
assert.ok(M.estimate({...base,mode:'manual',area:20,perimeter:18,corners:4,roomWidth:''},cfg).errors.includes('roomWidth'));
assert.equal(M.estimate({...base,mode:'manual',area:20,perimeter:18,corners:4,roomWidth:3.6},cfg).film.roll.price,380);
assert.equal(M.config(cfg).items.film.widths.length,3,'width metadata survives public sanitization');
assert.equal(M.profileVariant({name:'Тіньовий білий / чорний'},'shadow'),'standard','an ambiguous colour name must not invent a white variant');
assert.throws(()=>M.config({...cfg,items:{...cfg.items,film:{name:'bad',price:380,widths:[{nominal:3.6,max:-1,price:380}]}}}));
const quoted=M.estimate(base,{...cfg,minimum:20000,items:{...cfg.items,film:{name:'Classic',series:'classic',price:0,widths:[{nominal:5.1,max:5.6,price:0,requiresQuote:true}]}}});
assert.equal(quoted.valid,true);assert.equal(quoted.complete,false);assert.equal(quoted.rows.find(r=>r.key==='film').price,null);assert.ok(!quoted.rows.some(r=>r.key==='minimum'),'do not apply a minimum to an incomplete estimate');
assert.equal(M.estimate(base,{...cfg,items:{...cfg.items,film:{name:'Free explicit tariff',price:0}}}).complete,true,'an explicit zero rate remains different from an unknown price');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(400);
  await page.evaluate(()=>{
   elemGroups=[];elemItems=[{id:'al',name:'Базовий алюмінієвий профіль',source:'main_profile',unit:'м',price:200},{id:'pvc',name:'Базовий профіль ПВХ',source:'main_profile',unit:'м',price:150},{id:'c',name:'Кути',source:'corners',unit:'шт',price:100},{id:'sblack',name:'Тіньовий чорний',source:'shadow_profile',sourceVariant:'black',unit:'м',price:550},{id:'swhite',name:'Тіньовий білий',source:'shadow_profile',sourceVariant:'white',unit:'м',price:600},{id:'sc',name:'Кути тіньові',source:'shadow_corners',unit:'шт',price:150}];
   document.getElementById('aceilClientSetupButton').click();
  });
  await page.evaluate(()=>document.querySelectorAll('#aceilClientSetup details').forEach(el=>el.open=true));
  assert.equal(await page.locator('[data-client-item="film:premium:M303"] input[type=checkbox]').isChecked(),true,'film registry supplies the checklist even without any live film item');
  await page.locator('[data-client-item="al"] input[type=checkbox]').check();await page.locator('#aceilClientSetup [type=submit]').click();
  const url=await page.locator('#aceilClientSetup a').last().getAttribute('href'),payload=M.decode(new URL(url).hash.slice(1));
  assert.deepEqual(payload.config.options.film[0].widths.map(w=>[w.nominal,w.max,w.price]),[[3.6,3.6,380],[5.1,5.6,420],[5.8,6.2,420]]);
  assert.deepEqual(new Set(payload.config.options.film.map(it=>it.series)),new Set(['premium','classic','kralton']));assert.equal(payload.config.options.film.find(it=>it.series==='classic').widths[0].requiresQuote,true);
  assert.equal(payload.config.options.classic.length,2);assert.equal(payload.config.options.shadow.length,2);
  await page.goto(M.link('http://aceil.test/',{...payload.config,catalogue:false}));await page.locator('[data-step="1"]').click();assert.equal(await page.locator('[name=filmOption]').isVisible(),false);assert.ok((await page.locator('#filmRule').textContent()).includes('420 грн/м²'));
  if(width===390){const before=page.url();await page.locator('#viewEstimate').click();assert.equal(page.url(),before,'estimate dialog must not change encoded hash');await page.keyboard.press('Escape');}
  const initial=Number((await page.locator('#total').textContent()).replace(/[^0-9]/g,''));
  await page.locator('[data-profile-family=classic][data-profile-variant=pvc]').click();
  assert.ok((await page.locator('#profileCurrent').textContent()).includes('ПВХ'));assert.equal(Number((await page.locator('#total').textContent()).replace(/[^0-9]/g,'')),initial-900);
  await page.locator('[value=shadow]').check();await page.locator('[data-profile-family=shadow][data-profile-variant=white]').click();
  assert.ok((await page.locator('#profileCurrent').textContent()).includes('білий'));
  const white=Number((await page.locator('#total').textContent()).replace(/[^0-9]/g,''));await page.locator('[data-profile-family=shadow][data-profile-variant=black]').click();
  assert.equal(Number((await page.locator('#total').textContent()).replace(/[^0-9]/g,'')),white-900);
  await page.locator('[data-step="0"]').click();await page.locator('[name=width]').fill('3.6');assert.ok((await page.locator('#filmRule').textContent()).includes('380 грн/м²'));
  await page.locator('[data-mode=manual]').click();await page.locator('[name=roomWidth]').fill('');assert.equal(await page.locator('#save').isDisabled(),true);
  await page.locator('[name=roomWidth]').fill('6.3');assert.ok((await page.locator('#error').textContent()).includes('немає придатного полотна'));
  await page.locator('[name=roomWidth]').fill('4.4');await page.locator(width===390?'#viewEstimate':'#viewEstimateDesktop').click();await page.locator('#save').click();const saved=await page.locator('#savedLink').inputValue();
  await page.goto('about:blank');await page.goto(saved);assert.equal(await page.locator('[name=roomWidth]').inputValue(),'4.4');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS film width boundaries, registry, profile materials/colours and width state '+width+'px');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
