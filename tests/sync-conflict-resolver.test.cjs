'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),
  fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/projects/238-aceil-conflict-resolver.js'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(options={}){
  let local=Object.assign({id:'project-1',_dbId:'project-1',_cloudRevision:null,
    name:'Сьогодні — Копія',state:JSON.stringify({closed:true,lengths:[300,300,300,300]}),
    _dirty:true,_syncStatus:'conflict'},options.local||{});
  let cloud=Object.assign({id:'project-1',user_id:'user-1',sync_revision:7,
    name:'Сьогодні — Копія',state:{closed:true,lengths:[300,300,300,300]}},options.cloud||{});
  let projects=[local],queue=[{type:'save',payload:{localId:'project-1',dbId:'project-1'},
    _manualConflictRequired:true,_lastError:'Немає ревізії'}];
  let reads=0,flushes=0,downloads=0,updated=0;
  function element(tag='div'){
    const o={tagName:tag,className:'',children:[],dataset:{},style:{cssText:''},textContent:'',
      appendChild(x){this.children.push(x);return x},
      replaceChildren(...x){this.children=x},
      querySelector(sel){
        if(sel==='.aceil-conflict-resolver')return this.children.find(x=>x.className==='aceil-conflict-resolver')||null;
        if(sel==='[data-resolve-status]')return this.children.find(x=>x.dataset.resolveStatus==='1')||null;
        return null
      },
      click(){downloads++;},remove(){},setAttribute(){}
    };
    return o;
  }
  const host=element(),document={getElementById(id){return id==='aceilSyncRescuePanel'?host:null},
    createElement:element,body:{appendChild(){}}
  };
  const client={from(table){
    assert.equal(table,'projects');
    return {select(){return this},eq(field,val){
      if(field==='id')assert.equal(val,'project-1');
      if(field==='user_id')assert.equal(val,'user-1');return this
    },async single(){reads++;return {data:copy(cloud),error:null}}}
  }};
  const w={
    _sb:client,_sbUser:{id:'user-1'},navigator:{onLine:true},document,Blob,
    URL:{createObjectURL(){return 'blob:backup'},revokeObjectURL(){}},
    confirm:()=>true,Date,JSON,Promise,setTimeout(){return 1},clearTimeout(){},
    getPendingQueue(){return copy(queue)},setPendingQueue(next){queue=copy(next);return true},
    addToPendingQueue(op){queue.push(copy(op))},
    flushPendingQueue:async()=>{flushes++;
      if(queue.some(op=>op._manualConflictRequired))return false;
      queue=[];projects[0]._cloudRevision='8';delete projects[0]._dirty;
      delete projects[0]._localUpdatedAt;return true;
    },
    renderProjects(){},_updatePendingBadge(){}
  };
  w.window=w;w['A·CEIL']={ProjectRepository:{
    list(){return copy(projects)},replaceAll(next){updated++;projects=copy(next)}
  }};
  const c={window:w,document,navigator:w.navigator,Blob,URL:w.URL,Date,JSON,Promise,
    setTimeout:w.setTimeout,clearTimeout:w.clearTimeout,console};
  vm.createContext(c);vm.runInContext(source,c);
  function buttons(){const section=host.querySelector('.aceil-conflict-resolver');
    return section?section.children.filter(x=>x.tagName==='button'):[]}
  return {w,host,buttons,local:()=>copy(projects[0]),queue:()=>copy(queue),
    reads:()=>reads,flushes:()=>flushes,downloads:()=>downloads,updated:()=>updated,
    setCloud(next){cloud=Object.assign({},cloud,next)},api:w.A_CEIL_ConflictResolver};
}
test('missing revision resolves automatically only when local and cloud contents are identical',async()=>{
  const f=fixture();
  assert.equal(await f.api.open('project-1'),true);
  const buttons=f.buttons();assert.equal(buttons.length,1);
  assert.match(buttons[0].textContent,/Підтвердити синхронізацію/);
  await buttons[0].onclick();
  assert.equal(f.local()._cloudRevision,'7');
  assert.equal(f.local()._dirty,undefined);
  assert.equal(f.queue().length,0);
  assert.equal(f.flushes(),0,'no remote write for exactly equal project');
});
test('different versions cannot overwrite without a downloaded backup and explicit selection',async()=>{
  const f=fixture({cloud:{state:{closed:true,lengths:[333,300,300,300]}}});
  assert.equal(await f.api.open('project-1'),true);
  let buttons=f.buttons();assert.equal(buttons.length,3);
  await buttons[1].onclick();
  assert.equal(f.local()._cloudRevision,null,'no changes without backup');
  assert.equal(f.flushes(),0);
  buttons[0].onclick();assert.equal(f.downloads(),1);
  assert.equal(await buttons[1].onclick(),undefined);
  assert.equal(f.flushes(),1,'queued CAS save resumes only after verified download and manual choice');
  assert.equal(f.queue().length,0);
  assert.equal(f.local()._cloudRevision,'8');
  assert.equal(f.local().state,JSON.stringify({closed:true,lengths:[300,300,300,300]}));
});
test('cloud version changed during confirmation: CAS is not even attempted',async()=>{
  const f=fixture({cloud:{state:{closed:true,lengths:[333,300,300,300]}}});
  await f.api.open('project-1');const b=f.buttons();b[0].onclick();
  f.setCloud({sync_revision:8,state:{closed:true,lengths:[344,300,300,300]}});
  await b[1].onclick();
  assert.equal(f.flushes(),0);
  assert.equal(f.queue()[0]._manualConflictRequired,true);
  assert.equal(f.local()._cloudRevision,null);
});
test('explicit cloud choice restores latest server drawing and leaves downloaded two-way JSON backup',async()=>{
  const f=fixture({cloud:{state:{closed:true,lengths:[333,300,300,300]}}});
  await f.api.open('project-1');const b=f.buttons();b[0].onclick();
  await b[2].onclick();
  assert.equal(f.local()._cloudRevision,'7');
  assert.deepEqual(JSON.parse(f.local().state).lengths,[333,300,300,300]);
  assert.equal(f.local()._dirty,undefined);
  assert.equal(f.queue().length,0);
  assert.equal(f.flushes(),0,'choosing cloud must not send another cloud write');
});
test('conflict resolver keeps changes when logged-in user switches before second read',async()=>{
  const f=fixture({cloud:{state:{closed:true,lengths:[333,300,300,300]}}});
  await f.api.open('project-1');const b=f.buttons();b[0].onclick();
  f.w._sbUser={id:'different-user'};
  await b[1].onclick();
  assert.equal(f.flushes(),0);
  assert.equal(f.queue()[0]._manualConflictRequired,true);
});
