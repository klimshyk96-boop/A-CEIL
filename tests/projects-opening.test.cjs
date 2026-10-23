const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
async function fixture(browser,width){
 const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(1500);
 await page.evaluate(()=>{
  resetAllSilent();const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  window.__projectRights=[];window.__projectLoads=[];
  const fake={auth:{getSession:async()=>({data:{session:null},error:null})},rpc(name){if(name==='get_my_access'){if(new Error().stack.includes('forceLoadNomenclature'))return Promise.resolve({data:{is_active:true,app_role:'owner',projects_access:true,nomenclature_access:true},error:null});return new Promise(resolve=>__projectRights.push({resolve}));}return Promise.resolve({data:{},error:null})},from(table){let columns='',ordered=false;const q={select(v){columns=v;return q},order(){ordered=true;return q},eq(){return q},update(){return q},upsert(){return q},single(){return q},maybeSingle(){return q},then(resolve,reject){if(table==='projects'&&columns==='*'&&ordered)return new Promise(done=>__projectLoads.push({resolve:done})).then(resolve,reject);return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q},channel(){const ch={on(){return ch},subscribe(){return ch}};return ch},removeChannel:async()=>{}};
  _sb=fake;window._sb=fake;_sbUser={id:uid,email:'test@example.test'};window._sbUser=_sbUser;A_CEIL_UserStorage.setUser(_sbUser);
  const st={schemaVersion:3,projectType:'room',pts:[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}],realPts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}],lengths:[500,300,500,300],closed:true,elemGroups:[],elemItems:Array.from({length:80},(_,k)=>({id:'e'+k,name:'Позиція '+k,qty:0,price:100,unit:'шт'})),wallMarks:[],lightMarks:[]};
  window.__fixtureRows=Array.from({length:120},(_,i)=>{const id='00000000-0000-4000-8000-'+String(i+1).padStart(12,'0');return{id,user_id:uid,name:'Проєкт '+i,state:JSON.stringify(i%2?{schemaVersion:3,projectType:'apartment',multiRoom:true,rooms:Array.from({length:5},(_,j)=>({id:'r'+j,name:'Кімната '+j,area:'15',per:'16',state:JSON.stringify(st)}))}:st),area:'15',per:'16',created_at:'2026-10-23T08:00:00Z'}});
  const local=__fixtureRows.map(p=>({...p,_dbId:p.id,_ownerId:uid,...(JSON.parse(p.state).multiRoom?{multiRoom:true,rooms:JSON.parse(p.state).rooms,state:null}:{})}));
  window['A·CEIL'].ProjectRepository.replaceAll(local);
 });return{page,errors};
}
async function replyRights(page,index=0){await page.evaluate(index=>__projectRights[index].resolve({data:{is_active:true,app_role:'owner',projects_access:true,nomenclature_access:true},error:null}),index)}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){
  const {page,errors}=await fixture(browser,width);
  const first=await page.evaluate(()=>{window.__openStart=performance.now();window.__projectOpening=openProjectsModal();return{visible:document.getElementById('projectsModal').classList.contains('open'),callMs:performance.now()-__openStart,cards:document.querySelectorAll('#projectsList .rp-project-card').length}});
  if(process.env.ACEIL_PROJECTS_BASELINE){
   await page.waitForFunction(()=>__projectRights.length>0);await page.waitForTimeout(300);await replyRights(page);await page.waitForFunction(()=>__projectLoads.length>0);await page.waitForTimeout(300);await page.evaluate(()=>__projectLoads[0].resolve({data:__fixtureRows,error:null}));await page.evaluate(()=>__projectOpening);console.log(JSON.stringify({width,...first,readyMs:await page.evaluate(()=>performance.now()-__openStart)}));await page.close();continue;
  }
  assert.equal(first.visible,true,'cached project window opens before any network reply');assert.equal(first.cards,120);
  await page.evaluate(()=>{openProjectsModal();openProjectsModal()});await page.waitForFunction(()=>__projectRights.length>0);assert.equal(await page.evaluate(()=>__projectRights.length),1,'rapid opens share rights refresh');
  await replyRights(page);await page.waitForFunction(()=>__projectLoads.length>0);assert.equal(await page.evaluate(()=>__projectLoads.length),1,'one full list request');
  // A cached drawing can be opened while cloud loading is still pending.
  const loaded=await page.evaluate(async()=>{const t=performance.now();await loadProject(__fixtureRows[0].id);return{ms:performance.now()-t,id:_currentProjectId,lengths:structuredClone(lengths),closed}});
  assert.equal(loaded.id,await page.evaluate(()=>__fixtureRows[0].id));assert.deepEqual(loaded.lengths,[500,300,500,300]);assert.equal(loaded.closed,true);
  await page.evaluate(()=>{const repo=window['A·CEIL'].ProjectRepository,rows=repo.list({clone:true});rows[0].name='Нова локальна правка';rows[0]._dirty=true;rows[0]._localUpdatedAt=Date.now();rows.push({id:'local-draft',name:'Незбережена чернетка',state:'{}',_dirty:true});repo.replaceAll(rows);__projectLoads[0].resolve({data:__fixtureRows.concat([{id:'new-cloud-project',name:'Новий хмарний проєкт',user_id:_sbUser.id,state:'{}'}]),error:null})});
  await page.waitForFunction(()=>document.getElementById('projectsRefreshStatus')?.textContent.includes('оновлено'));
  assert.equal(await page.evaluate(()=>getProjects().find(p=>p.id===__fixtureRows[0].id).name),'Нова локальна правка');assert.equal(await page.evaluate(()=>getProjects().some(p=>p.id==='local-draft')),true,'refresh preserves unsynced local drafts');assert.equal(await page.evaluate(()=>getProjects().some(p=>p.id==='new-cloud-project')),true,'new cloud projects join the list');
  await page.evaluate(()=>openProjectsModal());await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__projectLoads.length),1,'fresh cache avoids repeated downloads');
  // In-flight result of the previous account must not enter the new account.
  await page.evaluate(()=>{_sbUser={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',email:'b@example.test'};window._sbUser=_sbUser;A_CEIL_UserStorage.setUser(_sbUser);openProjectsModal()});
  await page.waitForFunction(()=>__projectRights.length===2);await replyRights(page,1);await page.waitForFunction(()=>__projectLoads.length===2);
  await page.evaluate(()=>{_sbUser={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};window._sbUser=_sbUser;A_CEIL_UserStorage.setUser(_sbUser);window['A·CEIL'].ProjectRepository.replaceAll([{id:'account-c',name:'Account C',state:'{}'}]);__projectLoads[1].resolve({data:__fixtureRows,error:null})});
  await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>getProjects().map(p=>p.id)),['account-c']);
  await page.context().setOffline(true);await page.evaluate(()=>openProjectsModal());assert.equal(await page.locator('#projectsModal').evaluate(e=>e.classList.contains('open')),true);assert.equal(await page.evaluate(()=>__projectRights.length),2);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,cachedOpenMs:Math.round(first.callMs),savedDrawingOpenMs:Math.round(loaded.ms),cards:first.cards}));await page.close();
 }
 {
  const {page,errors}=await fixture(browser,390);await page.evaluate(()=>openProjectsModal());await page.waitForFunction(()=>__projectRights.length===1);
  const access=await page.evaluate(async()=>{
   _sbUser={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};window._sbUser=_sbUser;A_CEIL_UserStorage.setUser(_sbUser);
   window.A_CEIL_MY_ACCESS={is_active:false,label:'current-account'};
   __projectRights[0].resolve({data:{is_active:true,app_role:'owner'},error:null});
   for(let i=0;i<12;i++)await Promise.resolve();
   return{label:window.A_CEIL_MY_ACCESS.label,loads:__projectLoads.length};
  });
  assert.equal(access.label,'current-account');assert.equal(access.loads,0);assert.deepEqual(errors,[]);await page.close();console.log('PASS previous-account rights response cannot update new account');
 }
 {
  const {page,errors}=await fixture(browser,390);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{
   window.__projectWrites=0;const original=setProjects;
   window.setProjects=function(rows){__projectWrites++;return original(rows)};setProjects=window.setProjects;
  });
  const timing=await page.evaluate(async()=>{
   openProjectsModal();const start=performance.now();await openObjectRooms(__fixtureRows[1].id);
   await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
   return {firstFrameMs:Math.round(performance.now()-start),room:_activeRoomIdx,lengths:structuredClone(lengths)};
  });
  assert.equal(timing.room,0);assert.deepEqual(timing.lengths,[500,300,500,300]);
  await page.waitForTimeout(700);
  const unchanged=await page.evaluate(()=>{__projectWrites=0;saveState();saveState();saveState();return __projectWrites});
  assert.equal(unchanged,0,'unchanged saves do not rewrite/migrate all cached projects');
  // A changed wall/light/quantity is still persisted, then repeated saves are cheap.
  const edited=await page.evaluate(()=>{
   wallMarks=[{id:'new-wall',type:'Карниз',sideIndex:0,lenCm:100,offsetCm:0}];
   lightMarks=[{id:'new-light',type:'spot',x:200,y:200}];elemItems[0].qty=7;elemItems[0].manualQtyOverride=true;
   __projectWrites=0;saveState();const changedWrites=__projectWrites;
   const state=JSON.parse(getProjects().find(p=>p.id===__fixtureRows[1].id).rooms[0].state);
   __projectWrites=0;saveState();return {changedWrites,repeatedWrites:__projectWrites,state};
  });
  assert.ok(edited.changedWrites>0);assert.equal(edited.repeatedWrites,0);
  assert.equal(edited.state.wallMarks[0].id,'new-wall');assert.equal(edited.state.lightMarks[0].id,'new-light');assert.equal(edited.state.elemItems[0].qty,7);
  // Cornices must survive both a real change and explicit deletion.
  for(const cornices of [[{id:'cornice-test',shape:'straight',lengthA:120,baseIndex:0,offsetX:0,offsetY:20}],[]]){
   const saved=await page.evaluate(cornices=>{window.ceilingCornices=cornices;saveState();const room=getProjects().find(p=>p.id===__fixtureRows[1].id).rooms[0];__projectWrites=0;saveState();return {cornices:JSON.parse(room.state).ceilingCornices,repeatedWrites:__projectWrites}},cornices);
   assert.deepEqual(saved.cornices,cornices);assert.equal(saved.repeatedWrites,0);
  }
  // A queued film refresh must use the newly selected room, never restore the old geometry.
  await page.evaluate(()=>{openRoom(1);openRoom(2)});await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>_activeRoomIdx),2);assert.deepEqual(await page.evaluate(()=>lengths),[500,300,500,300]);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({canvasOpening:timing,unchangedProjectWrites:unchanged,cpuSlowdown:4}));await page.close();
 }
 for(const mode of ['empty','network-error']){
  const {page,errors}=await fixture(browser,390);
  if(mode==='empty')await page.evaluate(()=>window['A·CEIL'].ProjectRepository.replaceAll([]));
  assert.equal(await page.evaluate(()=>{openProjectsModal();return document.getElementById('projectsModal').classList.contains('open')}),true);
  await page.waitForFunction(()=>__projectRights.length===1);await replyRights(page);await page.waitForFunction(()=>__projectLoads.length===1);
  if(mode==='empty'){
   assert.ok(await page.locator('#projectsList').textContent().then(s=>s.includes('оновлюємо')),'empty cache shows loading, not a missing-project claim');
   await page.evaluate(()=>__projectLoads[0].resolve({data:__fixtureRows,error:null}));await page.waitForFunction(()=>document.querySelectorAll('#projectsList .rp-project-card').length===120);
  }else{
   await page.evaluate(()=>__projectLoads[0].resolve({data:null,error:{message:'Failed to fetch'}}));await page.waitForFunction(()=>document.getElementById('projectsRefreshStatus').textContent.includes('Не вдалося'));
   assert.equal(await page.locator('#projectsList .rp-project-card').count(),120,'network failure keeps cached projects usable');
  }
  assert.deepEqual(errors,[]);await page.close();console.log('PASS immediate projects modal '+mode);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
