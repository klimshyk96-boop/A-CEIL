const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const current=path.join(__dirname,'..'),baseline=process.env.ACEIL_ROOM_LOAD_BASELINE;
async function run(browser,root,width){
 const {page,errors}=await open(browser,width,1,root);await reveal(page);
 await page.evaluate(()=>{
  resetAllSilent();
  const groups=[{id:'insert',name:'Вставки'},{id:'lights',name:'Освітлення'}];
  const items=[{id:'white',groupId:'insert',name:'Вставка біла',source:'white_insert',sourceVariant:'white',unit:'м',price:60,qty:0,insertSelected:true},
   {id:'black',groupId:'insert',name:'Вставка чорна',source:'white_insert',sourceVariant:'black',unit:'м',price:90,qty:0,insertSelected:false},
   {id:'spot',groupId:'lights',name:'Точковий',unit:'шт',price:350,qty:0,manualQtyOverride:false}];
  window.__A·CEILNomenCatalogV339={items:structuredClone(items),groups:structuredClone(groups)};
  elemItems=structuredClone(items);elemGroups=structuredClone(groups);
  const room=(id,w,qty,black)=>({id,name:id,state:JSON.stringify({schemaVersion:3,projectType:'room',pts:[{x:100,y:100},{x:100+w,y:100},{x:100+w,y:400},{x:100,y:400}],realPts:[{x:0,y:0},{x:w,y:0},{x:w,y:300},{x:0,y:300}],lengths:[w,300,w,300],closed:true,elemGroups:groups,elemItems:items.map(it=>({...it,name:'Old '+it.name,price:1,qty:it.id==='spot'?qty:0,manualQtyOverride:it.id==='spot',insertSelected:it.id==='black'?black:it.id==='white'?!black:undefined})),wallMarks:[],lightMarks:[]})});
  window['A·CEIL'].ProjectRepository.replaceAll([{id:'load-test',name:'Load',multiRoom:true,rooms:[room('A',400,2,false),room('B',600,5,true),{id:'empty',name:'Empty',state:null},{id:'legacy',name:'Legacy',state:JSON.stringify({closed:true,pts:[{x:100,y:100},{x:500,y:100},{x:500,y:400},{x:100,y:400}],realPts:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}],lengths:[400,300,400,300]}),elemItems:[{...items[2],qty:7,manualQtyOverride:true}],elemGroups:groups}],state:'{}'}]);
  _activeObjectId='load-test';_activeRoomIdx=null;window._activeRoomId=null;
 });
 const snapshots=[];
 for(const index of [0,1,0,2,3,0]){
  await page.evaluate(index=>openRoom(index),index);await page.waitForTimeout(550);
  snapshots.push(await page.evaluate(()=>({lengths:structuredClone(lengths),closed,items:elemItems.map(it=>({id:it.filmPickerManaged?'film:'+it.name:it.id,name:it.name,price:it.price,qty:it.qty,selected:it.insertSelected,manual:it.manualQtyOverride})),groups:elemGroups.map(g=>({id:g.roomScopedKind==='film-color'?'film:'+g.name:g.id,name:g.name})),total:document.getElementById('rpcTotal')?.textContent,pill:document.getElementById('rpcTotalPill')?.textContent,subtotal:Math.round(elemItems.reduce((sum,it)=>sum+(Number(it.qty)||0)*(Number(it.price)||0),0)),room:_activeRoomIdx})));
  const snap=snapshots.at(-1),number=value=>Number(String(value||'').replace(/[^0-9.-]/g,''));
  // Two legacy header writers display either item subtotal or computed total.
  // Their final timer order is nondeterministic in BOTH builds; validate either
  // supported value while comparing the calculation and quantities exactly.
  assert.ok([snap.subtotal,number(snap.total)].includes(number(snap.pill)),JSON.stringify(snap));
  delete snap.pill;
 }
 await page.evaluate(()=>{document.getElementById('newRoomName').value='Fresh';confirmNewRoom()});await page.waitForTimeout(550);
 const fresh=await page.evaluate(()=>({closed,pts:pts.length,items:elemItems.filter(x=>['white','black','spot'].includes(x.id)).map(x=>({id:x.id,qty:x.qty,price:x.price,selected:x.insertSelected,manual:x.manualQtyOverride})),room:window['A·CEIL'].ProjectRepository.list()[0].rooms.at(-1).name}));
 assert.equal(fresh.closed,false);assert.equal(fresh.pts,0);assert.equal(fresh.items.find(x=>x.id==='white').selected,true);assert.equal(fresh.items.find(x=>x.id==='black').selected,false);assert.equal(fresh.items.find(x=>x.id==='spot').qty,0);
 // Rejected creation must not wipe the active room's manually entered quantities.
 const invalid=await page.evaluate(()=>{elemItems.find(x=>x.id==='spot').qty=9;document.getElementById('newRoomName').value='';confirmNewRoom();return elemItems.find(x=>x.id==='spot').qty});
 if(root===current)assert.equal(invalid,9);
 assert.deepEqual(errors,[]);await page.close();return {snapshots,fresh};
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){
  const actual=await run(browser,current,width);
  if(baseline){const expected=await run(browser,baseline,width);assert.deepEqual(actual,expected)}
  const first=actual.snapshots[0],back=actual.snapshots[2];assert.deepEqual(first.items,back.items);assert.deepEqual(first.lengths,back.lengths);
  assert.equal(first.items.find(x=>x.id==='spot').price,350);assert.equal(first.items.find(x=>x.id==='spot').qty,2);
  assert.equal(actual.snapshots[1].items.find(x=>x.id==='spot').qty,5);
  assert.equal(actual.snapshots[3].items.find(x=>x.id==='spot').qty,0);
  // Repository normalization drops duplicate top-level catalogues; a snapshot
  // without stored quantities starts from zero, as in the previous build.
  assert.equal(actual.snapshots[4].items.find(x=>x.id==='spot').qty,0);
  console.log('PASS room load/create: catalogue authority, independent quantities, legacy/empty snapshots, white insert, totals and invalid creation '+width+'px'+(baseline?' (matches baseline)':''));
 }
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
