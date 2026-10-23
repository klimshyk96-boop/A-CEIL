const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
async function tap(page,p,touch){
 const screen=await page.evaluate(p=>{const r=cv.getBoundingClientRect();return{x:r.left+(p.x*viewScale+viewOffsetX)*r.width/ACEILCanvas.width(cv),y:r.top+(p.y*viewScale+viewOffsetY)*r.height/ACEILCanvas.height(cv)}},p);
 if(touch)await page.evaluate(({x,y})=>{const t=new Touch({identifier:1,target:cv,clientX:x,clientY:y});cv.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[t],changedTouches:[t]}));cv.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[t]}))},screen);
 else await page.mouse.click(screen.x,screen.y);
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  const shape=await page.evaluate(()=>{
   resetAllSilent();A_CEIL_AutoCount.setEnabled(false,{silent:true});
   const w=ACEILCanvas.width(cv),h=ACEILCanvas.height(cv),s=Math.min(w,h)*.5,x=w*.2,y=h*.2;
   pts=[{x,y},{x:x+s,y},{x:x+s,y:y+s},{x,y:y+s}];realPts=pts.map(p=>({x:p.x-x,y:p.y-y}));lengths=[200,200,200,200];closed=true;viewScale=1;viewOffsetX=0;viewOffsetY=0;
   lightMarks=[{id:'camera-kept',type:'ce_camera_sensor',x:x+s*.1,y:y+s*.1}];draw();return{x,y,s};
  });
  const center={x:Math.round(shape.x+shape.s/2),y:Math.round(shape.y+shape.s/2)};
  async function start(type){await page.evaluate(type=>{rmLfSetMode('one');if(type==='spot')rmStartSpotFlow();else rmUseDoubleSpotV1('vertical')},type);await page.locator('#rmLightClean353 [data-method="points"]').waitFor();}
  for(const type of ['spot','double_spot']){
   let count=0;
   for(const method of ['zone','room','manual','points']){
    await start(type);
    assert.equal(await page.locator('#rmLightClean353 [data-method]').count(),4);
    assert.equal(await page.locator('#rm353Main').count(),0,'single light needs no second confirmation');
    await page.locator('#rmLightClean353 [data-method="'+method+'"]').click();
    assert.equal(await page.locator('#lightFlowModal').evaluate(e=>e.classList.contains('open')),false);
    let expected=center;
    if(method==='manual'){
     expected={x:Math.round(shape.x+shape.s*.7),y:Math.round(shape.y+shape.s*.6)};
     const tapPoint=expected;expected=await page.evaluate(p=>snapLightPoint(p.x,p.y),tapPoint);await tap(page,tapPoint,width===390);
    }
    if(method==='points'){
     await tap(page,{x:shape.x,y:shape.y},width===390);
     assert.equal(await page.evaluate(type=>lightMarks.filter(m=>m.type===type).length,type),count,'first reference creates no fixture');
     await tap(page,{x:shape.x+shape.s,y:shape.y+shape.s},width===390);
     assert.equal(await page.evaluate(()=>A_CEILLightPlacement.active()),false);
    }
    count++;
    await page.waitForFunction(({type,count})=>lightMarks.filter(m=>m.type===type).length===count,{type,count});
    await page.waitForTimeout(180);
    const actual=await page.evaluate(type=>{const a=lightMarks.filter(m=>m.type===type);return a[a.length-1]},type);
    assert.ok(Math.abs(actual.x-expected.x)<=2&&Math.abs(actual.y-expected.y)<=2,method+' coordinates '+JSON.stringify({actual,expected,shape}));
    if(type==='double_spot')assert.equal(actual.orientation,'vertical');
    assert.equal(await page.evaluate(()=>lightMarks.filter(m=>m.id==='camera-kept').length),1,'other fixtures survive');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ceiling_v18')).lightMarks);
    assert.ok(saved.some(m=>m.id===actual.id&&m.type===type),'fixture saved immediately');
   }
   await start(type);await page.locator('[data-method="points"]').click();await page.locator('#aceilPointPlacementHud button').click();
   assert.equal(await page.evaluate(()=>A_CEILLightPlacement.active()),false);
   assert.equal(await page.evaluate(type=>lightMarks.filter(m=>m.type===type).length,type),count,'cancel adds nothing');
   // Existing row and grid paths retain their explicit creation button.
   for(const [mode,qty] of [['row',5],['grid',8]]){
    await start(type);await page.locator('#rmLfTabs button').nth(mode==='row'?1:2).click();
    await page.locator('#rm353Main').waitFor();await page.locator('#rmLightClean353 [data-method="room"]').click();await page.locator('#rm353Main').click();
    assert.equal(await page.evaluate(type=>lightMarks.filter(m=>m.type===type).length,type),qty);
   }
  }
  // Zone centre differs from the whole-room centre for an L-shaped room.
  const l=await page.evaluate(()=>{clearLightMode();lightMarks=[];const x=pts[0].x,y=pts[0].y,s=pts[1].x-x;pts=[{x,y},{x:x+s,y},{x:x+s,y:y+s*.25},{x:x+s*.25,y:y+s*.25},{x:x+s*.25,y:y+s},{x,y:y+s}];lengths=[400,100,300,300,100,400];closed=true;draw();return{x,y,s}});
  await start('spot');await page.locator('[data-method="zone"]').click();
  const z=await page.evaluate(()=>lightMarks[0]);assert.ok((Math.abs(z.x-(l.x+l.s/2))<=1&&Math.abs(z.y-(l.y+l.s*.125))<=1)||(Math.abs(z.x-(l.x+l.s*.125))<=1&&Math.abs(z.y-(l.y+l.s/2))<=1),'centre of either equally large L-room zone');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS four single/double light actions, '+(width===390?'touch':'mouse')+', orientation, saved fixtures, cancellation, rows, grids and L-room zone '+width+'px');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
