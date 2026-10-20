const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(b,width);await reveal(page);await page.waitForTimeout(400);
  const result=await page.evaluate(()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:600},{x:100,y:600}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:500},{x:0,y:500}];lengths=[500,500,500,500];closed=true;
   wallTypes=['straight','straight','arc','straight'];arcPoints=[null,null,[{model:'measure-points',data:{version:3,bulgeSign:-1,points:[0,1,2].map((k)=>({id:'report-'+k,chordCm:125,curveCm:140,position:'line',bend:k%2?'outside':'inside',diagCorner:0,diag:0})),endChordCm:125,endCurveCm:140,endBend:'outside'}}],null];
   elemGroups=[{id:'profile',name:'Профілі'}];elemItems=[{id:'base',groupId:'profile',name:'Алюмінієвий профіль',source:'main_profile',unit:'м',price:185,qty:20,manualQtyOverride:false},{id:'insert',groupId:'profile',name:'Вставка біла',source:'white_insert',sourceVariant:'white',insertSelected:true,unit:'м',price:60,qty:20,manualQtyOverride:false},{id:'full',groupId:'profile',name:'Повний периметр',source:'full_perimeter',unit:'м',qty:0},{id:'curve',groupId:'profile',name:'Криволінійність',source:'curve_length',unit:'м',qty:0}];
   const g=window.A·CEILCurveGeometryV306;g.updateStats();autoFillNomenclature({silent:true});
   const state=JSON.parse(JSON.stringify({pts,realPts,lengths,wallTypes,arcPoints,closed,elemItems,elemGroups}));window.__reportCurveFixture=state;
   const geometry=A·CEILGeometry.calculate(state),live=g.measureState(),saved=g.measureState(state),items=JSON.parse(JSON.stringify(elemItems));
   const calculatedCost=items.filter(it=>['base','insert'].includes(it.id)).reduce((s,it)=>s+it.qty*it.price,0);
   saveState();loadState();
   return{items,geometry,live,saved,calculatedCost,perimeter:_totalPerimeterCm(),meters:getProjectPerimeterMeters(),bbox:getRoomBoundingBoxMeters(),afterLoad:g.measureState()};
  });
  assert.equal(result.perimeter,2060);assert.equal(result.meters,20.6);assert.equal(result.geometry.perimeterM,20.6);
  for(const id of ['base','insert','full'])assert.equal(result.items.find(it=>it.id===id).qty,20.6,'source '+id+' must count tape lengths');
  assert.equal(result.items.find(it=>it.id==='curve').qty,5.6);
  assert.equal(result.calculatedCost,5047);assert.equal(result.calculatedCost-20*(185+60),147);
  assert.equal(result.live.perimeterCm,result.saved.perimeterCm);assert.equal(result.afterLoad.perimeterCm,2060);
  assert.ok(result.geometry.boundsM.height>5.2,'outside bulges must extend the report bounds');assert.equal(result.geometry.boundsM.width,5);
  assert.equal(result.bbox.height,result.geometry.boundsM.height);
  assert.ok(Math.abs(result.geometry.areaM2-25)<.01,'alternating equal bulges cancel area without cancelling perimeter');
  const expectedBounds=result.geometry.boundsM.height.toFixed(2)+' × 5.00 м';
  async function reportText(kind){return page.evaluate(async kind=>{
   const texts=[],original=CanvasRenderingContext2D.prototype.fillText,preview=_modernOpenPreview;
   CanvasRenderingContext2D.prototype.fillText=function(t,...args){texts.push(String(t));return original.call(this,t,...args)};
   _modernOpenPreview=function(){};
   try{
    const rs={..._loadRS(),reportAudience:'full',drawing:false,overall:true};
    if(kind==='single')await generateModernSingleReport(rs);
    else await generateModernObjectReport({name:'Saved curve',rooms:[{name:'Curve room',area:'25.00',per:'20.60',state:JSON.stringify(window.__reportCurveFixture)}]},rs);
    return texts;
   }finally{CanvasRenderingContext2D.prototype.fillText=original;_modernOpenPreview=preview}
  },kind)}
  assert.ok((await reportText('single')).includes(expectedBounds),'single report must show full curve bounds');
  // A stored report room must never borrow geometry from the active canvas.
  const detached=await page.evaluate(()=>{
   const state=window.__reportCurveFixture,before=JSON.stringify(state);
   resetAllSilent();pts=[{x:0,y:0},{x:300,y:0},{x:300,y:200},{x:0,y:200}];realPts=pts.map(p=>({...p}));lengths=[300,200,300,200];closed=true;
   const activeBefore=JSON.stringify({pts,realPts,lengths,wallTypes,arcPoints});
   const geometry=A·CEILGeometry.calculate(state),plain=A·CEILGeometry.calculate(realPts);
   return{geometry,plain,activeSame:activeBefore===JSON.stringify({pts,realPts,lengths,wallTypes,arcPoints}),savedSame:before===JSON.stringify(state)};
  });
  assert.equal(detached.geometry.perimeterM,20.6);assert.equal(detached.plain.perimeterM,10);assert.equal(detached.activeSame,true);assert.equal(detached.savedSame,true);
  assert.ok((await reportText('object')).includes(expectedBounds),'object report must use the saved curve room bounds');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS curve report perimeter, quantities, bounds and detached room isolation '+width+'px');
 }}finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
