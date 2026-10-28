const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/projects/226-aceil-project-safety-ui.js'),'utf8');

function fixture(project){
 let projects=[structuredClone(project)],removed=[],queued=[],cleared=[],flushed=0,renders=0;
 const safety={status:async()=>({currentAt:null,trashCount:removed.length}),flush:async()=>true,listTrash:async()=>removed.map(p=>({project:p,deletedAt:Date.now(),expiresAt:Date.now()+1000}))};
 const repository={
  list:()=>structuredClone(projects),
  remove(id){const at=projects.findIndex(p=>[p.id,p._dbId,p._localId].some(v=>v!=null&&String(v)===String(id)));if(at<0)return false;removed.push(projects[at]);projects.splice(at,1);return true}
 };
 const c={console,Date,Promise,setTimeout(){return{unref(){}}},clearTimeout,
  document:{readyState:'complete',getElementById:()=>null,addEventListener(){},head:{appendChild(){}},body:{appendChild(){}},createElement:()=>({})},
  addEventListener(){},openProjectsModal(){},deleteProject(){throw new Error('legacy delete path used')},
  confirmTap(_btn,_text,fn){return fn()},renderProjects(){renders++},
  addToPendingQueue(op){queued.push(structuredClone(op))},removeFromPendingQueue(id){cleared.push(id)},
  async flushPendingQueue(){flushed++;return true},
  'A·CEIL':{ProjectRepository:repository,ProjectSafety:safety}
 };
 c.window=c;vm.createContext(c);vm.runInContext(source,c);
 return{c,projects:()=>projects,removed,queued,cleared,flushed:()=>flushed,renders:()=>renders};
}

test('successful cloud deletion enters trash before the server queue is flushed',async()=>{
 const f=fixture({id:'cloud-a',_dbId:'cloud-a',name:'A',state:'{}'});
 assert.equal(await f.c.deleteProject('cloud-a',{}),true);
 assert.equal(f.projects().length,0);assert.equal(f.removed.length,1);
 assert.equal(f.queued.length,1);assert.equal(f.queued[0].type,'delete');assert.equal(f.queued[0].payload.dbId,'cloud-a');
 assert.equal(f.flushed(),1);assert(f.renders()>0);
});

test('local-only deletion enters trash and removes its pending save',async()=>{
 const f=fixture({id:'local-a',name:'Local',state:'{}'});
 assert.equal(await f.c.deleteProject('local-a',{}),true);
 assert.equal(f.removed.length,1);assert.equal(f.queued.length,0);assert.deepEqual(f.cleared,['local-a']);
});
