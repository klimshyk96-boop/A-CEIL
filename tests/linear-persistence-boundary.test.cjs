const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const noop=()=>{};
const context={
  console,
  setTimeout:noop,
  clearTimeout:noop,
  requestAnimationFrame:noop,
  window:null,
  linearElements:[],
  wallMarks:[],
  wallTypes:[],
  arcPoints:[],
  lightTypes:[],
  localStorage:{getItem:()=>null,setItem:noop},
  document:{
    readyState:'complete',
    addEventListener:noop,
    getElementById:()=>null,
    querySelector:()=>null,
    createElement:()=>({style:{},setAttribute:noop,appendChild:noop,addEventListener:noop})
  },
  ACEILCanvas:{afterDraw:noop,width:()=>700,height:()=>700},
  MutationObserver:function(){this.observe=noop},
  'A·CEIL':{}
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/rooms/110-aceil-linear-element.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'js/canvas/173-aceil-wall-elements-persistence.js'),'utf8'),context);

const saved=[
  {id:'light',elementType:'lightLine',segments:[180]},
  {id:'track',elementType:'magneticTrack',segments:[240]}
];
context.linearElements=[];
context['A·CEIL'].WallElementPersistence.restoreCanvasState({state:{linearElements:saved}});

const persistence=context['A·CEIL'].LinearPersistence;
assert.ok(persistence,'linear editor must publish its persistence boundary');
assert.deepEqual(JSON.parse(JSON.stringify(persistence.snapshot())),saved);
assert.equal(context.linearElements,persistence.list(),
  'lexical editor state and window state must share the restored list');
context.linearElements.push({id:'free',elementType:'lightLine',segments:[90]});
assert.equal(persistence.list().length,3,
  'a free-light edit must not replace the list restored by the project loader');
saved[0].segments[0]=999;
assert.equal(persistence.list()[0].segments[0],180,'restored project state must be cloned');

console.log('PASS all linear editors share one cloned restore boundary');
