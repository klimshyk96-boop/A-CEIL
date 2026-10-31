const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'nomenclature', '140-aceil-universal-autocount.js'),
  'utf8'
);

function makeRoom({ items, marks = [], lengths = [300, 300, 300, 300], presets = [] }) {
  const window = {
    elemItems: items,
    rwe2WallPresetRead() { return presets; },
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
  vm.runInContext(source, context, { filename: '140-aceil-universal-autocount.js' });
  const ctx = {
    marksWall: marks,
    lengths,
    perimeterCm: lengths.reduce((sum, value) => sum + value, 0),
    cornersTotal: lengths.length
  };
  return {
    profile(state) { return window.aceilContourProfile(null, items, state); },
    qty(sourceKey, id) {
      const item = items.find(row => row.id === id);
      return window.aceilWholeContourCompute(sourceKey, item, ctx);
    },
    qtyWithoutContext(sourceKey, id) {
      const item = items.find(row => row.id === id);
      return window.aceilWholeContourCompute(sourceKey, item);
    },
    reconcileInsert() {return window.A_CEIL_ReconcileContourInsert();},
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

for (const source of ['floating_profile', 'walltypecolor:black:'+encodeURIComponent('Парящий профіль')]) {
  const items=baseItems();Object.assign(items.find(x=>x.id==='base'),{qty:0,manualQtyOverride:true});
  Object.assign(items.find(x=>x.id==='floating'),{source,name:'Парящий профіль чорний',sourceVariant:'black',qty:12,manualQtyOverride:true});
  const room=makeRoom({items,presets:[{name:'Парящий профіль',color:'#ff9500'}]});
  assert.equal(room.profile().whole,true);assert.equal(room.profile().source,'floating_profile');assert.equal(room.profile().color,'#ff9500');
  assert.equal(room.qty('main_profile','base'),0);assert.equal(room.qty('floating_corners','floating-corners'),4);
  assert.equal(items.find(x=>x.id==='floating').qty,12,'read-only contour inference preserves the manual quantity');
}
{
  const items=baseItems();Object.assign(items.find(x=>x.id==='base'),{qty:0,manualQtyOverride:true});
  const floating=items.find(x=>x.id==='floating');Object.assign(floating,{name:'Парящий чорний',qty:12,manualQtyOverride:true});
  const room=makeRoom({items,presets:[{name:'Парящий білий',color:'#00ccff'},{name:'Парящий профіль',color:'#ff9500'},{name:'Парящий чорний',color:'#aa3300'}]});
  assert.equal(room.profile().color,'#aa3300','matching physical variant has priority');
  floating.qty=3;assert.equal(room.profile().whole,true,'manual H=0 selects the profile style without a perimeter quantity requirement');assert.equal(room.profile().color,'#aa3300');
  items.find(x=>x.id==='base').qty=.01;assert.equal(room.profile().color,'#1d1d1f','positive base H restores its ordinary black outline');items.find(x=>x.id==='base').qty=0;
  floating.qty=12;items.push({id:'another',source:'floating_profile',name:'Парящий білий',qty:6,manualQtyOverride:true});floating.qty=6;
  assert.equal(room.profile().whole,false,'two mixed manual variants cannot select one colour for the whole contour');
}
{
  const items=baseItems();Object.assign(items.find(x=>x.id==='base'),{qty:0,manualQtyOverride:false});
  Object.assign(items.find(x=>x.id==='floating'),{qty:12,manualQtyOverride:true,sourceVariant:'black'});
  const room=makeRoom({items,marks:[{...fullWall('partial',0,'Парящий профіль','#ff9500'),profileColor:'black'}],presets:[{name:'Парящий профіль',color:'#ff9500'}]});
  assert.equal(room.profile().whole,false,'automatic zero H must not turn a partial wall mark into a whole-room choice');
  items.find(x=>x.id==='base').manualQtyOverride=true;assert.equal(room.profile().color,'#ff9500','explicitly zeroing H selects the manual profile style even when wall marks exist');
  assert.equal(room.qty('floating_profile','floating'),3,'manual style selection does not change quantity calculation from wall geometry');
}
console.log('Manual full-contour profile colour tests: OK');

{
 const items=baseItems();Object.assign(items.find(x=>x.id==='base'),{qty:0,manualQtyOverride:true});
 Object.assign(items.find(x=>x.id==='floating'),{qty:3,manualQtyOverride:true,sourceVariant:'black'});
 Object.assign(items.find(x=>x.id==='shadow'),{qty:12});
 const room=makeRoom({items,marks:[0,1,2,3].map(i=>fullWall('shadow-'+i,i,'Тіньовий профіль')),presets:[{name:'Парящий профіль',color:'#ff9500'}]});
 assert.equal(room.profile().color,'#ff9500');
 assert.equal(room.qty('shadow_profile','shadow'),12,'manual drawing style must not replace geometric calculation rules');
}

// A legacy/manual row need not carry a source or a manual-override flag.
for (const family of ['floating', 'shadow']) for (const variant of ['black','white']) {
 const label=(family==='floating'?'Парящий':'Тіньовий')+' '+(variant==='black'?'чорний':'білий');
 const items=[{id:'base',source:'main_profile',qty:0,manualQtyOverride:true},
  {id:'white',source:family+'_profile',sourceVariant:'white',qty:0,fullContourSelected:false},
  {id:'selected',name:label,unit:'м',qty:3,price:750},
  {id:'corner',name:'Кут '+label,unit:'шт',qty:4}];
 const room=makeRoom({items,presets:[{name:label,color:'#ff9500'}]});
 assert.equal(room.profile().source,family+'_profile');
 assert.equal(room.profile().color,'#ff9500');
 assert.equal(room.profile().item.id,'selected');
 assert.equal(items[2].qty,3);
 items[2].source='';items[2].autoMatchedSource='walltypecolor:'+variant+':'+encodeURIComponent(label);
 assert.equal(room.profile().color,'#ff9500');
}
console.log('PASS legacy/manual black and white floating/shadow profile rows');

for(const family of ['shadow','floating'])for(const variant of ['black','white']){
 const label=family==='shadow'?'Тіньовий профіль':'Парящий профіль';
 const items=baseItems([{id:'selected-'+family,source:family+'_profile',sourceVariant:variant,name:label+' '+variant}]);
 const marks=[{...fullWall('colour',0,label),profileColor:variant}];
 const room=makeRoom({items,marks});room.recalculate();
 assert.equal(items.find(i=>i.id==='selected-'+family).qty,3);
 assert.equal(items.find(i=>i.id===family).qty,0,'generic row must not duplicate coloured profile');
 assert.equal(items.find(i=>i.id==='base').qty,9);
 assert.equal(items.find(i=>i.id==='insert').qty,9);
}
console.log('PASS black/white floating and shadow lengths without double counting');

for(const family of ['floating','shadow'])for(const variant of ['black','white']){
 const items=baseItems();Object.assign(items.find(i=>i.id==='base'),{qty:0,manualQtyOverride:true});
 Object.assign(items.find(i=>i.id===family),{name:(family==='floating'?'Парящий':'Тіньовий')+' '+(variant==='black'?'чорний':'білий'),qty:3,manualQtyOverride:true,sourceVariant:variant});
 const insert=items.find(i=>i.id==='insert');insert.qty=12;
 const room=makeRoom({items});assert.equal(room.qty('white_insert','insert'),0,'manual whole contour excludes insert');room.reconcileInsert();assert.equal(insert.qty,0);
 items.find(i=>i.id===family).qty=0;room.reconcileInsert();assert.equal(insert.qty,12,'ordinary contour restores insert');
 items.find(i=>i.id==='base').qty=12;items.find(i=>i.id===family).qty=3;
 assert.equal(room.qty('white_insert','insert'),9,'partial manual profile is deducted');room.reconcileInsert();assert.equal(insert.qty,9);
}
{
 const items=baseItems();Object.assign(items.find(i=>i.id==='floating'),{qty:3,manualQtyOverride:true,sourceVariant:'black'});
 const room=makeRoom({items,marks:[{...fullWall('same',0,'Парящий профіль'),profileColor:'black'}]});
 assert.equal(room.qty('white_insert','insert'),9,'same marked and manual profile is deducted once');
}
console.log('PASS manual profiles suppress/restore insert and deduct partial lengths once');

for(const name of ['Профіль H алюмінієвий','Профіль Н алюміній','Профіль базовий'])for(const source of ['', 'full_perimeter']){
 const items=[{id:'h',name,source,qty:0,unit:'м'},{id:'corners',name:'Фіксація кутів',unit:'шт',qty:0}];
 const room=makeRoom({items});room.recalculate();
 assert.equal(items[0].source,'main_profile');assert.equal(items[0].qty,12);assert.equal(items[1].qty,4);
 assert.notEqual(items[0].manualQtyOverride,true,'H is automatic by default');
}
for(const family of ['floating','shadow'])for(const variant of ['white','black']){
 const profile=family==='floating'?'Парящий':'Тіньовий';
 const items=[{id:'h',source:'main_profile',qty:0,manualQtyOverride:true},
 {id:'profile',source:family+'_profile',sourceVariant:variant,qty:3,manualQtyOverride:true},
 {id:'base-corners',name:'Фіксація кутів',unit:'шт',qty:4,manualQtyOverride:true},
 {id:'white-corners',name:'Фіксація кута '+profile+' білий',unit:'шт',qty:0},
 {id:'black-corners',name:'Фіксація кута '+profile+' чорний',unit:'шт',qty:0}];
 const room=makeRoom({items});room.reconcileInsert();
 assert.equal(items[2].qty,0,'base corners disappear immediately');
 assert.equal(items[variant==='white'?3:4].qty,4,'matching profile corners appear immediately');
 assert.equal(items[variant==='white'?4:3].qty,0,'other colour is not charged');
 items[1].qty=0;room.reconcileInsert();assert.equal(items[2].qty,4);assert.equal(items[3].qty+items[4].qty,0);
}
console.log('PASS H defaults and immediate black/white profile corner replacement/restoration');

for(const family of ['floating','shadow']){
 const items=baseItems();
 Object.assign(items.find(i=>i.id==='base'),{qty:12,autoFilled:true,autoZero:false});
 Object.assign(items.find(i=>i.id===family),{fullContourSelected:true});
 const room=makeRoom({items});room.reconcileInsert();
 assert.equal(items.find(i=>i.id==='base').qty,0,family+' whole contour zeroes automatic H immediately');
 assert.equal(items.find(i=>i.id==='base').autoZero,true);
 const reopened=JSON.parse(JSON.stringify(items)),reopenedRoom=makeRoom({items:reopened});reopenedRoom.reconcileInsert();
 assert.equal(reopened.find(i=>i.id==='base').qty,0,family+' saved whole contour reopens with H at zero');
 items.find(i=>i.id===family).fullContourSelected=false;room.reconcileInsert();
 assert.equal(items.find(i=>i.id==='base').qty,12,family+' restores automatic H when ordinary contour returns');
 assert.equal(items.find(i=>i.id==='base').autoZero,false);
}
console.log('PASS whole shadow/floating contour immediately zeroes and restores automatic H');

{
 const items=baseItems([{id:'black-shadow-corners',name:'Фіксація кута тіньовий чорний',source:'walltypecolor:black:'+encodeURIComponent('Фіксація кута тіньовий'),unit:'шт',qty:0}]);
 Object.assign(items.find(i=>i.id==='base'),{qty:0,manualQtyOverride:true});Object.assign(items.find(i=>i.id==='shadow'),{qty:3,sourceVariant:'black',manualQtyOverride:true});
 const room=makeRoom({items});room.recalculate();const row=items.find(i=>i.id==='black-shadow-corners');assert.equal(row.source,'shadow_corners');assert.equal(row.qty,4);assert.equal(row.unit,'шт');
}

{
 const items=[{id:'estimate-h',name:'Профіль H',unit:'м',price:185,qty:2}];
 const room=makeRoom({items,lengths:[]});room.recalculate();assert.equal(items[0].qty,2,'no-plan legacy estimate must survive icon/list editing');
}
