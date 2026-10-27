const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=path.join(__dirname,'..'),baseline=process.env.ACEIL_REPORT_SETTINGS_BASELINE;
async function run(browser,source,width){
 const{page,errors}=await open(browser,width,1,source);await reveal(page);await page.waitForTimeout(900);
 const result=[];
 await page.evaluate(()=>{localStorage.setItem('reportSettings',JSON.stringify({reportStyle:'modern',reportAudience:'client',companyName:'Тест стелі',companyPhone:'+380000000000',companySite:'example.test',discountPercent:7,advanceAmount:1500,diagMode:'all',diagonals:true,showWallCoords:true,grandTotal:true}));});
 for(const action of ['initial','off','on','edit']){
  await page.evaluate(action=>{
   if(action==='off')rsproSetAll(false);else if(action==='on')rsproSetAll(true);else openReportSettings();
  },action);
  await page.waitForTimeout(220);
  if(action==='edit')await page.evaluate(()=>{
   for(const[id,value]of Object.entries({rsCompanyName:'Нова компанія',rsDiscountPercent:12,rsAdvanceAmount:2300}))document.getElementById(id).value=value;
   saveReportSettings();closeReportSettings();openReportSettings();
  });
  await page.waitForTimeout(220);
  const snapshot=await page.evaluate(()=>{
   const modal=document.getElementById('reportSettingsModal');
   return{visible:modal.style.display,inputs:[...modal.querySelectorAll('input,select')].map(e=>({id:e.id,value:e.value,checked:e.type==='checkbox'?e.checked:undefined})),buttons:[...modal.querySelectorAll('button')].map(e=>({text:e.textContent.trim(),onclick:e.getAttribute('onclick')})),settings:_loadRS(),diagonalMenu:document.getElementById('rsDiagInlineMenu')?.hidden};
  });
  assert.equal(snapshot.visible,'block');assert.equal(snapshot.inputs.filter(i=>i.id==='rsDiscountPercent').length,1);assert.equal(snapshot.inputs.filter(i=>i.id==='rsAdvanceAmount').length,1);assert.equal(snapshot.settings.reportStyle,'classic');
  if(action==='edit'){assert.equal(snapshot.settings.companyName,'Нова компанія');assert.equal(snapshot.settings.discountPercent,12);assert.equal(snapshot.settings.advanceAmount,2300)}
  result.push(snapshot);await page.evaluate(()=>closeReportSettings());
 }
 if(source===root){const p=await page.evaluate(()=>window['A·CEIL'].pipeline.get('openReportSettings').registered());assert.deepEqual(p,['discountAdvance','managerCard','diagonalSettings'])}
 assert.deepEqual(errors,[]);await page.close();return result;
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){const actual=await run(browser,root,width);if(baseline)assert.deepEqual(actual,await run(browser,baseline,width));console.log('PASS report settings: toggles, diagonals, company, discount, advance and reopen '+width+'px'+(baseline?' (matches baseline)':''))}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
