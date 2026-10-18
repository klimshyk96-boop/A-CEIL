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

function run(items, chooseId, afterAutofill) {
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
    previewNomenclatureSource(source,item) { return { qty: item.insertSelected ? 9 : 0, unit: 'м' }; },
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
  if (chooseId) {
    const chosen = items.find(item => item.id === chooseId);
    window.A_CEIL_SetInsertChoiceFromQty(chosen, chosen.qty);
  }
  window.autoFillNomenclature({ silent: true });
  if(afterAutofill)afterAutofill(window,items);
  timers.forEach(callback => callback());
  return items;
}

{
  const items = run([
    { id: 'white', name: 'Вставка біла', source: 'white_insert', sourceVariant: 'white', insertSelected: true, qty: 0 },
    { id: 'black', name: 'Вставка чорна', source: 'white_insert', sourceVariant: 'black', insertSelected: false, qty: 9 }
  ], 'black');
  assert.equal(items[0].qty, 0, 'zeroed white insert stays zero');
  assert.equal(items[0].insertSelected, false);
  assert.equal(items[1].qty, 9, 'manually substituted black insert survives recalculation');
  assert.equal(items[1].insertSelected, true);
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

{
 const items=run([
  {id:'white',name:'Вставка біла',source:'white_insert',sourceVariant:'white',insertSelected:true,qty:0},
  {id:'black',name:'Вставка чорна',source:'white_insert',sourceVariant:'black',insertSelected:false,qty:0}
 ],null,(window,items)=>{items[1].qty=7;window.A_CEIL_SetInsertChoiceFromQty(items[1],7);});
 assert.equal(items[0].qty,0,'manual switch clears the previous quantity immediately');
 assert.equal(items[1].qty,7,'old deferred autofill must not undo a more recent manual choice');
 assert.equal(items[1].insertSelected,true);
}

const stateSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'nomenclature', '025-aceil-state-persistence-nomenclature.js'),
  'utf8'
);
assert.equal(
  (stateSource.match(/A_CEIL_SetInsertChoiceFromQty/g) || []).length,
  4,
  'manual quantity and perimeter button must both remember the insert colour'
);

console.log('Insert choice tests: OK');

// Exercise every catalog merge, including old cloud rows with black selected.
const defaultHelper=stateSource.slice(stateSource.indexOf('function aceilDefaultInsertSelection'),stateSource.indexOf('\n}',stateSource.indexOf('function aceilDefaultInsertSelection'))+2);
const dirtyCatalog=[
  {id:'white',name:'Вставка біла',source:'white_insert',sourceVariant:'white',insertSelected:false,qty:0},
  {id:'black',name:'Вставка чорна',source:'white_insert',sourceVariant:'black',insertSelected:true,qty:9}
];
const currentRoom=JSON.parse(JSON.stringify(dirtyCatalog));
const mergeCases=[
 ['js/admin/033-aceil-supabase-auth-offline-access.js','function _nomenV339Clone','async function saveNomenclatureToCloud','_nomenV339MergeCatalogWithRoom'],
 ['js/admin/159-aceil-access-clean-v2.js','function nomItemKey','function mergeCatalogGroupsWithRoom','mergeCatalogWithRoomResults'],
 ['js/nomenclature/062-aceil-nomenclature-cloud-merge.js','function _nom3623Key','async function forceLoadNomenclature','_nom3623Merge'],
 ['js/nomenclature/171-aceil-offline-nomenclature-v1.js','  function clone','  function mergeGroups','mergeItems']
];
for(const [file,start,end,name] of mergeCases){
 const code=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const context={window:{},clone:x=>JSON.parse(JSON.stringify(x)),console};vm.createContext(context);
 vm.runInContext(defaultHelper+'\n'+code.slice(code.indexOf(start),code.indexOf(end)),context);
 const fresh=context[name](dirtyCatalog,[]);
 assert.equal(fresh[0].insertSelected,true,file+': fresh room must default to white despite old cloud selection');
 assert.equal(fresh[1].insertSelected,false);
 const restored=context[name](dirtyCatalog,currentRoom);
 assert.equal(restored[0].insertSelected,false,file+': sync must preserve this room\'s black choice');
 assert.equal(restored[1].insertSelected,true);
 if(context._nomenV339CatalogItems){
  const cleaned=context._nomenV339CatalogItems(currentRoom);
  assert.equal(cleaned[0].insertSelected,true,'cloud catalog must store white default');
  assert.equal(cleaned[1].insertSelected,false);
  assert.equal(currentRoom[1].insertSelected,true,'cleaning must not mutate room');
 }
}
console.log('Insert catalog isolation (all four merge paths): OK');
