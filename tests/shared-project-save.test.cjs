const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
async function fixture(browser){
 const result=await open(browser,390);const {page}=result;await reveal(page);
 await page.evaluate(()=>{
  window.__writes=[];window.__lookups=[];
  const fake={rpc:async()=>({data:[],error:null}),channel(){return {on(){return this},subscribe(){return this}}},removeChannel:async()=>{},from(table){let payload,id,automaticDraft=false;const q={select(){return q},eq(key,value){if(key==='id')id=value;if(key==='comment'&&value==='Автоматична чернетка A·CEIL')automaticDraft=true;return q},order(){return q},limit(){return q},maybeSingle(){return table==='projects'&&automaticDraft?new Promise(resolve=>window.__lookups.push(resolve)):Promise.resolve({data:null,error:null})},update(value){payload=value;return q},insert(value){payload=value;return q},single(){return new Promise(resolve=>window.__writes.push({payload,id,resolve}))}};return q}};
  _sb=fake;window._sb=fake;_sbUser={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};window._sbUser=_sbUser;window.A_CEIL_UserStorage.setUser(_sbUser);
  window.__originalFrom=fake.from;setPendingQueue([]);
  window['A·CEIL'].API.state.reset();_activeObjectId=null;_activeRoomIdx=null;window._activeRoomId=null;
  realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];pts=realPts.map(p=>({x:p.x+100,y:p.y+100}));lengths=[500,300,500,300];closed=true;
 });return result;
}
async function waitWrite(page,count){await page.waitForFunction(n=>window.__writes.length>=n,count,{timeout:5000})}
async function reply(page,index,id=A){await page.evaluate(({index,id})=>window.__writes[index].resolve({data:{id},error:null}),{index,id})}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 {
  const {page,errors}=await fixture(browser);
  await page.evaluate(A=>{window['A·CEIL'].ProjectRepository.replaceAll([{id:A,_dbId:A,name:'Named',state:'{}',thumb:'preview'}]);_currentProjectId=A;window.__save=window['A·CEILCloudFirstV330'].syncNow()},A);
  await waitWrite(page,1);
  await page.evaluate(B=>{lengths[0]=505;lengths[2]=505;realPts[1].x=505;realPts[2].x=505;pts[1].x=605;pts[2].x=605;const repo=window['A·CEIL'].ProjectRepository,items=repo.list({clone:true});items.push({id:B,_dbId:B,name:'Other project',state:'{}'});repo.replaceAll(items)},B);
  await reply(page,0);await waitWrite(page,2);
  assert.deepEqual(await page.evaluate(()=>window.__writes.map(x=>x.payload.state.lengths[0])),[500,505]);
  await reply(page,1);await page.waitForFunction(()=>window['A·CEILCloudFirstV330'].status().state==='saved',null,{timeout:5000});
  assert.equal(await page.evaluate(B=>window['A·CEIL'].ProjectRepository.list().find(p=>p.id===B)?.name,B),'Other project');
  assert.equal(await page.evaluate(()=>_sb.from===window.__originalFrom),true);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS autosave: latest edit retained, unrelated project preserved, SDK untouched');
 }
 {
  const {page,errors}=await fixture(browser);
  await page.evaluate(()=>{
   const room=(id,w)=>({id,name:id,state:JSON.stringify({pts:[{x:10,y:10},{x:110,y:10},{x:110,y:110},{x:10,y:110}],realPts:[{x:0,y:0},{x:w,y:0},{x:w,y:300},{x:0,y:300}],lengths:[w,300,w,300],closed:true})});
   window['A·CEIL'].ProjectRepository.replaceAll([{id:'obj_shared',name:'Apartment',multiRoom:true,projectType:'apartment',rooms:[room('r1',500),room('r2',600)],state:'{}'}]);
   _activeObjectId='obj_shared';openRoom(0);window.__roomSave1=saveCurrentRoom({silent:true});
  });await waitWrite(page,1);
  await page.evaluate(()=>{openRoom(1);lengths[0]=700;lengths[2]=700;realPts[1].x=700;realPts[2].x=700;window.__roomSave2=saveCurrentRoom({silent:true})});
  await reply(page,0);await waitWrite(page,2);
  const roomData=await page.evaluate(()=>({methods:window.__writes.map(x=>x.id?'update':'insert'),rooms:window.__writes[1].payload.state.rooms.map(r=>JSON.parse(r.state).lengths[0]),active:_activeRoomIdx}));
  assert.deepEqual(roomData,{methods:['insert','update'],rooms:[500,700],active:1});
  await reply(page,1);await page.evaluate(()=>Promise.all([window.__roomSave1,window.__roomSave2]));
  assert.equal(await page.evaluate(()=>getPendingQueue().length),0);assert.deepEqual(errors,[]);await page.close();
  console.log('PASS room save: switching rooms during INSERT preserves both rooms and updates the assigned ID');
 }
 {
  const {page,errors}=await fixture(browser);
  await page.evaluate(B=>{window['A·CEIL'].ProjectRepository.replaceAll([{id:B,_dbId:B,name:'B',state:'{}'}]);_currentProjectId=null;window.__draftSave=window['A·CEILCloudFirstV330'].syncNow()},B);
  await page.waitForFunction(()=>window.__lookups.length>=1,null,{timeout:5000}).catch(async error=>{console.error(await page.evaluate(()=>({lookups:__lookups.length,writes:__writes.length,project:_currentProjectId,object:_activeObjectId,room:_activeRoomIdx,pts:pts.length,closed,status:window['A·CEILCloudFirstV330'].status(),switching:window.__A·CEILSessionSwitching})));throw error});
  const result=await page.evaluate(async({A,B})=>{
   _currentProjectId=B;window.__lookups[0]({data:{id:A,name:'Old draft',comment:'Автоматична чернетка A·CEIL'},error:null});await window.__draftSave;
   return {current:_currentProjectId,ids:window['A·CEIL'].ProjectRepository.list().map(p=>p.id),writes:window.__writes.length};
  },{A,B});
  assert.deepEqual(result,{current:B,ids:[B],writes:0});assert.deepEqual(errors,[]);await page.close();
  console.log('PASS delayed draft discovery cannot replace a newly selected project');
 }


 {
  const {page,errors}=await fixture(browser);
  await page.evaluate(A=>{
   const project={id:A,_dbId:A,name:'Offline edit',multiRoom:true,rooms:[{id:'r1',state:'{"pts":[{"x":0,"y":0}]}'}],state:'{}'};
   window['A·CEIL'].ProjectRepository.replaceAll([project]);window.__offlineSave=window._updateObjectInCloud(project);
  },A);await waitWrite(page,1);
  await page.evaluate(()=>window.__writes[0].resolve({data:null,error:{message:'offline'}}));
  assert.equal(await page.evaluate(()=>window.__offlineSave),false);
  assert.deepEqual(await page.evaluate(()=>{const p=window['A·CEIL'].ProjectRepository.list()[0];return {dirty:p._dirty,pending:p._syncStatus,queued:getPendingQueue().length}}),{dirty:true,pending:'pending_update',queued:1});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS failed room metadata save stays queued and protected in the local cache');
 }
 {
  const {page,errors}=await fixture(browser);
  await page.evaluate(({A,B})=>{
   const room=id=>({id,name:id,state:JSON.stringify({pts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}],realPts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}],lengths:[500,300,500,300],closed:true})});
   window['A·CEIL'].ProjectRepository.replaceAll([
    {id:A,_dbId:A,name:'Apartment A',multiRoom:true,rooms:[room('rA')],state:'{}'},
    {id:B,_dbId:B,name:'Apartment B',multiRoom:true,rooms:[room('rB')],state:'{}',order_source:'site',deal_status:'won',_dirty:true,_syncStatus:'pending_update',_localUpdatedAt:123}]);
   window.__A·CEILReportRendering=true; // Isolate manual-save callbacks from the independent autosave timer.
   _activeObjectId=A;_activeRoomIdx=0;window._activeRoomId='rA';_currentProjectId=A;
   document.getElementById('projName').value='Renamed A';
   document.getElementById('projOrderSource').value='instagram';
   document.getElementById('projDealStatus').value='in_progress';
   window.__metadataSave=saveProject().then(result=>{window.__metadataDone=true;return result});
  },{A,B});await waitWrite(page,1);
  await page.evaluate(B=>{_activeObjectId=B;_currentProjectId=B;_activeRoomIdx=0;window._activeRoomId='rB';_currentProjName='Apartment B';document.getElementById('saveProjectModal').classList.add('open')},B);
  await reply(page,0);await page.waitForFunction(()=>window.__metadataDone,null,{timeout:5000}).catch(async error=>{console.error(await page.evaluate(()=>({writes:__writes.map(x=>({id:x.id,name:x.payload.name})),queue:getPendingQueue(),project:_currentProjectId,object:_activeObjectId})));throw error});
  assert.deepEqual(await page.evaluate(B=>{const p=window['A·CEIL'].ProjectRepository.list().find(x=>x.id===B);return {name:_currentProjName,id:_currentProjectId,dirty:p._dirty,status:p._syncStatus,at:p._localUpdatedAt,source:p.order_source,deal:p.deal_status,open:document.getElementById('saveProjectModal').classList.contains('open')}},B),{name:'Apartment B',id:B,dirty:true,status:'pending_update',at:123,source:'site',deal:'won',open:true});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS complete save wrapper chain preserves another project metadata, CRM, flags and newly opened form');
 }
 for(const existing of [false,true]){
  const {page,errors}=await fixture(browser);
  await page.evaluate(()=>{window['A·CEIL'].ProjectRepository.replaceAll([]);_currentProjectId=null;window.__newDraft=window['A·CEILCloudFirstV330'].syncNow()});
  await page.waitForFunction(()=>window.__lookups.length>=1,null,{timeout:5000}).catch(async error=>{console.error(await page.evaluate(()=>({lookups:__lookups.length,writes:__writes.length,project:_currentProjectId,object:_activeObjectId,room:_activeRoomIdx,pts:pts.length,closed,status:window['A·CEILCloudFirstV330'].status(),switching:window.__A·CEILSessionSwitching})));throw error});
  await page.evaluate(({existing,A})=>window.__lookups[0]({data:existing?{id:A,name:'Existing draft',comment:'Автоматична чернетка A·CEIL'}:null,error:null}),{existing,A});
  await waitWrite(page,1);
  assert.equal(await page.evaluate(()=>!!window.__writes[0].id),existing);
  await page.evaluate(()=>{lengths[0]=510;lengths[2]=510;realPts[1].x=510;realPts[2].x=510;pts[1].x=610;pts[2].x=610});await reply(page,0);await waitWrite(page,2);
  // Catalogue initialization may enqueue an intermediate revision during the
  // first request. Drain it too: the contract is the final edit, not two writes.
  let last=1;
  while(await page.evaluate(index=>window.__writes[index].payload.state.lengths[0],last)!==510&&last<5){
   assert.equal(await page.evaluate(index=>window.__writes[index].id,last),A);
   await reply(page,last);last++;await waitWrite(page,last+1);
  }
  assert.equal(await page.evaluate(index=>window.__writes[index].id,last),A);assert.equal(await page.evaluate(index=>window.__writes[index].payload.state.lengths[0],last),510);
  await reply(page,last);await page.waitForFunction(()=>window['A·CEILCloudFirstV330'].status().state==='saved',null,{timeout:5000});
  assert.equal(await page.evaluate(()=>JSON.parse(window['A·CEIL'].ProjectRepository.list()[0].state).lengths[0]),510);
  assert.deepEqual(await page.evaluate(()=>window['A·CEIL'].ProjectRepository.list().map(p=>p.id)),[A]);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS automatic draft '+(existing?'reuse':'creation')+': later edits use the same cloud ID');
 }
 const old=fs.readFileSync(require('node:path').join(__dirname,'../js/projects/072-aceil-object-room-save-cloud.js'),'utf8');
 const auto=fs.readFileSync(require('node:path').join(__dirname,'../js/nomenclature/145-aceil-cloud-first.js'),'utf8');
 assert.doesNotMatch(old,/window\._sb\.from\s*=|window\.saveCurrentRoom\s*=|window\.getProjects\s*=/);
 assert.doesNotMatch(old+auto,/\.from\("projects"\)\.(?:insert|update)/);
 assert.doesNotMatch(auto,/window\.saveState\s*=/);
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
