const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const c={console};c.window=c;c['A·CEIL']={};vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/projects/022-aceil-project-mode.js'),'utf8'),c);
const mode=c.A_CEIL_ProjectMode;
const singleState={projectType:'room',closed:true,pts:[{x:0,y:0},{x:1,y:0},{x:1,y:1}],lengths:[1,1,1]};
assert.equal(mode.isMulti({multiRoom:true,projectType:'apartment',rooms:[],state:JSON.stringify({...singleState,multiRoom:true,rooms:[]})}),false);
assert.equal(mode.isMulti({multiRoom:true,projectType:'apartment',rooms:[],state:'{"multiRoom":true,"rooms":[]}'}),true);
assert.equal(mode.isMulti({multiRoom:true,rooms:[{id:'r1',state:JSON.stringify(singleState)}],state:'{}'}),true);
const damaged={multiRoom:true,projectType:'apartment',rooms:[],state:JSON.stringify({...singleState,multiRoom:true,rooms:[]})};
mode.repair(damaged);assert.equal(damaged.multiRoom,undefined);assert.equal(damaged.rooms,undefined);assert.equal(damaged.projectType,'room');
const restored=JSON.parse(damaged.state);assert.equal(restored.multiRoom,undefined);assert.equal(restored.rooms,undefined);assert.equal(restored.closed,true);
// A restored apartment already has its room array in memory. Multiroom
// detection must not reparse a potentially huge project.state on every call.
let expensiveParseCalls=0;
c.JSON={parse:function(input){expensiveParseCalls++;return JSON.parse(input)},stringify:JSON.stringify};
const bigRooms=Array.from({length:80},(_,i)=>({id:'room_'+i,state:JSON.stringify(singleState)}));
for(let i=0;i<20;i++){
  assert.equal(mode.isMulti({rooms:bigRooms,multiRoom:true,state:'{"broken":'}),true);
}
assert.equal(expensiveParseCalls,0,'loaded multiroom checks cannot parse full state');
delete c.JSON;
console.log('PASS project mode distinguishes a standalone drawing from a real multi-room object and repairs stale flags');
