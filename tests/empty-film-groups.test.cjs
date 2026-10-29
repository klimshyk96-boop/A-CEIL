const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=process.env.ACEIL_PROFILE_ROOT||path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,390,1,root);await reveal(page);
  const r=await page.evaluate(()=>{
   resetAllSilent();window.A_CEILColorPicker.select('M303','premium');
   const n=elemGroups.filter(g=>g.roomScopedKind==='film-color').length;
   for(let i=0;i<2;i++)elemGroups.unshift({id:'dup'+i,name:'Плівка Premium · M303',collapsed:false,roomScoped:true,roomScopedKind:'film-color',filmSeriesId:'premium',filmCode:'M303'});
   renderElemList();
   const films=elemGroups.filter(g=>g.roomScopedKind==='film-color');
   return {n,after:films.length,withItems:films.every(g=>elemItems.some(i=>String(i.groupId)===String(g.id)))};
  });
  assert.deepEqual(r,{n:1,after:1,withItems:true},'empty duplicate film groups are removed');
  assert.deepEqual(errors,[]);console.log('empty film groups ok');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
