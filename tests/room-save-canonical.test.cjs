const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function fixture(){
 let records=[{id:'obj',rooms:[{id:'r1',name:'One',state:'{}'},{id:'r2',name:'Two',state:'{"untouched":true}'}]}],writes=0,fail=false;
 const cache=new Map(),c={console,document:{getElementById:()=>null},setTimeout:()=>{},_activeObjectId:'obj',_activeRoomIdx:0,_activeRoomId:'r1',
  pts:[{x:0,y:0},{x:500,y:0},{x:500,y:300}],realPts:[{x:0,y:0},{x:500,y:0},{x:500,y:300}],lengths:[500,300,580],closed:true,
  elemItems:[{id:'spot',price:300,qty:2,manualQtyOverride:true}],elemGroups:[{id:'lighting',name:'Lighting'}],
  wallMarks:[{id:'cornice',type:'cornice'}],linearElements:[{id:'track'}],wallTypes:[{id:'shadow'}],arcPoints:[{id:'arc'}],ceilingCornices:[{id:'ceiling'}],
  localStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)},
  'A·CEIL':{ProjectRepository:{list:()=>structuredClone(records),replaceAll:next=>{writes++;if(fail)return false;records=structuredClone(next);return true}},ProjectPersistence:{saveProjects:()=>{throw Error('unexpected redundant persistence')}}}};
 c.window=c;vm.createContext(c);vm.runInContext(read('js/rooms/multiroom-lifecycle.js'),c);
 const canonical=c.saveCurrentRoom;vm.runInContext(read('js/canvas/173-aceil-wall-elements-persistence.js'),c);
 return {c,canonical,cache,records:()=>records,writes:()=>writes,fail:()=>fail=true};
}
(async()=>{
 {
  const f=fixture();assert.equal(f.c.saveCurrentRoom,f.canonical,'wall module must not wrap room save');
  assert.equal(await f.c.saveCurrentRoom({silent:true,skipCloud:true}),true);assert.equal(f.writes(),1);
  const p=f.records()[0],r=p.rooms[0],s=JSON.parse(r.state);
  assert.deepEqual(r.elemItems,s.elemItems);assert.deepEqual(r.elemGroups,s.elemGroups);assert.deepEqual(r.wallMarks,s.wallMarks);
  for(const key of ['linearElements','wallTypes','arcPoints','ceilingCornices'])assert.deepEqual(s[key],structuredClone(f.c[key]));
  assert.equal(r.elemItems[0].qty,2);assert.equal(r.elemItems[0].manualQtyOverride,true);
  assert.equal(p.rooms[1].state,'{"untouched":true}');
  const backup=JSON.parse(f.cache.get('aceil_wall_elements_backup_v2'));assert.equal(backup.rooms['obj:0'].data.wallMarks[0].id,'cornice');
  f.c.elemItems[0].qty=8;f.c.wallMarks[0].id='changed';assert.equal(r.elemItems[0].qty,2);assert.equal(r.wallMarks[0].id,'cornice');
  console.log('PASS one room commit captures all independent mirrors and preserves the wall backup and other room');
 }
 {
  const f=fixture();f.c['A·CEIL'].WallElementPersistence={backupRoom(){throw Error('quota')}};
  assert.equal(await f.c.saveCurrentRoom({silent:true,skipCloud:true}),true);assert.equal(f.writes(),1);
  console.log('PASS optional backup failure cannot invalidate the committed room');
 }
 {
  const f=fixture();f.fail();assert.equal(await f.c.saveCurrentRoom({silent:true,skipCloud:true}),false);
  assert.equal(f.records()[0].rooms[0].state,'{}');assert.equal(f.cache.size,0);
  console.log('PASS failed local commit cannot report success or write a misleading new backup');
 }
 {
  const f=fixture();f.c.__A·CEILReportRendering=true;assert.equal(await f.c.saveCurrentRoom({silent:true}),false);assert.equal(f.writes(),0);
  assert.equal(f.records()[0].rooms[0].elemItems,undefined);
  f.c.__A·CEILReportRendering=false;f.c._activeRoomId='missing';assert.equal(await f.c.saveCurrentRoom({silent:true}),false);assert.equal(f.writes(),0);
  console.log('PASS report rendering and invalid room identity perform no partial writes');
 }
 const old=read('js/nomenclature/119-aceil-room-nomenclature-isolation-fix.js'),walls=read('js/canvas/173-aceil-wall-elements-persistence.js');
 assert.doesNotMatch(old+walls,/window\.saveCurrentRoom\s*=/);
})().catch(error=>{console.error(error);process.exit(1)});
