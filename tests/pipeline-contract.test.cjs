const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(read("js/core/007-aceil-pipeline.js"), context);

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
const factoryPos = runtime.indexOf("js/core/007-aceil-pipeline.js");
assert.ok(factoryPos >= 0, "factory must be present in runtime order");
for (const owner of [
  "js/rooms/040-aceil-rpc-cockpit-update.js",
  "js/nomenclature/105-aceil-autofill-pipeline.js"
]) {
  assert.ok(factoryPos < runtime.indexOf(owner), "factory must load before " + owner);
}
assert.ok(index.includes("js/core/007-aceil-pipeline.js"), "factory must be loaded by index");

const rpcOrder = ["projectMeta", "lightCount", "cockpitTools", "headerTotal", "syncDot", "metricIcons", "cornerHeader"];
const rpcOwner = read("js/rooms/040-aceil-rpc-cockpit-update.js");
assert.ok(rpcOwner.includes('order:' + JSON.stringify(rpcOrder)), "rpcUpdate stage order changed");
assert.equal((rpcOwner.match(/pipeline\.define\("rpcUpdate"/g) || []).length, 1, "rpcUpdate must have one owner");

const rpcStages = {
  projectMeta: "js/projects/041-aceil-current-project-meta.js",
  lightCount: "js/rooms/042-aceil-rpc-light-count-lines.js",
  cockpitTools: "js/rooms/044-aceil-cockpit-tools-wall-modal-normalize.js",
  headerTotal: "js/canvas/061-aceil-wall-marks-bridge-room-load.js",
  syncDot: "js/nomenclature/062-aceil-nomenclature-cloud-merge.js",
  metricIcons: "js/rooms/065-aceil-cockpit-metric-icons.js",
  cornerHeader: "js/nomenclature/167-aceil-color-picker.js"
};
for (const [stage, file] of Object.entries(rpcStages)) {
  assert.ok(read(file).includes('stage("' + stage + '"'), file + " must register " + stage);
}

const renderOrder = ["cloudLoading", "accessGate", "customRules", "offlineRestore", "desktopSidebar", "filmGroups"];
const renderOwner = read("js/nomenclature/026-aceil-render-elem-list-pipeline.js");
assert.ok(renderOwner.includes('order:' + JSON.stringify(renderOrder)), "renderElemList stage order changed");
assert.equal((renderOwner.match(/pipeline\.define\("renderElemList"/g) || []).length, 1, "renderElemList must have one owner");
const renderStages = {
  cloudLoading: "js/nomenclature/062-aceil-nomenclature-cloud-merge.js",
  accessGate: "js/admin/159-aceil-access-clean.js",
  customRules: "js/nomenclature/170-aceil-autocount-menu.js",
  offlineRestore: "js/nomenclature/171-aceil-offline-nomenclature.js",
  desktopSidebar: "js/core/168-aceil-desktop-sidebar.js",
  filmGroups: "js/nomenclature/212-aceil-film-group-state-fix.js"
};
for (const [stage, file] of Object.entries(renderStages)) {
  assert.ok(read(file).includes('stage("' + stage + '"'), file + " must register " + stage);
}
assert.ok(!read(rpcStages.cockpitTools).includes("_prevOpenWallModalForInit"), "must not restore the extra wall-modal wrapper");

const autofillOrder = ["linear", "universal", "colorFix", "cornices", "insertChoice", "filmFix"];
assert.ok(
  read("js/nomenclature/105-aceil-autofill-pipeline.js").includes("order:" + JSON.stringify(autofillOrder)),
  "autofill order changed"
);

const wallPipelines={
 saveWallEdit:{owner:"js/canvas/046-aceil-wall-presets.js",order:["header","profileColor","autocount","colorAutosource","breaks","distance","wallPersistence"],stages:{header:"js/canvas/061-aceil-wall-marks-bridge-room-load.js",profileColor:"js/canvas/093-aceil-wall-profile-color.js",autocount:"js/nomenclature/140-aceil-universal-autocount.js",colorAutosource:"js/nomenclature/150-aceil-wall-color-autosource.js",breaks:"js/canvas/169-aceil-wall-placement-restore.js",distance:"js/canvas/185-aceil-wall-menu-simplify.js",wallPersistence:"js/canvas/063-aceil-wall-marks-persist.js"}},
 openReportSettings:{owner:"js/reports/084-aceil-report-capture-labels-settings-ui.js",order:["discountAdvance","managerCard","diagonalSettings"],stages:{discountAdvance:"js/reports/146-aceil-report-discount-advance.js",managerCard:"js/reports/162-aceil-manager-report.js",diagonalSettings:"js/reports/224-aceil-report-diagonals-menu-fix.js"}},
 openWallEditModal:{owner:"js/canvas/047-aceil-wall-preset-editor.js",order:["presets","closeMenus","anchor","preview","toolbar","profileColor","placement","simplify"],stages:{presets:"js/canvas/051-aceil-wall-preset-storage.js",closeMenus:"js/projects/059-aceil-dirty-state-delete-guards.js",anchor:"js/canvas/066-aceil-wall-anchor-sync.js",preview:"js/canvas/068-aceil-wall-position-preview.js",toolbar:"js/canvas/069-aceil-wall-preset-toolbar.js",profileColor:"js/canvas/093-aceil-wall-profile-color.js",placement:"js/canvas/169-aceil-wall-placement-restore.js",simplify:"js/canvas/185-aceil-wall-menu-simplify.js"}},
 rwe2Save:{owner:"js/canvas/066-aceil-wall-anchor-sync.js",order:["profileColor","autocount","colorAutosource","breaks","distance"],stages:{profileColor:"js/canvas/093-aceil-wall-profile-color.js",autocount:"js/nomenclature/140-aceil-universal-autocount.js",colorAutosource:"js/nomenclature/150-aceil-wall-color-autosource.js",breaks:"js/canvas/169-aceil-wall-placement-restore.js",distance:"js/canvas/185-aceil-wall-menu-simplify.js"}}
};
for(const [name,config]of Object.entries(wallPipelines)){
 assert.ok(read(config.owner).includes('pipeline.define("'+name+'",{order:'+JSON.stringify(config.order)),name+" has one explicit owner/order");
 for(const [stage,file]of Object.entries(config.stages)){
  assert.ok(read(file).includes('stage("'+stage+'"'),file+" registers "+stage);
  assert.ok(runtime.indexOf(config.owner)<=runtime.indexOf(file),"owner loads before stage "+stage);
 }
 for(const file of runtime)assert.ok(!new RegExp('window\\.'+name+'\\s*=\\s*(function|wrapped|rweSaveWrapped)').test(read(file)),file+" must not wrap "+name);
}
console.log("pipeline contract: OK");
