const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert/strict');

const listeners={};
let geometryProbes=0;
const canvas={
  getBoundingClientRect(){geometryProbes++;return {left:0,top:0,width:390,height:844};}
};
const modalButton={};
const document={
  addEventListener(type,fn){listeners[type]=fn;},
  getElementById(id){return id==='cv'?canvas:null;},
  querySelector(){return null;}
};
const window={
  addEventListener(){},
  openSideInputModal(){},
  __aceilShortWallHits:[{x:0,y:0,w:1000,h:1000,i:0,action:'dimensions'}],
  __aceilWLRows:[]
};
const context=vm.createContext({window,document,console,closed:true,pts:[{},{},{}],lengths:[],wallTypes:[],setTimeout,clearTimeout,requestAnimationFrame(){return 1;},cancelAnimationFrame(){},innerWidth:390,innerHeight:844});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','canvas','175-aceil-side-input-stepper.js'),'utf8'),context);

assert.equal(typeof listeners.touchstart,'function','touch listener is installed');
listeners.touchstart({target:modalButton,touches:[{clientX:10,clientY:10}],cancelable:true,preventDefault(){throw new Error('modal tap was captured');},stopImmediatePropagation(){throw new Error('modal tap was captured');}});
assert.equal(geometryProbes,0,'a tap outside the canvas never reaches canvas hit testing');

console.log('PASS canvas hit target guard');
