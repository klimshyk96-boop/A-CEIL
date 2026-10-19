const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  for(const width of [390,1440]){
   const {page,errors}=await open(browser,width,2);await reveal(page);
   const result=await page.evaluate(()=>{
    resetAllSilent();
    pts=[{x:100,y:500},{x:100,y:200},{x:500,y:200},{x:500,y:500}];
    realPts=[{x:0,y:0},{x:0,y:300},{x:400,y:300},{x:400,y:0}];
    lengths=[300,400,300,400];closed=true;wallTypes=['straight','straight','straight','straight'];arcPoints=[null,null,null,null];
    const g=window.A·CEILCurveGeometryV306,controls=[{x:80,y:345},{x:200,y:365},{x:320,y:345}],route=[realPts[1],...controls,realPts[2]],dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const items=controls.map((p,k)=>({id:'stable-'+k,chordCm:dist(route[k],p),curveCm:dist(route[k],p)*1.01,diagCorner:k===2?3:0,diag:dist(realPts[k===2?3:0],p)}));
    const data={version:3,startCorner:1,startOffset:0,endOffset:0,bulgeSign:1,points:items,endChordCm:dist(controls[2],realPts[2]),endCurveCm:dist(controls[2],realPts[2])*1.01};
    const solved=g.solveData(1,data);
    // Exercise real editor inputs, including the last segment to the base corner.
    rmCurveMeasureOpenV301(1);rmCurveMeasureAddPointV301();rmCurveMeasureAddPointV301();
    const draftLabels=[...document.querySelectorAll('#cmPointsV301 .cm-point-name')].map(e=>e.textContent);
    for(let k=0;k<items.length;k++)for(const key of ['chordCm','curveCm','diagCorner','diag'])rmCurveMeasureUpdatePointV301(k,key,items[k][key]);
    rmCurveMeasureUpdatePointV301(-1,'endChordCm',data.endChordCm);rmCurveMeasureUpdatePointV301(-1,'endCurveCm',data.endCurveCm);
    document.getElementById('cmDirectionV3').value='1';rmCurveMeasureSaveV301();
    const saved=JSON.parse(JSON.stringify(arcPoints[1])),map=g.labels(),rows=g.measurementRows(),diagRows=g.diagonalRows();
    const canvasCurve=g.canvasPoints(1);
    const beforeDiagonalKeys=JSON.stringify(diagonalOverrides={AC:500});
    const beforeMarks=JSON.stringify(wallMarks=[{id:'wall-marker',sideIndex:2,lenCm:50}]);
    const normalized=window.A·CEIL.StateManager.normalize({pts,realPts,lengths,closed:true,wallTypes,arcPoints});
    window.__curveAuditState=JSON.parse(JSON.stringify(normalized));
    const ids=normalized.arcPoints[1][0].data.points.map(p=>p.id);
    const text=_getReportDiagLines(normalized,'manual');
    draw();
    const perimeter=_totalPerimeterCm(),expectedPerimeter=1000+data.endCurveCm+items.reduce((s,p)=>s+p.curveCm,0);
    rmCurveMeasureOpenV301(1);rmCurveMeasureAddPointV301();
    const afterAdd=[...document.querySelectorAll('#cmPointsV301 .cm-point-name')].map(e=>e.textContent);
    rmCurveMeasureDeletePointV301(3);rmCurveMeasureCloseV301();
    const stableKeys=beforeDiagonalKeys===JSON.stringify(diagonalOverrides),stableMarks=beforeMarks===JSON.stringify(wallMarks);
    const invalid=g.solveData(1,{...data,endChordCm:1}),badArc=g.solveData(1,{...data,endCurveCm:1});
    const optional=g.solveData(1,{...data,points:items.map(p=>({...p,diag:0}))});
    const rounded=JSON.parse(JSON.stringify(normalized));
    // Switching to an ordinary second room must not inherit the first room's labels.
    const plainLabels=g.labels({pts,wallTypes:[],arcPoints:[]}).corners;
    return{solved,controls,rows,diagRows,map,draftLabels,afterAdd,saved,normalized:rounded,ids,text,perimeter,expectedPerimeter,stableKeys,stableMarks,invalid,badArc,optional,plainLabels,canvasCurve,editorClosed:!document.getElementById('rmCurveMeasureModalV301').classList.contains('open')};
   });
   assert.equal(result.solved.ok,true);
   result.solved.controls.forEach((p,k)=>assert.ok(Math.hypot(p.x-result.controls[k].x,p.y-result.controls[k].y)<.3,'reproduce measured control'));
   assert.deepEqual(result.map.corners,['A','B','F','G']);
   assert.deepEqual(result.map.controls[1],['C','D','E']);
   assert.ok(result.canvasCurve.some(p=>p.y<150),'Y-up real geometry must map outward on a Y-down canvas');
   assert.deepEqual(result.rows.map(r=>r.label),['AB','BC','CD','DE','EF','FG','GA']);
   assert.deepEqual(result.diagRows.map(r=>r.label),['AC','AD','GE']);
   assert.deepEqual(result.draftLabels,['Ділянка BC','Ділянка CD','Ділянка DE','Остання ділянка EF']);
   assert.equal(result.afterAdd[4],'Остання ділянка FG');
   assert.equal(result.normalized.arcPoints[1][0].data.version,3);
   assert.ok(result.ids.every(Boolean));assert.equal(new Set(result.ids).size,3);
   assert.equal(result.saved[0].data.points[0].chordCm,result.normalized.arcPoints[1][0].data.points[0].chordCm);
   assert.ok(result.text.some(t=>t.startsWith('AC —'))&&result.text.some(t=>t.startsWith('GE —')));
   assert.ok(Math.abs(result.perimeter-result.expectedPerimeter)<.01,'use tape lengths, not chord sum');
   assert.equal(result.stableKeys,true);assert.equal(result.stableMarks,true);
   assert.equal(result.invalid.ok,false);assert.equal(result.badArc.ok,false);
   assert.equal(result.optional.ok,true);assert.equal(result.optional.approximate,true);
   assert.deepEqual(result.plainLabels,['A','B','C','D']);
   assert.equal(result.editorClosed,true);assert.deepEqual(errors,[]);
   const report=await page.evaluate(async()=>{
    const texts=[],native=CanvasRenderingContext2D.prototype.fillText,preview=_modernOpenPreview;
    const nativeMove=CanvasRenderingContext2D.prototype.moveTo,nativeLine=CanvasRenderingContext2D.prototype.lineTo;
    const prior=new WeakMap();let falseStraightContour=0;
    CanvasRenderingContext2D.prototype.moveTo=function(x,y){prior.set(this,{x,y});return nativeMove.call(this,x,y)};
    CanvasRenderingContext2D.prototype.lineTo=function(x,y){
      const p=prior.get(this);
      if(_reportMode&&pts[1]&&pts[2]&&p&&p.x===pts[1].x&&p.y===pts[1].y&&x===pts[2].x&&y===pts[2].y&&this.strokeStyle==='#0f172a'&&this.lineWidth>2)falseStraightContour++;
      prior.set(this,{x,y});return nativeLine.call(this,x,y);
    };
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){texts.push(String(text));return native.call(this,text,...args)};
    let size=null;
    _modernOpenPreview=function(canvas){window.__curveReportCanvas=canvas;size=[canvas.width,canvas.height]};
    try{
      await generateModernObjectReport({name:'Curve test',rooms:[{name:'Крива',state:JSON.stringify(window.__curveAuditState)}]},
        {..._loadRS(),reportAudience:'contractor-sheet',drawing:true,dimensionsList:true,diagonals:false,harpoonColor:'white',productionTime:'normal'});
      return{size,texts,falseStraightContour,labels:window.A·CEILCurveGeometryV306.labels(window.__curveAuditState).corners};
    }finally{CanvasRenderingContext2D.prototype.fillText=native;CanvasRenderingContext2D.prototype.moveTo=nativeMove;CanvasRenderingContext2D.prototype.lineTo=nativeLine;_modernOpenPreview=preview}
   });
   assert.ok(report.size&&report.size[0]>1000,'contractor report must render');
   assert.equal(report.falseStraightContour,0,'report must not paint a straight wall across the curve');
   assert.ok(report.texts.includes('ПО ПРЯМІЙ, СМ')&&report.texts.includes('ПО КРИВІЙ, СМ'),'separate report columns');
   for(const label of ['AB','BC','CD','DE','EF','FG','GA'])assert.ok(report.texts.includes(label),'report row '+label);
   if(process.env.ACEIL_SCREENSHOT){
    await page.evaluate(()=>{rmCurveMeasureOpenV301(1)});
    await page.screenshot({path:path.join(process.env.ACEIL_SCREENSHOT,'curve-editor-'+width+'.png')});
    const fs=require('node:fs');
    fs.writeFileSync(path.join(process.env.ACEIL_SCREENSHOT,'curve-report-'+width+'.png'),Buffer.from(await page.evaluate(()=>window.__curveReportCanvas.toDataURL('image/png').split(',')[1]),'base64'));
   }
   const switching=await page.evaluate(async()=>{
    const curve=JSON.parse(JSON.stringify(window.__curveAuditState)),plain=JSON.parse(JSON.stringify(curve));plain.arcPoints=[];plain.wallTypes=[];
    setProjects([{id:'curve-audit',_localId:'curve-audit',name:'Curve audit',multiRoom:true,rooms:[{id:'curve-a',name:'Крива',state:JSON.stringify(curve)},{id:'plain-b',name:'Пряма',state:JSON.stringify(plain)}],state:JSON.stringify({rooms:[]})}]);
    _activeObjectId='curve-audit';_activeRoomIdx=null;window._activeRoomId=null;
    openRoom(0);await saveCurrentRoom({silent:true});
    const a=JSON.stringify(arcPoints[1][0].data),before=window.A·CEILCurveGeometryV306.labels().corners;
    openRoom(1);const b=window.A·CEILCurveGeometryV306.labels().corners;
    openRoom(0);const after=JSON.stringify(arcPoints[1][0].data),restored=window.A·CEILCurveGeometryV306.labels().corners;
    return{a,after,b,before,restored};
   });
   assert.deepEqual(switching.b,['A','B','C','D']);assert.deepEqual(switching.restored,['A','B','F','G']);
   assert.equal(switching.a,switching.after,'room switching preserves all curve fields and stable IDs');
   await page.reload({waitUntil:'load'});await page.waitForTimeout(300);
   const persisted=await page.evaluate(()=>JSON.parse(getProjects().find(p=>p.id==='curve-audit').rooms[0].state).arcPoints[1][0].data);
   assert.equal(persisted.version,3);assert.equal(persisted.points.length,3);
   assert.equal(persisted.endCurveCm,result.normalized.arcPoints[1][0].data.endCurveCm);
   await page.close();console.log('PASS curve segments '+width+'px');
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
