const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/rooms/088-aceil-multiroom-save-controller.js'),'utf8');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
function fixture(){
 let items=[{id:'A',_dbId:'A',name:'Old A',rooms:[]},{id:'B',_dbId:'B',name:'Old B',_dirty:true,_syncStatus:'pending_update',_localUpdatedAt:123,rooms:[]}];
 const fields=Object.fromEntries(['Name','Addr','Phone','Comment'].map(k=>['proj'+k,{value:k==='Name'?'New A':'value '+k}]));
 const calls={prepare:0,local:0,cloud:[],closed:[],toasts:[],single:0};
 const cloud=deferred();let owner='owner';
 const context={console,setTimeout,document:{getElementById:id=>fields[id]||null},_activeObjectId:'A',_activeRoomIdx:0,_activeRoomId:'rA',_currentProjectId:'A',_currentProjName:'Old A',_currentProjAddr:'',_currentProjPhone:'',_currentProjComment:'',closed:true,_sb:{},
  A_CEIL_UserStorage:{getUserId:()=>owner},
  'A·CEIL':{ProjectRepository:{list:()=>structuredClone(items),replaceAll:next=>{items=structuredClone(next)}},ProjectPersistence:{prepareSave:()=>calls.prepare++,saveProjects:async next=>{calls.local++;items=structuredClone(next);return {ok:true}}}},
  saveProject:()=>{calls.single++;return 'single'},saveCurrentRoom:async()=>true,
  _updateObjectInCloud:obj=>{calls.cloud.push(structuredClone(obj));return cloud.promise},
  closeModal:id=>calls.closed.push(id),showToast:value=>calls.toasts.push(value)};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);
 return {context,calls,cloud,items:()=>items,switch(){context._activeObjectId='B';context._currentProjectId='B';context._currentProjName='Old B';context._activeRoomId='rB'},owner(value){owner=value}};
}
async function until(predicate){for(let i=0;i<20&&!predicate();i++)await Promise.resolve();assert.ok(predicate())}
(async()=>{
 {
  const f=fixture(),pending=f.context.saveProject();await until(()=>f.calls.cloud.length===1);
  assert.equal(f.context._currentProjName,'New A');assert.deepEqual(f.calls.closed,['saveProjectModal']);
  f.switch();f.cloud.resolve(true);assert.equal(await pending,true);
  assert.equal(f.context._currentProjName,'Old B');assert.equal(f.context._currentProjectId,'B');
  assert.equal(f.items()[1]._dirty,true);assert.equal(f.items()[1]._localUpdatedAt,123);assert.equal(f.items()[1]._syncStatus,'pending_update');
  assert.equal(f.items()[0]._dirty,true,'only the canonical queue may acknowledge local revisions');
  assert.deepEqual(f.calls.closed,['saveProjectModal']);assert.deepEqual(f.calls.toasts,[]);
  console.log('PASS late save cannot clear another project flags, replace its metadata, or close its form');
 }
 {
  const f=fixture(),room=deferred();f.context.saveCurrentRoom=()=>room.promise;
  const pending=f.context.saveProject();f.switch();room.resolve(true);assert.equal(await pending,false);
  assert.equal(f.calls.local,0);assert.equal(f.calls.cloud.length,0);assert.equal(f.items()[1].name,'Old B');
  console.log('PASS switching during room capture cannot apply form data to a different project');
 }
 {
  const f=fixture(),local=deferred();f.context['A·CEIL'].ProjectPersistence.saveProjects=()=>local.promise;
  const pending=f.context.saveProject();await until(()=>f.calls.prepare===1);await Promise.resolve();
  f.owner('other');local.resolve({ok:true});assert.equal(await pending,false);assert.equal(f.calls.cloud.length,0);assert.deepEqual(f.calls.closed,[]);
  console.log('PASS owner switch during local persistence cannot enqueue into another account');
 }
 {
  const f=fixture(),pending=f.context.saveProject();await until(()=>f.calls.cloud.length===1);f.cloud.resolve(false);
  assert.equal(await pending,true);assert.equal(f.items()[0]._dirty,true);assert.match(f.calls.toasts[0],/Очікує синхронізації/);
  console.log('PASS offline save retains pending revision and reports local persistence');
 }
 {
  const f=fixture();f.context._activeObjectId=null;assert.equal(await f.context.saveProject(),'single');assert.equal(f.calls.prepare,1);assert.equal(f.calls.single,1);
  console.log('PASS single-room fallback retains memory preparation without a late wrapper');
 }
 {
  const f=fixture(),pending=f.context.saveProject();await until(()=>f.calls.cloud.length===1);
  f.items()[0].name='Newer edit';f.items()[0]._localUpdatedAt=456;f.cloud.resolve(true);await pending;
  assert.equal(f.items()[0]._dirty,true);assert.equal(f.items()[0]._localUpdatedAt,456);assert.equal(f.items()[0].name,'Newer edit');
  console.log('PASS controller does not acknowledge edits made during the network wait');
 }
 for(const change of ['project','snapshot']){
  const f=fixture(),c=f.context,storage=new Map();
  c.wallMarks=[{id:'wallA',type:'cornice'}];c.linearElements=[];c.wallTypes=[];c.arcPoints=[];
  c.getProjects=()=>f.items();c.setProjects=next=>c['A·CEIL'].ProjectRepository.replaceAll(next);
  c.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  c.setTimeout=()=>{};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/canvas/173-aceil-wall-elements-persistence.js'),'utf8'),c);
  const pending=c.saveProject();await until(()=>f.calls.cloud.length===1);
  if(change==='project')f.switch();else c.wallMarks=[{id:'newerWall',type:'cornice'}];
  f.cloud.resolve(true);await pending;await Promise.resolve();
  const record=f.items()[change==='project'?1:0];
  assert.equal(record.wallMarks,undefined,'late wall snapshot must not be patched into a different context or newer edit');
  assert.ok(!String(record.state||'').includes('wallA'));
  console.log('PASS wall persistence callback ignores changed '+change);
 }
 const memory=fs.readFileSync(path.join(__dirname,'../js/projects/161-aceil-save-memory-roomprice-fix.js'),'utf8');
 assert.doesNotMatch(memory,/window\.saveProject\s*=|prevSaveProject/);
})().catch(error=>{console.error(error);process.exit(1)});
