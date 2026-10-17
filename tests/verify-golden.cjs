/* Golden-master: auto-count, estimate totals and structured report must stay identical across refactors,
   and must not depend on the viewport (phone vs desktop).  Update with: node tests/verify-golden.cjs --update */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
const GOLD=path.join(__dirname,'golden.json'),update=process.argv.includes('--update');
async function snapshot(browser,width,dpr){
 const {page,errors}=await open(browser,width,dpr);page.on('dialog',d=>d.accept());await reveal(page);
 const data=await page.evaluate(async()=>{
  const API=window['A\u00b7CEIL'].API;
  const shapes={
   rect500x300:[[0,0],[500,0],[500,300],[0,300]],
   rect350x420:[[0,0],[350,0],[350,420],[0,420]],
   lshape:[[0,0],[600,0],[600,200],[300,200],[300,400],[0,400]]
  };
  const norm=items=>items.map(x=>({name:x.name,qty:x.qty,unit:x.unit,price:x.price,source:x.source||null})).sort((a,b)=>(a.name+a.qty).localeCompare(b.name+b.qty));
  const out={rooms:{}};const rooms=[];
  for(const [key,poly] of Object.entries(shapes)){
   API.state.reset();
   realPts=poly.map(([x,y])=>({x,y}));pts=poly.map(([x,y])=>({x:100+x,y:100+y}));
   lengths=poly.map((p,i)=>{const q=poly[(i+1)%poly.length];return Math.round(Math.hypot(q[0]-p[0],q[1]-p[1]));});closed=true;
   await API.nomenclature.autoFill();API.estimate.recalc();
   const items=norm(elemItems);
   out.rooms[key]={lengths:lengths.slice(),items,total:items.reduce((s,x)=>s+(parseFloat(x.qty)||0)*(parseFloat(x.price)||0),0),groupNames:elemGroups.map(g=>g.name)};
   rooms.push({id:'room-'+key,name:key,price:out.rooms[key].total,state:JSON.stringify({pts,realPts,lengths,closed:true,elemGroups,elemItems})});
  }
  const single={id:'golden-single',_localId:'golden-single',name:'Golden single',multiRoom:false,rooms:[],state:rooms[0].state,price:rooms[0].price};
  const multi={id:'golden-multi',_localId:'golden-multi',name:'Golden multi',multiRoom:true,rooms,state:JSON.stringify({rooms:[]}),price:rooms.reduce((s,r)=>s+r.price,0)};
  API.projects.replaceAll([single,multi]);
  out.report={};
  for(const p of API.projects.list()){
   _activeObjectId=p.id;_activeRoomIdx=null;window._activeRoomId=null;
   const rep=await API.report.buildStructured(p);
   out.report[p.id]=JSON.parse(JSON.stringify(rep));
  }
  _activeObjectId='golden-multi';API.projects.openRoom(1);
  out.stableTotalMulti=API.estimate.stableProjectTotal();
  /* rich scenario: every auto-count source (profiles, insert, corners, perimeter, lights, vent) on a room with wall marks and lights */
  API.state.reset();
  realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];pts=realPts.map(p=>({x:100+p.x,y:100+p.y}));lengths=[500,300,500,300];closed=true;
  await API.nomenclature.autoFill();
  elemGroups.push({id:'g_rich',name:'Профілі та елементи'});
  const mk=(n,u,price,s)=>({id:'r_'+s,groupId:'g_rich',icon:'',name:n,qty:0,unit:u,price,inputMode:'auto',source:s,autoFilled:false});
  elemItems.push(mk('Профіль базовий','м',100,'main_profile'),mk('Профіль тіньовий','м',300,'shadow_profile'),mk('Профіль парящий','м',350,'floating_profile'),mk('Вставка біла','м',80,'white_insert'),mk('Кути','шт',50,'corners'),mk('Периметр','м',20,'full_perimeter'),mk('Світильник','шт',200,'spot_light'),mk('Люстра','шт',500,'chandelier'),mk('Вентиляція','шт',150,'ventilation'));
  window.wallMarks=[{id:'m1',sideIndex:0,type:'Тіньовий профіль',lenCm:200,offsetCm:150,anchor:'center',color:'#000'},{id:'m2',sideIndex:1,type:'Парящий профіль',lenCm:100,offsetCm:100,anchor:'center',color:'#000'}];
  try{wallMarks=window.wallMarks}catch(e){}
  window.lightMarks=[{id:'l1',type:'spot',x:150,y:150},{id:'l2',type:'spot',x:250,y:150},{id:'l3',type:'spot',x:350,y:150},{id:'l4',type:'chandelier',x:300,y:250},{id:'l5',type:'vent',x:500,y:350}];
  try{lightMarks=window.lightMarks}catch(e){}
  await API.nomenclature.autoFill();API.estimate.recalc();
  const richItems=norm(elemItems.filter(x=>x.groupId==='g_rich'));
  out.rich={items:richItems,total:norm(elemItems).reduce((s,x)=>s+(parseFloat(x.qty)||0)*(parseFloat(x.price)||0),0)};
  return out;
 });
 if(errors.length)throw new Error('page errors @'+width+': '+errors.join(' | '));
 await page.close();return data;
}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const phone=await snapshot(b,390,3),desktop=await snapshot(b,1440,1);
  assert.deepEqual(phone,desktop,'results differ between phone and desktop viewport');
  const s=JSON.stringify(phone,null,1);
  if(update||!fs.existsSync(GOLD)){fs.writeFileSync(GOLD,s+'\n');console.log('golden written');}
  else{const gold=JSON.parse(fs.readFileSync(GOLD,'utf8'));assert.deepEqual(phone,gold,'output differs from tests/golden.json');}
  const n=Object.keys(phone.rooms).length;
  assert.ok(Object.values(phone.rooms).every(r=>r.items.length>0&&r.total>0),'autofill produced no priced items');
  console.log('PASS golden ('+n+' shapes, phone=desktop'+(update?', updated':'')+')');
 }finally{await b.close();}
})().catch(e=>{console.error('FAIL',e.message.slice(0,600));process.exit(1);});
