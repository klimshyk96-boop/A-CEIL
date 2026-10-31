const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/projects/228-aceil-cloud-project-trash.js'),'utf8');
function fixture(){
 const calls=[],events=[];let loads=0;
 const replies={aceil_list_project_trash:[{project_id:'p1',project:{id:'p1',name:'Deleted'},deleted_at:'2026-10-31T10:00:00Z',expires_at:'2026-11-30T10:00:00Z'}],aceil_restore_project:'p1',aceil_purge_project_trash:true};
 const c={console,Date,JSON,CustomEvent:function(name,init){this.type=name;this.detail=init.detail},document:{},_sbUser:{id:'u1'},_sb:{rpc(name,args){calls.push({name,args:args||{}});return Promise.resolve({data:replies[name],error:null})}},async loadProjectsFromCloud(){loads++},dispatchEvent(event){events.push(event)},__diagSilent(){}};c.window=c;vm.createContext(c);vm.runInContext(source,c);return{c,calls,events,loads:()=>loads};
}
test('lists, restores and permanently purges cloud trash',async()=>{
 const f=fixture(),rows=await f.c.A_CEIL_CloudProjectTrash.list();assert.equal(rows.length,1);assert.equal(rows[0].project._dbId,'p1');assert.equal(rows[0].cloud,true);
 assert.equal(JSON.stringify(await f.c.A_CEIL_CloudProjectTrash.restore('p1')),JSON.stringify({ok:true,id:'p1'}));assert.equal(f.loads(),1);assert.equal(f.events[0].detail.source,'cloud-trash');
 assert.equal(JSON.stringify(await f.c.A_CEIL_CloudProjectTrash.purge('p1')),JSON.stringify({ok:true}));
 assert.deepEqual(f.calls.map(x=>x.name),['aceil_list_project_trash','aceil_restore_project','aceil_purge_project_trash']);
});
test('missing migration is reported as a feature availability error',async()=>{
 const f=fixture();f.c._sb.rpc=()=>Promise.resolve({data:null,error:{message:'Could not find the function public.aceil_list_project_trash in the schema cache'}});
 await assert.rejects(()=>f.c.A_CEIL_CloudProjectTrash.list(),error=>error.aceilTrashUnavailable===true);
});
