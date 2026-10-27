"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const context={
  window:{addEventListener(){}},
  document:{readyState:"loading",addEventListener(){},getElementById(){return null},body:{classList:{remove(){}}}},
  localStorage:{getItem(){return null},setItem(){}},
  setTimeout(){return 0},
  setInterval(){return 0},
  console,
  Math
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/canvas/193-aceil-finger-draw.js","utf8"),context);

const api=context.window.ACEILFingerDraw;
assert.ok(api,"finger drawing API must load");

const stroke=api.createStroke({x:0,y:0});
api.advance(stroke,{x:48,y:18});
assert.ok(stroke.dir,"a long enough stroke must establish a direction");
assert.ok(Math.abs(stroke.dir.x-48/Math.hypot(48,18))<1e-9);
assert.ok(Math.abs(stroke.dir.y-18/Math.hypot(48,18))<1e-9);
assert.notEqual(stroke.dir.y,0,"an acute wall must not snap to horizontal");
assert.notEqual(Math.abs(stroke.dir.x),Math.abs(stroke.dir.y),"an arbitrary wall must not snap to 45 degrees");

console.log("Finger drawing arbitrary-angle regression: OK");
