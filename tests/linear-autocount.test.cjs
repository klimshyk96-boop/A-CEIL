const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const factorySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', '007-aceil-pipeline.js'),
  'utf8'
);
const pipelineSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'nomenclature', '105-aceil-autofill-pipeline.js'),
  'utf8'
);
const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'rooms', '110-aceil-linear-element.js'),
  'utf8'
);

const linearElements = [
  { id: 'light', elementType: 'lightLine', shape: 'line', segments: [200] },
  { id: 'surface', elementType: 'surfaceTrack', shape: 'L', segments: [300, 100], trackFixtureCount: 4 },
  { id: 'recessed', elementType: 'recessedTrack', shape: 'line', segments: [250], trackFixtureCount: 2 },
  { id: 'magnetic', elementType: 'magneticTrack', shape: 'U', segments: [80, 220, 80], trackFixtureCount: 3 }
];
const elemItems = [
  { id: 'legacy-light', source: 'linear_length', qty: 0 },
  { id: 'light', source: 'lineartype:lightLine', qty: 0 },
  { id: 'surface', source: 'lineartype:surfaceTrack', qty: 0 },
  { id: 'recessed', source: 'lineartype:recessedTrack', qty: 0 },
  { id: 'magnetic', source: 'lineartype:magneticTrack', qty: 0 },
  { id: 'surface-fixtures', source: 'linearfixtures:surfaceTrack', qty: 0 },
  { id: 'surface-corners', source: 'linearcorners:surfaceTrack', qty: 0 }
];
const lightTypes = [];

let timerId = 0;
const timers = [];
function setTimeoutFake(callback, delay) {
  const timer = { id: ++timerId, callback, delay, cancelled: false };
  timers.push(timer);
  return timer.id;
}
function clearTimeoutFake(id) {
  const timer = timers.find(entry => entry.id === id);
  if (timer) timer.cancelled = true;
}

const document = {
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return {}; },
  body: { appendChild() {} }
};
const window = {
  linearElements,
  elemItems,
  lightTypes,
  setTimeout: setTimeoutFake,
  clearTimeout: clearTimeoutFake,
  autoFillNomenclature() {
    // Reproduce the old transient bug: the legacy pass counted every linear
    // element as a light line before the type-specific pass corrected it.
    elemItems[0].qty = 12.3;
  },
  __diagSilent() {}
};
const context = {
  window,
  document,
  ACEILCanvas: { afterDraw() {}, width() { return 1000; }, height() { return 1000; } },
  linearElements,
  elemItems,
  lightTypes,
  autoFillNomenclature: window.autoFillNomenclature,
  setTimeout: setTimeoutFake,
  clearTimeout: clearTimeoutFake,
  console
};
vm.createContext(context);
vm.runInContext(factorySource, context, { filename: '007-aceil-pipeline.js' });
vm.runInContext(pipelineSource, context, { filename: '105-aceil-autofill-pipeline.js' });
vm.runInContext(source, context, { filename: '110-aceil-linear-element.js' });

assert.deepEqual(
  Array.from(window.A_CEIL_LinearTypes.ids),
  ['lightLine', 'magneticTrack', 'surfaceTrack', 'recessedTrack', 'custom'],
  'linear sources must keep stable IDs'
);
lightTypes.push({ id: 'linear_surfaceTrack', label: 'Моя назва шинопроводу', icon: '▭' });
assert.equal(window.A_CEIL_LinearTypes.label('surfaceTrack'), 'Моя назва шинопроводу');
assert.equal(window.A_CEIL_LinearTypes.ids[2], 'surfaceTrack', 'renaming must not change the stable ID');

window.autoFillNomenclature({ silent: true });
assert.equal(elemItems[0].qty, 2, 'legacy light source must include only lightLine');
assert.equal(elemItems[1].qty, 2);
assert.equal(elemItems[2].qty, 4);
assert.equal(elemItems[3].qty, 2.5);
assert.equal(elemItems[4].qty, 3.8);
assert.equal(elemItems[5].qty, 4);
assert.equal(elemItems[6].qty, 1);

// A late stale write is repaired by the deferred stable-id synchronization.
elemItems[0].qty = 12.3;
elemItems[2].qty = 0;
window.scheduleLinearNomenclatureSync();
timers.filter(timer => !timer.cancelled).forEach(timer => timer.callback());
assert.equal(elemItems[0].qty, 2);
assert.equal(elemItems[2].qty, 4);

console.log('Linear autocount tests: OK');
