'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'js/core/019-aceil-core-ui-rooms-bulk-walls.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'js/canvas/renderer.js'),'utf8');
const sandbox={
  Math,Number,Array,String,JSON,isFinite,console,
  N(i){return String.fromCharCode(65+i)},
  NL(i){return String.fromCharCode(65+i)},
  _diagName(a,b){return String.fromCharCode(65+Math.min(a,b))+String.fromCharCode(65+Math.max(a,b))},
  _isValidInnerDiagForData(){return true},
  window:{_formatReportCm(v){return String(Math.round(v))},'A·CEILCurveGeometryV306':null}
};
const start=core.indexOf('function _reportDiagOverrideValue('),end=core.indexOf('function touchDistance(',start);
assert(start>0&&end>start,'report diagonal functions must be present');
vm.createContext(sandbox);vm.runInContext(core.slice(start,end),sandbox);
const pairs=(s,mode)=>Array.from(sandbox._getReportDiagPairs(s,mode));
const lines=(s,mode)=>Array.from(sandbox._getReportDiagLines(s,mode));
const corners=[
 {x:0,y:500},{x:0,y:0},{x:500,y:0},{x:500,y:200},
 {x:250,y:200},{x:250,y:400},{x:500,y:400},{x:500,y:500}
];
const selected=[[4,1],[1,5],[0,4],[0,5],[0,6],[5,7]];
const state={pts:corners,realPts:corners,lengths:[500,500,200,250,200,250,100,500],
  diagonals:selected,diagonalOverrides:{BE:320}};
test('editor-selected 6 diagonals appear in the WYSIWYG report, not only the confirmed one',()=>{
  const shown=pairs(state,'visible');
  assert.equal(shown.length,6);
  assert.deepEqual(shown.map(x=>[x.a,x.b]),selected.map(x=>[Math.min(...x),Math.max(...x)]));
  assert.equal(pairs(state,'manual').length,1);
  assert.equal(pairs(state,'manual')[0].value,320);
  assert.equal(lines(state,'visible').length,6);
  assert.equal(lines(state,'manual').length,1);
  assert(lines(state,'visible').some(x=>x.startsWith('EB — 320 см')),'confirmed pair uses measured length');
  assert(lines(state,'visible').some(x=>x.startsWith('BF — ≈ ')),'unconfirmed calculated length must be visibly approximate');
});
test('selection is never confused with mathematically possible diagonals',()=>{
  assert(pairs(state,'all').length>6);
  assert.equal(pairs({...state,diagonals:[]},'visible').length,0);
  assert.deepEqual(state.diagonals,selected,'report generation does not write back into original drawing');
});
test('selection used by the report plan is exactly the editor selection',()=>{
  const n=sandbox;
  n.window.reportSettings={diagonals:true,diagMode:'visible'};
  n.window._loadRS=function(){return n.window.reportSettings};
  n.pts=state.pts;n.realPts=state.realPts;n.lengths=state.lengths;
  n.diagonals=state.diagonals;n.diagonalOverrides=state.diagonalOverrides;
  n._reportMode=true;
  const begin=core.indexOf('function _diagonalsForCurrentDraw()'),end=core.indexOf('window._formatReportCm=window._formatReportCm||',begin);
  assert(begin>0&&end>begin);
  vm.runInContext(core.slice(begin,end),n);
  const selected=()=>Array.from(n._diagonalsForCurrentDraw(),x=>Array.from(x));
  assert.deepEqual(selected(),state.diagonals);
  n.window.reportSettings.diagMode='manual';
  assert.deepEqual(selected(),[[4,1]],'only one confirmed field measurement, with editor order preserved');
  n.window.reportSettings.diagMode='all';
  assert.equal(selected().length,0,'legacy all-possible mode keeps plan uncluttered');
  n.window.reportSettings.diagMode='visible';
  n.window.reportSettings.diagonals=false;
  assert.equal(selected().length,0,'none remains none in every rendering path');
});
test('report renderer draws all six visible pairs and still respects none/manual modes',()=>{
  assert.match(core,/if\(\(rs\.diagMode\|\|"manual"\)==="visible"\)/);
  assert.match(renderer,/diagMode\|\|"manual"\)!=="visible"/);
  assert.match(core,/if\(rs\.diagonals!==true\) return \[\]/);
  assert.match(renderer,/label=`\$\{NL\(d\[0\]\)\}\$\{NL\(d\[1\]\)\}/);
});
test('active report snapshots are read after local save, never after a cloud race',()=>{
  const src=fs.readFileSync(path.join(root,'js/reports/104-aceil-multiroom-report-sandbox-fix.js'),'utf8');
  const first=src.indexOf('await window.saveCurrentRoom({silent:true,skipCloud:true})');
  const second=src.indexOf('var obj=findReportObject(pendingId)');
  assert(first>=0&&second>first,'saved room must be refreshed before report generation');
});
