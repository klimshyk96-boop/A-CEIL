/* Room insert choices must survive sync without becoming the next room's default. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  for(const width of [390,1440]){
   const {page,errors}=await open(browser,width,1,process.env.ACEIL_SOURCE_ROOT||undefined);
   page.on('dialog',d=>d.accept());await reveal(page);
   const result=await page.evaluate(async()=>{
    resetAllSilent();window.A_CEIL_AutoCount.setEnabled(true);
    const rows=()=>elemItems.filter(x=>x.source==='white_insert').map(x=>({id:x.id,qty:x.qty,selected:x.insertSelected,manual:x.manualQtyOverride}));
    const geom=()=>{realPts=[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}];pts=realPts.map(p=>({x:p.x+100,y:p.y+100}));lengths=[400,300,400,300];closed=true;};
    elemGroups=[{id:'inserts',name:'Вставки'}];
    elemItems=[{id:'white',groupId:'inserts',name:'Вставка біла',source:'white_insert',sourceVariant:'white',qty:0,price:60,unit:'м',insertSelected:true},{id:'black',groupId:'inserts',name:'Вставка чорна',source:'white_insert',sourceVariant:'black',qty:14,price:80,unit:'м',insertSelected:false}];
    geom();await autoFillNomenclature({silent:true});
    const defaultWhite=rows();
    updateElemQty('white',0);updateElemQty('black',14);
    await autoFillNomenclature({silent:true});await new Promise(r=>setTimeout(r,350));
    const manualBlack=rows();
    const catalog=_nomenV339CaptureCatalog();
    const catalogWhite=catalog.items.map(x=>({id:x.id,selected:x.insertSelected,qty:x.qty}));
    const runtimeAfterSave=rows();
    const dirty=catalog.items.map(x=>({...x,insertSelected:x.id==='black',qty:x.id==='black'?14:0}));
    const merges={};
    merges.auth=_nomenV339MergeCatalogWithRoom(dirty,elemItems).map(x=>({id:x.id,selected:x.insertSelected}));
    const coldMerge=_nomenV339MergeCatalogWithRoom(dirty,[]).map(x=>({id:x.id,selected:x.insertSelected}));
    const payloads=[];
    _sbUser={id:'insert-test'};
    _sb={rpc:async()=>({data:{is_active:true,app_role:"owner",nomenclature_access:true},error:null}),from(){return {upsert:async p=>{payloads.push(structuredClone(p));return {error:null};},select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{items:dirty,groups:elemGroups},error:null})}}};
    window._sb=_sb;window._sbUser=_sbUser;window._nomenCloudLoaded=true;
    await forceSyncNomenclature();await saveNomenclatureToCloud();
    await forceLoadNomenclature();
    const afterCloud=rows();
    window.A_CEIL_OfflineNomenclature.capture();
    const offline=JSON.parse(localStorage.getItem('A_CEIL_nomenclature_offline_v1'));
    window.A_CEIL_OfflineNomenclature.restore();
    const afterOffline=rows();
    _sb=null;_sbUser=null;window._sb=null;window._sbUser=null;
    const roomState=JSON.stringify({pts,realPts,lengths,closed:true,elemItems,elemGroups});
    setProjects([{id:'insert-object',multiRoom:true,rooms:[{id:'a',name:'Black',state:roomState},{id:'b',name:'Fresh',state:null}]}]);
    _activeObjectId='insert-object';_activeRoomIdx=null;openRoom(1);geom();await autoFillNomenclature({silent:true});
    const newRoom=rows();
    openRoom(0);await autoFillNomenclature({silent:true});const restoredRoom=rows();
    resetAll();geom();await autoFillNomenclature({silent:true});const newProject=rows();
    saveState();
    return {defaultWhite,manualBlack,catalogWhite,runtimeAfterSave,merges,coldMerge,payloads,afterCloud,offline:offline.items,afterOffline,newRoom,restoredRoom,newProject};
   });
   const selected=(rows,id)=>rows.find(x=>x.id===id)?.selected===true&&rows.find(x=>x.id!==id)?.selected===false;
   const counted=(rows,id)=>selected(rows,id)&&rows.find(x=>x.id===id).qty===14&&rows.find(x=>x.id!==id).qty===0;
   for(const name of ['defaultWhite','newRoom','newProject'])assert.ok(counted(result[name],'white'),name+': '+JSON.stringify(result[name]));
   for(const name of ['manualBlack','runtimeAfterSave','afterCloud','afterOffline','restoredRoom'])assert.ok(counted(result[name],'black'),name+': '+JSON.stringify(result[name]));
   assert.ok(selected(result.catalogWhite,'white'),'saved catalog must default to white');
   assert.ok(selected(result.coldMerge,'white'),'old black catalog must default to white on cold load');
   assert.ok(selected(result.merges.auth,'black'),'merge must keep the room choice');
   assert.equal(result.payloads.length,2,'both cloud save paths must be exercised');
   for(const payload of result.payloads)assert.ok(selected(payload.items.map(x=>({...x,selected:x.insertSelected})),'white'),'cloud payload leaked black choice');
   assert.ok(result.offline.find(x=>x.id==='white').insertSelected&&!result.offline.find(x=>x.id==='black').insertSelected,'offline catalog must default to white');
   await page.reload({waitUntil:'load'});await page.waitForTimeout(400);
   assert.equal(await page.evaluate(()=>getProjects().find(p=>p.id==='insert-object').rooms[0]&&JSON.parse(getProjects().find(p=>p.id==='insert-object').rooms[0].state).elemItems.find(x=>x.id==='black').insertSelected),true,'saved black room survives reload');
   assert.deepEqual(errors,[],'unhandled browser errors');
   await page.close();console.log('PASS insert isolation @'+width);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
