const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/projects/227-aceil-cloud-first-autosave.js'),'utf8');

function fixture(){
 let projects=[{id:'p1',_dbId:'p1',name:'Test',state:'{}'}],syncs=0,state={pts:[{x:1,y:2}],closed:true};
 const listeners={};
 const c={console,setTimeout,clearTimeout,Date,Math,JSON,navigator:{onLine:true},CustomEvent:function(type,init){this.type=type;this.detail=init.detail},
  document:{readyState:'complete',visibilityState:'visible',getElementById:id=>({area:'12.00',per:'14.00',inCorners:'4',outCorners:'0'}[id]?{textContent:{area:'12.00',per:'14.00',inCorners:'4',outCorners:'0'}[id]}:null),addEventListener:(n,f)=>listeners[n]=f},
  localStorage:{getItem:key=>key==='ceiling_v18'?JSON.stringify(state):null},
  addEventListener:(n,f)=>listeners[n]=f,dispatchEvent(){},
  saveState(){return 'saved'},_currentProjectId:'p1',_activeObjectId:null,
  'A·CEIL':{ProjectRepository:{list:()=>structuredClone(projects),replaceAll:next=>projects=structuredClone(next)},ProjectPersistence:{syncProject:async p=>{syncs++;projects[0]=Object.assign({},projects[0],p,{_dirty:false,_localUpdatedAt:null,_syncStatus:''});return true}}}
 };
 c.window=c;vm.createContext(c);vm.runInContext(source,c);return{c,projects:()=>projects,syncs:()=>syncs};
}

test('canvas changes update the active cloud project after debounce',async()=>{
 const f=fixture();f.c.saveState();await new Promise(r=>setTimeout(r,1050));
 assert.equal(f.syncs(),1);assert.match(f.projects()[0].state,/\"closed\":true/);assert.equal(f.projects()[0].area,'12.00');
});

test('changes without an active saved project are not uploaded',async()=>{
 const f=fixture();f.c._currentProjectId=null;f.c.saveState();await new Promise(r=>setTimeout(r,1000));assert.equal(f.syncs(),0);
});
