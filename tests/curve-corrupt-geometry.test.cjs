'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/canvas/135-aceil-curve-fixed-ends.js'),'utf8');
const original={
  pts:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}],
  realPts:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}],
  lengths:[400,300,400,300],wallTypes:['arc','straight','straight','straight'],
  arcPoints:[]
};
function clone(value){return JSON.parse(JSON.stringify(value))}
function fixture(){
  const c={window:null,console,Math,Number,JSON,Object,Array,Map,Set,Date,
    setTimeout(){return 0;},document:{getElementById(){return null}},
    pts:clone(original.pts),realPts:clone(original.realPts),
    lengths:clone(original.lengths),wallTypes:clone(original.wallTypes),arcPoints:[],
    _reportMode:false};
  c.window=c;vm.createContext(c);vm.runInContext(source,c);
  return c['A·CEILCurveGeometryV306'];
}
const measured={version:2,startCorner:0,startOffset:80,endOffset:0,points:[{
  arcLen:130,diagCorner:3,diag:Math.hypot(200,250),sideHint:1
}]};
const segmented={version:3,points:[{id:'point-1',chordCm:200,curveCm:203,diagCorner:3,diag:0}],
  endChordCm:200,endCurveCm:203,bulgeSign:1};

test('valid measured curve continues to solve without modifying its saved state',()=>{
  const g=fixture(),state=clone(original),before=JSON.stringify(state);
  const result=g.solveData(0,clone(measured),state);
  assert.equal(result.ok,true);
  assert(Math.abs(result.controls[0].x-200)<.1);
  assert.equal(JSON.stringify(state),before);
});

test('incomplete or corrupt corners fail safely rather than throwing into the report',()=>{
  const g=fixture();
  const bad=[
    [],[{x:0,y:0},{x:400,y:0}], // unfinished drawing
    [{x:0,y:0},null,{x:400,y:300},{x:0,y:300}],
    [{x:0,y:0},{x:'?',y:0},{x:400,y:300},{x:0,y:300}],
    [{x:0,y:0},{x:Infinity,y:0},{x:400,y:300},{x:0,y:300}],
    [null,null,null,null]
  ];
  for(const points of bad){
    const state={...clone(original),pts:points};
    for(const curve of [measured,segmented]){
      let solved;
      assert.doesNotThrow(()=>{solved=g.solveData(0,clone(curve),state)});
      assert.equal(solved.ok,false);
      assert.equal(solved.error,'invalid_geometry');
    }
    assert.equal(g.measureState(state),null,'invalid curve does not generate an imaginary area');
  }
  for(const i of [-1,4,99,1.2]){
    const result=g.solveData(i,clone(measured),clone(original));
    assert.equal(result.ok,false);
    assert.equal(result.error,'invalid_geometry');
  }
});

test('saved curved wall with valid state still reports finite area and perimeter',()=>{
  const g=fixture(),state=clone(original);
  state.arcPoints=[[{model:'measure-points',data:clone(measured)}],null,null,null];
  const result=g.measureState(state);
  assert(result,'valid archived curved wall should be measurable');
  assert(Number.isFinite(result.areaCm2)&&result.areaCm2>0);
  assert(Number.isFinite(result.perimeterCm)&&result.perimeterCm>0);
});
