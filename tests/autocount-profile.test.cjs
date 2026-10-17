const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'nomenclature', '140-universal-autocount-v319.js'),
  'utf8'
);

function makeRoom({ items, marks = [], lengths = [300, 300, 300, 300] }) {
  const window = {
    elemItems: items,
    wallMarks: marks,
    linearElements: [],
    lightMarks: [],
    lightTypes: [],
    setTimeout() { return 0; },
    clearTimeout() {},
    __diagSilent() {}
  };
  const context = {
    window,
    elemItems: items,
    wallMarks: marks,
    linearElements: [],
    lightMarks: [],
    lightTypes: [],
    lengths,
    closed: true,
    pts: lengths.map((_, index) => ({ x: index, y: index })),
    circleMode: false,
    circleDiamCm: 0,
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {
      addEventListener() {},
      getElementById() { return null; },
      createElement() { return { setAttribute() {}, appendChild() {} }; }
    },
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: '140-universal-autocount-v319.js' });
  const ctx = {
    marksWall: marks,
    lengths,
    perimeterCm: lengths.reduce((sum, value) => sum + value, 0),
    cornersTotal: lengths.length
  };
  return {
    qty(sourceKey, id) {
      const item = items.find(row => row.id === id);
      return window.aceilWholeContourCompute(sourceKey, item, ctx);
    },
    qtyWithoutContext(sourceKey, id) {
      const item = items.find(row => row.id === id);
      return window.aceilWholeContourCompute(sourceKey, item);
    },
    recalculate() {
      window.rmUniversalAutoCountV319({ noSave: true });
    }
  };
}

function baseItems(extra = []) {
  return [
    { id: 'base', source: 'main_profile', name: 'Базовий алюмінієвий профіль' },
    { id: 'insert', source: 'white_insert', name: 'Біла вставка', insertSelected: true },
    { id: 'base-corners', source: 'corners', name: 'Кути базового профілю' },
    { id: 'shadow', source: 'shadow_profile', name: 'Тіньовий профіль' },
    { id: 'shadow-corners', source: 'shadow_corners', name: 'Кути тіньового профілю' },
    { id: 'floating', source: 'floating_profile', name: 'Парящий профіль' },
    { id: 'floating-corners', source: 'floating_corners', name: 'Кути парящого профілю' },
    ...extra
  ];
}

function fullWall(id, sideIndex, type, color = '#16a34a') {
  return { id, sideIndex, type, color, lenCm: 300, offsetCm: 0, anchor: 'full' };
}

{
  const room = makeRoom({
    items: baseItems(),
    marks: [fullWall('s1', 0, 'Тіньовий профіль')]
  });
  assert.equal(room.qty('main_profile', 'base'), 9);
  assert.equal(room.qty('white_insert', 'insert'), 9);
  assert.equal(room.qty('shadow_profile', 'shadow'), 3);
  assert.equal(room.qty('corners', 'base-corners'), 2);
  assert.equal(room.qty('shadow_corners', 'shadow-corners'), 2);
}

{
  const room = makeRoom({
    items: baseItems(),
    marks: [
      fullWall('s1', 0, 'Тіньовий профіль'),
      fullWall('s2', 1, 'Тіньовий профіль')
    ]
  });
  assert.equal(room.qty('main_profile', 'base'), 6);
  assert.equal(room.qty('shadow_profile', 'shadow'), 6);
  assert.equal(room.qty('corners', 'base-corners'), 1);
  assert.equal(room.qty('shadow_corners', 'shadow-corners'), 3);
}

{
  const items = baseItems();
  items.find(row => row.id === 'base').qty = 0;
  Object.assign(items.find(row => row.id === 'shadow'), {
    qty: 12,
    manualQtyOverride: true
  });
  const room = makeRoom({
    items,
    marks: [fullWall('s1', 0, 'Тіньовий профіль')]
  });
  assert.equal(room.qty('main_profile', 'base'), 9, 'stale manual full contour must not override wall geometry');
  assert.equal(room.qty('white_insert', 'insert'), 9);
}

{
  const items = baseItems();
  Object.assign(items.find(row => row.id === 'shadow'), {
    fullContourSelected: true,
    fullContourPresetName: 'Тіньовий профіль'
  });
  const room = makeRoom({ items });
  assert.equal(room.qty('main_profile', 'base'), 0);
  assert.equal(room.qty('white_insert', 'insert'), 0);
  assert.equal(room.qty('shadow_profile', 'shadow'), 12);
  assert.equal(room.qty('corners', 'base-corners'), 0);
  assert.equal(room.qty('shadow_corners', 'shadow-corners'), 4);
}

{
  const room = makeRoom({ items: baseItems() });
  assert.equal(room.qty('main_profile', 'base'), 12);
  assert.equal(room.qty('white_insert', 'insert'), 12);
  assert.equal(room.qty('corners', 'base-corners'), 4);
  assert.equal(room.qtyWithoutContext('corners', 'base-corners'), 4, 'ordinary corners work without an explicit preview context');
}

{
  const room = makeRoom({
    items: baseItems(),
    marks: [
      { id: 'a', sideIndex: 0, type: 'Тіньовий профіль', lenCm: 200, offsetCm: 0 },
      { id: 'b', sideIndex: 0, type: 'Тіньовий профіль', lenCm: 200, offsetCm: 100 }
    ]
  });
  assert.equal(room.qty('shadow_profile', 'shadow'), 3, 'overlapping marks count only once');
  assert.equal(room.qty('main_profile', 'base'), 9);
}

{
  const items = baseItems([
    { id: 'black-insert', source: 'white_insert', sourceVariant: 'black', name: 'Чорна вставка', insertSelected: false, qty: 12 }
  ]);
  Object.assign(items.find(row => row.id === 'insert'), { sourceVariant: 'white', qty: 12 });
  const room = makeRoom({
    items,
    marks: [fullWall('s1', 0, 'Тіньовий профіль')]
  });
  room.recalculate();
  assert.equal(items.find(row => row.id === 'insert').qty, 9, 'selected insert updates immediately after a profile wall changes');
  assert.equal(items.find(row => row.id === 'black-insert').qty, 0, 'unchosen insert stays zero');
  assert.equal(items.find(row => row.id === 'base-corners').qty, 2, 'ordinary profile corners update in the same pass');
}

console.log('Autocount profile tests: OK');
