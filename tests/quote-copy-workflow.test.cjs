/* Quote-copy workflow: two independent projects and two immutable public links. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const test=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../js/projects/230-aceil-project-archive.js'),'utf8');
const sync=fs.readFileSync(path.join(__dirname,'../js/projects/032-aceil-pending-sync-queue.js'),'utf8');
const auth=fs.readFileSync(path.join(__dirname,'../js/auth/033-aceil-supabase-auth-offline-access.js'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'../js/admin/159-aceil-access-clean.js'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  let projects=[{id:'original-uuid',_dbId:'original-uuid',_cloudRevision:'3',_ownerId:'user-1',name:'Вітальня',report_token:'a'.repeat(20),report_published_at:'2026-11-11T12:00:00Z',
    rooms:[{id:'r1',name:'Кімната 1',state:JSON.stringify({closed:true,pts:[{x:1},{x:2},{x:3}]}),_aceilVariantsShadow:{links:[{token:'old'}]}}],
    state:JSON.stringify({multiRoom:true,projectType:'apartment',rooms:[{id:'r1',state:'{}'}],report_token:'old'})}];
  const initial=copy(projects),queue=[],copies=[],messages=[],nodes={},writeTexts=[];
  function node(tag){return{tagName:tag||'',style:{},children:[],appendChild(el){this.children.push(el)},replaceChildren(){this.children=[]},setAttribute(){},insertBefore(el){nodes[el.id]=el},querySelectorAll(){return[]}}}
  const parent=node('div'),list=node('div');list.parentNode=parent;nodes.projectsList=list;
  const c={console,Date,Math,JSON,Promise,Map,Set,WeakMap,setTimeout(){return 1},clearTimeout(){},
    crypto:{randomUUID(){return 'copy-uuid'}},
    navigator:{onLine:true,clipboard:{async writeText(v){writeTexts.push(v)}}},
    document:{readyState:'loading',addEventListener(){},getElementById(id){return nodes[id]||null},createElement:node},
    getProjects(){return projects},setProjects(next){projects=copy(next)},showToast(m){messages.push(m)},
    _sb:{},_sbUser:{id:'user-1'},getPendingQueue(){return queue},
    addToPendingQueue(op){queue.push(copy(op))},
    async flushPendingQueue(){
      const op=queue.shift();
      const found=projects.find(p=>p.id===op.payload.localId);
      found._localId=found.id;found.id='new-cloud-uuid';found._dbId='new-cloud-uuid';found._cloudRevision='1';
      delete found._dirty;delete found._localUpdatedAt;delete found._syncStatus;
      return true;
    }};
  c.window=c;c['A·CEIL']={ProjectRepository:{
    upsert(p){projects.push(copy(p));copies.push(copy(p));return p},
    list(){return projects}
  }};
  c.A_CEIL_ReportLinks={publicUrl(token){return 'https://a-ceil.pp.ua/r/'+token}};
  vm.createContext(c);vm.runInContext(source,c);
  return{c,initial,projects:()=>projects,queue,copies,messages,nodes,writeTexts};
}
test('independent quote copy never overwrites original or inherits its report links',async()=>{
  const f=fixture(),result=await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid');
  assert.equal(result,'new-cloud-uuid');
  assert.deepEqual(f.projects()[0],f.initial[0],'original drawings and cloud link remain unchanged');
  assert.equal(f.projects().length,2);
  const p=f.projects()[1],raw=JSON.parse(p.state);
  assert.equal(p._dbId,'new-cloud-uuid');
  assert.equal(p._cloudRevision,'1');
  assert.equal(p._comparisonSourceId,'original-uuid');
  assert.equal(raw.comparisonSourceId,'original-uuid');
  assert.equal(raw.multiRoom,true);
  assert.equal(p.name,'Вітальня — Безвставочний');
  assert.equal(p.report_token,undefined,'copy requires its own publication');
  assert.equal(p.calcLinks,undefined);
  assert.equal(p.rooms[0]._aceilVariantsShadow,undefined,'no inherited estimate links');
  assert.equal(f.copies[0]._dbId,undefined,'the inserted copy must start with a new local id');
  assert.equal(f.queue.length,0);
});
test('unsaved and offline projects cannot claim cloud comparison copies',async()=>{
  const f=fixture();f.projects()[0]._dirty=true;
  assert.equal(await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid'),false);
  assert.equal(f.projects().length,1);
  f.projects()[0]._dirty=false;f.c.navigator.onLine=false;
  assert.equal(await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid'),false);
  assert.equal(f.projects().length,1);
});
test('two links are available only when original and copy published independently',async()=>{
  const f=fixture();await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid');
  const panel=f.nodes.aceilQuotePairPanel;
  assert(panel);
  assert.equal(panel.children.at(-1).disabled,true,'cannot send one link as two quotations');
  f.projects()[1].report_token='b'.repeat(20);
  assert.equal(f.c.A_CEIL_ProjectArchive.showPair('new-cloud-uuid'),true);
  const button=panel.children.at(-1);
  assert.equal(button.disabled,false);await button.onclick();
  assert.equal(f.writeTexts[0],'https://a-ceil.pp.ua/r/'+ 'a'.repeat(20)+'\nhttps://a-ceil.pp.ua/r/'+'b'.repeat(20));
  f.projects()[1].report_token='a'.repeat(20);
  assert.equal(f.c.A_CEIL_ProjectArchive.showPair('new-cloud-uuid'),false,'duplicate URLs must be blocked');
});
test('cloud persistence restores lineage and does not share original report identity',()=>{
  assert.match(sync,/state\.comparisonSourceId=String\(local\._comparisonSourceId\)/);
  assert.match(auth,/_comparisonSourceId:stateObj\.comparisonSourceId\|\|null/);
  assert.match(admin,/_comparisonSourceId:st\.comparisonSourceId\|\|null/);
  assert.match(auth,/report_token:p\.report_token\|\|null/);
  assert.match(sync,/sync_revision/);
});

test('pending cloud conflict exposes the real reason and does not blind-retry',async()=>{
  const f=fixture(),p=f.projects()[0];
  p._dirty=true;p._syncStatus='pending_update';
  f.queue.push({type:'save',payload:{localId:'original-uuid',dbId:'original-uuid'},_manualConflictRequired:true,_failures:1,_lastError:'Хмарна ревізія змінилася'});
  const issue=f.c.A_CEIL_ProjectArchive.syncIssue(p);
  assert.equal(issue.blocked,true);
  assert.equal(issue.label,'⚠️ Конфлікт');
  assert.match(issue.description,/Хмарна ревізія/);
  assert.equal(await f.c.A_CEIL_ProjectArchive.retryCloudSave('original-uuid'),false);
  assert.equal(f.queue.length,1,'conflicting edit remains in the queue, never overwritten');
});
test('stuck local project can be rescued as a separate cloud record, original unchanged',async()=>{
  const f=fixture(),p=f.projects()[0];
  p._dirty=true;p._localUpdatedAt=Date.now();p._syncStatus='pending_update';
  f.queue.push({type:'save',payload:{localId:p.id,dbId:p._dbId},_manualConflictRequired:true,_lastError:'Застаріла ревізія'});
  const result=await f.c.A_CEIL_ProjectArchive.rescueCloudCopy(p.id);
  assert.equal(result,'new-cloud-uuid');
  assert.deepEqual(f.projects()[0],Object.assign({},f.initial[0],{
    _dirty:true,_localUpdatedAt:p._localUpdatedAt,_syncStatus:'pending_update'
  }),'source stays unchanged with its conflict intact');
  assert.equal(f.projects().length,2);
  const copy=f.projects()[1],state=JSON.parse(copy.state);
  assert.equal(copy._dbId,'new-cloud-uuid');
  assert.equal(copy._recoverySourceId,'original-uuid');
  assert.equal(state.recoverySourceId,'original-uuid');
  assert.equal(copy._comparisonSourceId,undefined);
  assert.equal(state.comparisonSourceId,undefined);
  assert.equal(copy.report_token,undefined);
  assert.equal(f.queue.length,1,'original conflict queue is preserved after rescue');
  assert.equal(await f.c.A_CEIL_ProjectArchive.rescueCloudCopy('original-uuid'),false,
    'repeat tap must not create a second emergency copy');
  assert.equal(f.projects().length,2);
});
test('cloud recovery lineage survives login, and blocked saves are visibly distinguishable',()=>{
  assert.match(sync,/state\.recoverySourceId=String\(local\._recoverySourceId\)/);
  assert.match(auth,/_recoverySourceId:stateObj\.recoverySourceId\|\|null/);
  assert.match(admin,/_recoverySourceId:st\.recoverySourceId\|\|null/);
  assert.match(source,/syncChip\.textContent=issue\.label/);
  assert.match(source,/syncChip\.onclick=function\(\)\{window\.A_CEIL_ProjectArchive\.syncHelp/);
});
