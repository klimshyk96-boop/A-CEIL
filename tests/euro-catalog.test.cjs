const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page}=await open(browser,width);await reveal(page);await page.waitForTimeout(1500);
 const r=await page.evaluate(()=>{
  const s=ACEIL_FILM_SERIES.find(x=>x.id==='euro');const list=(ACEIL_COLOR_CATALOG_BY_SERIES.euro||[]).map(c=>({d:c.displayCode||c.code,w:(c.filmWidths||[]).map(w=>w.nominal),p:(c.filmWidths||[]).map(w=>w.price||0)}));
  A_CEILColorPicker.select(ACEIL_COLOR_CATALOG_BY_SERIES.euro[0].code,'euro');
  const rows=elemItems.filter(i=>i.seriesId==='euro').map(i=>[i.name,i.filmWidth,i.price]);
  ACEILCustomFilm.deleteSeries('euro');const after=!!ACEIL_FILM_SERIES.find(x=>x.id==='euro');
  return {s:s&&s.name,list,rows,after};});
 assert.equal(r.s,'EURO');
 assert.deepEqual(r.list.map(x=>x.d),['Teqtum euro','Teqtum KM2','Lumfer']);
 assert.deepEqual(r.list.map(x=>x.w),[[3.6,4.5],[3.2,5],[3.05,4.5]]);
 assert.ok(r.list.every(x=>x.p.every(v=>v===0)),'no prices yet');
 assert.equal(r.rows.length,2);
 assert.equal(r.after,false,'a deleted series is not seeded again');
 await page.reload();await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>!!ACEIL_FILM_SERIES.find(x=>x.id==='euro')),false,'stays deleted after reload');
 console.log('PASS EURO series: three films, widths, no prices, deletable '+width+'px');}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
