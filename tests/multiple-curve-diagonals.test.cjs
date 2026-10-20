const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(400);
  await page.evaluate(()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:300},{x:100,y:300}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:200},{x:0,y:200}];lengths=[500,200,500,200];closed=true;
   wallTypes=['arc','straight','straight','straight'];arcPoints=[[{model:'measure-points',data:{version:3,bulgeSign:-1,points:[{id:'multiple',chordCm:250,curveCm:255,position:'line',diagCorner:3,diag:0}],endChordCm:250,endCurveCm:255}}],null,null,null];
   diagonals=[[0,2],[1,3]];diagonalOverrides={AC:Math.hypot(500,200),BD:Math.hypot(500,200)};saveState();
  });
  for(const corner of [2,3,0]){
   await page.evaluate(corner=>window.A·CEILCurveGeometryV306.openControlDiagonal('curve:0:multiple',corner),corner);
   const value=corner===0?250:Math.hypot(250,200);
   await page.locator('#diagEditInput').fill(String(value));await page.locator('#diagEditModal button').last().click();
  }
  const inspect=()=>page.evaluate(()=>{
   const g=window.A·CEILCurveGeometryV306,texts=[],original=ctx.fillText;
   ctx.fillText=function(text,...args){texts.push(String(text));return original.call(this,text,...args)};
   try{draw()}finally{ctx.fillText=original}
   const capture=g.captureImage();return{curves:g.diagonalRows(),base:_diagonalsForCurrentDraw(),report:getCurrentReportDiagLines('manual'),rendered:g.reportCapture(capture).diagonals,texts,solution:g.solve(0),normalized:A·CEIL.StateManager.normalize({pts,realPts,lengths,wallTypes,arcPoints}).arcPoints[0][0].data};
  });
  const result=await inspect();
  assert.equal(result.curves.length,3,'a third diagonal must not replace the earlier two');assert.equal(result.base.length,2);assert.equal(result.report.length,5);
  assert.equal(result.rendered.length,3,'all curve diagonals must be present in the rendered report capture');assert.equal(result.solution.ok,true);
  for(const label of ['AB','DB','EB'])assert.ok(result.texts.some(t=>t.startsWith(label+' ')),'canvas line label '+label);
  assert.equal(result.normalized.points[0].diagonals.length,2,'additional measurements persist alongside the legacy primary measurement');
  await page.evaluate(()=>{saveState();loadState()});assert.equal((await inspect()).curves.length,3);
  // Reopening an existing pair edits that pair rather than duplicating it.
  await page.evaluate(()=>window.A·CEILCurveGeometryV306.openControlDiagonal('curve:0:multiple',2));
  assert.equal(Number(await page.locator('#diagEditInput').inputValue()),Math.hypot(250,200));
  await page.locator('#diagEditModal button').last().click();assert.equal((await inspect()).curves.length,3);
  // The compact wall editor must retain all measurements when switching anchors.
  await page.evaluate(()=>{rmCurveMeasureOpenV301(0);rmCurveMeasureUpdatePointV301(0,'diagCorner',1)});
  assert.equal(await page.locator('[data-curve-point="0"] [data-cm-measure="diag"]').inputValue(),'');
  await page.evaluate(()=>rmCurveMeasureUpdatePointV301(0,'diagCorner',2));
  assert.equal(Number(await page.locator('[data-curve-point="0"] [data-cm-measure="diag"]').inputValue()),Math.hypot(250,200));
  await page.evaluate(()=>rmCurveMeasureSaveV301());assert.equal((await inspect()).curves.length,3);
  await page.evaluate(()=>window.A·CEILCurveGeometryV306.removeControlDiagonal('curve:0:multiple',3));
  const after=await inspect();assert.equal(after.curves.length,2);assert.ok(after.curves.every(d=>d.corner!==3));assert.equal(after.report.length,4);
  await page.evaluate(()=>A·CEIL.History.undo());assert.equal((await inspect()).curves.length,3,'undo restores only the removed diagonal');
  await page.evaluate(()=>A·CEIL.History.redo());assert.equal((await inspect()).curves.length,2);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS five simultaneous diagonals, persistence, editor, render/report and undo '+width+'px');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
