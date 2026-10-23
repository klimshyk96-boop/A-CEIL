const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=process.env.ACEIL_PROFILE_ROOT||path.join(__dirname,'..');
async function scenario(browser,width,source,variant,family="floating"){
 const {page,errors}=await open(browser,width,1,root);await reveal(page);
 await page.evaluate(({source,variant,family})=>{
  resetAllSilent();window.A_CEIL_AutoCount.setEnabled(false,{silent:true});
  pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];lengths=[500,300,500,300];closed=true;
  elemGroups=[{id:'profiles',name:'Профілі'}];
  elemItems=[{id:'base',groupId:'profiles',name:'Профіль базовий',source:'main_profile',qty:16,unit:'м',price:200},{id:'floating',groupId:'profiles',name:(family==='floating'?'Парящий ':'Тіньовий ')+(variant==='black'?'чорний':'білий'),source,sourceVariant:variant,qty:0,unit:'м',price:750}];
  elemItems.push({id:'unused',groupId:'profiles',name:(family==='floating'?'Парящий ':'Тіньовий ')+(variant==='black'?'білий':'чорний'),source:family+'_profile',qty:0,unit:'м',price:800});
  elemItems.push({id:'insert',groupId:'profiles',name:'Вставка біла',source:'white_insert',sourceVariant:'white',insertSelected:true,qty:16,unit:'м',price:60},{id:'insert-black',groupId:'profiles',name:'Вставка чорна',source:'white_insert',sourceVariant:'black',insertSelected:false,qty:0,unit:'м',price:60});
  window.__A·CEILNomenCatalogV339={items:structuredClone(elemItems),groups:structuredClone(elemGroups)};
  window.rwe2WallPresetWrite([{name:family==='floating'?'Парящий профіль':'Тіньовий профіль',color:'#ff9500'}]);
  const original=ctx.stroke;window.__profileStrokes=[];ctx.stroke=function(...args){window.__profileStrokes.push({color:this.strokeStyle,width:this.lineWidth,report:!!_reportMode});return original.apply(this,args)};
  renderElemList();document.getElementById('elementsModal').classList.add('open');draw();
 },{source,variant,family});
 assert.equal(await page.evaluate(()=>window.aceilContourProfileColor()),'#1d1d1f');
 await page.locator('#emrow_base .em-qty-input').fill('0');
 await page.evaluate(()=>{window.__profileStrokes=[]});
 await page.locator('#emrow_floating .em-qty-input').fill('16');
 await page.waitForFunction(()=>window.__profileStrokes.some(x=>x.color==='#ff9500'&&x.width===3),null,{timeout:5000});
 assert.deepEqual(await page.evaluate(()=>({color:aceilContourProfileColor(),whole:aceilContourProfile().whole,source:aceilContourProfile().source,marks:wallMarks.length,quantities:elemItems.filter(x=>x.id==='base'||x.id==='floating').map(x=>x.qty)})),{color:'#ff9500',whole:true,source:family+'_profile',marks:0,quantities:[0,16]});
 assert.deepEqual(await page.evaluate(()=>elemItems.filter(i=>i.source==='white_insert').map(i=>i.qty)),[0,0],'manual profile immediately removes insert, including with AutoCount off');
 const saved=await page.evaluate(()=>{saveState();return JSON.parse(localStorage.getItem('ceiling_v18'))});
 await page.evaluate(saved=>{elemItems=[];lengths=[100,100,100,100];const profile=aceilContourProfile(null,saved.elemItems,saved);window.__snapshotProfile={source:profile.source,color:profile.color,whole:profile.whole};elemItems=saved.elemItems;lengths=saved.lengths},saved);
 assert.deepEqual(await page.evaluate(()=>window.__snapshotProfile),{source:family+'_profile',color:'#ff9500',whole:true});
 // Manual profile style does not depend on matching the room perimeter.
 await page.evaluate(()=>{window.__profileStrokes=[]});await page.locator('#emrow_floating .em-qty-input').fill('3');
 await page.waitForFunction(()=>window.__profileStrokes.some(x=>x.color==='#ff9500'&&x.width===3),null,{timeout:5000});
 assert.equal(await page.evaluate(()=>aceilContourProfile().whole),true);
 if(!source){
  await page.evaluate(()=>{window.A_CEIL_AutoCount.setEnabled(true,{silent:true});window.A_CEILColorPicker.select('M303','premium');window.rmUniversalAutoCountV319({noSave:true})});
  const report=await page.evaluate(async()=>{
   window.__profileStrokes=[];
   const texts=[],strokes=[],proto=CanvasRenderingContext2D.prototype,oldText=proto.fillText,oldStroke=proto.stroke;
   proto.fillText=function(t,...args){if(this.canvas!==cv)texts.push(String(t));return oldText.call(this,t,...args)};
   proto.stroke=function(...args){if(_reportMode)strokes.push(this.strokeStyle);return oldStroke.apply(this,args)};
   Object.defineProperty(navigator,'standalone',{value:true,configurable:true});
   const rs={..._loadRS(),reportAudience:'full',drawing:true,showLegend:true,nomenclature:true,qty:true,unitPrice:true,rowTotal:true,grandTotal:true};
   localStorage.setItem('reportSettings',JSON.stringify(rs));window.reportSettings=rs;
   const before=structuredClone(elemItems);
   try{await generateModernSingleReport(rs)}finally{proto.fillText=oldText;proto.stroke=oldStroke}
   const groups=_modernGetNomenclatureGroupsFromState({elemItems,elemGroups});
   return {texts,strokes:strokes.concat(window.__profileStrokes.filter(s=>s.report).map(s=>s.color)),before,after:elemItems,total:_modernGroupsTotal(groups),profileTotal:groups.filter(g=>g.id==='profiles').reduce((sum,g)=>sum+g.items.reduce((v,i)=>v+i.qty*i.price,0),0),name:elemItems.find(i=>i.id==='floating').name};
  });
  assert.deepEqual(report.after,report.before,'report preserves quantities and prices');
  assert.equal(report.profileTotal,2250,'3 m × 750; H and alternate colour are zero');
  assert.equal(report.total,7950,'2250 profiles + 20 m² × 285 film');
  assert.ok(report.strokes.includes('#ff9500'),'report plan uses configured profile colour');
  assert.ok(report.texts.filter(t=>t===report.name).length>=2,'profile named in legend and estimate');
  assert.ok(report.texts.some(t=>/7[\s\u00a0]?950/.test(t)),'7950 total appears in rendered report');
  await page.locator('#A_CEIL_InAppImageReport img').waitFor();
  await page.evaluate(()=>document.getElementById('A_CEIL_InAppImageReport').remove());
 }

 await page.evaluate(()=>{window.__profileStrokes=[]});await page.locator('#emrow_floating .em-qty-input').fill('0');
 await page.waitForFunction(()=>window.__profileStrokes.some(x=>x.color==='#1d1d1f'&&x.width===3),null,{timeout:5000});
 assert.equal(await page.evaluate(()=>aceilContourProfile().whole),false);
 assert.deepEqual(await page.evaluate(()=>elemItems.filter(i=>i.source==='white_insert').map(i=>i.qty)),[16,0],'removing manual profile restores chosen insert');
 assert.deepEqual(errors,[]);await page.close();console.log('PASS real manual inputs repaint full contour, saved-state colour and manual profile selection '+width+'px '+source.split(':')[0]+' '+variant);
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of (process.env.ACEIL_PROFILE_REPORT_ONLY?[]:[390,1440]))for(const variant of ['black','white'])for(const source of ['floating_profile','walltypecolor:'+variant+':'+encodeURIComponent('Парящий профіль')])await scenario(browser,width,source,variant);
 for(const width of [390,1440])for(const family of ['floating','shadow'])for(const variant of ['black','white'])await scenario(browser,width,'',variant,family);
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
