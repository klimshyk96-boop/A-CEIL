const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const src=fs.readFileSync(path.join(__dirname,'..','js/nomenclature/213-aceil-film-catalog-sync.js'),'utf8');

/* ---------- 1. чисте злиття ---------- */
const sandbox={window:{addEventListener(){},dispatchEvent(){},CustomEvent:function(){}},document:{addEventListener(){},visibilityState:'visible'},
 localStorage:{getItem(){return null},setItem(){}},navigator:{onLine:true},setInterval(){return 0},clearInterval(){},setTimeout,clearTimeout,CustomEvent:function(){},console};
vm.runInNewContext(src,sandbox);
const api=sandbox.window.ACEILFilmCatalogSync,canon=api.canon,merge=(a,b)=>JSON.parse(JSON.stringify(api.merge(a,b)));
const K=(c,cid)=>Object.assign({cid},c);
const S=(id,u)=>({id,manufacturer:id,name:id,u}),C=(sid,code,u,price=1)=>({seriesId:sid,code,display:code,texture:'mat',widths:[{nominal:3.6,max:3.6,price}],u});
const doc=(series,colors,deleted={},pricing={})=>({v:1,custom:{v:1,series,colors,reserved:[],deleted,descorLabellImported:false},pricing});
let m=merge(doc([S('a',1)],[C('a','M901',1)]),doc([S('a',1),S('b',2)],[C('a','M902',2),C('b','M901',2)]));
assert.deepEqual(m.custom.colors.map(c=>c.seriesId+c.code).sort(),['aM901','aM902','bM901']);
m=merge(doc([S('a',1)],[C('a','M901',5,500)]),doc([S('a',1)],[C('a','M901',3,300)]));
assert.equal(m.custom.colors[0].widths[0].price,500,'newer record wins');
m=merge(doc([S('a',1)],[]),doc([S('a',1)],[C('a','M901',2)],{}));
m=merge(doc([S('a',1)],[],{'c:a:M901':10}),doc([S('a',1)],[C('a','M901',2)]));
assert.equal(m.custom.colors.length,0,'tombstone removes older colour');
m=merge(doc([S('a',1)],[],{'c:a:M901':10}),doc([S('a',1)],[C('a','M901',20)]));
assert.equal(m.custom.colors.length,1,'re-added later colour survives');
m=merge(doc([],[],{'s:a':9},{}),doc([S('a',1)],[C('a','M901',2)],{},{a:{rates:{mat:{w360:1}},u:3}}));
assert.deepEqual([m.custom.series.length,m.custom.colors.length,Object.keys(m.pricing).length],[0,0,0],'series tombstone drops colours and tariffs');
m=merge(doc([],[],{},{premium:{rates:{mat:{narrow:400}},u:5}}),doc([],[],{},{premium:{rates:{mat:{narrow:380}},u:2},classic:{rates:{},u:1}}));
assert.equal(m.pricing.premium.rates.mat.narrow,400);assert.ok(m.pricing.classic);
m=merge(doc([S('a',1)],[K(C('a','M902',5),'x1')]),doc([S('a',1)],[K(Object.assign(C('a','M902',6),{display:'OTHER'}),'x2')]));
assert.equal(m.custom.colors.length,2,'same code created on two devices keeps both colours');
assert.equal(new Set(m.custom.colors.map(c=>c.code)).size,2);
assert.equal(m.custom.colors.find(c=>c.cid==='x1').code,'M902','earlier colour keeps its code');
m=merge(doc([S('a',1)],[K(C('a','M902',5),'x1')]),doc([S('a',1)],[K(Object.assign(C('a','M902',9),{display:'RENAMED'}),'x1')]));
assert.equal(m.custom.colors.length,1,'rename of the same colour is not a collision');assert.equal(m.custom.colors[0].display,'RENAMED');
{ // two devices + a stale third copy keep exchanging a collision: count must stay 2
 const x1=K(C('a','M902',5),'x1'),x2=K(Object.assign(C('a','M902',6),{display:'OTHER'}),'x2');
 let P=doc([S('a',1)],[x1]),Q=doc([S('a',1)],[x2]),R=doc([S('a',1)],[x2]); // R is a stale holder of x2@M902
 for(let i=0;i<5;i++){P=merge(P,Q);Q=merge(Q,P);R=merge(R,Q);P=merge(P,R);Q=merge(Q,R);}
 for(const d of[P,Q,R]){assert.equal(d.custom.colors.length,2,'collision does not multiply colours');assert.equal(new Set(d.custom.colors.map(c=>c.cid)).size,2);}
 assert.equal(canon(P),canon(Q));assert.equal(canon(Q),canon(R));
}
{ // colour deleted after its code was moved: a stale copy under the OLD code must not come back
 const stale=doc([S('a',1)],[K(C('a','M902',5),'x2')]);
 const afterDelete=doc([S('a',1)],[],{'c:a:M903':50,'k:x2':50});
 assert.equal(merge(stale,afterDelete).custom.colors.length,0,'deleted colour is not resurrected by a stale copy');
 assert.equal(merge(afterDelete,stale).custom.colors.length,0);
 const legacy=doc([S('a',1)],[],{'c:a:M902':50});
 assert.equal(merge(stale,legacy).custom.colors.length,0,'code tombstone still works');
 const edited=doc([S('a',1)],[K(C('a','M902',90),'x2')]);
 assert.equal(merge(edited,afterDelete).custom.colors.length,1,'an edit made after the deletion wins');
}
{ // equal timestamps must resolve identically on every device (no 975 <-> 0 ping-pong)
 const p1=doc([S('a',1)],[K(C('a','M902',7,975),'t1')],{},{a:{rates:{mat:{w360:1}},u:4}}),p2=doc([S('a',1)],[K(C('a','M902',7,0),'t1')],{},{a:{rates:{mat:{w360:2}},u:4}});
 assert.equal(canon(merge(p1,p2)),canon(merge(p2,p1)),'merge is commutative on equal timestamps');
 let x=p1,y=p2;for(let i=0;i<4;i++){x=merge(x,y);y=merge(y,x)}assert.equal(canon(x),canon(y),'two devices converge');
}
assert.equal(canon(merge(m,m)),canon(m),'merge is idempotent');

/* ---------- 2. два «пристрої» та сервер як у SQL ---------- */
const db={};
function server(uid,name,args){
 if(name==='aceil_get_film_catalog')return db[uid]?{data:db[uid].data,rev:db[uid].rev,uid}:{data:null,rev:0,uid};
 if(name==='aceil_save_film_catalog'){
  if(args.p_data.uid!==uid){const e=new Error('film_catalog_user_changed');e.code='42501';throw e}
  const row=db[uid];
  if(row&&row.rev!==(args.p_base_rev||0)){const e=new Error('film_catalog_conflict');e.code='40001';throw e}
  const d=JSON.parse(JSON.stringify(args.p_data));delete d.uid;db[uid]={data:d,rev:(row?row.rev:0)+1};return db[uid].rev;
 }
 const e=new Error('could not find the function');e.code='PGRST202';throw e;
}
async function device(browser,uid,init){
 const {page,errors}=await open(browser,390,1,undefined,init?async p=>{await p.addInitScript(init)}:undefined);await reveal(page);await page.waitForTimeout(800);
 await page.exposeFunction('__srv',(u,n,a)=>{try{return {data:server(u,n,a),error:null}}catch(e){return {data:null,error:{code:e.code,message:e.message}}}});
 await page.evaluate(id=>{window.__fakeUid=id;const ch={on(){return ch},subscribe(){return ch},unsubscribe(){}},c={rpc:(n,a)=>window.__srv(window.__fakeUid,n,a),channel:()=>ch,removeChannel(){}};window._sb=c;window._sbUser={id};try{_sb=c}catch(_){}try{_sbUser={id}}catch(_){}},uid);
 return {page,errors};
}
const save=(page,display,price)=>page.evaluate(([d,p])=>window.ACEILCustomFilm.saveColor({manufacturer:'Novum',texture:'mat',display:d,widths:[{nominal:'3,6',max:'',price:p}]}),[display,price]);
const sync=page=>page.evaluate(()=>window.ACEILFilmCatalogSync.sync().then(s=>s.state));
const colours=page=>page.evaluate(()=>{const s=window.ACEIL_FILM_SERIES.filter(x=>x.custom&&x.manufacturer==='Novum');return s.flatMap(x=>window.ACEIL_COLOR_CATALOG_BY_SERIES[x.id].map(c=>c.displayCode))});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 const A=await device(browser,'u1'),B=await device(browser,'u1');
 await A.page.evaluate(()=>localStorage.removeItem('aceil_film_sync_v1'));
 await save(A.page,'PS-204',510);
 assert.equal(await sync(A.page),'ok');
 assert.ok(db.u1&&db.u1.data.custom.colors.some(c=>c.display==='PS-204'),'device A pushed catalogue');
 // device B pulls it
 assert.equal(await sync(B.page),'ok');
 assert.ok((await colours(B.page)).includes('PS-204'),'device B received the colour');
 // both change offline, then sync -> union
 await save(A.page,'AX-1',400);await save(B.page,'BX-2',450);
 await sync(A.page);await sync(B.page);await sync(A.page);
 for(const d of[A,B])assert.deepEqual((await colours(d.page)).sort(),['AX-1','BX-2','PS-204']);
 // price change (variants editor path) propagates
 await A.page.evaluate(()=>window.ACEILSetFilmPricing('premium',{mat:{narrow:777,wide:888}}));
 await sync(A.page);await sync(B.page);
 assert.equal(await B.page.evaluate(()=>window.ACEILGetFilmPricing('premium').mat.narrow),777);
 // deletion propagates
 await A.page.evaluate(()=>{const s=window.ACEIL_FILM_SERIES.find(x=>x.custom&&x.manufacturer==='Novum');window.ACEILCustomFilm.deleteColor(s.id,window.ACEIL_COLOR_CATALOG_BY_SERIES[s.id].find(c=>c.displayCode==='AX-1').code)});
 await sync(A.page);await sync(B.page);
 assert.deepEqual((await colours(B.page)).sort(),['BX-2','PS-204']);
 // a different account in the same browser never inherits or uploads this catalogue
 await B.page.evaluate(()=>{window.__fakeUid='u2';window._sbUser={id:'u2'};try{_sbUser={id:'u2'}}catch(_){}});
 await sync(B.page);
 assert.ok(!JSON.stringify(db.u2||{}).includes('Novum'),'foreign local catalogue is not uploaded');
 assert.deepEqual(await colours(B.page),[]);
 // (1) a change made while the cloud copy is loading must survive and be uploaded
 await B.page.evaluate(()=>{window.__fakeUid='u1';window._sbUser={id:'u1'};try{_sbUser={id:'u1'}}catch(_){}});
 await sync(B.page); // settle ownership: this device now belongs to u1
 await B.page.evaluate(()=>{window.__gate=new Promise(r=>{window.__open=r});const c=window._sb;const orig=c.rpc;
  window._sb=c;try{_sb=c}catch(_){}c.rpc=(n,a)=>n==='aceil_get_film_catalog'?window.__gate.then(()=>orig(n,a)):orig(n,a)});
 const p1=B.page.evaluate(()=>window.ACEILFilmCatalogSync.sync().then(s=>s.state));
 await B.page.waitForTimeout(150);
 await save(B.page,'DURING-LOAD',321);
 await B.page.evaluate(()=>window.__open());await p1;await sync(B.page);
 assert.ok((await colours(B.page)).includes('DURING-LOAD'),'change made during load is kept locally');
 assert.ok(db.u1.data.custom.colors.some(c=>c.display==='DURING-LOAD'),'and reaches the cloud');
 // (3) switching account while a request is in flight never writes the first account's catalogue to the second
 await B.page.evaluate(()=>{window.__gate=new Promise(r=>{window.__open=r});});
 const before=JSON.stringify(db.u2||null);const revBefore=db.u2&&db.u2.rev;
 const p3=B.page.evaluate(()=>window.ACEILFilmCatalogSync.sync().then(s=>s.state));
 await B.page.waitForTimeout(150);
 await save(B.page,'ONLY-U1',111);
 await B.page.evaluate(()=>{window.__fakeUid='u2';window._sbUser={id:'u2'};try{_sbUser={id:'u2'}}catch(_){}});
 await B.page.evaluate(()=>window.__open());await p3;
 assert.equal(JSON.stringify(db.u2||null),before,'second account row untouched by the first account');
 await sync(B.page);
 assert.ok(!(db.u2&&JSON.stringify(db.u2).includes('ONLY-U1')),'first account data never reaches second account');
 assert.ok(!(await colours(B.page)).includes('ONLY-U1'),'second account does not see first account local catalogue');
 // switching back restores the first account's own unsynced work
 await B.page.evaluate(()=>{window.__fakeUid='u1';window._sbUser={id:'u1'};try{_sbUser={id:'u1'}}catch(_){}});
 await sync(B.page);
 assert.ok(db.u1.data.custom.colors.some(c=>c.display==='ONLY-U1'),'first account change is not lost after a switch');
 // (2) code collision: the project keeps the BLUE colour, qty stays, nothing turns RED
 const C3=await device(browser,'u3');
 db.u3={rev:1,data:{v:1,custom:{v:1,series:[{id:'s1',manufacturer:'Zed',collection:'',name:'Zed',u:1}],colors:[{cid:'k2',seriesId:'s1',code:'M902',display:'RED',texture:'mat',colorName:'',swatch:'#ff0000',widths:[{nominal:3.6,max:3.6,price:500}],u:1000}],reserved:[],deleted:{},descorLabellImported:true},pricing:{}}};
 await C3.page.evaluate(()=>{
  const st=window.ACEILFilmCatalogStore,d=st.readCustom();d.descorLabellImported=true;
  d.series.push({id:'s1',manufacturer:'Zed',collection:'',name:'Zed',u:1});
  d.colors.push({cid:'k1',seriesId:'s1',code:'M902',display:'BLUE',texture:'mat',colorName:'',swatch:'#0000ff',widths:[{nominal:3.6,max:3.6,price:480}],u:2000});
  st.writeCustom(d);
  window.__aceilColorPickerChoose('M902','mat','s1',true);
  const it=elemItems.find(x=>x.filmDisplayCode==='BLUE'&&x.filmWidth===3.6);it.qty=12;it.manualQtyOverride=true;window.__blueId=it.id;
 });
 assert.equal(await C3.page.evaluate(()=>elemItems.find(x=>x.id===window.__blueId).filmCid),'k1','items remember the colour cid');
 await sync(C3.page);await sync(C3.page);
 const after=await C3.page.evaluate(()=>{
  const list=window.ACEIL_COLOR_CATALOG_BY_SERIES.s1,blue=list.find(c=>c.cid==='k1'),red=list.find(c=>c.cid==='k2');
  const it=elemItems.find(x=>x.id===window.__blueId),mat=window.A_CEILColorPicker.material();
  return{n:list.length,blue:blue.code,red:red.code,itemCode:it.colorCode,qty:it.qty,name:it.name,matLabel:mat&&mat.label,matCode:mat&&mat.code,swatch:mat&&mat.swatch,
   reds:elemItems.filter(x=>x.filmDisplayCode==='RED'||/RED/.test(x.name||'')).length}});
 assert.equal(after.n,2,'no duplicated colours after repeated syncs');
 assert.equal(after.red,'M902','earlier colour keeps its code');assert.notEqual(after.blue,'M902');
 assert.equal(after.itemCode,after.blue,'project item follows the colour to its new code');
 assert.equal(after.qty,12,'quantity is kept');assert.match(after.name,/^BLUE /);
 assert.equal(after.matCode,after.blue);assert.match(after.matLabel,/^BLUE/);assert.match(after.swatch||'', /0000ff/i);assert.equal(after.reds,0,'the project did not switch to RED');
 // the same project opened later from a stale item snapshot (saved before the move) is healed on load
 const healed=await C3.page.evaluate(([old,id])=>{const it=elemItems.find(x=>x.id===id);it.colorCode=old;const changed=window.A_CEIL_NormalizeFilmGroups();return{changed,code:elemItems.find(x=>x.id===id).colorCode}},['M902',await C3.page.evaluate(()=>window.__blueId)]);
 assert.equal(healed.code,after.blue,'stale saved item is healed by cid');
 // (4) deletion writes a cid tombstone
 await C3.page.evaluate(()=>window.ACEILCustomFilm.deleteColor('s1',window.ACEIL_COLOR_CATALOG_BY_SERIES.s1.find(c=>c.cid==='k1').code));
 assert.ok(Object.keys(await C3.page.evaluate(()=>window.ACEILFilmCatalogStore.readCustom().deleted)).includes('k:k1'),'cid tombstone recorded');
 assert.deepEqual(C3.errors,[]);
 // (5) OLD project: items saved before cids existed still follow their colour after a code collision
 const C4=await device(browser,'u4');
 db.u4={rev:1,data:{v:1,custom:{v:1,series:[{id:'s1',manufacturer:'Zed',collection:'',name:'Zed',u:1}],colors:[{cid:'k2',seriesId:'s1',code:'M902',display:'RED',texture:'mat',colorName:'',swatch:'#ff0000',widths:[{nominal:3.6,max:3.6,price:500}],u:1000}],reserved:[],deleted:{},descorLabellImported:true},pricing:{}}};
 await C4.page.evaluate(()=>{
  const st=window.ACEILFilmCatalogStore,d=st.readCustom();d.descorLabellImported=true;
  d.series.push({id:'s1',manufacturer:'Zed',collection:'',name:'Zed',u:1});
  d.colors.push({cid:'k1',seriesId:'s1',code:'M902',display:'BLUE',texture:'mat',colorName:'',swatch:'#0000ff',widths:[{nominal:3.6,max:3.6,price:480}],u:2000});
  st.writeCustom(d);
  window.__aceilColorPickerChoose('M902','mat','s1',true);
  const it=elemItems.find(x=>x.filmDisplayCode==='BLUE'&&x.filmWidth===3.6);it.qty=12;it.manualQtyOverride=true;window.__blueId=it.id;
  elemItems.forEach(x=>{delete x.filmCid});   // as saved by the previous app version
 });
 await sync(C4.page);await sync(C4.page);
 const old=await C4.page.evaluate(()=>{
  const list=window.ACEIL_COLOR_CATALOG_BY_SERIES.s1,blue=list.find(c=>c.cid==='k1'),it=elemItems.find(x=>x.id===window.__blueId),mat=window.A_CEILColorPicker.material();
  return{blue:blue.code,itemCode:it.colorCode,cid:it.filmCid,qty:it.qty,matLabel:mat&&mat.label,swatch:mat&&mat.swatch,
   other:elemItems.filter(x=>x.colorCode==='M902'&&x.filmWidth>0).map(x=>x.name+':'+x.qty)}});
 assert.notEqual(old.blue,'M902');assert.equal(old.itemCode,old.blue,'old item (no cid) follows its colour');
 assert.equal(old.cid,'k1');assert.equal(old.qty,12,'old project quantity is kept');
 assert.match(old.matLabel,/^BLUE/);assert.match(old.swatch||'',/0000ff/i);
 assert.deepEqual(C4.errors,[]);
 // (6) fabric price set by the user survives the code being moved; legacy overrides are folded into the colour
 const C5=await device(browser,'u5');
 db.u5={rev:1,data:{v:1,custom:{v:1,series:[{id:'s9',manufacturer:'Fab',collection:'',name:'Fab',u:1}],colors:[{cid:'f2',seriesId:'s9',code:'M951',display:'OTHER',texture:'fabric',colorName:'',swatch:'#999999',widths:[{nominal:3.1,max:3.1,price:700}],u:1000}],reserved:[],deleted:{},descorLabellImported:true},pricing:{}}};
 const fab=await C5.page.evaluate(()=>{
  const st=window.ACEILFilmCatalogStore,d=st.readCustom();d.descorLabellImported=true;
  d.series.push({id:'s9',manufacturer:'Fab',collection:'',name:'Fab',u:1});
  d.colors.push({cid:'f1',seriesId:'s9',code:'M951',display:'MINE',texture:'fabric',colorName:'',swatch:'#112233',widths:[{nominal:3.1,max:3.1,price:800}],u:2000});
  st.writeCustom(d);
  // price edited through the estimate-variants / nomenclature price path
  window.ACEILSetFilmPricing('s9',{fabric:{M951_w310:975}});
  return{price:window.ACEILGetFilmPricing('s9').fabric.M951_w310,overrides:JSON.parse(localStorage.getItem('aceil_film_pricing_overrides_v1')||'{}').s9||{}}});
 assert.equal(fab.price,975);assert.deepEqual(fab.overrides,{},'custom series prices live in the colour, not in a code-keyed override');
 await sync(C5.page);await sync(C5.page);
 const moved=await C5.page.evaluate(()=>{
  const list=window.ACEIL_COLOR_CATALOG_BY_SERIES.s9,mine=list.find(c=>c.cid==='f1'),other=list.find(c=>c.cid==='f2'),p=window.ACEILGetFilmPricing('s9').fabric;
  return{mine:mine.code,other:other.code,minePrice:p[mine.code+'_w310'],otherPrice:p[other.code+'_w310']}});
 assert.notEqual(moved.mine,'M951');assert.equal(moved.other,'M951');
 assert.equal(moved.minePrice,975,'price follows the colour to its new code');assert.equal(moved.otherPrice,700,'the other colour keeps its own price');
 // legacy: an old code-keyed override is folded into the colour on load
 const legacy=await C5.page.evaluate(()=>{
  const st=window.ACEILFilmCatalogStore,k=st.keys,d=st.readCustom(),c=d.colors.find(x=>x.cid==='f1');
  c.widths[0].price=800;c.u=1;st.writeCustom(d);
  localStorage.setItem(k.pricing,JSON.stringify({s9:{fabric:{[c.code+'_w310']:990}}}));localStorage.setItem(k.pricingMeta,JSON.stringify({s9:Date.now()}));
  st.writeCustom(st.readCustom());
  return{price:window.ACEILGetFilmPricing('s9').fabric[c.code+'_w310'],ov:JSON.parse(localStorage.getItem(k.pricing)).s9}});
 assert.equal(legacy.price,990);assert.deepEqual(legacy.ov,{});
 // the price reached the cloud with the colour
 await sync(C5.page);
 assert.equal(db.u5.data.custom.colors.find(c=>c.cid==='f1').widths[0].price,990,'price is stored with the colour in the cloud');
 assert.deepEqual(C5.errors,[]);
 // (7) two devices, one with a pre-update price (975) and one with the default (0): the price must stick, not alternate
 const legacyCustom=JSON.stringify({v:1,descorLabellImported:true,series:[{id:'descor-premium',manufacturer:'DESCOR',collection:'Premium',name:'DESCOR Premium'}],
  colors:[{cid:'seed:M951',seriesId:'descor-premium',code:'M951',display:'WEISS 450',texture:'fabric',colorName:'',swatch:'#ffffff',widths:[{nominal:3.1,max:3.1,price:0}]}],reserved:[{seriesId:'descor-premium',code:'M951'}]});
 const initA=`if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');localStorage.setItem('aceil_custom_film_v1',${JSON.stringify(legacyCustom)});localStorage.setItem('aceil_film_pricing_overrides_v1',JSON.stringify({'descor-premium':{fabric:{M951_w310:975}}}))}`;
 const initB=`if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');localStorage.setItem('aceil_custom_film_v1',${JSON.stringify(legacyCustom)})}`;
 const D1=await device(browser,'u7',initA),D2=await device(browser,'u7',initB);
 const price=pg=>pg.evaluate(()=>window.ACEILGetFilmPricing('descor-premium').fabric.M951_w310);
 assert.equal(await price(D1.page),975);assert.equal(await price(D2.page),0);
 for(let i=0;i<4;i++){
  await sync(D1.page);assert.equal(db.u7.data.custom.colors[0].widths[0].price,975,'device 1 keeps/pushes 975 in round '+i);
  await sync(D2.page);assert.equal(db.u7.data.custom.colors[0].widths[0].price,975,'device 2 does not overwrite it with 0 in round '+i);
 }
 assert.equal(await price(D1.page),975);assert.equal(await price(D2.page),975,'device 2 received the price');
 const rev=db.u7.rev;await sync(D1.page);await sync(D2.page);assert.equal(db.u7.rev,rev,'stable: further syncs change nothing');
 assert.deepEqual(D1.errors.concat(D2.errors),[]);
 // backend not installed -> app keeps working locally
 await B.page.evaluate(()=>{window._sb={rpc:()=>Promise.resolve({data:null,error:{code:'PGRST202',message:'Could not find the function'}}),channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}};try{_sb=window._sb}catch(_){}});
 assert.equal(await sync(B.page),'unavailable');
 await save(B.page,'LOCAL-1',100);assert.ok((await colours(B.page)).includes('LOCAL-1'));
 for(const d of[A,B])assert.deepEqual(d.errors,[]);
 console.log('film-catalog-sync OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
