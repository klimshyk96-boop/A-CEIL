const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 const {page,errors}=await open(browser,390);await reveal(page);await page.waitForTimeout(2600);
 await page.evaluate(()=>{window.__A·CEILReportRendering=true;window.__A·CEILNomenCatalogV339={items:[],groups:[]};elemItems=[];elemGroups=[];window.A_CEILColorPicker.select('L303','premium');document.getElementById('elementsModal').classList.add('open');renderElemList();});
 const card=page.locator('#elemList .grp-card').filter({hasText:'Плівка'});
 await card.locator('.grp-add').click();
 await page.locator('#rmNiNameV320').fill('L303 5.8м');await page.locator('#rmNiUnitV320').selectOption('м²');await page.locator('#rmNiPriceV320').fill('440');
 await page.locator('#rmNomNewItemV320 button[onclick="rmSaveNomNewItemV320()"]').click();
 assert.equal(await page.locator('#elemList .nom-group-label').count(),1);
 const row=page.locator('#elemList .em-name').filter({hasText:'L303 5.8м'});await row.click();
 await page.locator('#editElemName').fill('L303 5,8м');await page.locator('#editElemModal button[onclick="saveElemEdit()"]').click();
 const id=await page.evaluate(()=>elemItems.find(x=>x.name==='L303 5,8м')?.id);assert.ok(id);
 // Price is entered through the rendered row, not by changing the model.
 await page.locator(`#elemList input[oninput*="updateElemPrice('${id}'"]`).fill('440');
 let model=await page.evaluate(id=>({...elemItems.find(x=>x.id===id)}),id);assert.equal(model.price,440);assert.equal(model.filmWidth,5.8);assert.equal(model.unit,'м²');assert.equal(model.colorCode,'L303');
 await page.evaluate(()=>window.A_CEILColorPicker.select('S303','premium'));assert.equal(await page.locator('#elemList .nom-group-label').count(),1);assert.equal(await page.locator('#elemList .em-name').filter({hasText:'L303'}).count(),0);
 await page.evaluate(()=>window.A_CEILColorPicker.select('L303','premium'));assert.equal(await page.locator('#elemList .em-name').filter({hasText:/L303 5[.,]8м/}).count(),1);
 // Collapse is intentional within this opening, but must not carry into the next opening.
 await card.locator('.grp-toggle').click();await page.evaluate(()=>renderElemList());assert.equal(await card.locator('.grp-body').count(),0);
 await page.evaluate(()=>{closeModal('elementsModal');openElementsModal();});
 assert.equal(await page.evaluate(()=>elemGroups.find(g=>g.filmCode==='L303').collapsed),false);
 await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>elemGroups.find(g=>g.filmCode==='L303').collapsed),false);
 // Migrate the exact old, metadata-free row shown in the user's screenshot.
 await page.evaluate(()=>{elemGroups.push({id:'legacy',name:'Плівка Premium'});elemItems.push({id:'legacy-row',groupId:'legacy',name:'S303 5.8м',icon:'📦',qty:0,unit:'м²',price:441});renderElemList();});
 assert.equal(await page.locator('#elemList .nom-group-label').count(),1);
 const catalog=await page.evaluate(()=>_nomenV339CaptureCatalog());assert.ok(catalog.items.some(x=>x.colorCode==='L303'&&x.filmWidth===5.8&&x.price===440));assert.ok(catalog.items.some(x=>x.colorCode==='S303'&&x.filmWidth===5.8&&x.price===441));assert.deepEqual(errors,[]);
 const fresh=await open(browser,390);await reveal(fresh.page);
 const restored=await fresh.page.evaluate(catalog=>{
  window.__A·CEILReportRendering=true;window.__A·CEILNomenCatalogV339=catalog;
  elemGroups=_nomenV339MergeGroupsWithRoom(catalog.groups,elemGroups);elemItems=_nomenV339MergeCatalogWithRoom(catalog.items,elemItems);
  window.A_CEILColorPicker.select('L303','premium');renderElemList();
  return {custom:window.A_CEILColorPicker.audit().items.filter(x=>x.filmWidth===5.8),groups:[...document.querySelectorAll('#elemList .nom-group-label')].filter(x=>x.textContent.includes('Плівка')).length};
 },catalog);
 assert.equal(restored.groups,1);assert.equal(restored.custom.length,1);assert.equal(restored.custom[0].price,440);assert.deepEqual(fresh.errors,[]);await fresh.page.close();
 console.log('PASS actual + / name editing / price 440 / one film group / legacy metadata-free row / expanded on reopen');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
