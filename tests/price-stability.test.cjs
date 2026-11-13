'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','js/nomenclature/163-aceil-price-stability.js'),'utf8');

function room(id,amount){return {id,state:JSON.stringify({elemItems:[{qty:1,price:amount}]})};}
function fixture(){
  const projects=[
    {id:'o1',_dbId:'o1',multiRoom:true,rooms:[room('r-A',200),room('r-B',900)]},
    {id:'o2',_dbId:'o2',multiRoom:true,rooms:[room('r-C',330),room('r-D',770)]}
  ];
  const events={},fields={rpcTotal:{textContent:''},rpcTotalPill:{querySelector(){return fields.pillText;}},
    pillText:{textContent:''}};
  const c={console,Date,Math,Number,JSON,Array,Promise,
    setTimeout(){return 1},
    document:{visibilityState:'hidden',getElementById(id){return fields[id]||null},
      addEventListener(type,fn){events['doc:'+type]=fn}},
    addEventListener(type,fn){events[type]=fn},
    elemItems:[{qty:4,price:100}],
    _activeObjectId:'o1',_activeRoomIdx:0,_activeRoomId:'r-A'
  };
  c.window=c;
  c['A·CEIL']={ProjectRepository:{list(){return projects;}}};
  vm.createContext(c);vm.runInContext(source,c);
  return {c,projects,fields,events,total(){return c.A_CEIL_GetStableProjectTotal()}};
}

test('live amount contributes only to the room whose stable ID matches the open object',()=>{
  const f=fixture();
  assert.equal(f.total(),1300,'400 live + 900 from other saved room');
  f.c._activeRoomId='r-B';f.c._activeRoomIdx=0;
  assert.equal(f.total(),600,'stable room identity overrides stale index: 200 + 400');
  f.c._activeRoomId=null;
  assert.equal(f.total(),1100,'no room identity means saved-only estimate');
});

test('switching objects cannot mix another object canvas into the displayed total',()=>{
  const f=fixture();
  const original=JSON.stringify(f.projects);
  f.c._activeObjectId='o2';f.c._activeRoomIdx=0;
  // Old r-A ID still points to a room of object o1.
  assert.equal(f.total(),1100,'new object total must use only its saved room states');
  f.c._activeRoomId='r-D';
  assert.equal(f.total(),730,'330 saved + 400 live for r-D');
  assert.equal(JSON.stringify(f.projects),original,'display function never writes back prices');
});

test('cloud refresh and foreground wake update total chip without repricing rooms',()=>{
  const f=fixture();
  assert.equal(typeof f.events['aceil:sync-status-change'],'function');
  assert.equal(typeof f.events['doc:visibilitychange'],'function');
  f.events['aceil:sync-status-change']();
  assert.match(f.fields.rpcTotal.textContent,/1.?300/);
  assert.equal(f.fields.pillText.textContent,f.fields.rpcTotal.textContent);
  f.c._activeRoomId='invalid-room';
  f.c.document.visibilityState='visible';
  f.events['doc:visibilitychange']();
  assert.match(f.fields.rpcTotal.textContent,/1.?100/);
});
