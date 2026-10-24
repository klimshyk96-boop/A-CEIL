const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{for(const width of [390,1440]){
 const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(1800);
 const start=await page.evaluate(async()=>{
  resetAllSilent();A_CEIL_AutoCount.setEnabled(false,{silent:true});realPts=[{x:0,y:0},{x:400,y:0},{x:400,y:500},{x:0,y:500}];pts=realPts.map(p=>({x:p.x+100,y:p.y+100}));lengths=[400,500,400,500];closed=true;document.getElementById('area').textContent='20';elemItems=[];elemGroups=[];window.__A·CEILNomenCatalogV339={items:[],groups:[]};
  elemGroups=[{id:'pvc',name:'Комплектуючі ПВХ'},{id:'fabric',name:'Тканинні стелі',ceilingMaterial:'fabric'},{id:'lights',name:'Освітлення'},{id:'custom',name:'Особливе'}];
  const item=(id,groupId,name,price,qty,extra={})=>({id,groupId,name,price,qty,unit:'м',manualQtyOverride:true,...extra});
  elemItems=[item('h','pvc','Алюмінієвий профіль h',185,18,{source:'main_profile'}),item('insert','pvc','Вставка біла',60,18,{source:'white_insert'}),item('harpoon','pvc','Гарпун',10,18),item('fabric-profile','fabric','Профіль ПВХ Descor ECOTRACK',100,18,{source:'main_profile'}),item('fabric-work','fabric','Монтаж полотна',50,20),item('light','lights','Люстра',350,1),item('protection','custom','Захист підлоги плівкою',20,1),item('cornice','custom','Карниз накладний ПВХ',200,1),item('unknown','custom','Особлива робота',90,1)];
  A_CEILColorPicker.select('M951','descor-premium');
  elemItems.filter(i=>i.filmPickerManaged).forEach(i=>{i.qty=i.filmWidth===4.1?20:0;i.price=500;});await openElementsModal();
  window.__materialFilterState={realPts,pts,lengths,closed,elemItems:structuredClone(elemItems),elemGroups:structuredClone(elemGroups)};
  return {visible:A_CEILColorPicker.view().items.map(i=>i.id),total:_modernGroupsTotal(_modernGetNomenclatureGroupsFromState(window.__materialFilterState)),footer:document.getElementById('elemTotalValue').textContent,stable:A_CEIL_GetStableProjectTotal(),quantities:elemItems.filter(i=>['h','insert','harpoon'].includes(i.id)).map(i=>i.qty)};
 });
 for(const id of ['h','insert','harpoon'])assert.ok(!start.visible.includes(id),id+' hidden for fabric');
 for(const id of ['fabric-profile','fabric-work','light','protection','cornice','unknown'])assert.ok(start.visible.includes(id),id+' visible for fabric');
 assert.equal(start.total,13460);assert.equal(start.stable,13460);assert.equal(start.footer,'₴13460.00');assert.deepEqual(start.quantities,[18,18,18],'filtering preserves stored quantities');
 assert.match(await page.locator('#elemMaterialFilterLabel').innerText(),/Тканинна/);
 await page.locator('#elemMaterialFilterToggle').click();assert.match(await page.locator('#elemList').innerText(),/Алюмінієвий профіль h/);assert.equal(await page.locator('#elemTotalValue').innerText(),'₴13460.00','show-all is only a catalogue view');
 // Reopening and choosing a new ceiling kind reset the inspection toggle.
 await page.evaluate(()=>{closeModal('elementsModal');openElementsModal();});assert.ok(!(await page.locator('#elemList').innerText()).includes('Алюмінієвий профіль h'));
 // Explicit item type is editable and survives local state capture.
 await page.evaluate(()=>openEditElemModal('unknown'));await page.locator('#editElemCeilingMaterial').selectOption('pvc');await page.evaluate(()=>saveElemEdit());
 assert.ok(!(await page.locator('#elemList').innerText()).includes('Особлива робота'));assert.equal(await page.evaluate(()=>elemItems.find(i=>i.id==='unknown').ceilingMaterial),'pvc');
 // An explicit shared override permits exceptions even inside a PVC group.
 await page.evaluate(()=>{A_CEILColorPicker.toggleMaterialFilter();openEditElemModal('h');});await page.locator('#editElemCeilingMaterial').selectOption('shared');await page.evaluate(()=>{saveElemEdit();A_CEILColorPicker.toggleMaterialFilter();});
 assert.ok((await page.locator('#elemList').innerText()).includes('Алюмінієвий профіль h'));
 await page.evaluate(()=>openEditGroupModal('fabric'));assert.equal(await page.locator('#editGroupCeilingMaterial').inputValue(),'fabric');await page.evaluate(()=>closeModal('editGroupModal'));
 const reports=await page.evaluate(async()=>{
  const saved=structuredClone(window.__materialFilterState),pvc=structuredClone(saved);pvc.elemItems=pvc.elemItems.filter(i=>!i.filmPickerManaged);pvc.elemItems.unshift({id:'pvc-film',name:'M303 5.1м',qty:20,price:400,filmWidth:5.1,colorCode:'M303',seriesId:'premium',colorTexture:'mat',filmRoomSelected:true,filmPickerManaged:true});
  const fabricIds=_modernGetNomenclatureGroupsFromState(saved).flatMap(g=>g.items.map(i=>i.id)),pvcIds=_modernGetNomenclatureGroupsFromState(pvc).flatMap(g=>g.items.map(i=>i.id));
  const project={rooms:[{id:'f',name:'Тканина',area:20,state:JSON.stringify(saved)},{id:'p',name:'ПВХ',area:20,state:JSON.stringify(pvc)}]},E=A_CEIL_EstimateVariants;
  const variant=E.createVariant(project,{scope:'all',changes:{film:{mode:'replace',seriesId:'premium',code:'M303'}}});
  const variantItems=E.computeRoomItems(project,project.rooms[0],variant.variant.id),variantRows=_modernGetNomenclatureGroupsFromState({elemItems:variantItems.items,elemGroups:variantItems.groups}).flatMap(g=>g.items.map(i=>i.id));
  const texts=[],original=CanvasRenderingContext2D.prototype.fillText,preview=_modernOpenPreview;
  CanvasRenderingContext2D.prototype.fillText=function(t,...args){texts.push(String(t));return original.call(this,t,...args)};_modernOpenPreview=function(){};
  try{await generateModernObjectReport({rooms:[project.rooms[0]]},{..._loadRS(),drawing:false,dimensionsList:false,showLegend:false,showWallCoords:false,showLightCoords:false,nomenclature:true,grandTotal:true,reportAudience:'client'});}finally{CanvasRenderingContext2D.prototype.fillText=original;_modernOpenPreview=preview;}
  const oldObject=_activeObjectId,oldRoom=_activeRoomIdx;window['A·CEIL'].ProjectRepository.replaceAll([{id:'material-filter-multi',multiRoom:true,...project}]);_activeObjectId='material-filter-multi';_activeRoomIdx=null;const mixedTotal=A_CEIL_GetStableProjectTotal();_activeObjectId=oldObject;_activeRoomIdx=oldRoom;
  return {fabricIds,pvcIds,variantRows,texts,mixedTotal};
 });
 assert.equal(reports.mixedTotal,26710,'each saved room uses its own selected material');
 assert.ok(!reports.fabricIds.includes('h'));assert.ok(reports.pvcIds.includes('h'));assert.ok(!reports.pvcIds.includes('fabric-profile'));assert.ok(reports.variantRows.includes('h'));assert.ok(!reports.variantRows.includes('fabric-profile'));
 assert.ok(!reports.texts.some(t=>t.includes('Алюмінієвий профіль h')));assert.ok(reports.texts.some(t=>t.includes('Descor ECOTRACK')));
 await page.evaluate(()=>{A_CEILColorPicker.select('M303','premium');openElementsModal();});assert.match(await page.locator('#elemMaterialFilterLabel').innerText(),/ПВХ/);assert.ok(!(await page.locator('#elemList').innerText()).includes('Descor ECOTRACK'));
 await page.evaluate(()=>openEditGroupModal('custom'));await page.locator('#editGroupCeilingMaterial').selectOption('shared');await page.evaluate(()=>saveGroupEdit());
 await page.reload();await reveal(page);await page.waitForTimeout(1600);
 const stored=await page.evaluate(()=>({item:elemItems.find(i=>i.id==='unknown')?.ceilingMaterial,exception:elemItems.find(i=>i.id==='h')?.ceilingMaterial,group:elemGroups.find(g=>g.id==='custom')?.ceilingMaterial}));assert.deepEqual(stored,{item:'pvc',exception:'shared',group:'shared'});
 await page.evaluate(()=>openElementsModal());assert.deepEqual(errors,[]);await page.screenshot({path:'/tmp/aceil-material-filter-'+width+'.png'});await page.close();console.log('PASS material filter, overrides, totals, room reports and variants '+width+'px');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
