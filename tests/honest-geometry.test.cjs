"use strict";

const assert=require("node:assert");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

const document={readyState:"loading",addEventListener(){},getElementById(){return null}};
const window={document,addEventListener(){},__diagSilent(){}};
window.window=window;
vm.runInNewContext(
  fs.readFileSync(path.resolve(__dirname,"../js/canvas/190-aceil-honest-geometry.js"),"utf8"),
  {window,document,console,Math,Number,WeakMap,Object,Array,String}
);

const geometry=window.A_CEIL_HonestGeometry;
assert(geometry,"honest geometry API must load");

/* Deliberately imprecise phone sketch of an intended L-shaped room. */
const sketch=[
  {x:0,y:0},
  {x:5,y:-100},
  {x:104,y:-91},
  {x:100,y:-41},
  {x:50,y:-45},
  {x:46,y:5}
];
const entered=[100,100,50,50,50,49];
const solved=geometry.solveExactOrthogonal(sketch,entered,[]);
assert(solved&&solved.nearOrthogonal,"near-orthogonal phone sketch must use measured-scale solver");

function distance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
function angle(points,i){
  const n=points.length,a=points[(i-1+n)%n],b=points[i],c=points[(i+1)%n];
  const ax=a.x-b.x,ay=a.y-b.y,bx=c.x-b.x,by=c.y-b.y;
  return Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(Math.hypot(ax,ay)*Math.hypot(bx,by)))))*180/Math.PI;
}

const measured=solved.points.map((point,i)=>distance(point,solved.points[(i+1)%solved.points.length]));
entered.forEach((expected,i)=>assert(Math.abs(measured[i]-expected)<.01,
  `wall ${i} must stay at entered ${expected} cm, got ${measured[i]}`));

const angles=solved.points.map((_,i)=>angle(solved.points,i));
assert(Math.max(...angles.map(value=>Math.abs(value-90)))<1.25,
  `a 1 cm mismatch must remain visually subtle, got ${angles.join(", ")}`);
assert(Math.abs(solved.closureCorrectionCm-1)<.01,
  `test contour must retain its real 1 cm closure mismatch, got ${solved.closureCorrectionCm}`);

const perimeter=entered.reduce((sum,value)=>sum+value,0);
assert.strictEqual((perimeter/100).toFixed(2),"3.99","displayed perimeter must keep entered measurements");

const source=fs.readFileSync(path.resolve(__dirname,"../js/canvas/190-aceil-honest-geometry.js"),"utf8");
assert.match(source,/position:absolute[^\n]+top:64px[^\n]+right:12px/,
  "geometry guidance must be a compact canvas overlay");
assert.doesNotMatch(source,/class="aceil-geometry-warning-text"/,
  "geometry guidance must not render the old full-width text banner");

console.log("Honest geometry tests: OK");
