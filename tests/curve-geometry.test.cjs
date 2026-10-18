const assert=require('assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');

function near(actual,expected,tolerance,message){
  assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} != ${expected}`);
}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
  try{
    const {page,errors}=await open(browser,390,3);
    await reveal(page);
    const result=await page.evaluate(()=>{
      resetAllSilent();
      pts=[{x:100,y:100},{x:600,y:100},{x:600,y:475},{x:100,y:475}];
      realPts=[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}];
      lengths=[400,300,400,300];closed=true;
      wallTypes=['arc','straight','straight','straight'];

      const measured={version:2,startCorner:0,startOffset:80,endOffset:0,points:[{
        arcLen:130,diagCorner:3,diag:Math.hypot(200,250),sideHint:1
      }]};
      arcPoints=[[{model:'measure-points',data:measured}],null,null,null];
      window.wallTypes=wallTypes;window.arcPoints=arcPoints;
      draw();

      const geometry=window.A·CEILCurveGeometryV306;
      geometry.updateStats();
      const solved=geometry.solve(0);
      const canvasPoints=_sideArcCanvasPts(0);
      const normalized=window.A·CEIL.StateManager.normalize({
        pts,realPts,lengths,closed:true,wallTypes,arcPoints
      });
      const metrics={
        effective:_sideEffectiveLenCm(0),
        curve:_totalCurveLengthCm(),
        perimeter:Number(document.getElementById('per').textContent),
        area:Number(document.getElementById('area').textContent)
      };
      const invalid=geometry.solveData(0,{version:2,startCorner:0,startOffset:80,endOffset:0,points:[{
        arcLen:10,diagCorner:3,diag:10
      }]});

      window.__A·CEILSelectedSideV89=0;
      rmWallTapOpenV84(0);rmWallTapCurveV84();
      const measureOpen=document.getElementById('rmCurveMeasureModalV301').classList.contains('open');
      const legacyOpen=document.getElementById('sideInputModal').classList.contains('open');
      rmCurveMeasureSaveV301();
      const uiSaved=wallTypes[0]==='arc'&&arcPoints[0]?.[0]?.model==='measure-points'&&
        !document.getElementById('rmCurveMeasureModalV301').classList.contains('open');

      const legacy=[
        {role:'start',d:80,o:0},
        {role:'end',d:320,o:0},
        {role:'control',d:200,o:50}
      ];
      const migrated=geometry.legacyToMeasure(0,legacy);
      arcPoints[0]=legacy;window.arcPoints=arcPoints;wallTypes[0]='arc';
      const migratedSolution=geometry.solve(0);

      return{
        solved,
        canvasCount:canvasPoints.length,
        effective:metrics.effective,
        curve:metrics.curve,
        perimeter:metrics.perimeter,
        area:metrics.area,
        normalized:normalized.arcPoints[0],
        invalid,
        measureOpen,
        legacyOpen,
        uiSaved,
        migrated,
        migratedSolution
      };
    });

    assert.equal(result.solved.ok,true,'measured curve must solve');
    near(result.solved.start.x,80,.01,'start offset must be respected');
    near(result.solved.controls[0].x,200,.05,'measured X must be reproduced');
    near(result.solved.controls[0].y,50,.05,'measured Y must be reproduced');
    assert.ok(result.canvasCount>20,'one measured point must produce a visible curve');
    assert.ok(result.effective>400,'curved wall must be longer than its chord');
    assert.ok(result.curve>320,'curve-only length must be calculated');
    near(result.perimeter,14.18,.01,'perimeter must use curved length');
    near(result.area,11.06,.02,'area must use curved boundary');
    assert.equal(result.normalized[0].model,'measure-points','StateManager must preserve canonical curve data');
    assert.equal(result.invalid.ok,false,'contradictory measurements must be rejected');
    assert.equal(result.invalid.error,'no_intersection','invalid measurements must explain the geometry conflict');
    assert.equal(result.measureOpen,true,'visible wall action must open the measurement editor');
    assert.equal(result.legacyOpen,false,'visible wall action must not open the legacy dimensions editor');
    assert.equal(result.uiSaved,true,'measurement editor must save and close through the real UI handler');
    assert.equal(result.migrated.version,2,'legacy curve must migrate to the canonical schema');
    assert.equal(result.migratedSolution.ok,true,'migrated legacy curve must remain drawable');
    near(result.migratedSolution.start.x,80,.05,'migration must preserve curve start');
    near(result.migratedSolution.end.x,320,.05,'migration must preserve curve end');
    assert.deepEqual(errors,[],'browser must not raise unhandled errors');
    console.log('PASS curve geometry');
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
