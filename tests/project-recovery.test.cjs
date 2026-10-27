const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const OWNER='08d419a3-2fa5-4c40-92f4-ad72b627e734';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 const backup=JSON.stringify({at:123,reason:'legacy',projects:[{id:'local_recovery',name:'Незбережений проєкт',state:'{}',_dirty:true}]});
 const {page,errors}=await open(browser,390,1,undefined,async page=>{await page.addInitScript(({owner,backup})=>{
  localStorage.setItem('A_CEIL_offline_user_v1',JSON.stringify({id:owner}));
  localStorage.setItem('ceiling_projects_backup_v35::user:'+owner,backup);
 },{owner:OWNER,backup})});await reveal(page);
 const result=await page.evaluate(({owner,backup})=>{const root=window['A·CEIL'],native=A_CEIL_UserStorage.native,get=k=>native.getItem.call(localStorage,k);
  const recovery=root.ProjectRecovery,before=root.ProjectRepository.list().length,restored=recovery.restore();
  return {version:root.VERSION,key:recovery.storageKey,legacy:get('ceiling_projects_backup_v35::user:'+owner),current:get('aceil_project_recovery::user:'+owner),before,restored,ids:root.ProjectRepository.list().map(p=>p.id),expected:backup};
 },{owner:OWNER,backup});
 assert.equal(result.version,'20261027-report-safari-sync5');
 assert.equal(result.key,'aceil_project_recovery');assert.equal(result.legacy,null);assert.equal(result.current,result.expected);
 assert.equal(result.before,0);assert.equal(result.restored.ok,true);assert.ok(result.ids.includes('local_recovery'));assert.deepEqual(errors,[]);
 console.log('PASS legacy recovery migration, canonical API and restore');await page.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
