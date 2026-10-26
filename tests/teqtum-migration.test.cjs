const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
/* Upgrade of an earlier draft -> two devices through the cloud -> reload.
   Seeded colours must stay, edits of the user must survive, Lumfer becomes a PVC film keeping its prices and widths. */
const db={};
function server(uid,name,args){
 if(name==='aceil_get_film_catalog')return db[uid]?{data:db[uid].data,rev:db[uid].rev,uid}:{data:null,rev:0,uid};
 if(name==='aceil_save_film_catalog'){
  if(args.p_data.uid!==uid){const e=new Error('film_catalog_user_changed');e.code='42501';throw e}
  const row=db[uid];if(row&&row.rev!==(args.p_base_rev||0)){const e=new Error('film_catalog_conflict');e.code='40001';throw e}
  const d=JSON.parse(JSON.stringify(args.p_data));delete d.uid;db[uid]={data:d,rev:(row?row.rev:0)+1};return db[uid].rev;
 }
 const e=new Error('could not find the function');e.code='PGRST202';throw e;
}
const D2=[["Біла білизна","RAL 110 96 02","#fcfcf9"],["Жовто-бежевий","RAL 080 80 30","#f8d49a"],["Біла морська троянда","RAL 080 80 30","#f7e4d0"],["Темно-сірий","RAL 110 96 02","#6d6d6a"],["Білий креповий шовк","RAL 080 80 30","#fbf2ea"],["Біла тінь","RAL 080 80 30","#e3e3e3"],["Бежева макадамія","RAL 110 96 02","#fbe9c3"],["Коричнева ніч","RAL 080 80 30","#55290b"],["Білий атлас","RAL 080 80 30","#f7f0dd"],["Помірно сірий","RAL 110 96 02","#9c9799"],["Бежевий сандал","RAL 080 80 30","#f9e0b9"],["Чорнильно чорний","RAL 080 80 30","#0d0d0d"]];
// What a browser that ran the previous drafts holds (plus things the user did on top).
function oldState(){
 const W=l=>l.map(n=>({nominal:n,max:n,price:0}));const colors=[];
 [['L','lak'],['M','mat'],['S','satin']].forEach(([p,t])=>D2.forEach((r,i)=>colors.push({seriesId:'teqtum-euro',code:p+(901+i),display:r[0],texture:t,colorName:r[1],swatch:r[2],widths:W([3.6,4.5])})));
 // user edits on top of the draft
 colors.find(c=>c.code==='M904').display='Мій графіт';                         // renamed
 colors.find(c=>c.code==='L902').swatch='#112233';                              // changed swatch
 colors.find(c=>c.code==='S905').widths=W([3.6,4.5,5]);                         // extra width
 colors.find(c=>c.code==='M910').widths[0].price=321;                           // priced
 const KS={M303:'#ffffff',M305:'linear-gradient(90deg,#E9E9E9 0%,#e6e6e6 50%,#E9E9E9 100%)',M347:'linear-gradient(90deg,#000100 0%,#0d0d0d 50%,#000000 100%)',M501:'linear-gradient(90deg,#F2ECE0 0%,#f0e7d5 50%,#F2ECE0 100%)'};
 ['M303','M305','M347','M501'].forEach(c=>colors.push({seriesId:'teqtum-km2',code:c,display:c,texture:'mat',swatch:KS[c],widths:W([3.2,5])})); // as the Premium swatches seeded by the draft
 colors.push({seriesId:'lumfer',code:'M961',display:'Lumfer',texture:'fabric',colorName:'Білий',swatch:'#ffffff',widths:[{nominal:3.05,max:3.05,price:0},{nominal:4.5,max:4.5,price:1100}],u:0});
 colors.push({seriesId:'my',code:'M501',display:'Моя плівка',texture:'mat',widths:[{nominal:3.6,max:3.6,price:777}],u:5});
 return {v:1,series:[{id:'lumfer',manufacturer:'Lumfer',collection:'',name:'Lumfer'},{id:'my',manufacturer:'Мій',collection:'',name:'Мій'},{id:'teqtum-euro',manufacturer:'TEQTUM',collection:'Euro',name:'TEQTUM Euro'},{id:'teqtum-km2',manufacturer:'TEQTUM',collection:'KM2',name:'TEQTUM KM2'}],colors,teqtumImported:true};
}
async function link(page,uid){
 await page.exposeFunction('__srv'+Math.random().toString(36).slice(2),()=>{}).catch(()=>{});
 await page.evaluate(id=>{window.__fakeUid=id;const ch={on(){return ch},subscribe(){return ch},unsubscribe(){}},c={rpc:(n,a)=>window.__srv(window.__fakeUid,n,a),channel:()=>ch,removeChannel(){}};window._sb=c;window._sbUser={id};try{_sb=c}catch(_){}try{_sbUser={id}}catch(_){}},uid);
}
async function device(browser,uid,seed){
 const {page}=await open(browser,390,1,undefined,async p=>{
  if(seed){await p.addInitScript(([k,v,o])=>{try{if(!localStorage.getItem(k)){localStorage.setItem(k,v);localStorage.setItem('aceil_film_pricing_overrides_v1',o);}}catch(_){}},['aceil_custom_film_v1',JSON.stringify(seed),JSON.stringify({lumfer:{fabric:{M961_w305:975}}})]);}
 });
 await page.exposeFunction('__srv',(u,n,a)=>{try{return {data:server(u,n,a),error:null}}catch(e){return {data:null,error:{code:e.code,message:e.message}}}});
 await reveal(page);await page.waitForTimeout(900);await link(page,uid);return page;
}
const sync=page=>page.evaluate(()=>window.ACEILFilmCatalogSync.sync().then(s=>s.state));
const snap=page=>page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('aceil_custom_film_v1'));const by=(s,c)=>d.colors.find(x=>x.seriesId===s&&x.code===c);
 const lum=by('lumfer','M961');const lumCat=(ACEIL_COLOR_CATALOG_BY_SERIES.lumfer||[])[0];
 return {codes:d.colors.filter(x=>x.seriesId==='teqtum-euro').map(x=>x.code).sort(),ids:d.series.map(s=>s.id).sort(),
  renamed:by('teqtum-euro','M904')&&by('teqtum-euro','M904').display,swatch:by('teqtum-euro','L902')&&by('teqtum-euro','L902').swatch,
  widthsS905:by('teqtum-euro','S905')&&by('teqtum-euro','S905').widths.length,priced:by('teqtum-euro','M910')&&by('teqtum-euro','M910').widths[0].price,
  lum:lum&&{t:lum.texture,w:lum.widths.map(w=>[w.nominal,w.price]),label:lumCat&&lumCat.label,name:lum.colorName},
  mine:by('my','M501')&&by('my','M501').widths[0].price,
  m921:!!by('teqtum-euro','M921'),m921cat:!!(ACEIL_COLOR_CATALOG_BY_SERIES['teqtum-euro']||[]).find(c=>c.code==='M921'),
  km2:d.colors.filter(x=>x.seriesId==='teqtum-km2').length,
  sat:d.colors.filter(x=>x.seriesId==='teqtum-euro'&&x.texture==='satin').map(x=>x.display).sort()};});
function check(s,where){
 assert.ok(s.m921&&s.m921cat,where+': M921 is present');
 for(const c of ['L921','M932','S921','S927'])assert.ok(s.codes.includes(c),where+': '+c);
 assert.ok(!s.codes.includes('S933'),where+': no black satin');
 assert.ok(!['L901','M901','L903','M905','S901','M912'].some(c=>s.codes.includes(c)),where+': untouched draft rows are gone');
 assert.equal(s.renamed,'Мій графіт',where+': renamed row kept');assert.equal(s.swatch,'#112233',where+': changed swatch kept');
 assert.equal(s.widthsS905,3,where+': extra width kept');assert.equal(s.priced,321,where+': priced row kept');
 assert.equal(s.mine,777,where+': own series kept');assert.ok(s.ids.includes('my')&&!s.ids.includes('euro'));
 assert.deepEqual(s.lum.w,[[3.05,975],[4.5,1100]],where+': Lumfer widths and prices kept (incl. price typed before the update)');
 assert.equal(s.lum.t,'mat',where+': Lumfer is a film');assert.equal(s.lum.label,'Мат');assert.equal(s.lum.name,'ПВХ');
 assert.equal(s.km2,4);
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 const A=await device(browser,'u1',oldState());   // upgraded from the previous version
 const B=await device(browser,'u1',null);         // another, clean device
 check(await snap(A),'A after upgrade');
 assert.equal(await sync(A),'ok');assert.equal(await sync(B),'ok');assert.equal(await sync(A),'ok');assert.equal(await sync(B),'ok');
 const a=await snap(A),b=await snap(B);check(a,'A after sync');check(b,'B after sync');
 assert.deepEqual(a.codes,b.codes,'both devices hold the same colours');
 const rev=db.u1.rev;assert.equal(await sync(A),'ok');assert.equal(await sync(B),'ok');
 assert.equal(db.u1.rev,rev,'sync is stable (no ping-pong)');
 // reload both devices
 for(const p of [A,B]){await p.reload();await p.waitForTimeout(1200);await link(p,'u1');}
 check(await snap(A),'A after reload');check(await snap(B),'B after reload');
 assert.equal(await sync(A),'ok');assert.equal(await sync(B),'ok');
 check(await snap(A),'A after reload+sync');check(await snap(B),'B after reload+sync');
 assert.equal(db.u1.rev,rev,'reload and sync do not change the cloud copy');
 // Revision 3 recreated a live row with a tombstone for its very same identity.
 const dead=1720000000000,broken={v:1,teqtumRev:3,teqtumImported:true,descorLabellImported:true,
  series:[{id:'teqtum-euro',manufacturer:'TEQTUM',collection:'Euro',name:'TEQTUM Euro'}],
  colors:[{cid:'seed:teqtum-euro:M921',seriesId:'teqtum-euro',code:'M921',display:'Білий шовковий креп',texture:'mat',swatch:'#eeebe1',widths:[{nominal:3.6,max:3.6,price:0},{nominal:4.5,max:4.5,price:0}]}],
  deleted:{'c:teqtum-euro:M921':dead,'k:seed:teqtum-euro:M921':dead}};
 const R=await device(browser,'repair',broken),T=await device(browser,'repair',null);
 const row=pg=>pg.evaluate(()=>ACEILFilmCatalogStore.readCustom().colors.find(c=>c.seriesId==='teqtum-euro'&&c.code==='M921')||null);
 assert.ok((await row(R)).u>dead,'live row is versioned past the accidental tombstone');
 for(let i=0;i<3;i++){await sync(R);await sync(T);assert.ok(await row(R));assert.ok(await row(T));}
 assert.equal((await row(R)).cid,'seed:teqtum-euro:M921','identity is preserved');
 await R.reload();await link(R,'repair');await sync(R);assert.ok(await row(R),'repair survives reload');
 // An explicit deletion must still remove the repaired row on both devices.
 await R.evaluate(()=>ACEILCustomFilm.deleteColor('teqtum-euro','M921'));await sync(R);await sync(T);
 assert.equal(await row(R),null);assert.equal(await row(T),null);
 await R.evaluate(()=>{const d=ACEILFilmCatalogStore.readCustom();d.teqtumRev=4;localStorage.setItem('aceil_custom_film_v1',JSON.stringify(d));});
 await R.reload();await link(R,'repair');await sync(R);await sync(T);
 assert.equal(await row(R),null,'upgrade never resurrects an explicitly deleted colour');assert.equal(await row(T),null);
 // Legacy absent records have no safe proof of an accidental deletion: preserve them as deleted.
 const gone=JSON.parse(JSON.stringify(broken));gone.colors=[];
 const G=await device(browser,'gone',gone);assert.equal(await row(G),null);await sync(G);assert.equal(await row(G),null);
 const goneSeries=JSON.parse(JSON.stringify(gone));goneSeries.series=[];goneSeries.deleted['s:teqtum-euro']=dead;
 const GS=await device(browser,'gone-series',goneSeries);assert.ok(!(await snap(GS)).ids.includes('teqtum-euro'),'deleted series stays deleted');
 console.log('PASS TEQTUM migration and repair: two-device convergence, reload, explicit and legacy deletions preserved');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
