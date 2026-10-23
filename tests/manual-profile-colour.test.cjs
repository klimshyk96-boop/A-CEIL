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
  elemItems.push({id:'base-corners',groupId:'profiles',name:'Фіксація кутів',qty:4,unit:'шт',price:100},{id:'selected-corners',groupId:'profiles',name:'Фіксація кута '+(family==='floating'?'парящий ':'тіньовий ')+(variant==='black'?'чорний':'білий'),qty:0,unit:'шт',price:350},{id:'other-corners',groupId:'profiles',name:'Фіксація кута '+(family==='floating'?'парящий ':'тіньовий ')+(variant==='black'?'білий':'чорний'),qty:0,unit:'шт',price:400});
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
 assert.deepEqual(await page.evaluate(()=>elemItems.filter(i=>['base-corners','selected-corners','other-corners'].includes(i.id)).map(i=>i.qty)),[0,4,0],'correct corners replace base corners before any recalculation');
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
  assert.equal(report.profileTotal,3650,'3 m × 750 + 4 matching corners × 350; base and alternate colour zero');
  assert.equal(report.total,9350,'3650 profiles/corners + 20 m² × 285 film');
  assert.ok(report.strokes.includes('#ff9500'),'report plan uses configured profile colour');
  assert.ok(report.texts.filter(t=>t===report.name).length>=2,'profile named in legend and estimate');
  assert.ok(report.texts.some(t=>/9[\s\u00a0]?350/.test(t)),'9350 total appears in rendered report');
  await page.locator('#A_CEIL_InAppImageReport img').waitFor();
  await page.evaluate(()=>document.getElementById('A_CEIL_InAppImageReport').remove());
 }

 await page.evaluate(()=>{window.__profileStrokes=[]});await page.locator('#emrow_floating .em-qty-input').fill('0');
 await page.waitForFunction(()=>window.__profileStrokes.some(x=>x.color==='#1d1d1f'&&x.width===3),null,{timeout:5000});
 assert.equal(await page.evaluate(()=>aceilContourProfile().whole),false);
 assert.deepEqual(await page.evaluate(()=>elemItems.filter(i=>i.source==='white_insert').map(i=>i.qty)),[16,0],'removing manual profile restores chosen insert');
 assert.deepEqual(await page.evaluate(()=>elemItems.filter(i=>['base-corners','selected-corners','other-corners'].includes(i.id)).map(i=>i.qty)),[4,0,0],'restoring base restores base corners');
 assert.deepEqual(errors,[]);await page.close();console.log('PASS real manual inputs repaint full contour, saved-state colour and manual profile selection '+width+'px '+source.split(':')[0]+' '+variant);
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of (process.env.ACEIL_PROFILE_REPORT_ONLY?[]:[390,1440]))for(const variant of ['black','white'])for(const source of ['floating_profile','walltypecolor:'+variant+':'+encodeURIComponent('Парящий профіль')])await scenario(browser,width,source,variant);
 for(const width of [390,1440])for(const family of ['floating','shadow'])for(const variant of ['black','white'])await scenario(browser,width,'',variant,family);
 for(const width of [390,1440]){
  const {page,errors}=await open(browser,width,1,root);await reveal(page);
  const result=await page.evaluate(()=>{
   resetAllSilent();A_CEIL_AutoCount.setEnabled(true,{silent:true,recalculate:false});
   const groups=[{id:'base-group',name:'Профілі'}],items=[{id:'legacy-h',groupId:'base-group',name:'Профіль H алюмінієвий',source:'',unit:'м',price:200,qty:0,manualQtyOverride:true,fullContourSelected:true},{id:'legacy-corners',groupId:'base-group',name:'Фіксація кутів',unit:'шт',price:100,qty:0,manualQtyOverride:true}];
   window.__A·CEILNomenCatalogV339={items:structuredClone(items),groups};
   const state=window['A·CEIL'].RoomNomenclature.newRoomState();
   pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=pts.map(p=>({x:p.x-100,y:p.y-100}));lengths=[500,300,500,300];closed=true;
   window['A·CEIL'].RoomNomenclature.installNewRoom(state);saveState();openEditElemModal('legacy-h');
   return {source:elemItems[0].source,qty:elemItems[0].qty,manual:elemItems[0].manualQtyOverride,corners:elemItems[1].qty,autoChecked:document.getElementById('acEditEnabled').checked,baseChecked:document.getElementById('acWholeContour').checked,baseDisabled:document.getElementById('acWholeContour').disabled,label:document.getElementById('acWholeContourText').textContent};
  });
  assert.equal(result.source,'main_profile');assert.equal(result.qty,16);assert.equal(result.manual,false);assert.equal(result.corners,4);assert.equal(result.autoChecked,true);assert.equal(result.baseChecked,true);assert.equal(result.baseDisabled,false);assert.match(result.label,/активний за замовчуванням/);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS new room restores automatic H and base corners despite dirty legacy catalogue '+width+'px');
 }
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
