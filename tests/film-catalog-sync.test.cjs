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
async function device(browser,uid){
 const {page,errors}=await open(browser,390);await reveal(page);await page.waitForTimeout(800);
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
 // backend not installed -> app keeps working locally
 await B.page.evaluate(()=>{window._sb={rpc:()=>Promise.resolve({data:null,error:{code:'PGRST202',message:'Could not find the function'}}),channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}};try{_sb=window._sb}catch(_){}});
 assert.equal(await sync(B.page),'unavailable');
 await save(B.page,'LOCAL-1',100);assert.ok((await colours(B.page)).includes('LOCAL-1'));
 for(const d of[A,B])assert.deepEqual(d.errors,[]);
 console.log('film-catalog-sync OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
