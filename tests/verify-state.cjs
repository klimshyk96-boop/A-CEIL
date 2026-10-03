const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
const checks=[];function check(name,value,info){assert.ok(value,name+': '+JSON.stringify(info));checks.push(name);}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(b,390,3);page.on('dialog',d=>d.accept());await reveal(page);
  const first=await page.evaluate(async()=>{
   resetAllSilent();
   const points=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];
   const room=(id,n,w)=>({id,name:n,price:12345,state:JSON.stringify({pts:points,realPts:[{x:0,y:0},{x:w,y:0},{x:w,y:300},{x:0,y:300}],lengths:[w,300,w,300],closed:true,circleMode:false,elemGroups:[{id:'test',name:'Test'}],elemItems:[{id:'test-item',groupId:'test',name:'Test item',unit:'м²',price:777,qty:12,manualQtyOverride:true}]})});
   setProjects([{id:'test-project',_localId:'test-project',name:'Regression',multiRoom:true,rooms:[room('room-a','A',400),room('room-b','B',500)],state:JSON.stringify({rooms:[]})}]);
   _activeObjectId='test-project';_activeRoomIdx=null;window._activeRoomId=null;
   openRoom(0);const a=JSON.stringify(lengths);
   const priceBefore=elemItems.map(x=>({id:x.id,price:x.price,qty:x.qty}));
   await openElementsModal();const priceAfter=elemItems.map(x=>({id:x.id,price:x.price,qty:x.qty}));
   if(typeof closeElementsModal==='function')closeElementsModal();
   openRoom(1);const second=JSON.stringify(lengths);openRoom(0);const restored=JSON.stringify(lengths);
   await saveCurrentRoom({silent:true});
   const persisted=getProjects().find(p=>p.id==='test-project');
   return {a,second,restored,priceBefore,priceAfter,rooms:persisted?.rooms.map(r=>({id:r.id,state:JSON.parse(r.state),price:r.price}))};
  });
  
  check('Room A loads',first.a==='[400,300,400,300]',first);
  check('Room B loads separately',first.second==='[500,300,500,300]',first);
  check('A → B → A preserves dimensions',first.restored===first.a,first);
  check('Opening nomenclature preserves quantities and prices',JSON.stringify(first.priceBefore)===JSON.stringify(first.priceAfter),first);
  check('Room save persists geometry',first.rooms?.length===2&&first.rooms[0].state.lengths[0]===400,first);
  await page.reload({waitUntil:'load'});await page.waitForTimeout(1000);
  const reload=await page.evaluate(()=>getProjects().find(p=>p.id==='test-project'));
  check('Projects survive reload',reload?.rooms?.length===2,reload);
  const deleted=await page.evaluate(()=>{_activeObjectId='test-project';_activeRoomIdx=null;window._activeRoomId=null;openRoom(0);deleteRoom(1);return getProjects().find(p=>p.id==='test-project');});
  check('Room deletion updates both representations',deleted?.rooms?.length===1&&JSON.parse(deleted.state).rooms.length===1,deleted);
  await page.reload({waitUntil:'load'});await page.waitForTimeout(1000);
  check('Deleted room stays deleted after reload',await page.evaluate(()=>getProjects().find(p=>p.id==='test-project')?.rooms.length===1));
  await reveal(page);
  const lighting=await page.evaluate(()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:600},{x:100,y:600}];realPts=[{x:0,y:0},{x:400,y:0},{x:400,y:400},{x:0,y:400}];lengths=[400,400,400,400];closed=true;
   linearElements=[{id:'light-test',elementType:'lightLine',shape:'line',lightShapeMode:'rhombus',rhombusSide:100,rhombusAngle:60,rotation:0,centerCanvasPx:{x:350,y:350},segments:[100]}];window.linearElements=linearElements;
   openLinearElementEditor('light-test');
   const side=document.getElementById('leRhombusSide');if(side){side.value='140';side.dispatchEvent(new Event('input',{bubbles:true}));}
   const rotation=document.getElementById('leRotationDeg');if(rotation){rotation.value='45';rotation.dispatchEvent(new Event('input',{bubbles:true}));}
   return {sideFound:!!side,rotationFound:!!rotation,side:linearElements[0].rhombusSide,rotation:linearElements[0].rotation};
  });
  check('Live rhombus side updates in its owner module',lighting.sideFound&&lighting.side===140,lighting);
  if(lighting.rotationFound)check('Live rotation updates',lighting.rotation===45,lighting);
  await page.evaluate(()=>{
   document.querySelectorAll('.modal-overlay,[id="leModal"]').forEach(e=>{e.classList.remove('open');if(e.id==='leModal')e.style.display='none';});
   resetAllSilent();pts=[{x:100,y:100},{x:650,y:100},{x:650,y:330},{x:400,y:330},{x:400,y:620},{x:100,y:620}];realPts=structuredClone(pts);lengths=[550,230,250,290,300,520];closed=true;viewScale=1;viewOffsetX=0;viewOffsetY=0;draw();
  });
  await page.screenshot({path:__dirname+'/review-mobile-complex.png'});
  await page.locator('#cv').screenshot({path:__dirname+'/review-canvas.png'});
  const before=await page.evaluate(()=>({pts:JSON.stringify(pts),lengths:JSON.stringify(lengths)}));
  await page.evaluate(()=>window.A·CEIL.ToolPanel.collapse());await page.waitForTimeout(400);
  const collapsed=await page.evaluate(()=>{const r=cv.getBoundingClientRect(),p=pts[0],w=ACEILCanvas.width(cv),h=ACEILCanvas.height(cv);const q=getCanvasPoint(r.left+(p.x*viewScale+viewOffsetX)*r.width/w,r.top+(p.y*viewScale+viewOffsetY)*r.height/h);return {w,h,roundtrip:Math.hypot(q.x-p.x,q.y-p.y),pts:JSON.stringify(pts),lengths:JSON.stringify(lengths)};});
  check('Expanded canvas keeps input mapping and geometry',collapsed.roundtrip<1e-6&&collapsed.pts===before.pts&&collapsed.lengths===before.lengths,collapsed);
  await page.evaluate(()=>window.A·CEIL.ToolPanel.expand());await page.waitForTimeout(200);
  check('Canvas returns to nominal size',await page.evaluate(()=>ACEILCanvas.height(cv)===750));
  check('No unhandled browser errors',errors.length===0,errors);
  fs.writeFileSync('verification-state.json',JSON.stringify({checks,passed:checks.length},null,2));console.log('PASS',checks.length);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
