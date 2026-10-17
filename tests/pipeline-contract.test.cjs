const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(read("js/core/007-aceil-pipeline-v1.js"), context);

const pipeline = context.window["A·CEIL"].pipeline;
assert.ok(Object.isFrozen(pipeline), "pipeline factory must be frozen");

const calls = [];
context.window.demoBase = function (value) {
  calls.push("base:" + value);
  return value + 1;
};
const demo = pipeline.define("demoBase", {
  order: ["inner", "outer"],
  base: context.window.demoBase
});
assert.equal(demo.stage("inner", {
  after(result) { calls.push("inner-after:" + result); }
}), true);
assert.equal(demo.stage("outer", {
  around(next) {
    calls.push("outer-before");
    const result = next();
    calls.push("outer-after:" + result);
    return result;
  }
}), true);
assert.equal(demo.stage("inner", {}), false, "duplicate stage must be ignored");
assert.throws(() => demo.stage("unknown", {}), /unknown stage/);
assert.equal(context.window.demoBase(4), 5);
assert.deepEqual(calls, ["outer-before", "base:4", "inner-after:5", "outer-after:5"]);

const index = read("index.html");
const runtime = JSON.parse(read("scripts/runtime-order.json"));
const factoryPos = runtime.indexOf("js/core/007-aceil-pipeline-v1.js");
assert.ok(factoryPos >= 0, "factory must be present in runtime order");
for (const owner of [
  "js/nomenclature/040-aceil-rpc-cockpit-update.js",
  "js/nomenclature/105-aceil-autofill-pipeline-v1.js"
]) {
  assert.ok(factoryPos < runtime.indexOf(owner), "factory must load before " + owner);
}
assert.ok(index.includes("js/core/007-aceil-pipeline-v1.js"), "factory must be loaded by index");

const rpcOrder = ["projectMeta", "lightCount", "cockpitTools", "headerTotal", "syncDot", "metricIcons", "cornerHeader"];
const rpcOwner = read("js/nomenclature/040-aceil-rpc-cockpit-update.js");
assert.ok(rpcOwner.includes('order:' + JSON.stringify(rpcOrder)), "rpcUpdate stage order changed");
assert.equal((rpcOwner.match(/pipeline\.define\("rpcUpdate"/g) || []).length, 1, "rpcUpdate must have one owner");

const rpcStages = {
  projectMeta: "js/reports/041-aceil-current-project-meta.js",
  lightCount: "js/nomenclature/042-aceil-rpc-light-count-lines.js",
  cockpitTools: "js/reports/044-aceil-cockpit-tools-wall-modal-normalize.js",
  headerTotal: "js/reports/061-aceil-wall-marks-bridge-room-load.js",
  syncDot: "js/nomenclature/062-aceil-nomenclature-cloud-merge.js",
  metricIcons: "js/reports/065-aceil-cockpit-metric-icons.js",
  cornerHeader: "js/nomenclature/167-aceil-color-picker-v3.js"
};
for (const [stage, file] of Object.entries(rpcStages)) {
  assert.ok(read(file).includes('stage("' + stage + '"'), file + " must register " + stage);
}
assert.ok(!read(rpcStages.cockpitTools).includes("_prevOpenWallModalForInit"), "must not restore the extra wall-modal wrapper");

const autofillOrder = ["linear", "universal", "colorFix", "cornices", "insertChoice", "filmFix"];
assert.ok(
  read("js/nomenclature/105-aceil-autofill-pipeline-v1.js").includes("order:" + JSON.stringify(autofillOrder)),
  "autofill order changed"
);

console.log("pipeline contract: OK");
