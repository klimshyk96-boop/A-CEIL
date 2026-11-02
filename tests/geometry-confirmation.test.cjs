const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function context(){
  const document={readyState:'loading',addEventListener(){},getElementById(){return null},querySelectorAll(){return[]}};
  const window={document,__diagSilent(){}};
  window.window=window;
  return vm.createContext({window,document,console,setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},Date,JSON,Math,Number,String,Array,Object,Promise});
}
function run(file,ctx){vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});}

const ctx=context();
run('js/canvas/127-aceil-measure-confidence.js',ctx);
const confidence=ctx.window['A·CEILMeasureConfidence'];
const state={pts:[{x:0,y:0},{x:239,y:0},{x:241,y:321},{x:0,y:316}],realPts:[{x:0,y:0},{x:239,y:0},{x:241,y:321},{x:0,y:316}],lengths:[239,321,241,316],closed:true,diagonals:[],diagonalOverrides:{}};
const confirmation={verified:true,signature:confidence.signatureForState(state),verifiedAt:'2026-11-02T11:13:00.000Z',reason:'intentional_irregular_geometry'};

assert.equal(confidence.isStateConfirmed({...state,geometryConfirmation:confirmation}),true,'explicit confirmation must validate the exact geometry');
assert.equal(confidence.isStateConfirmed({...state,diagonalOverrides:{__geometryConfirmation:confirmation}}),true,'confirmation stored with diagonal data must survive legacy serializers');
assert.equal(confidence.isStateConfirmed({...state,lengths:[239,321,242,316],geometryConfirmation:confirmation}),false,'changing a wall must invalidate confirmation');

ctx.window._analyzeRoomState=()=>({verdict:{type:'conflict'}});
run('js/reports/223-aceil-installer-share.js',ctx);
const share=ctx.window.A_CEIL_InstallerShare;
assert.equal(share.measurementProblem({rooms:[{name:'Крива кімната',state:JSON.stringify({...state,geometryConfirmation:confirmation})}]}),'','confirmed curvature must not block installer share');
assert.match(share.measurementProblem({rooms:[{name:'Крива кімната',state:JSON.stringify(state)}]}),/непідтверджена/i,'unconfirmed conflict must still be blocked');

console.log('geometry confirmation tests: ok');
