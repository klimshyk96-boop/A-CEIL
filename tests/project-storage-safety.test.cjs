const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const OWNER='08d419a3-2fa5-4c40-92f4-ad72b627e734';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH,args:['--no-sandbox']});try{
 const recovery={at:123,reason:'quota',projects:[{id:'fallback-a',name:'Recovery A',state:'{}',_dirty:true,_syncStatus:'pending_create'}]};
 const {page,errors}=await open(browser,390,1,undefined,async page=>page.addInitScript(({owner,recovery})=>{
  localStorage.setItem('A_CEIL_offline_user_v1',JSON.stringify({id:owner}));
  localStorage.setItem('ceiling_projects::user:'+owner,'{broken-json');
  localStorage.setItem('aceil_project_recovery::user:'+owner,JSON.stringify(recovery));
 },{owner:OWNER,recovery}));await reveal(page);
 await page.waitForFunction(()=>window['A·CEIL']&&window['A·CEIL'].ProjectSafety);
 const result=await page.evaluate(async()=>{
  const root=window['A·CEIL'],repo=root.ProjectRepository,safety=root.ProjectSafety;
  const fallback=repo.list().map(p=>p.id);
  repo.replaceAll([{id:'cloud-a',_dbId:'cloud-a',name:'Cloud A',state:'{}'}],{allowUnsyncedRemoval:true,reason:'cloud_seed'});
  repo.replaceAll([],{allowUnsyncedRemoval:true,reason:'cloud_refresh'});await safety.flush();
  const refreshTrash=(await safety.listTrash()).length;
  await safety.confirmDeletion({dbId:'cloud-a'});await safety.flush();
  const bridgedTrash=(await safety.listTrash()).map(row=>row.project&&row.project.id);
  repo.replaceAll([{id:'dirty-a',name:'Dirty A',state:'{}',_dirty:true,_syncStatus:'pending_create'}],{allowUnsyncedRemoval:true,reason:'test_seed'});
  repo.replaceAll([]);const guarded=repo.list().map(p=>p.id);
  await safety.flush();const beforeRemove=await safety.status();
  repo.remove('dirty-a');await safety.flush();
  const trash=await safety.listTrash(),removed=repo.list().length;
  repo.upsert({id:'dirty-a',_dbId:'dirty-a',name:'Dirty A',state:'{}'},{replace:true});
  const duplicateGuard=await safety.restoreTrash('dirty-a');await safety.flush();
  const duplicateIds=repo.list().filter(p=>String(p.id).startsWith('restored_')).map(p=>p.id);
  repo.remove('dirty-a');await safety.flush();
  const restored=await safety.restoreTrash('dirty-a');await safety.flush();
  const after=repo.list().find(p=>String(p.id).startsWith('restored_'));
  const finalStatus=await safety.status();
  return {fallback,refreshTrash,bridgedTrash,guarded,beforeRemove,trash:trash.map(x=>x.project&&x.project.id),removed,
   duplicateGuard:{ok:duplicateGuard.ok,alreadyPresent:duplicateGuard.alreadyPresent},duplicateIds,restored:restored.ok,
   after:after&&{id:after.id,dirty:after._dirty,status:after._syncStatus,db:after._dbId},finalStatus};
 });
 assert.deepEqual(result.fallback,['fallback-a'],'corrupt primary falls back to the recovery record');
 assert.equal(result.refreshTrash,0,'cloud refresh must not create trash');
 assert.deepEqual(result.bridgedTrash,['cloud-a'],'queued delete must bridge the removed project into trash');
 assert.deepEqual(result.guarded,['dirty-a'],'an accidental empty replacement cannot drop an unsynced project');
 assert.equal(result.beforeRemove.currentCount,1);assert.ok(result.beforeRemove.currentAt);
 assert.equal(result.removed,0);assert.ok(result.trash.includes('dirty-a'),'explicit removal is retained in the 30-day trash');
 assert.deepEqual(result.duplicateGuard,{ok:true,alreadyPresent:true},'restore must not duplicate a project that already exists');
 assert.deepEqual(result.duplicateIds,[],'duplicate restore must not create a replacement row');
 assert.equal(result.restored,true);assert.ok(result.after&&result.after.id.startsWith('restored_'));
 assert.equal(result.after.dirty,true);assert.equal(result.after.status,'pending_create');assert.equal(result.after.db,undefined);
 assert.equal(result.finalStatus.currentCount,1);assert.deepEqual(errors,[]);
 console.log('PASS recovery fallback, IndexedDB generations, deletion guard and trash restore');
 await page.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});