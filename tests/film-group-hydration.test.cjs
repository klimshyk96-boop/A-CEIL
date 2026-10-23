const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(2600);
  const result=await page.evaluate(()=>{
   window.__A·CEILReportRendering=true;
   const film=(id,groupId,w,qty)=>({id,groupId,name:'M303 '+w+'м',unit:'м²',price:w===3.6?380:420,filmWidth:w,filmMaxWidth:w===3.6?3.6:5.6,colorCode:'M303',colorTexture:'mat',seriesId:'premium',filmSeriesId:'premium',filmPickerManaged:true,roomScoped:true,roomScopedKind:'film-color',qty,manualQtyOverride:qty>0});
   elemGroups=[{id:'film-new',name:'Плівка Premium',roomScoped:true,roomScopedKind:'film-color',filmSeriesId:'premium'},{id:'other',name:'Освітлення'}];
   elemItems=[film('new-a','film-new',3.6,0),film('new-b','film-new',5.1,0),film('saved-a','film-old',3.6,12),film('saved-b','film-old',5.1,0),{id:'other-item',groupId:'deleted-other',name:'Звичайна позиція',qty:2,price:10}];
   renderElemList();
   return {groups:structuredClone(elemGroups),film:elemItems.filter(x=>x.filmPickerManaged),other:elemItems.find(x=>x.id==='other-item'),html:document.getElementById('elemList').textContent};
  });
  assert.equal(result.film.length,2,'saved film rows without a matching group must not duplicate the default white mat');
  assert.ok(result.film.every(x=>result.groups.some(g=>String(g.id)===String(x.groupId)&&g.name)));
  assert.equal(result.film.find(x=>x.filmWidth===3.6).qty,12);assert.equal(result.film.find(x=>x.filmWidth===3.6).price,380);
  assert.equal(result.other.groupId,'deleted-other');assert.equal(result.other.qty,2);
  const missing=await page.evaluate(()=>{
   elemGroups=elemGroups.filter(g=>g.roomScopedKind!=='film-color');renderElemList();
   return {groups:structuredClone(elemGroups),film:elemItems.filter(x=>x.filmPickerManaged)};
  });
  assert.equal(missing.groups.filter(g=>g.roomScopedKind==='film-color').length,1);assert.ok(missing.film.every(x=>missing.groups.some(g=>g.id===x.groupId&&g.name==='Плівка Premium')));
  const anonymous=await page.evaluate(()=>{
   const filmGroup=elemGroups.find(g=>g.roomScopedKind==='film-color');filmGroup.name='';
   renderElemList();renderElemList();
   const before=elemItems.filter(x=>x.filmPickerManaged).map(x=>x.id);
   const stable=window.A_CEIL_NormalizeFilmGroups();
   window.A_CEILColorPicker.select('M303','premium');renderElemList();
   return {name:filmGroup.name,stable,before,groups:elemGroups.filter(g=>g.roomScopedKind==='film-color').map(g=>({id:g.id,name:g.name})),film:elemItems.filter(x=>x.filmPickerManaged).map(x=>({groupId:x.groupId,code:x.colorCode,width:x.filmWidth})),orphanFilm:elemItems.filter(x=>x.filmPickerManaged&&!elemGroups.some(g=>g.id===x.groupId)).length};
  });
  assert.equal(anonymous.name,'Плівка Premium');assert.equal(anonymous.stable,false,'normalization is idempotent');assert.equal(anonymous.groups.length,1);assert.equal(anonymous.orphanFilm,0);assert.equal(new Set(anonymous.film.map(x=>x.width)).size,anonymous.film.length);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS missing film groups repaired, white mat widths deduplicated, saved quantity/price and unrelated rows retained '+width+'px');
 }
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
