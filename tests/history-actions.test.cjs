const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(b,width);await reveal(page);await page.waitForTimeout(400);
  const state=()=>page.evaluate(()=>({pts:pts.length,closed,lengths,lights:lightMarks.length,cornices:window.ceilingCornices.length,history:A·CEIL.History.getState()}));
  await page.evaluate(()=>{resetAllSilent();saveState();A·CEIL.History.reset()});
  for(const p of [{x:100,y:100},{x:400,y:100},{x:400,y:300}])await page.evaluate(p=>{
   const r=cv.getBoundingClientRect();handleInputEvent(r.left+(p.x*viewScale+viewOffsetX)*r.width/ACEILCanvas.width(cv),r.top+(p.y*viewScale+viewOffsetY)*r.height/ACEILCanvas.height(cv));
  },p);
  assert.equal((await state()).history.undo,3,'every drawn corner must be undoable');
  await page.locator('[id="A·CEILUndoBtn"]').click();assert.equal((await state()).pts,2);
  await page.locator('[id="A·CEILRedoBtn"]').click();assert.equal((await state()).pts,3);
  await page.evaluate(()=>{closeShape();saveState()});await page.evaluate(()=>A·CEIL.History.undo());assert.equal((await state()).closed,false);
  await page.evaluate(()=>A·CEIL.History.redo());assert.equal((await state()).closed,true);
  await page.evaluate(()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:500,y:100},{x:500,y:300},{x:100,y:300}];realPts=pts.map(p=>({...p}));lengths=[400,200,400,200];closed=true;saveState();
  });
  // Finish the fixture's area/catalog initialization before the next user action.
  await page.waitForTimeout(400);
  await page.evaluate(()=>{
   A·CEIL.History.reset();
   // One handler saving twice must create one action, including late fields.
   lightMarks=[{id:'one-light',x:200,y:150,type:'spot'}];saveState();
   window.ceilingCornices=[{id:'one-cornice',shape:'I',lengthA:100,baseIndex:0}];saveState();
  });
  assert.equal((await state()).history.undo,1);
  await page.evaluate(()=>A·CEIL.History.undo());assert.equal((await state()).lights,0);assert.equal((await state()).cornices,0);
  await page.evaluate(()=>A·CEIL.History.redo());assert.equal((await state()).lights,1,'redo light');assert.equal((await state()).cornices,1,'redo cornice');
  await page.evaluate(()=>{
   A·CEIL.History.reset();_restoreCanvasStats();
   const f=document.querySelector('#tbl input[data-i="0"]');f.id='historyDimension';
   document.getElementById('tbl').style.display='block';
  });
  for(const val of ['4','48','480'])await page.evaluate(val=>{const f=document.getElementById('historyDimension');f.value=val;f.dispatchEvent(new Event('input',{bubbles:true}))},val);
  assert.equal((await state()).history.undo,1,'typing one dimension is one edit');
  await page.evaluate(()=>A·CEIL.History.undo());assert.equal((await state()).lengths[0],400);
  assert.equal(await page.locator('#tbl input[data-i="0"]').inputValue(),'400','dimension UI must match restored state');
  await page.evaluate(()=>A·CEIL.History.redo());assert.equal((await state()).lengths[0],480);
  await page.evaluate(()=>{A·CEIL.History.undo();notes=[{text:'new branch',x:100,y:100}];saveState()});
  assert.equal((await state()).history.redo,0,'editing after undo discards redo');
  await page.evaluate(()=>{saveState();saveState()});assert.equal((await state()).history.undo,1,'unchanged saves must not consume history');
  await page.evaluate(()=>{A·CEIL.History.reset();wallTypes=['arc','straight','straight','straight'];arcPoints=[[{model:'measure-points',data:{version:3,bulgeSign:-1,points:[{id:'history-curve',chordCm:200,curveCm:210,diagCorner:3,diag:0,position:'line'}],endChordCm:200,endCurveCm:210}}],null,null,null];saveState()});
  await page.evaluate(()=>A·CEIL.History.undo());assert.equal(await page.evaluate(()=>arcPoints.length),0,'undo added curve');
  await page.evaluate(()=>A·CEIL.History.redo());assert.equal(await page.evaluate(()=>arcPoints[0][0].data.points[0].id),'history-curve','redo curve measurements');
  await page.evaluate(()=>{elemItems.push({id:'auto-light',source:'spot_light',qty:1,manualQtyOverride:false,autoFilled:true});saveState();A·CEIL.History.reset();notes.push({text:'control note',x:10,y:10});saveState()});
  await page.evaluate(()=>A·CEIL.History.undo());
  await page.evaluate(()=>{const it=elemItems.find(x=>x.id==='auto-light');it.qty=2;it.autoZero=false;saveState()});
  assert.equal((await state()).history.redo,1,'late automatic calculation must preserve redo');assert.equal((await state()).history.undo,0,'no invisible calculation steps');
  await page.evaluate(()=>{const it=elemItems.find(x=>x.id==='auto-light');it.manualQtyOverride=true;it.qty=3;saveState()});
  assert.equal((await state()).history.undo,1,'manual quantity is a real action');assert.equal((await state()).history.redo,0);
  await page.evaluate(()=>{resetAllSilent();_activeObjectId='other-project';window._activeRoomId='other-room';A·CEIL.History.resetAfterLoad()});
  await page.evaluate(()=>{pts.push({x:80,y:80});saveState()});
  assert.equal((await state()).history.undo,1,'first action after room load is undoable');
  await page.evaluate(()=>A·CEIL.History.undo());assert.equal((await state()).pts,0);assert.equal((await state()).history.undo,0,'must not undo into another room');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS history actions '+width+'px');
 }}finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
