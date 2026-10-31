const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=process.env.ACEIL_PROFILE_ROOT||path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,390,1,root);await reveal(page);
  const r=await page.evaluate(()=>{
   const u=n=>`${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}`;
   const mk=(n,name,extra)=>Object.assign({id:u(n),_dbId:u(n),name,state:'{}'},extra||{});
   const R=window['A·CEIL'].ProjectRepository;
   R.replaceAll([mk(1,'deleted-elsewhere'),mk(2,'kept'),mk(3,'dirty',{_dirty:true,_localUpdatedAt:Date.now()}),{id:'local_x',name:'local-only',state:'{}',_dirty:true}],{allowUnsyncedRemoval:true});
   window['A·CEILMergeCloudProjects']([mk(2,'kept')]);
   return R.list().map(p=>p.name).sort();
  });
  assert.deepEqual(r,['dirty','kept','local-only'],'cloud merge drops synced ghosts but keeps unsynced work');
  const base=await page.evaluate(()=>{
   const id='33333333-3333-4333-8333-333333333333';
   window['A·CEILMergeCloudProjects']([{id,_dbId:id,name:'Flat',multiRoom:true,state:'{}',rooms:[{id:'r1',name:'Hall',state:'{"closed":true}'}]}]);
   const p=window['A·CEIL'].ProjectRepository.list().find(x=>x.id===id);
   return p&&p._cloudBase;
  });
  assert.deepEqual(Object.keys(base||{}),['r1'],'cloud load records the base used to detect remote room edits');
  assert.deepEqual(errors,[]);console.log('cloud merge ghost ok');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
