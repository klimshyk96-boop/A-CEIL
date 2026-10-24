const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const sourceRoot=process.env.ACEIL_TEST_SOURCE_ROOT,connected=new WeakSet();
const snapshot=page=>page.evaluate(()=>({price:ACEILGetFilmPricing('descor-premium').fabric.M951_w410,u:ACEILFilmCatalogStore.readCustom().colors.find(c=>c.seriesId==='descor-premium'&&c.code==='M951').u||0}));
const sync=page=>page.evaluate(()=>ACEILFilmCatalogSync.sync());
async function connect(page,server){
 if(!connected.has(page)){await page.exposeFunction('__legacyPriceServer',(name,args)=>server(name,args));connected.add(page);}
 await page.evaluate(()=>{const ch={on(){return ch},subscribe(){return ch},unsubscribe(){}};const c={rpc:(n,a)=>window.__legacyPriceServer(n,a),channel:()=>ch,removeChannel(){}};window._sb=c;_sb=c;window._sbUser={id:'legacy-user'};_sbUser=window._sbUser;});
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 for(const width of [390,1440])for(const equalStoredPrice of [false,true]){
  let row=null;
  const server=(name,args)=>{
   if(name==='aceil_get_film_catalog')return {data:row?{data:structuredClone(row.data),rev:row.rev,uid:'legacy-user'}:{data:null,rev:0,uid:'legacy-user'},error:null};
   assert.equal(args.p_data.uid,'legacy-user');
   if(row&&row.rev!==args.p_base_rev)return {data:null,error:{code:'40001',message:'film_catalog_conflict'}};
   const data=structuredClone(args.p_data);delete data.uid;row={data,rev:(row?row.rev:0)+1};return {data:row.rev,error:null};
  };
  const A=await open(browser,width,1,sourceRoot,async p=>p.addInitScript(equal=>{
   if(localStorage.getItem('__legacy-price-seeded'))return;localStorage.setItem('__legacy-price-seeded','1');
   localStorage.setItem('aceil_film_pricing_overrides_v1',JSON.stringify({'descor-premium':{fabric:{M951_w410:975}}}));
   localStorage.removeItem('aceil_film_pricing_meta_v1');
   if(equal)localStorage.setItem('aceil_custom_film_v1',JSON.stringify({v:1,descorLabellImported:true,series:[{id:'descor-premium',manufacturer:'DESCOR',collection:'Premium',name:'DESCOR Premium'}],colors:[{seriesId:'descor-premium',code:'M951',display:'WEISS 450',texture:'fabric',swatch:'#ffffff',widths:[{nominal:4.1,max:4.1,price:975}]}]}));
  },equalStoredPrice));
  await reveal(A.page);const imported=await snapshot(A.page);assert.equal(imported.price,975);
  await A.page.reload();await reveal(A.page);assert.deepEqual(await snapshot(A.page),imported,'reload does not restamp an already imported price');
  await connect(A.page,server);await sync(A.page);
  const B=await open(browser,width,1,sourceRoot);await reveal(B.page);await connect(B.page,server);await sync(B.page);
  assert.equal((await snapshot(B.page)).price,975,'a clean device receives the legacy price instead of replacing it with zero');
  assert.ok(imported.u>0,'an undated override has a persistent version, including equal-value overrides');
  for(let i=0;i<3;i++){await sync(A.page);await sync(B.page);assert.equal((await snapshot(A.page)).price,975);assert.equal((await snapshot(B.page)).price,975);}
  const cloudPrice=()=>row.data.custom.colors.find(c=>c.seriesId==='descor-premium'&&c.code==='M951').widths.find(w=>w.nominal===4.1).price;
  assert.equal(cloudPrice(),975);
  await B.page.reload();await reveal(B.page);assert.equal((await snapshot(B.page)).price,975);await connect(B.page,server);
  // A later offline edit still wins over the one-time import.
  await B.page.context().setOffline(true);
  await B.page.evaluate(()=>ACEILSetFilmPricing('descor-premium',{fabric:{M951_w410:990}}));
  assert.equal((await sync(B.page)).state,'offline');assert.equal((await snapshot(B.page)).price,990);
  await B.page.context().setOffline(false);await sync(B.page);await sync(A.page);
  assert.equal((await snapshot(A.page)).price,990);assert.equal(cloudPrice(),990);
  assert.deepEqual(A.errors,[]);assert.deepEqual(B.errors,[]);
  await A.page.close();await B.page.close();console.log('PASS legacy price convergence, reload and offline edit '+width+'px; existing stored price '+equalStoredPrice);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
