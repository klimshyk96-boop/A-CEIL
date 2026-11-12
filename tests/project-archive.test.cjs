const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/projects/230-aceil-project-archive.js'),'utf8');
const queue=fs.readFileSync(path.join(root,'js/projects/032-aceil-pending-sync-queue.js'),'utf8');
const auth=fs.readFileSync(path.join(root,'js/auth/033-aceil-supabase-auth-offline-access.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'js/admin/159-aceil-access-clean.js'),'utf8');
let projects=[{id:'p1',_dbId:'p1',name:'Готовий обʼєкт',multiRoom:true,rooms:[{id:'r1',state:'{"closed":true}'}],state:'{"multiRoom":true,"rooms":[]}'}];
const synced=[];
const context={
  console,setTimeout,clearTimeout,Date,JSON,Promise,
  document:{readyState:'loading',addEventListener(){},getElementById(){return null},querySelectorAll(){return[]}},
  getProjects:()=>projects,
  setProjects:next=>{projects=JSON.parse(JSON.stringify(next));return projects},
  showToast(){},
  window:null
};
context.window=context;
context['A·CEIL']={ProjectPersistence:{syncProject:async project=>{synced.push(project.id);return true}}};
vm.createContext(context);vm.runInContext(source,context);
(async()=>{
  assert.equal(context.A_CEIL_ProjectArchive.count(),0);
  await context.A_CEIL_ProjectArchive.toggle('p1',true);
  assert.ok(projects[0].archivedAt,'archive date must be stored on the project');
  assert.ok(JSON.parse(projects[0].state).archivedAt,'archive date must be stored in cloud state');
  assert.equal(context.A_CEIL_ProjectArchive.count(),1);
  await context.A_CEIL_ProjectArchive.toggle('p1',false);
  assert.equal(projects[0].archivedAt,null);
  assert.equal(JSON.parse(projects[0].state).archivedAt,undefined);
  assert.deepEqual(synced,['p1','p1']);
  // Dense project lists previously parsed the entire drawing on every count
  // and render pass, including each card. Cache must also invalidate after a
  // project state is replaced (archiving/unarchiving and cloud refresh).
  projects=Array.from({length:120},(_,i)=>({
    id:'perf-'+i,name:'Object '+i,state:JSON.stringify({
      schemaVersion:3,pts:Array.from({length:80},(_,n)=>({x:n,y:n*2})),
      archivedAt:null
    })
  }));
  const originalJSON=context.JSON;
  let parseCalls=0;
  context.JSON={
    parse(value){parseCalls++;return originalJSON.parse(value)},
    stringify:originalJSON.stringify
  };
  assert.equal(context.A_CEIL_ProjectArchive.count(),0);
  assert.equal(parseCalls,120,'first pass parses 120 uncached drawings');
  assert.equal(context.A_CEIL_ProjectArchive.count(),0);
  assert.equal(parseCalls,120,'a second pass does not reparse 120 unchanged drawings');
  projects[0].state=JSON.stringify({archivedAt:'2026-11-12T06:00:00Z'});
  assert.equal(context.A_CEIL_ProjectArchive.count(),1,'cache invalidates when cloud state changes');
  assert.equal(parseCalls,121,'only the changed project is parsed again');
  context.JSON=originalJSON;
  assert.match(source,/aceilProjectArchiveTabs/,'projects modal must show archive tabs');
  assert.match(source,/count\.archive/,'archive tab must show the count');
  assert.match(queue,/state\.archivedAt=local\.archivedAt/,'cloud payload must preserve archive state');
  assert.match(auth,/archivedAt:stateObj\.archivedAt\|\|null/,'normal cloud load must restore archive state');
  assert.match(admin,/archivedAt:st\.archivedAt\|\|null/,'access refresh must restore archive state');
  console.log('PASS project archive and cloud persistence');
})().catch(error=>{console.error(error);process.exitCode=1});
