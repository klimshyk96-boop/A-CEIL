const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=process.env.ACEIL_PROFILE_ROOT||path.join(__dirname,'..');
async function scenario(browser,width,source){
 const {page,errors}=await open(browser,width,1,root);await reveal(page);
 await page.evaluate(source=>{
  resetAllSilent();window.A_CEIL_AutoCount.setEnabled(false,{silent:true});
  pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];lengths=[500,300,500,300];closed=true;
  elemGroups=[{id:'profiles',name:'Профілі'}];
  elemItems=[{id:'base',groupId:'profiles',name:'Профіль базовий',source:'main_profile',qty:16,unit:'м',price:200},{id:'floating',groupId:'profiles',name:'Парящий чорний',source,sourceVariant:'black',qty:0,unit:'м',price:750}];
  window.__A·CEILNomenCatalogV339={items:structuredClone(elemItems),groups:structuredClone(elemGroups)};
  window.rwe2WallPresetWrite([{name:'Парящий профіль',color:'#ff9500'}]);
  const original=ctx.stroke;window.__profileStrokes=[];ctx.stroke=function(...args){window.__profileStrokes.push({color:this.strokeStyle,width:this.lineWidth});return original.apply(this,args)};
  renderElemList();document.getElementById('elementsModal').classList.add('open');draw();
 },source);
 assert.equal(await page.evaluate(()=>window.aceilContourProfileColor()),'#1d1d1f');
 await page.locator('#emrow_base .em-qty-input').fill('0');
 await page.evaluate(()=>{window.__profileStrokes=[]});
 await page.locator('#emrow_floating .em-qty-input').fill('16');
 await page.waitForFunction(()=>window.__profileStrokes.some(x=>x.color==='#ff9500'&&x.width===3),null,{timeout:5000});
 assert.deepEqual(await page.evaluate(()=>({color:aceilContourProfileColor(),whole:aceilContourProfile().whole,source:aceilContourProfile().source,marks:wallMarks.length,quantities:elemItems.filter(x=>x.id==='base'||x.id==='floating').map(x=>x.qty)})),{color:'#ff9500',whole:true,source:'floating_profile',marks:0,quantities:[0,16]});
 const saved=await page.evaluate(()=>{saveState();return JSON.parse(localStorage.getItem('ceiling_v18'))});
 await page.evaluate(saved=>{elemItems=[];lengths=[100,100,100,100];const profile=aceilContourProfile(null,saved.elemItems,saved);window.__snapshotProfile={source:profile.source,color:profile.color,whole:profile.whole};elemItems=saved.elemItems;lengths=saved.lengths},saved);
 assert.deepEqual(await page.evaluate(()=>window.__snapshotProfile),{source:'floating_profile',color:'#ff9500',whole:true});
 // Returning to a partial amount must immediately restore the ordinary outline.
 await page.evaluate(()=>{window.__profileStrokes=[]});await page.locator('#emrow_floating .em-qty-input').fill('3');
 await page.waitForFunction(()=>window.__profileStrokes.some(x=>x.color==='#1d1d1f'&&x.width===3),null,{timeout:5000});
 assert.equal(await page.evaluate(()=>aceilContourProfile().whole),false);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS real manual inputs repaint full contour, saved-state colour and partial amount '+width+'px '+source.split(':')[0]);
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440])for(const source of ['floating_profile','walltypecolor:black:'+encodeURIComponent('Парящий профіль')])await scenario(browser,width,source);
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
