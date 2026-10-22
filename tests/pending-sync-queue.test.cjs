/* Exercise the canonical queue with delayed cloud responses and scoped storage.
   No network or production data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/projects/032-aceil-pending-sync-queue.js'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(initial = [{id:'local-a', _dbId:'db-a', name:'old', state:'{}', _dirty:true}]) {
  let owner = 'owner-a', quota = false;
  const states = new Map([[owner, copy(initial)]]), disk = new Map(), requests = [], listeners = {};
  const status = {textContent:'', title:''};
  const c = {console, Map, Set, Math, Date, Promise, document:{getElementById:() => status}, hideSync(){}};
  c.window = c;
  c.addEventListener = (name, fn) => {listeners[name] = fn};
  c.A_CEIL_UserStorage = {getUserId:() => owner};
  c.localStorage = {getItem:key => disk.get(owner+':'+key) || null, setItem(key,value){if(quota)throw Error('quota');disk.set(owner+':'+key,value)}};
  c['A·CEIL'] = {ProjectRepository:{list:() => copy(states.get(owner) || []), replaceAll:items => states.set(owner,copy(items))}};
  c._sbUser = {id:owner};
  c._sb = {from(){
    let method, payload, id;
    function request(){return new Promise(resolve => requests.push({method,payload:copy(payload || {}),id,resolve}))}
    const q = {update(value){method='update';payload=value;return q},insert(value){method='insert';payload=value;return q},delete(){method='delete';return q},eq(key,value){id=value;return method==='delete'?request():q},select(){return q},single:request};
    return q;
  }};
  vm.createContext(c); vm.runInContext(source,c);
  const items = () => states.get(owner) || [];
  const enqueue = (id='local-a', extra={}) => c.addToPendingQueue({type:'save',payload:{localId:id},addedAt:1,...extra});
  const reply = (index,id='db-a',error=null) => requests[index].resolve({data:error?null:{id},error});
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
  f.reply(1);assert.equal(await done,true);assert.equal(f.items().length,0);
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
  assert.equal(await f.c.flushPendingQueue(),false);assert.equal(f.requests.length,0);assert.equal(f.c.getPendingQueue().length,1);
});
