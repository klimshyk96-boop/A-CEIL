const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(2600);
  const result=await page.evaluate(()=>{
   window.__A·CEILReportRendering=true;
   elemGroups=[{id:'m303',name:'Плівка Premium',roomScoped:true,roomScopedKind:'film-color',filmSeriesId:'premium'}];
   elemItems=[{id:'m',groupId:'m303',name:'M303 3.6м',filmWidth:3.6,filmMaxWidth:3.6,colorCode:'M303',colorTexture:'mat',seriesId:'premium',filmSeriesId:'premium',filmPickerManaged:true,roomScoped:true,qty:12,price:380},
    {id:'s',groupId:'m303',name:'S303 5.8м',filmWidth:5.8,filmMaxWidth:6.2,qty:0,price:451,unit:'м²'},
    {id:'l',groupId:'missing-l',name:'L303 5.8м',filmWidth:5.8,filmMaxWidth:6.2,colorCode:'L303',colorTexture:'lak',seriesId:'premium',filmSeriesId:'premium',filmPickerManaged:true,roomScoped:true,qty:0,price:452,unit:'м²'}];
   renderElemList();
   const rows=elemItems.map(x=>({...x})),groups=elemGroups.map(x=>({...x}));
   const mGroup=rows.find(x=>x.id==='m').groupId;
   const sGroup=rows.find(x=>x.id==='s')?.groupId,lGroup=rows.find(x=>x.id==='l')?.groupId;
   return {rows,groups,mGroup,sGroup,lGroup};
  });
  assert.ok(result.sGroup);assert.ok(result.lGroup);assert.notEqual(result.sGroup,result.mGroup,'S303 5.8 must not appear in the M303 list');assert.notEqual(result.lGroup,result.mGroup,'L303 5.8 must not appear in the M303 list');assert.notEqual(result.sGroup,result.lGroup);
  assert.equal(result.rows.find(x=>x.id==='s').price,451);assert.equal(result.rows.find(x=>x.id==='l').price,452);assert.equal(result.rows.find(x=>x.id==='m').qty,12);
  const selected=await page.evaluate(()=>{window.A_CEILColorPicker.select('M303','premium');renderElemList();return {groups:structuredClone(elemGroups),rows:structuredClone(elemItems)}});
  const m=selected.rows.find(x=>x.colorCode==='M303');assert.ok(m);assert.ok(selected.rows.filter(x=>x.groupId===m.groupId&&Number(x.filmWidth)>0).every(x=>/^M303\b/.test(x.name)));
  const satin=await page.evaluate(()=>{window.A_CEILColorPicker.select('S303','premium');renderElemList();return {current:window.A_CEILColorPicker.current(),rows:structuredClone(elemItems),groups:structuredClone(elemGroups)}});
  assert.equal(satin.current.code,'S303');const custom=satin.rows.find(x=>x.id==='s');assert.ok(custom,'manually created S303 5.8 survives selection');assert.equal(custom.price,451);assert.equal(custom.filmWidth,5.8);
  assert.ok(satin.rows.filter(x=>x.groupId===custom.groupId&&Number(x.filmWidth)>0).every(x=>/^S303\b/.test(x.name)));
  const gloss=await page.evaluate(()=>{window.A_CEILColorPicker.select('L303','premium');renderElemList();return {current:window.A_CEILColorPicker.current(),rows:structuredClone(elemItems)}});
  assert.equal(gloss.current.code,'L303');assert.ok(gloss.rows.some(x=>x.id==='s'&&x.price===451));assert.ok(gloss.rows.some(x=>x.colorCode==='L303'&&x.price===452&&x.filmWidth===5.8),'custom gloss width and price survive selection');
  const calculated=await page.evaluate(()=>{
   window.A_CEIL_AutoCount.setEnabled(true);realPts=[{x:0,y:0},{x:600,y:0},{x:600,y:700},{x:0,y:700}];pts=realPts.map(p=>({x:100+p.x/2,y:100+p.y/2}));lengths=[600,700,600,700];closed=true;
   document.getElementById('area').textContent='42';document.getElementById('per').textContent='26';
   window.A_CEILColorPicker.select('S303','premium');
   return {current:window.A_CEILColorPicker.current(),positive:elemItems.filter(x=>Number(x.filmWidth)>0&&Number(x.qty)>0).map(x=>({name:x.name,width:x.filmWidth,qty:x.qty,price:x.price})),catalogSelected:_nomenV339CatalogItems(elemItems).some(x=>x.filmRoomSelected===true),newRoomSelected:window['A·CEIL'].RoomNomenclature.newRoomState().elemItems.some(x=>x.filmRoomSelected===true)};
  });
  assert.equal(calculated.current.code,'S303');assert.deepEqual(calculated.positive,[{name:'S303 5,8м',width:5.8,qty:42,price:451}]);
  assert.equal(calculated.catalogSelected,false);assert.equal(calculated.newRoomSelected,false);
  const persistence=await page.evaluate(async()=>{
   window.__A·CEILReportRendering=false;
   window.A_CEILColorPicker.select('M303','premium');
   const state=()=>({schemaVersion:3,projectType:'room',pts:structuredClone(pts),realPts:structuredClone(realPts),lengths:structuredClone(lengths),closed,diagonals:[],diagonalOverrides:{},circleMode:false,circleDiamCm:0,notes:[],elemItems:structuredClone(elemItems),elemGroups:structuredClone(elemGroups),lightMarks:[],wallMarks:[],linearElements:[],wallTypes:[],arcPoints:[]});
   const first=state(),second=state();
   window['A·CEIL'].ProjectRepository.replaceAll([{id:'film-save-test',_localId:'film-save-test',name:'Film persistence',multiRoom:true,rooms:[{id:'film-room-a',name:'A',state:JSON.stringify(first)},{id:'film-room-b',name:'B',state:JSON.stringify(second)}],state:'{}'}]);
   _activeObjectId='film-save-test';_activeRoomIdx=null;window._activeRoomId=null;openRoom(0);
   window.A_CEILColorPicker.select('S303','premium');
   const saved=await window.saveCurrentRoom({silent:true,skipCloud:true});
   const project=window['A·CEIL'].ProjectRepository.list().find(x=>x.id==='film-save-test'),savedState=JSON.parse(project.rooms[0].state);
   openRoom(1);openRoom(0);
   return{saved,dirty:project._dirty,syncStatus:project._syncStatus,savedSelected:savedState.elemItems.filter(x=>x.filmRoomSelected===true).map(x=>x.colorCode),savedPositive:savedState.elemItems.filter(x=>Number(x.filmWidth)>0&&Number(x.qty)>0).map(x=>x.colorCode),restored:window.A_CEILColorPicker.current(),material:window.A_CEILColorPicker.material()};
  });
  assert.equal(persistence.saved,true);assert.equal(persistence.dirty,true);assert.equal(persistence.syncStatus,'pending_create');assert.ok(persistence.savedSelected.length>0);assert.ok(persistence.savedSelected.every(code=>code==='S303'));assert.ok(persistence.savedPositive.length>0);assert.ok(persistence.savedPositive.every(code=>code==='S303'));assert.equal(persistence.restored.code,'S303');assert.equal(persistence.material.textureLabel,'Сатин');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS M303, manually added S303 5.8 and orphan L303 5.8 keep separate film identities '+width+'px');
 }
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
