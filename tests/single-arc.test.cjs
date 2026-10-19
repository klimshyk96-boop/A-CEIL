const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,390,3);await reveal(page);
  for(const tape of [220,230]){
   await page.evaluate(()=>{
    resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:300},{x:100,y:300}];
    realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:200},{x:0,y:200}];
    lengths=[500,200,500,200];wallTypes=['straight','straight','straight','straight'];arcPoints=[null,null,null,null];closed=true;
    rmCurveMeasureOpenV301(3);
   });
   assert.equal(await page.locator('#cmPointsV301 .cm-point').count(),1,'one card for one whole arc');
   assert.equal(await page.locator('#cmPointsV301 .cm-point-name').textContent(),'Ділянка DA');
   assert.equal(await page.locator('#cmPointsV301 input').first().inputValue(),'200','prefill the actual straight wall measurement');
   assert.equal(await page.locator('#cmPointsV301 select:not([data-cm-field])').count(),0,'no fabricated intermediate diagonal');
   await page.locator('#cmPointsV301 input').nth(1).fill(String(tape));
   await page.locator('#rmCurveMeasureModalV301 .cm-save').click();
   const result=await page.evaluate(()=>{
    const g=window.A·CEILCurveGeometryV306,solution=g.solve(3),samples=g.canvasPoints(3);
    let drawn=0;const all=[pts[3],...samples,pts[0]];for(let i=1;i<all.length;i++)drawn+=Math.hypot(all[i].x-all[i-1].x,all[i].y-all[i-1].y);
    return{data:arcPoints[3][0].data,labels:g.labels().corners,rows:g.measurementRows(),perimeter:_totalPerimeterCm(),curve:_sideCurveLenCm(3),drawn,outward:samples.some(p=>p.x<99),ok:solution.ok,approximate:solution.approximate,closed:!document.getElementById('rmCurveMeasureModalV301').classList.contains('open')};
   });
   assert.equal(result.ok,true);assert.equal(result.closed,true);assert.equal(result.approximate,false);
   assert.equal(result.data.points.length,0);assert.equal(result.data.endChordCm,200);assert.equal(result.data.endCurveCm,tape);
   assert.deepEqual(result.labels,['A','B','C','D']);assert.deepEqual(result.rows.map(r=>r.label),['AB','BC','CD','DA']);
   assert.equal(result.perimeter,1200+tape);assert.equal(result.curve,tape);assert.ok(Math.abs(result.drawn-tape)<.02,'drawn circular arc must match tape length');assert.equal(result.outward,true);
   await page.evaluate(()=>rmCurveMeasureOpenV301(3));
   assert.equal(await page.locator('#cmPointsV301 .cm-point').count(),1,'reopening must preserve zero controls');
   assert.equal(await page.locator('#cmPointsV301 input').nth(1).inputValue(),String(tape));
   await page.evaluate(()=>{rmCurveMeasureAddPointV301();rmCurveMeasureDeletePointV301(0)});
   assert.equal(await page.locator('#cmPointsV301 .cm-point-name').textContent(),'Ділянка DA','last control point can be removed');
   await page.evaluate(()=>rmCurveMeasureCloseV301());
  }
  assert.deepEqual(errors,[]);console.log('PASS single 200 cm chord with 220/230 cm arc through actual mobile inputs');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
