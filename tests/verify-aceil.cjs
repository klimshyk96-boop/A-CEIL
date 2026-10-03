const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
const root=path.join(__dirname,'..'),original=process.env.ACEIL_BASELINE;
const checks=[];
function check(name,condition,detail){assert.ok(condition,`${name}: ${JSON.stringify(detail)}`);checks.push(name);}
async function styles(page){return page.evaluate(()=>{
 const props=['display','position','fontFamily','fontSize','fontWeight','color','backgroundColor','borderRadius','padding','margin','gridTemplateColumns','flexDirection','gap','maxWidth'];
 const out={};for(const e of document.querySelectorAll('[id]')){
  if(!e.id||e.tagName==='SCRIPT'||e.tagName==='STYLE'||e.tagName==='LINK'||e.tagName==='CANVAS')continue;
  const c=getComputedStyle(e);out[e.id]=Object.fromEntries(props.map(p=>[p,c[p]]));
 }return out;
});}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try {
  for(const width of (original?[390,1440,2560]:[])){
   const a=await open(browser,width,1,original),b=await open(browser,width,1,root);
   const sa=await styles(a.page),sb=await styles(b.page),diff=[];
   for(const id of Object.keys(sa))if(sb[id]&&JSON.stringify(sa[id])!==JSON.stringify(sb[id]))diff.push({id,before:sa[id],after:sb[id]});
   fs.writeFileSync(`css-diff-${width}.json`,JSON.stringify(diff,null,2));
   check(`CSS equivalence at ${width}px`,diff.length===0,diff.slice(0,3));
   check(`No startup errors at ${width}px`,b.errors.length===0,b.errors);
   check(`No missing assets at ${width}px`,b.missing.length===0,b.missing);
   await a.page.close();await b.page.close();
  }
  for(const [width,dpr] of [[390,1],[390,3],[1440,2]]){
   const {page,errors,missing}=await open(browser,width,dpr,root);await reveal(page);
   const result=await page.evaluate(async()=>{
    const snapshot=()=>JSON.stringify({pts,lengths,realPts,closed,circleMode,circleDiamCm,elemItems,elemGroups,lightMarks,wallMarks,linearElements,viewScale,viewOffsetX,viewOffsetY,w:cv.width,h:cv.height});
    const pngSize=data=>{if(!data.startsWith('data:image/png;base64,'))return null;const bytes=Uint8Array.from(atob(data.split(',')[1]),x=>x.charCodeAt(0));const d=new DataView(bytes.buffer);return [d.getUint32(16),d.getUint32(20)];};
    document.getElementById('rectW').value='400';document.getElementById('rectH').value='300';applyRect();
    viewScale=1.25;viewOffsetX=-25;viewOffsetY=30;draw();
    const logical=[ACEILCanvas.width(cv),ACEILCanvas.height(cv)],r=cv.getBoundingClientRect();
    const roundTrips=pts.map(p=>{const q=getCanvasPoint(r.left+(p.x*viewScale+viewOffsetX)*r.width/logical[0],r.top+(p.y*viewScale+viewOffsetY)*r.height/logical[1]);return Math.hypot(q.x-p.x,q.y-p.y);});
    const before=snapshot();draw();const drawReadOnly=snapshot()===before;
    const state={pts:structuredClone(pts),lengths:structuredClone(lengths),realPts:structuredClone(realPts),closed:true,circleMode:false,elemItems:structuredClone(elemItems),elemGroups:structuredClone(elemGroups),lightMarks:[],wallMarks:[],linearElements:[]};
    const multi=_renderRoomForReport({state:JSON.stringify(state)},{showLights:true,dimensions:true});
    const multiRestored=snapshot()===before;
    const single=_modernCaptureCurrentDrawing();const singleRestored=snapshot()===before;
    resetAllSilent();circleMode=true;circleDiamCm=400;closed=true;viewScale=1;viewOffsetX=0;viewOffsetY=0;draw();
    const circleBefore=snapshot();const circle=_renderRoomForReport({state:JSON.stringify({circleMode:true,circleDiamCm:400,closed:true})},{showLights:true});
    const circleRestored=snapshot()===circleBefore;
    const circleSingle=_modernCaptureCurrentDrawing();
    resetAllSilent();draw();
    ACEILFingerDraw.setMode('finger');const modeStored=localStorage.getItem('aceil-canvas-input-mode');
    ACEILFingerDraw.setMode('points');
    const drawIdentity=window.draw;draw();
    return {logical,raster:[cv.width,cv.height],roundTrips,drawReadOnly,multi:pngSize(multi),single:pngSize(single),circle:pngSize(circle),circleSingle:pngSize(circleSingle),multiRestored,singleRestored,circleRestored,modeStored,stableDraw:window.draw===drawIdentity,health:A_CEIL_CleanHealth(),pipeline:ACEILCanvas.inspect()};
   });
   check(`Coordinate round trips ${width}/${dpr}`,result.roundTrips.every(x=>x<1e-6),result);
   check(`Read-only draw ${width}/${dpr}`,result.drawReadOnly,result);
   check(`Report state restore ${width}/${dpr}`,result.multiRestored&&result.singleRestored&&result.circleRestored,result);
   for(const kind of ['multi','single','circle','circleSingle'])check(`${kind} PNG ${width}/${dpr}`,result[kind]?.[0]===3000&&result[kind]?.[1]===3000,result[kind]);
   check(`Mode persistence ${width}/${dpr}`,result.modeStored==='finger',result);
   check(`Stable renderer and health ${width}/${dpr}`,result.stableDraw&&result.health.ok,result);
   check(`No scenario errors ${width}/${dpr}`,!errors.length&&!missing.length,{errors,missing});
   await page.evaluate(()=>{document.querySelectorAll('.modal-overlay').forEach(e=>e.classList.remove('open'));document.getElementById('rectW').value='400';document.getElementById('rectH').value='300';applyRect();});
   await page.waitForTimeout(400);await page.evaluate(()=>document.querySelectorAll('.modal-overlay').forEach(e=>e.classList.remove('open')));
   await page.screenshot({path:`./review-${width}-${dpr}.png`,fullPage:false});
   console.log('scenario',width,dpr,JSON.stringify(result));await page.close();
  }
  fs.writeFileSync('verification.json',JSON.stringify({checks,passed:checks.length},null,2));
  console.log('PASS',checks.length);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
