const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=process.env.ACEIL_PROFILE_ROOT||path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,1440,1,root);await reveal(page);
  for(const flags of ['manualQtyOverride:true','autoFilled:true','fullContourSelected:true','']){
   await page.evaluate(flags=>{
    resetAllSilent();
    pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];lengths=[500,300,500,300];closed=true;
    elemGroups=[{id:'profiles',name:'Профілі'}];
    const shadow={id:'shadow',groupId:'profiles',name:'Тіньовий профіль білий',source:'shadow_profile',sourceVariant:'white',qty:16,unit:'м',price:700};
    flags.split(',').filter(Boolean).forEach(f=>{const [k,v]=f.split(':');shadow[k]=v==='true'});
    elemItems=[{id:'base',groupId:'profiles',name:'Профіль базовий',source:'main_profile',qty:0,manualQtyOverride:true,unit:'м',price:200},shadow,{id:'insert',groupId:'profiles',name:'Вставка біла',source:'white_insert',insertSelected:true,qty:0,unit:'м',price:60}];
    window.A_CEIL_AutoCount.setEnabled(true,{silent:true});saveState();
   },flags);
   await page.reload({waitUntil:'load'});await page.waitForTimeout(1200);await reveal(page);
   const r=await page.evaluate(()=>({shadow:elemItems.find(i=>i.id==='shadow').qty,base:elemItems.find(i=>i.id==='base').qty,whole:aceilContourProfile().whole}));
   assert.deepEqual(r,{shadow:16,base:0,whole:true},'shadow contour survives reopen: '+flags);
  }
  const corners=await page.evaluate(()=>{
   const mk=(id,x,y)=>({id,elementType:'lightLine',shape:'rectangle',lightShapeMode:'rectangle',segments:[100,100],center:{x,y},rotation:0});
   window.linearElements=linearElements=[mk('a',150,150),mk('b',200,150),mk('c',150,200),mk('d',200,200)];
   const s=linearElementsSummary();return {corners:s.cornerCount,inter:s.intersectionCount};
  });
  assert.equal(corners.corners,16,'4 squares = 16 corners, crossings add none by default');
  assert.ok(corners.inter>0);
  const freeCorners=await page.evaluate(()=>{
   const sq=(id,x,y)=>{const seg=[],ang=[];[0,90,180,270].forEach(a=>{for(let i=0;i<2;i++){seg.push(50);ang.push(a)}});return {id,elementType:'lightLine',shape:'free',lightShapeMode:'free',segments:seg,segmentAngles:ang,closedPath:true,center:{x,y},rotation:0}};
   window.linearElements=linearElements=[sq('a',100,100),sq('b',400,100),sq('c',100,300),sq('d',400,300)];
   return linearElementsSummary().cornerCount;
  });
  assert.equal(freeCorners,16,'free-drawn squares split into collinear segments still have 4 corners each');
  const turns=await page.evaluate(()=>{
   const total=(angles,closedPath=false,elementType='lightLine')=>window['A·CEILLinearElement'].computeTotals({elementType,shape:'free',lightShapeMode:'free',segments:angles.map(()=>50),segmentAngles:angles,closedPath}).cornerCount;
   return {thirty:total([0,30]),smallTurns:total([0,10,20,30]),straight:total([0,360,720]),wrap:total([-180,180]),closed:total([0,30,180],true),track:total([0,0,90,90,180,180,270,270],true,'magneticTrack')};
  });
  assert.deepEqual(turns,{thirty:1,smallTurns:3,straight:0,wrap:0,closed:3,track:4},'count actual turns and preserve track snapping');
  await page.evaluate(()=>{resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];lengths=[500,300,500,300];closed=true;
   const mk=(id,x)=>({id,elementType:'lightLine',shape:'rectangle',lightShapeMode:'rectangle',segments:[100,100],center:{x,y:150},rotation:0});
   linearElements=[mk('a',150),mk('b',300)];window.linearElements=linearElements;saveState();});
  await page.reload({waitUntil:'load'});await page.waitForTimeout(1200);await reveal(page);
  await page.evaluate(()=>{try{leAddLightSegment&&0}catch(_){}window.A_CEIL_ReportLinks;});
  assert.equal(await page.evaluate(()=>linearElements.length+'/'+window.linearElements.length+'/'+JSON.parse(localStorage.getItem('ceiling_v18')).linearElements.length),'2/2/2','light lines survive reopen');
  assert.deepEqual(errors,[]);
  console.log('contour reopen + light corners ok');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
