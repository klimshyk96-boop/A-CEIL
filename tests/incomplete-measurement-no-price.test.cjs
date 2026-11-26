'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const gsrc=src('js/core/098-aceil-geometry-core.js');
const hsrc=src('js/canvas/190-aceil-honest-geometry.js');
const nsrc=src('js/nomenclature/025-aceil-state-persistence-nomenclature.js');
const csrc=src('js/canvas/135-aceil-curve-fixed-ends.js');
const variants=src('js/reports/184-aceil-estimate-variants-ui.js');

const screenshot=[452,202,242,8,302,355,383,158,19.5,30,289,20,96.5,20,62,187,0,0];
const points=Array.from({length:screenshot.length},(_,i)=>({x:i*40,y:i%2?80:0}));
function geometry(){
  const ctx={window:{},Math,Number,Object,Array};
  vm.createContext(ctx);vm.runInContext(gsrc,ctx);
  return ctx.window['A·CEILGeometry'];
}
const G=geometry();

test('iPhone example: 18 sides, QR and RA missing -> no measured area',()=>{
  assert.equal(screenshot.length,18);
  assert.equal(screenshot.reduce((s,x)=>s+x,0),2826,'entered perimeter is only 28.26 m');
  const d=G.dimensionsStatus({closed:true,pts:points,lengths:screenshot});
  assert.equal(d.ok,false);assert.deepEqual(Array.from(d.missing),[16,17]);
  assert.equal(d.reason,'missing_dimensions');
});
test('measurements count and zero guards, including circle exception',()=>{
  const r=[{x:0,y:0},{x:500,y:0},{x:500,y:400},{x:0,y:400}];
  assert.equal(G.dimensionsStatus({closed:true,pts:r,lengths:[500,400,500,400]}).ok,true);
  assert.equal(G.dimensionsStatus({closed:true,pts:r,lengths:[500,400,500,0]}).ok,false);
  assert.equal(G.dimensionsStatus({closed:false,pts:r,lengths:[500,400,500,400]}).ok,false);
  assert.equal(G.dimensionsStatus({closed:true,pts:r,lengths:[500,400]}).ok,false);
  assert.equal(G.dimensionsStatus({circleMode:true,circleDiamCm:400}).ok,true);
  assert.equal(G.dimensionsStatus({circleMode:true,circleDiamCm:0}).ok,false);
});
function priceArea(lengths,poly=points,shown='58.01'){
  const a=nsrc.indexOf('function getProjectAreaMeters(){');
  const b=nsrc.indexOf('function isFilmItem(',a);
  assert(a>0&&b>a);
  const ctx={window:{'A·CEILGeometry':G},document:{getElementById(){return{textContent:shown}}},
    pts:poly,lengths,realPts:poly,closed:true,circleMode:false,circleDiamCm:0,
    Math,Number,isNaN,parseFloat};
  vm.createContext(ctx);vm.runInContext(nsrc.slice(a,b),ctx);
  return ctx.getProjectAreaMeters();
}
test('stale 58.01 m² DOM value never produces film pricing for incomplete sides',()=>{
  assert.equal(priceArea(screenshot),0);
  const rect=[{x:0,y:0},{x:500,y:0},{x:500,y:400},{x:0,y:400}];
  assert.equal(priceArea([500,400,500,400],rect,'20.00'),20);
});
test('honest rebuild clears stale area, keeps all measurements editable, and triggers recount',()=>{
  const area={textContent:'58.01'},calls=[];
  const ctx={Math,Number,WeakMap,Array,Object,console,
    closed:true,circleMode:false,pts:points.map(p=>({...p})),
    lengths:screenshot.slice(),realPts:points.map(p=>({...p})),
    document:{
      readyState:'loading',
      addEventListener(){},
      getElementById(id){return id==='area'?area:null}
    },
    window:{'A·CEILGeometry':G},
    updateDiagList(){},updateCornerCount(){},updateChecks(){},draw(){},
    autoFillNomenclature(){calls.push('autofill')},
    recalcElemTotal(){calls.push('total')}
  };
  vm.createContext(ctx);vm.runInContext(hsrc,ctx);
  const r=ctx.window.A_CEIL_HonestGeometry.rebuild();
  assert.equal(area.textContent,'—');
  assert.equal(r.pendingMeasurements,true);
  assert.deepEqual(Array.from(r.missingSides),['QR','RA']);
  assert.equal(ctx.realPts.length,0);
  assert.deepEqual(Array.from(ctx.lengths),screenshot);
  assert.deepEqual(calls,['autofill','total']);
});
test('re-opening stale room data must not reuse old room.area for a new estimate',()=>{
  const start=variants.indexOf('function roomAreaM2(room){');
  const end=variants.indexOf('function filmWidthCandidates(',start);
  assert(start>0&&end>start);
  const ctx={Math,Number,window:{'A·CEILGeometry':G},
    parseMaybeJSON(v){return typeof v==='string'?JSON.parse(v):v||{}},
    num:v=>Number(v)||0};
  vm.createContext(ctx);vm.runInContext(variants.slice(start,end),ctx);
  assert.equal(ctx.roomAreaM2({area:58.01,state:JSON.stringify({
    closed:true,pts:points,lengths:screenshot,realPts:points
  })}),0);
  const rect=[{x:0,y:0},{x:500,y:0},{x:500,y:400},{x:0,y:400}];
  assert.equal(ctx.roomAreaM2({area:20,state:{
    closed:true,pts:rect,lengths:[500,400,500,400],realPts:rect}}),20);
});
test('other geometry modules cannot resurrect incomplete area',()=>{
  assert.match(csrc,/!geometry\.dimensionsStatus\(\{closed:closed,pts:pts,lengths:lengths\}\)\.ok/);
  assert.match(variants,/protectUnmeasuredFilm\(items,warnings\)/);
  assert.match(variants,/!it\.manualQtyOverride===true|it\.manualQtyOverride===true/);
});
