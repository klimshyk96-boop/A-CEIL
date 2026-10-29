const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{const{page,errors}=await open(browser,390);
 await page.evaluate(()=>{
  const id='11111111-1111-4111-8111-111111111111';
  window.__queueRequests=[];
  const fake={channel(){return {on(){return this},subscribe(){return this}}},removeChannel:async()=>{},from(){let payload,dbId;const query={update(value){payload=value;return query},eq(key,value){dbId=value;return query},select(){return query},single(){return new Promise(resolve=>window.__queueRequests.push({payload,dbId,resolve}))}};return query}};
  _sb=fake;window._sb=fake;_sbUser={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};window._sbUser=_sbUser;
  window['A·CEIL'].ProjectRepository.replaceAll([{id,_dbId:id,name:'Стара назва',state:'{}',_dirty:true}]);
  setPendingQueue([]);addToPendingQueue({type:'save',payload:{localId:id},addedAt:1});
  window.__queueDone=flushPendingQueue();window.__queueSameFlight=window.__queueDone===flushPendingQueue();
 });
 await page.waitForFunction(()=>window.__queueRequests.length===1,null,{timeout:5000});
 await page.evaluate(()=>{
  const repo=window['A·CEIL'].ProjectRepository,items=repo.list({clone:true});items[0].name='Нова назва';items[0]._localUpdatedAt=2;repo.replaceAll(items);
  addToPendingQueue({type:'save',payload:{localId:items[0].id},addedAt:1});
  // The later memory-maintenance module uses this public normalization path.
  setPendingQueue(getPendingQueue());
  window.__queueRequests[0].resolve({data:{id:items[0].id},error:null});
 });
 await page.waitForFunction(()=>window.__queueRequests.length===2,null,{timeout:5000});
 assert.deepEqual(await page.evaluate(()=>({sameFlight:window.__queueSameFlight,names:window.__queueRequests.map(x=>x.payload.name),queued:getPendingQueue().length,dirty:window['A·CEIL'].ProjectRepository.list()[0]._dirty})),{sameFlight:true,names:['Стара назва','Нова назва'],queued:1,dirty:true});
 const result=await page.evaluate(async()=>{
  const request=window.__queueRequests[1];request.resolve({data:{id:request.dbId},error:null});const ok=await window.__queueDone;
  _currentProjectId=window['A·CEIL'].ProjectRepository.list()[0].id;window._updatePendingBadge();
  return {ok,queued:getPendingQueue().length,name:window['A·CEIL'].ProjectRepository.list()[0].name,dirty:!!window['A·CEIL'].ProjectRepository.list()[0]._dirty,status:document.getElementById('cloudStatus').textContent};
 });
 // The badge is per open project and shows the time the server confirmed the save.
 assert.match(result.status,/^☁️ у хмарі о \d{2}:\d{2}$/);
 assert.deepEqual({...result,status:undefined},{ok:true,queued:0,name:'Нова назва',dirty:false,status:undefined});
 assert.deepEqual(errors,[]);await page.close();console.log('PASS real app: one canonical queue, serialized requests and latest edit preserved');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
