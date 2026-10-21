const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(400);
  const result=await page.evaluate(async()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:600},{x:100,y:600}];realPts=pts.map(p=>({x:p.x-100,y:p.y-100}));lengths=[500,500,500,500];closed=true;
   wallTypes=['straight','straight','arc','straight'];
   arcPoints=[null,null,[{model:'measure-points',data:{version:3,bulgeSign:-1,points:[0,1,2].map(k=>({id:'layout-'+k,chordCm:125,curveCm:140,position:'line',bend:k%2?'outside':'inside',diagCorner:0,diag:Math.hypot(375-k*125,500)})),endChordCm:125,endCurveCm:140,endBend:'outside'}}],null];
   diagonals=[[0,2]];diagonalOverrides={AC:Math.hypot(500,500)};
   wallMarks=[{id:'cornice',sideIndex:2,type:'Карниз прихований 1',lenCm:500,offsetCm:0,wallDistanceCm:40,color:'#16a34a'}];
   window.A·CEILCurveGeometryV306.updateStats();
   const strokes=[],texts=[],boxes=[],proto=CanvasRenderingContext2D.prototype,original={};let path=[];
   for(const key of ['beginPath','moveTo','lineTo','stroke','fillText','fillRect'])original[key]=proto[key];
   proto.beginPath=function(...args){path=[];return original.beginPath.apply(this,args)};
   for(const key of ['moveTo','lineTo'])proto[key]=function(x,y){path.push({x,y});return original[key].call(this,x,y)};
   proto.stroke=function(...args){if(_reportMode&&this.strokeStyle==='#16a34a'&&path.length)strokes.push(path.slice());return original.stroke.apply(this,args)};
   proto.fillRect=function(x,y,w,h){if(this.fillStyle==='#fffbeb')boxes.push({x,y,w,h});return original.fillRect.call(this,x,y,w,h)};
   proto.fillText=function(t,x,y,...rest){if(this.canvas!==cv&&/^(AC|AD|AE|AF) /.test(String(t)))texts.push(String(t));return original.fillText.call(this,t,x,y,...rest)};
   Object.defineProperty(navigator,'standalone',{value:true,configurable:true});
   const rs={..._loadRS(),reportAudience:'full',drawing:true,diagonals:true,diagMode:'manual',showWallMarks:true,showLights:false};
   localStorage.setItem('reportSettings',JSON.stringify(rs));window.reportSettings=rs;
   try{await generateModernSingleReport(rs)}finally{Object.assign(proto,original)}
   window.__layoutBoxes=boxes;
   return{strokes,texts,boxes};
  });
  // Report uses the same straight 500 cm segment, 40 cm inside the baseline.
  assert.ok(result.strokes.some(p=>p.length===2&&Math.abs(p[0].y-560)<.01&&Math.abs(p[1].y-560)<.01&&Math.abs(p[0].x-p[1].x)===500));
  assert.equal(result.strokes.length,1,'one report cornice stroke');assert.equal(result.strokes[0].length,2,'straight cornice');
  for(const label of ['AC','AD','AE','AF'])assert.equal(result.texts.filter(t=>t.startsWith(label+' ')).length,1,label+' rendered once');
  assert.equal(result.boxes.length,4);
  result.boxes.forEach((a,i)=>result.boxes.slice(i+1).forEach(b=>assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'diagonal labels must not overlap')));
  await page.locator('#A_CEIL_InAppImageReport img').waitFor();
  await page.locator('[data-zoom-in]').click();
  assert.equal(await page.locator('[data-zoom-label]').textContent(),'125%');
  for(const scroll of [0,500]){
   const layout=await page.evaluate(scroll=>{const body=document.querySelector('.aceil-ir-body');body.scrollTop=scroll;const z=document.querySelector('.aceil-ir-zoom').getBoundingClientRect(),b=body.getBoundingClientRect();return{zoomBottom:z.bottom,bodyTop:b.top}},scroll);
   assert.ok(layout.zoomBottom<=layout.bodyTop,'zoom remains outside scrolling report');
  }
  await page.locator('[data-zoom-label]').click();assert.equal(await page.locator('[data-zoom-label]').textContent(),'100%');
  await page.screenshot({path:'/tmp/aceil-report-layout-'+width+'.png'});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS report cornice offset, four readable diagonals and separate zoom toolbar '+width+'px');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
