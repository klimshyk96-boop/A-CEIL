const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  const result=await page.evaluate(async()=>{
   window.__A·CEILReportRendering=true;
   const id='11111111-1111-4111-8111-111111111111';
   const st={closed:true,pts:[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}],realPts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}],lengths:[500,300,500,300],linearElements:[],lightMarks:[],wallMarks:[],elemItems:[],elemGroups:[]};
   const types=['lightLine','magneticTrack','surfaceTrack','recessedTrack'];
   const lines=types.map((elementType,i)=>({id:'cloud-line-'+i,type:'linearElement',elementType,shape:'line',segments:[100+i*10],totalLengthCm:100+i*10,center:{x:100,y:70+i*40},centerCanvasPx:{x:200,y:170+i*40},baseIndex:0,rotation:0,profileWidth:35}));
   const local={id,_dbId:id,name:'Старий кеш',state:JSON.stringify(st)};
   window['A·CEIL'].ProjectRepository.replaceAll([local]);await loadProject(id);
   const rows=[{id,name:'Свіжа хмара',state:{...st,linearElements:lines}}];
   _aceilProtectActiveProjectRow(rows);
   const beforeMerge=rows[0].state;
   A·CEILMergeCloudProjects(rows.map(p=>({...p,_dbId:p.id,state:typeof p.state==='string'?p.state:JSON.stringify(p.state)})));
   await loadProject(id);await new Promise(r=>setTimeout(r,30));
   const restored=linearElements.map(x=>({id:x.id,type:x.elementType,segments:x.segments}));
   const cloudState=typeof beforeMerge==='string'?JSON.parse(beforeMerge):beforeMerge;
   // Pending edits must still win over a remote response, including a compact
   // queue entry whose project no longer carries a dirty flag.
   const protectedCounts=[];
   for(const kind of ['dirty','queued']){
    const current={...local,state:JSON.stringify({...st,linearElements:lines.slice(0,2)}),...(kind==='dirty'?{_dirty:true}:{})};
    window['A·CEIL'].ProjectRepository.replaceAll([current]);
    setPendingQueue(kind==='queued'?[{type:'save',payload:{localId:id,dbId:id}}]:[]);
    const incoming=[{id,state:{...st,linearElements:[]}}];_aceilProtectActiveProjectRow(incoming);
    protectedCounts.push(JSON.parse(incoming[0].state).linearElements.length);
   }
   setPendingQueue([]);
   return {cloudCount:cloudState.linearElements.length,restored,protectedCounts,cloudRecord:{id,_dbId:id,name:'З хмари',state:JSON.stringify(cloudState)},expected:lines.map(x=>({id:x.id,type:x.elementType,segments:x.segments}))};
  });
  assert.equal(result.cloudCount,4,'clean active cache must not replace the newer cloud lighting state');
  assert.deepEqual(result.restored,result.expected);assert.deepEqual(result.protectedCounts,[2,2]);assert.deepEqual(errors,[]);await page.close();
  // New isolated browser context: no local canvas or wall backups may supply
  // the missing lines. The cloud record alone must restore every type.
  const fresh=await open(browser,width);await reveal(fresh.page);
  const cold=await fresh.page.evaluate(async record=>{
   window.__A·CEILReportRendering=true;
   window['A·CEIL'].ProjectRepository.replaceAll([record]);await loadProject(record.id);
   await new Promise(r=>setTimeout(r,30));
   return linearElements.map(x=>({id:x.id,type:x.elementType,segments:x.segments}));
  },result.cloudRecord);
  assert.deepEqual(cold,result.expected);assert.deepEqual(fresh.errors,[]);await fresh.page.close();
  console.log('PASS cloud lighting replaces stale clean local cache and restores all four linear types '+width+'px');
 }
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
