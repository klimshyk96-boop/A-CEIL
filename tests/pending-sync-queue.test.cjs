/* Exercise the canonical queue with delayed cloud responses and scoped storage.
   No network or production data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/projects/032-aceil-pending-sync-queue.js'), 'utf8');
const modeSource = fs.readFileSync(require('node:path').join(__dirname, '../js/projects/022-aceil-project-mode.js'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(initial = [{id:'local-a', _dbId:'db-a', name:'old', state:'{}', _dirty:true}]) {
  let owner = 'owner-a', quota = false;
  const seeded = initial.map(p=>p._dbId && !Object.prototype.hasOwnProperty.call(p,'_cloudRevision') ? {...p,_cloudRevision:'1'} : p);
  const states = new Map([[owner, copy(seeded)]]), disk = new Map(), requests = [], listeners = {};
  const status = {textContent:'', title:''};
  const later=(fn,ms)=>{const timer=setTimeout(fn,ms);if(ms>=1000)timer.unref?.();return timer};
  const c = {console, Map, Set, Math, Date, Promise, AbortController, setTimeout:later, clearTimeout,
    navigator:{onLine:true}, document:{visibilityState:'visible',getElementById:() => status,addEventListener:(name,fn) => {listeners[name] = fn}}, hideSync(){}};
  c.window = c;
  c.addEventListener = (name, fn) => {listeners[name] = fn};
  c.A_CEIL_UserStorage = {getUserId:() => owner};
  c.localStorage = {getItem:key => disk.get(owner+':'+key) || null, setItem(key,value){if(quota)throw Error('quota');disk.set(owner+':'+key,value)}};
  c['A·CEIL'] = {ProjectRepository:{list:() => copy(states.get(owner) || []), replaceAll:items => states.set(owner,copy(items))}};
  c._sbUser = {id:owner};
  c._sb = {from(){
    let method, payload, id, filters={};
    function request(){return new Promise(resolve => requests.push({method,payload:copy(payload || {}),id,filters:{...filters},resolve}))}
    const q = {update(value){method='update';payload=value;return q},insert(value){method='insert';payload=value;return q},delete(){method='delete';return q},eq(key,value){filters[key]=value;if(key==='id')id=value;return q},select(){return method==='delete'?request():q},single:request};
    return q;
  }};
  const hashRoom = r => JSON.stringify([r && r.name, r && r.state]);
  c['A·CEIL'] = Object.assign(c['A·CEIL'] || {}, {ProjectRepository:c['A·CEIL'].ProjectRepository, roomSync:{hash:hashRoom, hashes(rooms){const o={};(rooms||[]).forEach(r=>{o[String(r.id)]=hashRoom(r)});return o}}});
  vm.createContext(c); vm.runInContext(modeSource,c); vm.runInContext(source,c);
  const items = () => states.get(owner) || [];
  const enqueue = (id='local-a', extra={}) => c.addToPendingQueue({type:'save',payload:{localId:id},addedAt:1,...extra});
  const reply = (index,id='db-a',error=null) => { const r=requests[index], rev=r.method==='update'?String(Number(r.filters.sync_revision||1)+1):'1'; r.resolve({data:error?null:{id,sync_revision:rev},error}); };
  return {c,requests,status,disk,states,items,enqueue,reply,listeners,quota(value){quota=value},switchTo(value){owner=value;c._sbUser={id:value};if(!states.has(owner))states.set(owner,[])}};
}
test('a later edit survives acknowledgement; concurrent flush calls share one request', async () => {
  const f=fixture(); f.enqueue(); const done=f.c.flushPendingQueue(); assert.equal(f.c.flushPendingQueue(),done);
  await tick(); assert.equal(f.requests.length,1); assert.equal(f.requests[0].payload.name,'old');
  f.items()[0].name='new'; f.items()[0]._localUpdatedAt=2; f.enqueue();
  f.reply(0); await tick();
  assert.equal(f.requests.length,2); assert.equal(f.requests[1].payload.name,'new');
  assert.equal(f.c.getPendingQueue().length,1); assert.equal(f.items()[0]._dirty,true);
  assert(!f.status.textContent.includes('синхронізовано'));
  f.reply(1); assert.equal(await done,true); assert.equal(f.c.getPendingQueue().length,0); assert.equal(f.items()[0]._dirty,undefined);
});
test('conflict stays blocked after editing the same project again', async () => {
  const f=fixture();
  f.c.setPendingQueue([{type:'save',payload:{localId:'local-a',dbId:'db-a'},
    _queueId:'old-conflict',_manualConflictRequired:true,_lastError:'Different revision'}]);
  f.items()[0].name='newer local drawing'; f.items()[0]._localUpdatedAt=15;
  f.enqueue('local-a');
  assert.equal(f.c.getPendingQueue().length,1);
  assert.equal(f.c.getPendingQueue()[0]._manualConflictRequired,true);
  assert.match(f.status.textContent,/конфлікт/);
  assert.equal(await f.c.flushPendingQueue(),false);
  assert.equal(f.requests.length,0,'new edit must not bypass manual conflict reconciliation');
  const op=f.c.getPendingQueue()[0];delete op._manualConflictRequired;
  f.c.setPendingQueue([op]); // Explicit recovery UI clears the gate.
  const done=f.c.flushPendingQueue();await tick();
  assert.equal(f.requests.length,1);
  assert.equal(f.requests[0].payload.name,'newer local drawing');
  f.reply(0);assert.equal(await done,true);
});
test('cloud-trash restoration gate stays blocked across repeated edits', async () => {
  const f=fixture();
  f.c.setPendingQueue([{type:'save',payload:{localId:'local-a',dbId:'db-a'},
    _queueId:'old-missing',_manualRestoreRequired:true,_lastError:'Missing cloud project'}]);
  f.items()[0].name='edited after deletion';f.enqueue('local-a');
  assert.equal(f.c.getPendingQueue()[0]._manualRestoreRequired,true);
  assert.match(f.status.textContent,/відновлення/);
  assert.equal(await f.c.flushPendingQueue(),false);
  assert.equal(f.requests.length,0,'deletion cannot be undone by a new local edit');
});
test('a changed repository snapshot is sent again even without a new queue entry', async () => {
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.items()[0].state='{"lengths":[123]}';f.items()[0]._localUpdatedAt=3;
  f.reply(0);await tick();assert.deepEqual(f.requests[1].payload.state,{lengths:[123]});
  f.reply(1);assert.equal(await done,true);
});
test('an edit during INSERT is subsequently UPDATEd using the assigned cloud ID', async () => {
  const f=fixture([{id:'local-a',name:'old',state:'{}',_dirty:true}]);f.c._activeObjectId='local-a';f.c._currentProjectId='another-project';f.enqueue();
  const done=f.c.flushPendingQueue();await tick();assert.equal(f.requests[0].method,'insert');
  f.items()[0].name='new';f.enqueue();f.reply(0,'new-cloud-id');await tick();
  assert.equal(f.requests[1].method,'update');assert.equal(f.requests[1].id,'new-cloud-id');
  assert.equal(f.items()[0]._localId,'local-a');assert.equal(f.c._activeObjectId,'new-cloud-id');assert.equal(f.c._currentProjectId,'another-project');f.reply(1,'new-cloud-id');assert.equal(await done,true);
});
test('deleting during INSERT binds the queued delete and does not restore the project', async () => {
  const f=fixture([{id:'local-a',name:'old',state:'{}'}]);f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.states.set('owner-a',[]);f.c.addToPendingQueue({type:'delete',payload:{localId:'local-a'}});
  f.reply(0,'created-id');await tick();assert.equal(f.requests[1].method,'delete');assert.equal(f.requests[1].id,'created-id');
  f.reply(1,'created-id');assert.equal(await done,true);assert.equal(f.items().length,0);
});
test('a delete without the returned server row is not acknowledged', async () => {
  const f=fixture([]);f.c.addToPendingQueue({type:'delete',payload:{localId:'local-a',dbId:'db-a'}});
  const done=f.c.flushPendingQueue();await tick();assert.equal(f.requests[0].method,'delete');
  f.requests[0].resolve({data:[],error:null});assert.equal(await done,false);assert.equal(f.c.getPendingQueue().length,1);
});
test('cloud trash RPC atomically replaces direct project deletion when available', async () => {
  const f=fixture([]),calls=[];f.c._sb.rpc=(name,args)=>{calls.push({name,args});return Promise.resolve({data:args.p_project_id,error:null})};
  f.c.addToPendingQueue({type:'delete',payload:{localId:'local-a',dbId:'db-a'}});
  assert.equal(await f.c.flushPendingQueue(),true);assert.equal(JSON.stringify(calls),JSON.stringify([{name:'aceil_trash_project',args:{p_project_id:'db-a'}}]));
  assert.equal(f.requests.length,0);assert.equal(f.c.getPendingQueue().length,0);
});
test('failures stay queued; successful unrelated work is removed and retry succeeds', async () => {
  const f=fixture([{id:'local-a',_dbId:'db-a',name:'A',state:'{}'},{id:'local-b',_dbId:'db-b',name:'B',state:'{}'}]);
  f.enqueue();const done=f.c.flushPendingQueue();await tick();f.enqueue('local-b');f.reply(0,null,{message:'offline'});await tick();
  f.reply(1,'db-b');assert.equal(await done,false);assert.equal(f.c.getPendingQueue().length,1);assert(f.status.textContent.includes('не збережено'));
  const retry=f.c.flushPendingQueue();await tick();f.reply(2);assert.equal(await retry,true);
});
test('a response without a saved row is not acknowledged', async () => {
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();f.requests[0].resolve({data:null,error:null});
  assert.equal(await done,false);assert.equal(f.c.getPendingQueue().length,1);
});
test('a deleted cloud project is never silently recreated; local edits are preserved', async () => {
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.reply(0,null,{code:'PGRST116',message:'JSON object requested, 0 rows'});
  await tick();
  assert.equal(f.requests.length,2,'zero-row CAS checks whether row was deleted');
  f.requests[1].resolve({data:null,error:{code:'PGRST116',message:'JSON object requested, 0 rows'}});
  assert.equal(await done,false);
  assert.equal(f.requests.length,2,'must not INSERT an orphaned project');
  assert.equal(f.requests[0].method,'update');
  assert.equal(f.c.getPendingQueue().length,1,'local save remains queued');
  assert.equal(f.c.getPendingQueue()[0]._manualRestoreRequired,true);
  assert.match(f.status.textContent,/очікує відновлення/);
  assert.match(f.c.__A_CEIL_LAST_CLOUD_ERROR.message,/Локальні зміни збережено/);
  assert.equal(f.items()[0]._dbId,'db-a');
});
test('only explicit cloud-trash restoration unblocks a missing project revision', async () => {
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.reply(0,null,{code:'PGRST116',message:'JSON object requested, 0 rows'});
  await tick();f.requests[1].resolve({data:null,error:{code:'PGRST116',message:'JSON object requested, 0 rows'}});
  assert.equal(await done,false);
  f.listeners['aceil:project-recovered']({detail:{source:'local-cache',id:'db-a'}});
  await tick();
  assert.equal(f.requests.length,2,'local-only recovery cannot resurrect a cloud deletion');
  assert.equal(f.c.getPendingQueue()[0]._manualRestoreRequired,true);
  f.listeners['aceil:project-recovered']({detail:{source:'cloud-trash',id:'db-a'}});
  await tick();
  assert.equal(f.requests.length,3,'explicit cloud restoration retries the original UPDATE');
  assert.equal(f.requests[2].method,'update');
  assert.equal(f.requests[2].id,'db-a');
  f.reply(2,'db-a');await tick();
  assert.equal(f.c.getPendingQueue().length,0);
});
test('a hung Safari request times out and releases the queue flight', async () => {
  const f=fixture();f.c.__A_CEIL_SYNC_TIMEOUT_MS=20;f.enqueue();
  const first=f.c.flushPendingQueue();await tick();assert.equal(f.requests.length,1);assert.equal(await first,false);
  assert.equal(f.c.getPendingQueue().length,1);assert.match(f.c.__A_CEIL_LAST_CLOUD_ERROR.message,/таймаут/);
  const retry=f.c.flushPendingQueue();await tick();assert.equal(f.requests.length,2);f.reply(1);assert.equal(await retry,true);
});
test('quota fallback is authoritative, including a removal that could not reach disk', () => {
  const f=fixture();f.enqueue();f.quota(true);f.c.removeFromPendingQueue('local-a');
  assert.equal(f.c.getPendingQueue().length,0);assert(f.disk.get('owner-a:ceiling_pendingSync').includes('local-a'));
  f.switchTo('owner-b');f.enqueue('b');assert.equal(f.c.getPendingQueue()[0].payload.localId,'b');
  f.switchTo('owner-a');assert.equal(f.c.getPendingQueue().length,0);
  f.quota(false);f.c.setPendingQueue(f.c.getPendingQueue());assert.deepEqual(JSON.parse(f.disk.get('owner-a:ceiling_pendingSync')),[]);
});
test('changing accounts during a response cannot clear either account or patch the new repository', async () => {
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.switchTo('owner-b');f.states.set('owner-b',[{id:'local-b',name:'B'}]);f.enqueue('local-b');const status=f.status.textContent;
  f.reply(0);assert.equal(await done,false);assert.equal(f.c.getPendingQueue()[0].payload.localId,'local-b');assert.equal(f.status.textContent,status);
  assert.equal(f.items()[0].name,'B');f.switchTo('owner-a');assert.equal(f.c.getPendingQueue().length,1);assert.equal(f.items()[0]._dirty,true);
});
test('queue compaction retains more than 30 projects and keeps heavy state in the repository', () => {
  const f=fixture();for(let i=0;i<40;i++)f.enqueue('p'+i,{payload:{localId:'p'+i,stateObj:{huge:'x'.repeat(100)},thumb:'data:image/png'}});
  const queue=f.c.getPendingQueue();assert.equal(queue.length,40);assert.equal(queue[0].payload.stateObj,undefined);assert.equal(queue[0].payload.thumb,undefined);
});
test('legacy records remain identifiable and the online handler uses the canonical queue', async () => {
  const f=fixture();f.disk.set('owner-a:ceiling_pendingSync',JSON.stringify([{type:'save',payload:{localId:'local-a'},addedAt:1}]));
  assert.equal(f.c.getPendingQueue()[0]._queueId,f.c.getPendingQueue()[0]._queueId);
  f.listeners.online();await tick();assert.equal(f.requests.length,1);f.reply(0);await tick();assert.equal(f.c.getPendingQueue().length,0);
});
test('the later room-price module no longer replaces queue functions', () => {
  const later=fs.readFileSync(require('node:path').join(__dirname,'../js/projects/161-aceil-save-memory-roomprice-fix.js'),'utf8');
  assert.doesNotMatch(later,/window\.(?:getPendingQueue|setPendingQueue|addToPendingQueue|removeFromPendingQueue|flushPendingQueue)\s*=/);
});

test('a reconnect before ProjectRepository is loaded cannot discard pending work', async () => {
  const f=fixture();f.enqueue();const repo=f.c['A·CEIL'].ProjectRepository;delete f.c['A·CEIL'].ProjectRepository;
  assert.equal(await f.c.flushPendingQueue(),false);assert.equal(f.c.getPendingQueue().length,1);assert.equal(f.requests.length,0);
  f.c['A·CEIL'].ProjectRepository=repo;const done=f.c.flushPendingQueue();await tick();f.reply(0);assert.equal(await done,true);
});

test('apartment writes rebuild state.rooms from the latest repository rooms and retain the preview', async () => {
  const rooms=[{id:'r1',state:'{"pts":[{"x":1,"y":2}]}'}];
  const f=fixture([{id:'local-a',_dbId:'db-a',name:'Apartment',multiRoom:true,rooms,state:'{"multiRoom":true,"rooms":[]}',thumb:'data:image/png;base64,preview'}]);
  f.enqueue();const done=f.c.flushPendingQueue();await tick();
  assert.deepEqual(f.requests[0].payload.state.rooms,rooms);assert.equal(f.requests[0].payload.thumb,'data:image/png;base64,preview');
  f.reply(0);assert.equal(await done,true);
});
test('empty apartment data cannot overwrite a cloud drawing', async () => {
  const f=fixture([{id:'local-a',_dbId:'db-a',multiRoom:true,rooms:[],state:'{}'}]);f.enqueue();
  assert.equal(await f.c.flushPendingQueue(),false);assert.equal(f.requests.length,0);
  assert.equal(f.c.getPendingQueue().length,0,'an impossible empty save is not retried forever');
});
test('a failing request records its failure count and reason on the queued operation', async () => {
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.reply(0,null,{status:400,message:'bad payload'});assert.equal(await done,false);
  const op=f.c.getPendingQueue()[0];assert.equal(op._failures,1);assert.match(op._lastError,/bad payload/);
});
test('a standalone drawing with stale apartment flags syncs and is repaired', async () => {
  const state={projectType:'apartment',multiRoom:true,rooms:[],closed:true,pts:[{x:0,y:0},{x:2,y:0},{x:2,y:2}],lengths:[2,2,2]};
  const f=fixture([{id:'local-a',_dbId:'db-a',multiRoom:true,projectType:'apartment',rooms:[],state:JSON.stringify(state),_dirty:true}]);
  f.enqueue();const done=f.c.flushPendingQueue();await tick();
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].payload.state.closed,true);assert.equal(f.requests[0].payload.state.multiRoom,undefined);assert.equal(f.requests[0].payload.state.rooms,undefined);
  f.reply(0);assert.equal(await done,true);const saved=f.items()[0];assert.equal(saved.multiRoom,undefined);assert.equal(saved.rooms,undefined);assert.equal(saved._dirty,undefined);
});

const drawn = n => JSON.stringify({closed:true,pts:[{x:0,y:0},{x:n,y:0},{x:n,y:n}]});
function roomsFixture(localRooms, base) {
  const project = {id:'local-a',_dbId:'db-a',multiRoom:true,name:'Flat',rooms:localRooms,state:'{}',_cloudBase:base};
  return fixture([project]);
}
test('rooms changed only on another device are adopted instead of overwritten', async () => {
  const orig1={id:'r1',name:'Hall',state:drawn(1)}, orig2={id:'r2',name:'Kitchen',state:drawn(2)};
  const base={r1:JSON.stringify([orig1.name,orig1.state]), r2:JSON.stringify([orig2.name,orig2.state])};
  const mine2={...orig2,state:drawn(22)};
  const f=roomsFixture([orig1,mine2],base);f.enqueue();const done=f.c.flushPendingQueue();await tick();
  assert.equal(f.requests[0].method,undefined,'live cloud rows are read first');
  const remote1={...orig1,state:drawn(11)}, remote3={id:'r3',name:'Bath',state:drawn(3)};
  f.requests[0].resolve({data:{state:JSON.stringify({rooms:[remote1,orig2,remote3]}),sync_revision:1},error:null});await tick();
  assert.equal(f.requests[1].method,'update');
  const sent=f.requests[1].payload.state.rooms;
  assert.deepEqual(sent.map(r=>[r.id,r.state]),[['r1',remote1.state],['r2',mine2.state],['r3',remote3.state]]);
  f.reply(1);assert.equal(await done,true);
  assert.deepEqual(f.items()[0].rooms.map(r=>r.id),['r1','r2','r3']);
  assert.equal(f.items()[0].rooms[0].state,remote1.state);
  assert.equal(f.items()[0]._cloudBase.r1,JSON.stringify(['Hall',remote1.state]));
});
test('later cloud revision with exact same drawing is acknowledged without overwrite',async()=>{
  const r={id:'r1',name:'Кімната',state:drawn(5)};
  const base={r1:JSON.stringify([r.name,r.state])};
  const f=roomsFixture([r],base);f.enqueue();
  const done=f.c.flushPendingQueue();await tick();
  assert.equal(f.requests[0].method,undefined,'read revision without changing cloud');
  f.requests[0].resolve({data:{state:{rooms:[r]},sync_revision:12},error:null});
  await tick();
  assert.equal(f.requests.length,2,'verify all editable fields on stale revision');
  assert.equal(f.requests[1].method,undefined,'verification is read only');
  const data={id:'db-a',sync_revision:12,name:'Flat',addr:'',phone:'',comment:'',
    area:'',per:'',in_corners:'',out_corners:'',thumb:'',
    state:{schemaVersion:3,projectType:'apartment',multiRoom:true,rooms:[r]}};
  f.requests[1].resolve({data,error:null});
  assert.equal(await done,true,'server already contains exactly the local content');
  assert.equal(f.requests.length,2,'no destructive CAS UPDATE');
  assert.equal(f.c.getPendingQueue().length,0);
  assert.equal(f.items()[0]._cloudRevision,'12');
  assert.equal(f.items()[0].rooms[0].state,r.state);
});
test('newer revision with even one real room difference still blocks any overwrite',async()=>{
  const r={id:'r1',name:'Кімната',state:drawn(5)};
  const f=roomsFixture([r],{r1:JSON.stringify([r.name,r.state])});f.enqueue();
  const done=f.c.flushPendingQueue();await tick();
  f.requests[0].resolve({data:{state:{rooms:[r]},sync_revision:12},error:null});await tick();
  f.requests[1].resolve({data:{id:'db-a',sync_revision:12,name:'Flat',
    addr:'',phone:'',comment:'',area:'',per:'',in_corners:'',out_corners:'',thumb:'',
    state:{schemaVersion:3,projectType:'apartment',multiRoom:true,
      rooms:[{...r,state:drawn(9)}]}},error:null});
  assert.equal(await done,false);
  assert.equal(f.requests.length,2,'no CAS attempt for real conflict');
  assert.equal(f.c.getPendingQueue()[0]._manualConflictRequired,true);
  assert.equal(f.items()[0].rooms[0].state,r.state,'local copy preserved');
});
test('a room changed on two devices must remain queued without overwriting either drawing', async () => {
  const orig={id:'r1',name:'Hall',state:drawn(1)};
  const base={r1:JSON.stringify([orig.name,orig.state])};
  const mine={...orig,state:drawn(5)};
  const f=roomsFixture([mine],base);f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.requests[0].resolve({data:{state:JSON.stringify({rooms:[{...orig,state:drawn(9)}]}),sync_revision:1},error:null});await tick();
  assert.equal(await done,false,'automatic sync must stop at the conflict');
  assert.equal(f.requests.length,1,'must not issue a destructive UPDATE');
  assert.equal(f.c.getPendingQueue().length,1,'unsynced local drawing remains in queue');
  assert.equal(f.items()[0].rooms[0].state,mine.state,'local drawing remains intact');
  assert.match(f.c.__A_CEIL_LAST_CLOUD_ERROR.message,/Хмарну версію не перезаписано/);
});
test('a failed cloud pre-check stays queued without a blind update and retries safely', async () => {
  const orig={id:'r1',name:'Hall',state:drawn(1)};
  const f=roomsFixture([orig],{r1:JSON.stringify([orig.name,orig.state])});f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.requests[0].resolve({data:null,error:{status:400,message:'boom'}});await tick();
  assert.equal(await done,false);assert.equal(f.requests.length,1);assert.equal(f.c.getPendingQueue().length,1);
  const retry=f.c.flushPendingQueue();await tick();
  f.requests[1].resolve({data:{state:{rooms:[orig]},sync_revision:1},error:null});await tick();
  assert.equal(f.requests[2].method,'update');f.reply(2);assert.equal(await retry,true);
});

for(const moment of ['read','write']) for(const removal of [false,true]) {
 test('local room edit during cloud '+moment+' survives remote '+(removal?'deletion':'adoption'), async()=>{
  const orig={id:'r1',name:'Hall',state:drawn(1)},remote={...orig,state:drawn(9)},latest={...orig,state:drawn(42)};
  const f=roomsFixture([orig],{r1:JSON.stringify([orig.name,orig.state])});f.enqueue();const done=f.c.flushPendingQueue();await tick();
  if(moment==='read')f.items()[0].rooms=[latest];
  f.requests[0].resolve({data:{state:{rooms:removal?[]:[remote]},sync_revision:1},error:null});await tick();
  if(moment==='write')f.items()[0].rooms=[latest];
  f.reply(1);await tick();
  assert.equal(f.items()[0].rooms[0].state,latest.state,'new local geometry must not be replaced or deleted by acknowledgement');
  assert.equal(f.items()[0]._dirty,true);assert.equal(f.c.getPendingQueue().length,1);
  f.requests[2].resolve({data:{state:{rooms:f.requests[1].payload.state.rooms},sync_revision:2},error:null});await tick();
  assert.equal(f.requests[3].payload.state.rooms[0].state,latest.state,'next pass uploads the edit retained locally');
  f.reply(3);assert.equal(await done,true);assert.equal(f.items()[0].rooms[0].state,latest.state);
 });
}

for(const state of [null,'broken json',{}])test('unreadable cloud state blocks destructive update: '+JSON.stringify(state),async()=>{
 const orig={id:'r1',name:'Hall',state:drawn(1)},f=roomsFixture([orig],{r1:JSON.stringify([orig.name,orig.state])});
 f.enqueue();const done=f.c.flushPendingQueue();await tick();f.requests[0].resolve({data:{state,sync_revision:1},error:null});
 assert.equal(await done,false);assert.equal(f.requests.length,1);assert.equal(f.c.getPendingQueue().length,1);
});

test('account switch during cloud pre-check prevents the subsequent update',async()=>{
 const orig={id:'r1',name:'Hall',state:drawn(1)},f=roomsFixture([orig],{r1:JSON.stringify([orig.name,orig.state])});
 f.enqueue();const done=f.c.flushPendingQueue();await tick();f.switchTo('owner-b');
 f.requests[0].resolve({data:{state:{rooms:[orig]},sync_revision:1},error:null});assert.equal(await done,false);assert.equal(f.requests.length,1);
 f.switchTo('owner-a');assert.equal(f.c.getPendingQueue().length,1);
});

test('atomic CAS includes the last acknowledged server revision in the UPDATE filter',async()=>{
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();
  assert.equal(f.requests[0].method,'update');
  assert.equal(f.requests[0].filters.id,'db-a');
  assert.equal(f.requests[0].filters.sync_revision,'1');
  f.reply(0);assert.equal(await done,true);
  assert.equal(f.items()[0]._cloudRevision,'2');
});

test('stale server revision blocks overwrite and retains local edits',async()=>{
  const f=fixture();f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.reply(0,null,{code:'PGRST116',message:'JSON object requested, 0 rows'});
  await tick();assert.equal(f.requests[1].method,undefined,'read current revision after failed CAS');
  f.requests[1].resolve({data:{sync_revision:2},error:null});
  await tick();
  assert.equal(f.requests[2].method,undefined,'verify cloud content before declaring conflict');
  f.requests[2].resolve({data:{id:'db-a',sync_revision:2,name:'other',state:{}},error:null});
  assert.equal(await done,false);
  assert.equal(f.requests.length,3);
  assert.equal(f.c.getPendingQueue().length,1);
  assert.equal(f.c.getPendingQueue()[0]._manualConflictRequired,true);
  assert.equal(f.items()[0]._dirty,true);
  assert.match(f.status.textContent,/конфлікт змін/);
  assert.equal(await f.c.flushPendingQueue(),false);
  assert.equal(f.requests.length,3,'blocked conflict cannot auto-retry');
});

test('legacy local project without verified revision cannot overwrite cloud data',async()=>{
  const f=fixture([{id:'local-a',_dbId:'db-a',name:'offline',state:'{}',_dirty:true,_cloudRevision:null}]);
  f.enqueue();assert.equal(await f.c.flushPendingQueue(),false);
  assert.equal(f.requests.length,0);
  assert.equal(f.c.getPendingQueue()[0]._manualConflictRequired,true);
  assert.equal(f.items()[0].name,'offline');
});

test('remote room revision change prevents destructive write',async()=>{
  const orig={id:'r1',name:'Hall',state:drawn(1)};
  const f=roomsFixture([orig],{r1:JSON.stringify([orig.name,orig.state])});
  f.enqueue();const done=f.c.flushPendingQueue();await tick();
  f.requests[0].resolve({data:{sync_revision:2,state:{rooms:[{...orig,state:drawn(20)}]}},error:null});
  await tick();
  assert.equal(f.requests[1].method,undefined);
  f.requests[1].resolve({data:{id:'db-a',sync_revision:2,name:'Flat',
    state:{rooms:[{...orig,state:drawn(20)}]}},error:null});
  assert.equal(await done,false);
  assert.equal(f.requests.length,2,'newer revision must not be overwritten');
  assert.equal(f.c.getPendingQueue()[0]._manualConflictRequired,true);
});


test('single-room alternative quote retains original lineage after canvas autosave stripped it from state',async()=>{
  const f=fixture([{
    id:'local-copy',name:'Кухня — Копія',_comparisonSourceId:'original-cloud-id',
    _recoverySourceId:'recovery-cloud-id',
    state:JSON.stringify({projectType:'room',closed:true,pts:[{x:0},{x:1},{x:2}]}),
    _dirty:true
  }]);
  f.enqueue('local-copy');
  const done=f.c.flushPendingQueue();await tick();
  assert.equal(f.requests.length,1,'one cloud insert for local quote');
  assert.equal(f.requests[0].method,'insert');
  assert.equal(f.requests[0].payload.state.comparisonSourceId,'original-cloud-id',
    'lineage must follow the project record, not the current canvas state');
  assert.equal(f.requests[0].payload.state.recoverySourceId,'recovery-cloud-id');
  assert.equal(f.requests[0].payload.state.multiRoom,undefined,
    'single-room copy must not accidentally become an apartment');
  f.reply(0,'copy-cloud-id');
  assert.equal(await done,true);
  assert.equal(f.items()[0]._comparisonSourceId,'original-cloud-id');
  assert.equal(f.items()[0]._dbId,'copy-cloud-id');
});
test('single-room copy also preserves lineage through an UPDATE after offline edits',async()=>{
  const f=fixture([{
    id:'copy-cloud-id',_dbId:'copy-cloud-id',_cloudRevision:'7',
    name:'Соборна — Копія',_comparisonSourceId:'original-cloud-id',
    state:JSON.stringify({projectType:'room',closed:true,lengths:[300,400,300,400]}),
    _dirty:true
  }]);
  f.enqueue('copy-cloud-id');
  const done=f.c.flushPendingQueue();await tick();
  assert.equal(f.requests.length,1);
  assert.equal(f.requests[0].method,'update');
  assert.equal(f.requests[0].filters.sync_revision,'7','CAS protects original cloud revision');
  assert.equal(f.requests[0].payload.state.comparisonSourceId,'original-cloud-id');
  f.reply(0,'copy-cloud-id');
  assert.equal(await done,true);
});
