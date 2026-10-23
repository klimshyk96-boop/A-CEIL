const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(2600);
  await page.evaluate(()=>{
   window.__A·CEILReportRendering=true;
   window.__A·CEILNomenCatalogV339={items:[],groups:[]};
   elemGroups=[{id:'m',name:'Плівка Premium · M303',filmSeriesId:'premium',filmCode:'M303',roomScoped:true,roomScopedKind:'film-color'},{id:'s',name:'Плівка Premium · S303',filmSeriesId:'premium',filmCode:'S303'},{id:'l',name:'Плівка Premium',filmSeriesId:'premium',filmCode:'L303'},{id:'ordinary',name:'Профілі'}];
   const film=(code,g,w,price,managed)=>({id:code+'-'+w,groupId:g,name:code+' '+w+'м',colorCode:code,colorTexture:code[0]==='S'?'satin':code[0]==='L'?'lak':'mat',seriesId:'premium',filmSeriesId:'premium',filmWidth:w,filmMaxWidth:w===5.8?6.2:w===5.1?5.6:w,price,qty:0,unit:'м²',filmPickerManaged:managed,roomScoped:managed,filmRoomSelected:code==='M303'});
   elemItems=[film('M303','m',3.6,380,true),film('M303','m',5.1,420,true),film('M303','m',5.8,420,true),film('S303','s',3.6,380,true),film('S303','s',5.1,420,true),film('S303','s',5.8,451,false),film('L303','l',3.6,380,true),film('L303','l',5.1,420,true),film('L303','l',5.8,452,false),{id:'profile',groupId:'ordinary',name:'Профіль H',qty:0,price:200}];
   renderElemList();
  });
  for(const [code,price] of [['M303',420],['S303',451],['L303',452],['M303',420]]){
   const result=await page.evaluate(code=>{
    window.A_CEILColorPicker.select(code,'premium');renderElemList();
    return {labels:[...document.querySelectorAll('#elemList .em-name')].map(n=>n.textContent),headings:[...document.querySelectorAll('#elemList .nom-group-label')].map(n=>n.textContent),film:window.A_CEILColorPicker.audit().items};
   },code);
   assert.equal(result.headings.filter(x=>x.includes('Плівка')).length,1,'room estimate shows one selected film group');
   assert.ok(result.labels.includes('Профіль H'));assert.ok(result.labels.filter(x=>/^[MLS]303\b/.test(x)).every(x=>x.startsWith(code+' ')));
   assert.equal(result.film.find(x=>x.filmWidth===5.8)?.price,price,'the selected texture retains its custom 5.8 m price');
  }
  await page.evaluate(()=>{renderElemList();document.getElementById('elementsModal').classList.add('open')});
  await page.screenshot({path:'/tmp/aceil-selected-film-'+width+'.png',fullPage:true});
  const cloud=await page.evaluate(()=>_nomenV339CaptureCatalog());
  for(const code of ['S303','L303'])assert.ok(cloud.items.some(x=>x.colorCode===code&&x.filmWidth===5.8),'custom width exported to cloud catalogue for '+code);
  assert.deepEqual(errors,[]);await page.close();
  const fresh=await open(browser,width);await reveal(fresh.page);
  const restored=await fresh.page.evaluate(catalog=>{
   window.__A·CEILReportRendering=true;window.__A·CEILNomenCatalogV339=catalog;
   elemGroups=_nomenV339MergeGroupsWithRoom(catalog.groups,elemGroups);elemItems=_nomenV339MergeCatalogWithRoom(catalog.items,elemItems);
   return ['S303','L303'].map(code=>{window.A_CEILColorPicker.select(code,'premium');renderElemList();return {code,width:window.A_CEILColorPicker.audit().items.find(x=>x.filmWidth===5.8),groups:[...document.querySelectorAll('#elemList .nom-group-label')].filter(n=>n.textContent.includes('Плівка')).length}});
  },cloud);
  assert.deepEqual(restored.map(x=>[x.code,x.width?.price,x.groups]),[['S303',451,1],['L303',452,1]]);assert.deepEqual(fresh.errors,[]);await fresh.page.close();
  console.log('PASS one active film group, M/S/L switching, custom 5.8 m prices and clean-browser cloud restoration '+width+'px');
 }
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
