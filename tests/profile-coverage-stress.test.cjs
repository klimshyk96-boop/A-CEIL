'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','js/nomenclature/232-aceil-profile-coverage.js'),'utf8');
const ctx={window:{},Number,Math,Object,Array,isFinite,String};
vm.createContext(ctx);vm.runInContext(source,ctx);
const coverage=ctx.window.A_CEIL_ProfileMarkCoverage;
const rank={noinsert_profile:0,shadow_profile:1,floating_profile:2};
const family=mark=>mark&&mark.family||'';

function assertCoverage(marks,lengths){
  const output=Array.from(coverage(marks,lengths,family));
  for(let side=0;side<lengths.length;side++){
    const intervals=output.filter(m=>m.sideIndex===side).map(m=>({
      start:Number(m.offsetCm),end:Number(m.offsetCm)+Number(m.lenCm),id:m.id
    })).sort((a,b)=>a.start-b.start);
    for(let i=0;i<intervals.length;i++){
      const v=intervals[i];
      assert(Number.isFinite(v.start)&&Number.isFinite(v.end));
      assert(v.start>=0&&v.end<=lengths[side]+1e-7);
      assert(v.end>v.start);
      if(i>0)assert(v.start+1e-6>=intervals[i-1].end,
        'one wall centimetre cannot be billed to two profile marks');
    }
    assert(intervals.reduce((sum,v)=>sum+v.end-v.start,0)<=lengths[side]+1e-6);
  }
  return output;
}
test('overlap priority resolves exactly once, preserves colour/source and input state',()=>{
  const marks=[
    {id:'f',family:'floating_profile',sideIndex:0,offsetCm:0,lenCm:300,color:'black'},
    {id:'s',family:'shadow_profile',sideIndex:0,offsetCm:60,lenCm:180,color:'white'},
    {id:'n',family:'noinsert_profile',sideIndex:0,offsetCm:100,lenCm:50,color:'black'}
  ];
  const copy=JSON.stringify(marks);
  const result=assertCoverage(marks,[300]);
  assert.deepEqual(Array.from(result,m=>[m.id,m.offsetCm,m.lenCm]),
    [['f',0,60],['s',60,40],['n',100,50],['s',150,90],['f',240,60]]);
  assert.equal(JSON.stringify(marks),copy,'resolver never edits saved wall marks');
  assert.equal(result.find(m=>m.id==='n').color,'black');
});
test('later mark wins against an older mark in the same profile family',()=>{
  const result=assertCoverage([
    {id:'old',family:'shadow_profile',sideIndex:0,offsetCm:0,lenCm:120},
    {id:'new',family:'shadow_profile',sideIndex:0,offsetCm:40,lenCm:40}
  ],[200]);
  assert.deepEqual(Array.from(result,m=>[m.id,m.offsetCm,m.lenCm]),
    [['old',0,40],['new',40,40],['old',80,40]]);
});
test('old unpositioned marks stay unpositioned instead of accidentally becoming wall zero',()=>{
  const marks=[{id:'legacy',family:'noinsert_profile',sideIndex:null,offsetCm:0,lenCm:450}];
  const out=Array.from(coverage(marks,[300],family));
  assert.equal(out.length,1);
  assert.equal(out[0].sideIndex,null);
  assert.equal(out[0].lenCm,450);
  assert.equal(JSON.stringify(marks[0]),JSON.stringify(out[0]));
});
test('400 deterministic overlapping profiles conserve wall lengths and never produce negatives',()=>{
  let seed=17219;
  function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  const families=Object.keys(rank),lengths=[300,340,210,400];
  for(let iteration=0;iteration<400;iteration++){
    const marks=Array.from({length:3+Math.floor(random()*35)},(_,i)=>({
      id:'mark-'+i,
      sideIndex:Math.floor(random()*lengths.length),
      offsetCm:Math.round((random()-.1)*480),
      lenCm:Math.round(random()*400)+1,
      family:families[Math.floor(random()*families.length)],
      color:random()<.5?'white':'black'
    }));
    assertCoverage(marks,lengths);
  }
});
