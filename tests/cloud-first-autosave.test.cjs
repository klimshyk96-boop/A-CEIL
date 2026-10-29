const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/projects/227-aceil-cloud-first-autosave.js'),'utf8');

function fixture(syncImpl){
 let projects=[{id:'p1',_dbId:'p1',name:'Test',state:'{}'}],syncs=0,state={pts:[{x:1,y:2}],closed:true};
 const listeners={};
 const c={console,setTimeout,clearTimeout,Date,Math,JSON,navigator:{onLine:true},CustomEvent:function(type,init){this.type=type;this.detail=init.detail},
  document:{readyState:'complete',visibilityState:'visible',getElementById:id=>({area:'12.00',per:'14.00',inCorners:'4',outCorners:'0'}[id]?{textContent:{area:'12.00',per:'14.00',inCorners:'4',outCorners:'0'}[id]}:null),addEventListener:(n,f)=>listeners[n]=f},
  localStorage:{getItem:key=>key==='ceiling_v18'?JSON.stringify(state):null},
  addEventListener:(n,f)=>listeners[n]=f,dispatchEvent(){},
  saveState(){return 'saved'},_currentProjectId:'p1',_activeObjectId:null,
  'A·CEIL':{ProjectRepository:{list:()=>structuredClone(projects),replaceAll:next=>projects=structuredClone(next)},ProjectPersistence:{syncProject:async p=>{syncs++;if(syncImpl)return syncImpl(p,{projects:()=>projects,replace:next=>projects=structuredClone(next)});projects[0]=Object.assign({},projects[0],p,{_dirty:false,_localUpdatedAt:null,_syncStatus:''});return true}}}
 };
 c.window=c;vm.createContext(c);vm.runInContext(source,c);return{c,projects:()=>projects,syncs:()=>syncs,setState:next=>state=structuredClone(next)};
}

test('canvas changes update the active cloud project after debounce',async()=>{
 const f=fixture();f.c.saveState();await new Promise(r=>setTimeout(r,1050));
 assert.equal(f.syncs(),1);assert.match(f.projects()[0].state,/\"closed\":true/);assert.equal(f.projects()[0].area,'12.00');
});

test('changes without an active saved project are not uploaded',async()=>{
 const f=fixture();f.c._currentProjectId=null;f.c.saveState();await new Promise(r=>setTimeout(r,1000));assert.equal(f.syncs(),0);
});

test('an edit made while a cloud save is in flight is saved in a follow-up pass',async()=>{
 let releaseFirst,first=true;
 const f=fixture(async(p,repo)=>{
  if(first){first=false;await new Promise(resolve=>releaseFirst=resolve)}
  const all=repo.projects();all[0]=Object.assign({},all[0],p,{_dirty:false,_localUpdatedAt:null,_syncStatus:''});repo.replace(all);return true;
 });
 f.c.navigator.onLine=false; // keep the scheduled startup migration out of this focused race test
 f.c.saveState();await new Promise(r=>setTimeout(r,950));
 f.setState({pts:[{x:9,y:8}],closed:true,revision:'latest'});f.c.saveState();
 await new Promise(r=>setTimeout(r,950));releaseFirst();await new Promise(r=>setTimeout(r,400));
 assert.equal(f.syncs(),2);assert.match(f.projects()[0].state,/\"revision\":\"latest\"/);
});

test('a rejected cloud save keeps the local project visibly pending',async()=>{
 const f=fixture(async()=>false);f.setState({pts:[{x:4,y:5}],closed:true,revision:'offline'});
 assert.equal(await f.c.A_CEIL_CloudFirst.syncNow('test_failure'),false);
 const project=f.projects()[0];assert.equal(project._dirty,true);assert.equal(project._syncStatus,'pending_update');
 assert.match(project.state,/\"revision\":\"offline\"/);
});
