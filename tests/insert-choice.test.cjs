const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const factorySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', '007-aceil-pipeline-v1.js'),
  'utf8'
);
const pipelineSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'nomenclature', '105-aceil-autofill-pipeline-v1.js'),
  'utf8'
);
const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'nomenclature', '179-aceil-insert-choice-guard-v1.js'),
  'utf8'
);

function run(items) {
  const timers = [];
  const window = {
    elemItems: items,
    autoFillNomenclature() {
      // Simulate an older pass selecting/counting the wrong colour.
      items.forEach(item => {
        item.qty = item.sourceVariant === 'black' ? 9 : 0;
        item.insertSelected = item.sourceVariant === 'black';
      });
    },
    previewNomenclatureSource() { return { qty: 9, unit: 'м' }; },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    __diagSilent() {}
  };
  window['A·CEIL'] = {};
  const context = {
    window,
    elemItems: items,
    autoFillNomenclature: window.autoFillNomenclature,
    setTimeout: window.setTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(factorySource, context, { filename: '007-aceil-pipeline-v1.js' });
  vm.runInContext(pipelineSource, context, { filename: '105-aceil-autofill-pipeline-v1.js' });
  vm.runInContext(source, context, { filename: '179-aceil-insert-choice-guard-v1.js' });
  window.autoFillNomenclature({ silent: true });
  timers.forEach(callback => callback());
  return items;
}

{
  const items = run([
    { id: 'white', name: 'Вставка біла', source: 'white_insert', sourceVariant: 'white', insertSelected: true, qty: 0 },
    { id: 'black', name: 'Вставка чорна', source: 'white_insert', sourceVariant: 'black', insertSelected: false, qty: 0 }
  ]);
  assert.equal(items[0].qty, 9);
  assert.equal(items[0].insertSelected, true);
  assert.equal(items[1].qty, 0);
  assert.equal(items[1].insertSelected, false);
}

{
  const items = run([
    { id: 'white', name: 'Вставка біла', source: 'white_insert', sourceVariant: 'white', qty: 0 },
    { id: 'black', name: 'Вставка чорна', source: 'white_insert', sourceVariant: 'black', qty: 0 }
  ]);
  assert.equal(items[0].qty, 9, 'white insert is the default when no choice is stored');
  assert.equal(items[0].insertSelected, true);
  assert.equal(items[1].qty, 0);
}

console.log('Insert choice tests: OK');
