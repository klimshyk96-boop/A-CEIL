const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page}=await open(browser,width);await reveal(page);await page.waitForTimeout(1500);
 const r=await page.evaluate(()=>{
  elemGroups.unshift({id:'gOld',name:'Плівка Premium',collapsed:false});
  [3.6,5.1,5.8].forEach((w,i)=>elemItems.push({id:'o'+i,groupId:'gOld',icon:'svg:layers',name:'M303 '+w+'м',filmWidth:w,price:[380,420,440][i],qty:i===1?7:0,unit:'м²',colorCode:'M303',seriesId:'premium',filmWidthDefinition:true}));
  A_CEILColorPicker.select('M303','premium');A_CEIL_NormalizeFilmGroups();A_CEILColorPicker.select('M303','premium');A_CEIL_NormalizeFilmGroups();
  return elemItems.filter(i=>/M303/.test(i.name)).map(i=>({w:i.filmWidth,p:i.price,q:i.qty,m:i.filmPickerManaged===true}));});
 assert.equal(r.length,3,JSON.stringify(r));assert.ok(r.every(x=>x.m));
 assert.equal(r.find(x=>x.w===5.8).p,440);
 const diff=await page.evaluate(()=>{elemItems.push({id:'x',groupId:elemItems.find(i=>i.filmPickerManaged).groupId,icon:'svg:layers',name:'M303 5.8м',filmWidth:5.8,price:999,qty:0,unit:'м²',colorCode:'M303',seriesId:'premium',filmWidthDefinition:true});A_CEIL_NormalizeFilmGroups();return elemItems.filter(i=>i.filmWidth===5.8&&/M303/.test(i.name)).map(i=>i.price).sort()});
 assert.deepEqual(diff,[440,999]);
 console.log('PASS saved width definition is not shown twice next to the picker rows '+width+'px');}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
