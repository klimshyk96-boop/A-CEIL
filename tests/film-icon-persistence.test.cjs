const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 const {page,errors}=await open(browser,390);await reveal(page);await page.waitForTimeout(2600);
 const id=await page.evaluate(()=>{window.__A·CEILReportRendering=true;window.__A·CEILNomenCatalogV339={items:[],groups:[]};elemItems=[];elemGroups=[];window.A_CEILColorPicker.select('M303','premium');document.getElementById('elementsModal').classList.add('open');renderElemList();return elemItems.find(x=>x.colorCode==='M303'&&x.filmWidth===3.6).id;});
 assert.equal(await page.locator('#emrow_'+id+' .em-icon svg').count(),1,'film defaults to the blue SVG icon');
 await page.locator('#emrow_'+id+' .em-icon').click();await page.locator('#emojiGrid [data-nom-icon-set="laconic"]').click();await page.locator('#emojiGrid [data-nom-icon-panel="laconic"] button[aria-label="Плівка"]').click();
 const selection=await page.evaluate(id=>elemItems.find(x=>x.id===id).icon,id);assert.equal(selection,'svg:laconic-film');
 const retained=await page.evaluate(id=>{for(const code of ['S303','L303','M303','M303'])window.A_CEILColorPicker.select(code,'premium');renderElemList();return elemItems.filter(x=>x.colorCode==='M303'&&x.filmWidth===3.6).map(x=>x.icon)},id);assert.deepEqual(retained,[selection],'the chosen icon survives switching colours (the row is rebuilt: other colours are removed by design)');
 const rowId=()=>page.evaluate(()=>elemItems.find(x=>x.colorCode==='M303'&&x.filmWidth===3.6).id);
 // Changing standard texture prices still works after preserving the row and icon.
 await page.evaluate(()=>{const prices=window.ACEILGetFilmPricing('premium');prices.mat.narrow=489;window.ACEILSetFilmPricing('premium',prices);window.A_CEILColorPicker.select('M303','premium')});
 assert.equal(await page.evaluate(()=>elemItems.find(x=>x.colorCode==='M303'&&x.filmWidth===3.6).price),489);
 const catalog=await page.evaluate(()=>_nomenV339CaptureCatalog());assert.ok(catalog.items.some(x=>x.colorCode==='M303'&&x.filmWidth===3.6&&x.icon==='svg:laconic-film'));
 const fresh=await open(browser,390);await reveal(fresh.page);
 const restored=await fresh.page.evaluate(catalog=>{window.__A·CEILReportRendering=true;window.__A·CEILNomenCatalogV339=catalog;elemItems=[];elemGroups=[];for(const code of ['M303','S303','L303','M303'])window.A_CEILColorPicker.select(code,'premium');renderElemList();return {item:elemItems.find(x=>x.colorCode==='M303'&&x.filmWidth===3.6),count:elemItems.filter(x=>x.colorCode==='M303'&&x.filmWidth===3.6).length};},catalog);
 assert.equal(restored.item.icon,'svg:laconic-film');assert.equal(restored.count,1);
 // An explicitly selected emoji is a preference too, including the old palette.
 const id2=await rowId();await page.locator('#emrow_'+id2+' .em-icon').click();await page.locator('#emojiGrid .nom-emoji-more summary').click();await page.locator('#emojiGrid button[onclick="selectEmoji(\'🎨\')"]').click();
 const emoji=await page.evaluate(()=>{window.A_CEILColorPicker.select('S303','premium');window.A_CEILColorPicker.select('M303','premium');window.A_CEIL_NormalizeFilmGroups();return elemItems.find(x=>x.colorCode==='M303'&&x.filmWidth===3.6).icon;});assert.equal(emoji,'🎨');
 assert.deepEqual(errors,[]);assert.deepEqual(fresh.errors,[]);console.log('PASS film SVG/emoji selection, icon preserved across colour switching, standard prices and clean-browser catalogue restoration');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
