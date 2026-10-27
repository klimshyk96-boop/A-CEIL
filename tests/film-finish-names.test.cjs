const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,390,2,root);await reveal(page);
  await page.evaluate(()=>{pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=[{x:0,y:0},{x:300,y:0},{x:300,y:300},{x:0,y:300}];lengths=[300,300,300,300];closed=true;draw()});
  const pick=async(tab,code)=>{await page.click('#aceilColorPickerBtn');await page.evaluate(()=>window.__aceilColorPickerSeries('teqtum-euro'));await page.evaluate(t=>window.__aceilColorPickerTab(t),tab);await page.click('#acp2Grid [data-code="'+code+'"]');await page.click('#acp2Confirm');await page.waitForTimeout(400)};
  const state=()=>page.evaluate(()=>({cur:A_CEILColorPicker.current().code,btn:document.getElementById('acpbCode').textContent,active:elemItems.filter(i=>i.filmWidth>0&&i.qty>0).map(i=>i.name),first:elemGroups[0].name,groups:elemGroups.filter(g=>g.filmSeriesId==='teqtum-euro').map(g=>g.name)}));
  for(const [tab,code,label] of [['mat','M921','Мат'],['satin','S921','Сатин'],['lak','L921','Глянець'],['mat','M921','Мат']]){
   await pick(tab,code);const s=await state();
   assert.equal(s.cur,code);
   assert.ok(s.btn.endsWith(label),'button shows finish: '+s.btn);
   assert.ok(s.active.length===1&&s.active[0].includes(label),'estimate row shows finish: '+s.active);
   assert.ok(s.first.endsWith(label),'active group shows finish: '+s.first);
  }
  const s=await state();assert.equal(new Set(s.groups).size,s.groups.length,'group names are distinct per finish');
  // Premium codes stay unchanged (no suffix).
  await page.click('#aceilColorPickerBtn');await page.evaluate(()=>window.__aceilColorPickerSeries('premium'));await page.evaluate(()=>window.__aceilColorPickerTab('satin'));await page.click('#acp2Grid [data-code="S303"]');await page.click('#acp2Confirm');await page.waitForTimeout(300);
  assert.equal((await state()).active[0].split(' ')[0],'S303');
  assert.deepEqual(errors,[]);
  console.log('film finish names ok');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
