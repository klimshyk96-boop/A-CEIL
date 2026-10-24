/* Перше оновлення зі старої версії: ціни, задані раніше (без службової мітки часу), не губляться. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 // Storage exactly as the previous app version wrote it: no cid, no u, no pricing meta.
 const legacy={
  custom:{v:1,descorLabellImported:true,series:[{id:'old1',manufacturer:'Fab',collection:'',name:'Fab'},{id:'old2',manufacturer:'Mat',collection:'',name:'Mat'}],
   colors:[
    {seriesId:'old1',code:'M951',display:'MINE',texture:'fabric',colorName:'',swatch:'#112233',widths:[{nominal:3.1,max:3.1,price:800},{nominal:4.5,max:4.5,price:800}]},
    {seriesId:'old2',code:'M910',display:'PS-204',texture:'mat',colorName:'',swatch:'#ffffff',widths:[{nominal:3.6,max:3.6,price:510}]},
    {seriesId:'old2',code:'L911',display:'GL-1',texture:'lak',colorName:'',swatch:'#ffffff',widths:[{nominal:3.6,max:3.6,price:430}]}],
   reserved:[{seriesId:'old1',code:'M951'},{seriesId:'old2',code:'M910'},{seriesId:'old2',code:'L911'}]},
  overrides:{old1:{fabric:{M951_w310:975}},old2:{mat:{w360:555},lak:{w360:430}},premium:{mat:{narrow:401,wide:402}}}
 };
 const {page,errors}=await open(browser,390,1,undefined,async p=>{
  await p.addInitScript(l=>{
   if(localStorage.getItem('__seeded'))return;localStorage.setItem('__seeded','1');
   localStorage.setItem('aceil_custom_film_v1',JSON.stringify(l.custom));
   localStorage.setItem('aceil_film_pricing_overrides_v1',JSON.stringify(l.overrides));
  },legacy);
 });
 await reveal(page);await page.waitForTimeout(800);
 const r=await page.evaluate(()=>{
  const g=id=>window.ACEILGetFilmPricing(id),col=(sid,code)=>window.ACEIL_COLOR_CATALOG_BY_SERIES[sid].find(c=>c.code===code);
  return{fabric:g('old1').fabric.M951_w310,fabricUntouched:g('old1').fabric.M951_w450,mat:g('old2').mat.w360,lak:g('old2').lak.w360,
   premium:g('premium').mat,
   stored:JSON.parse(localStorage.getItem('aceil_custom_film_v1')).colors.map(c=>c.code+':'+c.widths.map(w=>w.price).join('/')),
   ov:JSON.parse(localStorage.getItem('aceil_film_pricing_overrides_v1'))}});
 assert.equal(r.fabric,975,'fabric price set before the update is kept');
 assert.equal(r.fabricUntouched,800,'other widths keep their price');
 assert.equal(r.mat,555);assert.equal(r.lak,430);
 assert.deepEqual([r.premium.narrow,r.premium.wide],[401,402],'built-in series overrides are untouched');
 assert.deepEqual(r.stored,['M951:975/800','M910:555','L911:430'],'prices now live in the colours');
 assert.deepEqual([r.ov.old1,r.ov.old2],[{},{}],'folded overrides are cleared');
 // a second load must not change anything (idempotent) and must not overwrite later edits
 await page.evaluate(()=>window.ACEILSetFilmPricing('old1',{fabric:{M951_w310:990}}));
 await page.reload({waitUntil:'load'});await page.waitForTimeout(800);
 assert.equal(await page.evaluate(()=>window.ACEILGetFilmPricing('old1').fabric.M951_w310),990);
 assert.deepEqual(errors,[]);
 console.log('film-legacy-prices OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
