'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/rooms/060-aceil-light-svg-icons.js'),'utf8');

function fixture(){
  const images=[],timers=[],repaints=[],revoked=[];
  const types=[
    {id:'spot',svgId:'spot_round'},
    {id:'chandelier',svgId:'chandelier'},
    {id:'vent',svgId:'vent_round'}
  ],marks=[];
  class ImageMock{
    constructor(){this.complete=false;images.push(this)}
    set src(value){this._src=value}
    get src(){return this._src}
  }
  const ctx={
    window:{drawLightMarks(){return 'original'}},
    document:{
      getElementById(){return null},
      createElement(type){assert.equal(type,'style');return {id:null,textContent:''}},
      head:{appendChild(){}}
    },
    localStorage:{getItem(){return null},setItem(){}},
    lightTypes:types,lightMarks:marks,
    Blob,Image:ImageMock,
    URL:{createObjectURL(){return 'blob:test-svg'},revokeObjectURL(v){revoked.push(v)}},
    setTimeout(fn,time){timers.push(time);return timers.length},
    requestDraw(){repaints.push('draw')},
    Math,Number,Array,Object,Set,JSON
  };
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return {ctx,images,timers,repaints,marks,types,revoked};
}
test('initial editor load never generates 6 colours per light type',()=>{
  const f=fixture();
  assert.equal(f.images.length,0,'no eager Image() creations');
  assert.equal(f.timers.length,0,'no delayed startup image storm');
  assert.equal(f.ctx.window._getSvgImage instanceof Function,false,'VM function is isolated, but exposed');
  assert.equal(typeof f.ctx.window._getSvgImage,'function');
  f.ctx.window.warmSvgCache();
  assert.equal(f.images.length,0,'empty drawing needs no warming');
});
test('explicit warming uses exactly placed types and real 56px cache keys',()=>{
  const f=fixture();
  f.marks.push({type:'spot'},{type:'spot'},{type:'chandelier'});
  f.ctx.window.warmSvgCache();
  assert.equal(f.images.length,2,'two distinct used icons, never 18 colours');
  assert.equal(f.ctx.window._getSvgImage('spot_round','#ca8a04',48),null);
  assert.equal(f.images.length,3,'48px requests remain independent, as expected');
  assert.equal(f.ctx.window._getSvgImage('spot_round','#ca8a04',56),null);
  assert.equal(f.images.length,3,'56px warmed icon is not duplicated');
  f.images[0].complete=true;f.images[0].onload();
  assert.strictEqual(f.ctx.window._getSvgImage('spot_round','#ca8a04',56),f.images[0]);
  assert.equal(f.repaints.length,1,'image load triggers drawing normally');
  assert.equal(f.revoked.length,1,'temporary blob URL is revoked');
});
test('a newly used icon still loads on demand, even without warming',()=>{
  const f=fixture();
  assert.equal(f.ctx.window._getSvgImage('vent_round','#0891b2',56),null);
  assert.equal(f.images.length,1);
  assert.equal(f.ctx.window._getSvgImage('vent_round','#0891b2',56),null);
  assert.equal(f.images.length,1,'pending request shared');
  f.images[0].complete=true;f.images[0].onload();
  assert.strictEqual(f.ctx.window._getSvgImage('vent_round','#0891b2',56),f.images[0]);
});
