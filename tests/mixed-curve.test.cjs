const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,390,3);await reveal(page);
  await page.evaluate(()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:300},{x:100,y:300}];
   realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:200},{x:0,y:200}];lengths=[500,200,500,200];closed=true;
   wallTypes=['straight','straight','straight','straight'];arcPoints=[null,null,null,null];rmCurveMeasureOpenV301(2);rmCurveMeasureAddPointV301();
   rmCurveMeasureUpdatePointV301(0,'chordCm',250);rmCurveMeasureUpdatePointV301(0,'curveCm',270);
   rmCurveMeasureUpdatePointV301(-1,'endChordCm',250);rmCurveMeasureUpdatePointV301(-1,'endCurveCm',270);
  });
  await page.locator('#cmPointsV301 [data-cm-field="bend"]').selectOption('outside');
  await page.locator('#cmPointsV301 [data-cm-field="endBend"]').selectOption('inside');
  await page.locator('#cmPointsV301 [data-cm-field="position"]').selectOption('line');
  await page.locator('#rmCurveMeasureModalV301 .cm-save').click();
  const result=await page.evaluate(()=>{
   const g=window.A·CEILCurveGeometryV306,s=g.solve(2),path=g.fullRealSide(2),data=arcPoints[2][0].data;
   const normalized=window.A·CEIL.StateManager.normalize({pts,realPts,lengths,wallTypes,arcPoints});
    const automatic=g.solveData(2,{...data,points:data.points.map(p=>({...p,position:'auto'}))});
    return{ok:s.ok,mid:s.controls[0],first:path[32],second:path[96],data,automatic,normalized:normalized.arcPoints[2][0].data,perimeter:_totalPerimeterCm()};
  });
  assert.equal(result.ok,true);assert.ok(Math.abs(result.mid.y-200)<.01);
  assert.equal(result.automatic.ok,true);assert.ok(Math.abs(result.automatic.controls[0].y-200)<.01,'250 + 250 on a 500 cm wall fixes the point on the straight baseline');assert.equal(result.automatic.approximate,false);
  assert.ok(result.first.y>210,'CD must bulge outside');assert.ok(result.second.y<190,'DE must bulge inside');
  assert.equal(result.perimeter,1440);assert.equal(result.normalized.points[0].bend,'outside');assert.equal(result.normalized.endBend,'inside');assert.equal(result.normalized.points[0].position,'line');
  await page.evaluate(()=>rmCurveMeasureOpenV301(2));
  assert.equal(await page.locator('#cmPointsV301 [data-cm-field="bend"]').inputValue(),'outside');
  assert.equal(await page.locator('#cmPointsV301 [data-cm-field="endBend"]').inputValue(),'inside');
  const mixed=await page.evaluate(()=>{
   const g=window.A·CEILCurveGeometryV306,controls=[{x:150,y:-50},{x:350,y:40}],distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),route=[realPts[0],...controls,realPts[1]];
   const data={version:3,bulgeSign:-1,points:controls.map((p,k)=>({id:'opposite-'+k,chordCm:distance(route[k],p),curveCm:distance(route[k],p)*1.01,diagCorner:3,diag:distance(realPts[3],p),position:k?'inside':'outside',bend:k?'inside':'outside'})),endChordCm:distance(controls[1],realPts[1]),endCurveCm:distance(controls[1],realPts[1])*1.01,endBend:'outside'};
   const solution=g.solveData(0,data);return{solution,controls};
  });
  assert.equal(mixed.solution.ok,true,'mixed inside/outside control points must solve');
  assert.ok(mixed.solution.controls[0].y<0);assert.ok(mixed.solution.controls[1].y>0);
  mixed.solution.controls.forEach((p,i)=>assert.ok(Math.hypot(p.x-mixed.controls[i].x,p.y-mixed.controls[i].y)<.3,'respect diagonal positions'));
  assert.deepEqual(errors,[]);console.log('PASS independent outside/inside segments and mixed control positions');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
