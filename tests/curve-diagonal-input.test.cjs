const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  for(const width of [390,1440]){
   const {page,errors}=await open(browser,width);await reveal(page);
   await page.evaluate(()=>{
    resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:300},{x:100,y:300}];
    realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:200},{x:0,y:200}];lengths=[500,200,500,200];closed=true;
    wallTypes=['arc','straight','straight','straight'];arcPoints=[[{model:'measure-points',data:{version:3,bulgeSign:-1,points:[{id:'test-point',chordCm:250,curveCm:255,diagCorner:3,diag:0,position:'line',bend:'outside'}],endChordCm:250,endCurveCm:255,endBend:'inside'}}],null,null,null];
    toggleDiag();
   });
   async function tapTarget(control){
    // Respect the existing 450 ms repeated-touch guard when revisiting a point.
    if(width===390)await page.waitForTimeout(460);
    const p=await page.evaluate(control=>{
     const p=control?window.A·CEILCurveGeometryV306.controlTargets()[0].canvas:pts[3];
     const r=cv.getBoundingClientRect();return{x:r.left+(p.x*viewScale+viewOffsetX)*r.width/ACEILCanvas.width(cv),y:r.top+(p.y*viewScale+viewOffsetY)*r.height/ACEILCanvas.height(cv)};
    },control);
    await page.evaluate(({p,width})=>{
     if(width===390){
      const t=new Touch({identifier:1,target:cv,clientX:p.x,clientY:p.y});
      cv.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[t],targetTouches:[t],changedTouches:[t]}));
      cv.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:[t]}));
     }else cv.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:p.x,clientY:p.y}));
    },{p,width});
   }
   await tapTarget(false);await tapTarget(true);
   assert.ok(await page.locator('#diagEditModal').evaluate(e=>e.classList.contains('open')),'base then curve opens input');
   assert.match(await page.locator('#diagEditLabel').textContent(),/EB/);
   const measured=Math.hypot(250,200);
   await page.locator('#diagEditInput').fill(String(measured));
   await page.locator('#diagEditModal button').last().click();
   const result=await page.evaluate(()=>({data:arcPoints[0][0].data,rows:window.A·CEILCurveGeometryV306.diagonalRows(),base:diagonals,overrides:diagonalOverrides,report:getCurrentReportDiagLines('manual')}));
   assert.equal(result.data.points[0].diag,measured);assert.equal(result.data.points[0].diagCorner,3);
   assert.deepEqual(result.base,[]);assert.deepEqual(result.overrides,{});assert.equal(result.rows[0].label,'EB');assert.match(result.report.join(' '),/EB/);
   await tapTarget(true);await tapTarget(false);
   assert.ok(await page.locator('#diagEditModal').evaluate(e=>e.classList.contains('open')),'curve then base opens input');
   await page.locator('#diagEditInput').fill('1');await page.locator('#diagEditModal button').last().click();
   assert.equal(await page.evaluate(()=>arcPoints[0][0].data.points[0].diag),measured,'conflicting input must preserve previous measurement');
   assert.ok(await page.locator('#diagEditModal').evaluate(e=>e.classList.contains('open')));
   await page.locator('#diagEditModal button').first().click();
   await page.evaluate(()=>autoDiagonals());
   assert.equal(await page.locator('#diagSelector select').count(),1,'curve point is offered in diagonal menu');
   await page.locator('#diagSelector [data-curve-diag-add]').click();
   assert.match(await page.locator('#diagEditLabel').textContent(),/EB/);
   await page.locator('#diagEditModal button').first().click();
   const normalized=await page.evaluate(()=>window.A·CEIL.StateManager.normalize({pts,realPts,lengths,wallTypes,arcPoints}).arcPoints[0][0].data.points[0]);
   assert.equal(normalized.diag,measured);assert.equal(normalized.id,'test-point');assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS base/curve diagonal input in both orders, menu, conflict guard, reports and normalization at mobile/desktop widths');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
