'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../js/canvas/wall-elements-parallel.js'),'utf8');
// Concave inverted U: its average vertex (50,55) is OUTSIDE the room,
// below internal horizontal edge E->F at y=20. Using the average vertex
// to choose the wall offset would put an inside 10 cm cornice at y=30.
const concave=[
  {x:0,y:0},{x:100,y:0},{x:100,y:100},{x:80,y:100},
  {x:80,y:20},{x:20,y:20},{x:20,y:100},{x:0,y:100}
];
function scene(points,marks,dimensions){
  const strokes=[],texts=[];
  let strokePoints=[];
  const context={
    canvas:null,
    save(){},restore(){},setLineDash(){},
    beginPath(){strokePoints=[]},moveTo(x,y){strokePoints.push({x,y})},
    lineTo(x,y){strokePoints.push({x,y})},
    stroke(){if(strokePoints.length>1)strokes.push(strokePoints.slice())},
    fill(){},rect(){},roundRect(){},measureText(txt){return {width:txt.length*6}},
    translate(){},rotate(){},fillText(t){texts.push(String(t))}
  };
  const sandbox={window:{},pts:points,wallMarks:marks,
    lengths:dimensions||points.map((p,i)=>Math.hypot(points[(i+1)%points.length].x-p.x,points[(i+1)%points.length].y-p.y)),
    Math,Number,Array,Object,console};
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  sandbox.window.drawWallMarks(context);
  return {strokes,texts,hit:(x,y)=>sandbox.window.findWallMarkHit(x,y)};
}
function lineAt(scene,axis,expected){
  assert.equal(scene.strokes.length,1,'single cornice must draw one stroke');
  for(const point of scene.strokes[0]){
    assert.ok(Math.abs(point[axis]-expected)<1e-9,
      'expected '+axis+'='+expected+', got '+point[axis]);
  }
}
test('concave internal wall offsets 10 cm into ceiling, not into open notch',()=>{
  const mark={id:'hi',sideIndex:4,type:'Карниз прихований',lenCm:60,
    offsetCm:0,wallDistanceCm:10,color:'#16a34a'};
  const s=scene(concave,[mark]);
  lineAt(s,'y',10); // actual wall E-F is y=20; outside is y=30
  assert.equal(s.hit(50,10),0,'tap editing uses the exact shifted segment');
  assert.equal(s.hit(50,35),0,'tolerant touch hit is still available');
});
test('reverse vertex order gives identical inward offset',()=>{
  const reversed=concave.slice().reverse(),mark={
    id:'hi',sideIndex:2,type:'Карниз прихований',lenCm:60,
    offsetCm:0,wallDistanceCm:10,color:'#16a34a'};
  lineAt(scene(reversed,[mark]),'y',10);
});
test('other walls on both winding directions still move 10 cm inside',()=>{
  const leftOrRight={id:'right',sideIndex:1,type:'Карниз прихований',lenCm:100,
    offsetCm:0,wallDistanceCm:10,color:'#16a34a'};
  lineAt(scene(concave,[leftOrRight]),'x',90);
  const reversed=concave.slice().reverse(),reverseRight={
    ...leftOrRight,sideIndex:5};
  lineAt(scene(reversed,[reverseRight]),'x',90);
});
test('zero offset stays exactly on the wall and non-cornice styles follow same direction',()=>{
  lineAt(scene(concave,[{sideIndex:4,type:'Карниз прихований',
    lenCm:60,wallDistanceCm:0}]),'y',20);
  lineAt(scene(concave,[{sideIndex:4,type:'Тіньовий профіль',
    lenCm:60,wallDistanceCm:10}]),'y',10);
});
test('labels and report drawing share the corrected inward geometry',()=>{
  const mark={sideIndex:4,type:'Карниз прихований',lenCm:60,
    wallDistanceCm:10,color:'#16a34a'};
  const s=scene(concave,[mark]);
  lineAt(s,'y',10);
  assert.ok(s.texts.some(t=>t.includes('Карниз прихований')));
  assert.match(source,/var sx=-g\.nx\*dist,sy=-g\.ny\*dist/,
    'report and canvas still use same displayedGeometry');
});
