const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(b,width);await reveal(page);
  const standard=await page.evaluate(()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:300,y:100},{x:300,y:600},{x:100,y:600}];realPts=[{x:0,y:0},{x:200,y:0},{x:200,y:500},{x:0,y:500}];lengths=[200,500,200,500];closed=true;
   editDiagonal('AC',539,0,2);return window.A·CEILCurveGeometryV306.diagonalHint('AC',539,0,2);
  });
  assert.equal(standard.lower,300);assert.equal(standard.upper,700);assert.ok(Math.abs(standard.estimate-Math.hypot(200,500))<.001);
  assert.equal(await page.locator('#diagEditInput').inputValue(),'','an estimate is a hint, not a confirmed measurement');
  assert.match(await page.locator('#diagMeasureHint').textContent(),/300–700/);
  assert.match(await page.locator('#diagMeasureHint').textContent(),/538,5/);
  await page.screenshot({path:'/workspace/scratch/6cd4a9e8a918/diagonal-hint-'+width+'.png'});
  const edited=await page.evaluate(()=>{diagonalOverrides.AC=600;editDiagonal('AC',539);return window.A·CEILCurveGeometryV306.diagonalHint('AC',539)});
  assert.equal(edited.lower,300);assert.equal(edited.upper,700,'exclude the measurement being edited');assert.equal(await page.locator('#diagEditInput').inputValue(),'600');
  const incomplete=await page.evaluate(()=>{lengths=[0,0,0,0];realPts=[];diagonalOverrides={};editDiagonal('AC',123);return window.A·CEILCurveGeometryV306.diagonalHint('AC',123)});
  assert.equal(incomplete.estimate,null,'never label canvas pixels as cm');assert.equal(incomplete.upper,null);assert.match(await page.locator('#diagMeasureHint').textContent(),/бракує/);
  const conflict=await page.evaluate(()=>{lengths=[200,500,200,50];return window.A·CEILCurveGeometryV306.diagonalHint('AC',0)});
  assert.equal(conflict.conflict,true);
  const curve=await page.evaluate(()=>{
   lengths=[500,200,500,200];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:200},{x:0,y:200}];pts=[{x:100,y:100},{x:600,y:100},{x:600,y:300},{x:100,y:300}];
   wallTypes=['arc','straight','straight','straight'];arcPoints=[[{model:'measure-points',data:{version:3,bulgeSign:-1,points:[{id:'hint-control',chordCm:250,curveCm:255,diagCorner:3,diag:Math.hypot(250,200),position:'line'}],endChordCm:250,endCurveCm:255}}],null,null,null];
   const g=window.A·CEILCurveGeometryV306,key='curve:0:hint-control:3',before=g.diagonalHint(key,0);g.openControlDiagonal('curve:0:hint-control',3);
   arcPoints[0][0].data.points[0].curveCm=400;arcPoints[0][0].data.endCurveCm=400;
   return{before,after:g.diagonalHint(key,0)};
  });
  assert.equal(curve.before.label,'EB');assert.equal(curve.before.lower,50);assert.equal(curve.before.upper,450);assert.ok(Math.abs(curve.before.estimate-Math.hypot(250,200))<.01);
  assert.equal(curve.after.lower,curve.before.lower);assert.equal(curve.after.upper,curve.before.upper,'tape lengths cannot substitute for chords');
  assert.match(await page.locator('#diagMeasureHint').textContent(),/50–450/);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS diagonal measurement hints '+width+'px');
 }}finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
