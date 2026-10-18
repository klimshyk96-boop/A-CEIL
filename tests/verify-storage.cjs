const assert=require('assert/strict');
const {chromium}=require('playwright');
const {open}=require('./browser-review.cjs');
const checks=[];function check(name,value,info){assert.ok(value,name+': '+JSON.stringify(info));checks.push(name);}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(b,390,3);
  await page.waitForTimeout(3200); /* let the 2.5 s auto-run finish so it cannot interfere */
  const r=await page.evaluate(async()=>{
   const N='A\u00b7CEIL',US=window.A_CEIL_UserStorage,nat=US.native,owner=US.primaryOwnerId,other='22222222-2222-2222-2222-222222222222';
   const set=(k,v)=>nat.setItem.call(localStorage,k,v),get=k=>nat.getItem.call(localStorage,k),del=k=>nat.removeItem.call(localStorage,k);
   const S=(k,u)=>k+'::user:'+(u||owner),SC=window[N].StorageCleanup,CC='A\u00b7CEIL_cloud_cache_v330';
   const wait=ms=>new Promise(r=>setTimeout(r,ms));
   const out={};
   US.setUser(owner);await wait(1200);
   const bigLegacy=JSON.stringify([{id:'p1',name:'A',pad:'x'.repeat(5000)}]);
   /* 1. covered legacy projects/cache/state are removed; uncovered backup and foreign/unlisted keys stay */
   set('ceiling_projects',bigLegacy);set(S('ceiling_projects'),JSON.stringify([{id:'p1'},{id:'p2'}]));
   set('ceiling_projects_backup_v35',JSON.stringify({projects:[{id:'p9'}]}));set(S('ceiling_projects_backup_v35'),JSON.stringify({projects:[{id:'p2'}]}));
   set(CC,'{"a":1}');set(S(CC),'{"a":2}');
   set('ceiling_v18','{"pts":[1]}');set(S('ceiling_v18'),'{"pts":[2]}');
   set(S('ceiling_projects',other),'[{"id":"z"}]');
   set('A\u00b7CEIL_wall_presets_v32','legacy-presets');set(S('A\u00b7CEIL_wall_presets_v32'),'scoped-presets');
   const res=SC.cleanLegacy();
   out.removed=res.removed;out.kept=res.kept;
   out.after={projects:get('ceiling_projects'),backup:get('ceiling_projects_backup_v35'),cache:get(CC),state:get('ceiling_v18'),
     scopedProjects:get(S('ceiling_projects')),scopedBackup:get(S('ceiling_projects_backup_v35')),scopedState:get(S('ceiling_v18')),
     foreign:get(S('ceiling_projects',other)),presetsLegacy:get('A\u00b7CEIL_wall_presets_v32'),presetsScoped:get(S('A\u00b7CEIL_wall_presets_v32'))};
   out.freed=res.freedBytes;
   /* 2. legacy without a scoped copy is never removed */
   del(S('ceiling_v18'));set('ceiling_v18','only-copy');
   const res2=SC.cleanLegacy();out.onlyCopyKept=get('ceiling_v18')==='only-copy';out.res2=res2;
   /* 3. legacy projects are kept while the scoped list is empty, and removed once it is non-empty (cloud is authoritative) */
   set('ceiling_projects',JSON.stringify([{id:'p1'},{id:'lost'}]));
   const keepScoped=get(S('ceiling_projects'));set(S('ceiling_projects'),'[]');
   SC.cleanLegacy();out.uncoveredKept=get('ceiling_projects')!==null;
   set(S('ceiling_projects'),keepScoped);
   SC.cleanLegacy();out.nonEmptyScopedRemoves=get('ceiling_projects')===null;
   /* 4. another (non-owner) account: nothing is touched */
   set('ceiling_projects',JSON.stringify([{id:'p1'}]));
   US.setUser(other);await wait(50);
   const res4=SC.cleanLegacy();out.nonOwner=res4.skipped;out.nonOwnerKept=get('ceiling_projects')!==null&&get('ceiling_v18')==='only-copy';
   US.setUser(owner);await wait(50);
   /* 5. freeSpace (quota path) removes the dead cache copy */
   set(CC,'{"dead":1}');set(S(CC),'{"live":1}');
   window[N].StorageRepair.freeSpace({force:true});
   out.freeSpaceCleaned=get(CC)===null;
   /* 6. warning toast: only when full, only once per session, names the biggest keys */
   sessionStorage.removeItem('aceil_storage_warn_v1');
   const small=SC.warnIfFull();
   set('zz_big_test_key','x'.repeat(2100000));
   const first=SC.warnIfFull(),second=SC.warnIfFull();
   const toastText=[...document.querySelectorAll('div')].map(d=>d.textContent).find(t=>/Пам'ять Safari майже повна/.test(t))||'';
   del('zz_big_test_key');
   out.warn={small,first,second,toastText};
   out.audit=window[N+'StorageAuditV340']&&1;out.auditFn=typeof window['A\u00b7CEILStorageAuditV340']==='function'&&window['A\u00b7CEILStorageAuditV340']().ok;
   return out;
  });
  check('removed covered legacy copies',['ceiling_projects','A\u00b7CEIL_cloud_cache_v330','ceiling_v18'].every(k=>r.removed.includes(k)),r.removed);
  check('legacy projects deleted',r.after.projects===null,r.after);
  check('legacy cache deleted',r.after.cache===null,r.after);
  check('legacy state deleted',r.after.state===null,r.after);
  check('scoped data untouched',r.after.scopedProjects&&r.after.scopedBackup&&r.after.scopedState,r.after);
  check('uncovered legacy backup kept',r.kept.includes('ceiling_projects_backup_v35')&&r.after.backup!==null,r);
  check('foreign account key kept',r.after.foreign==='[{"id":"z"}]',r.after);
  check('non-listed legacy key kept',r.after.presetsLegacy==='legacy-presets'&&r.after.presetsScoped==='scoped-presets',r.after);
  check('freed bytes reported',r.freed>10000,r.freed);
  check('legacy without scoped copy kept',r.onlyCopyKept,r.res2);
  check('legacy projects kept while scoped list is empty',r.uncoveredKept,r);
  check('legacy projects removed once scoped list is non-empty',r.nonEmptyScopedRemoves,r);
  check('non-owner skipped and kept',r.nonOwner==='not_primary_owner'&&r.nonOwnerKept,r);
  check('freeSpace cleans dead copy',r.freeSpaceCleaned,r);
  check('no warning when small',r.warn.small===false,r.warn);
  check('warning shown once',r.warn.first===true&&r.warn.second===false,r.warn);
  check('warning names biggest key',/zz_big_test_key|КБ/.test(r.warn.toastText),r.warn);
  check('audit function works',r.auditFn===true,r);
  /* dead cloud cache: never re-created by saving, removed if present.
     ProjectRepository.CACHE_LIMIT=8, so these 6 synced + 1 unsynced projects
     all remain available offline. */
  const r2=await page.evaluate(async()=>{
   const N='A\u00b7CEIL',US=window.A_CEIL_UserStorage,nat=US.native,owner=US.primaryOwnerId,CC='A\u00b7CEIL_cloud_cache_v330';
   const wait=ms=>new Promise(r=>setTimeout(r,ms));
   const set=(k,v)=>nat.setItem.call(localStorage,k,v),get=k=>nat.getItem.call(localStorage,k);
   const out={};
   US.setUser(owner);await wait(1000);
   set(CC+'::user:'+owner,'{"dead":1}');set(CC,'{"dead":1}');
   const rd=window[N].StorageCleanup.removeDeadCache();
   out.deadRemoved=get(CC)===null&&get(CC+'::user:'+owner)===null;out.deadFreed=rd.freedBytes;
   window.rmCloudFirstSaveV330&&window.rmCloudFirstSaveV330();await wait(1500);
   out.notRecreated=get(CC+'::user:'+owner)===null;
   const P=window[N].ProjectRepository,mk=(i,extra)=>Object.assign({id:'aaaaaaaa-0000-0000-0000-00000000000'+i,_dbId:'aaaaaaaa-0000-0000-0000-00000000000'+i,name:'S'+i,state:JSON.stringify({pts:[1]})},extra||{});
   const synced=[1,2,3,4,5,6].map(i=>mk(i)),local={id:'local_new1',_localId:'local_new1',name:'NEW',state:'{}'};
   P.replaceAll([...synced,local]);
   const stored=JSON.parse(get('ceiling_projects::user:'+owner)||'[]');
   out.stored=stored.map(p=>p.id);out.memory=P.list().length;
   return out;
  });
  check('dead cache removed',r2.deadRemoved&&r2.deadFreed>0,r2);
  check('cache not re-created by saving',r2.notRecreated,r2);
  check('local cache keeps all projects within cache limit',r2.stored.length===7&&r2.stored.includes('local_new1'),r2);
  check('memory list still complete',r2.memory===7,r2);
  check('no page errors',errors.length===0,errors);
  console.log('PASS '+checks.length);
 }finally{await b.close();}
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
