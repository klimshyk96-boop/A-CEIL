/* Regression: editing/revoking B while A is active must never resolve A.
   Uses the real app with local browser fixtures; no cloud writes. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {open, reveal} = require('./browser-review.cjs');
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.ACEIL_CHROMIUM_PATH || undefined});
 try {
  for (const width of [390,1440]) {
   const {page} = await open(browser,width);
   await reveal(page);
   await page.evaluate(() => {
    const A={id:'local-first',name:'Інший проєкт',order_source:'call',deal_status:'lost',report_token:null};
    const B={id:'local-target',_localId:'target-alias',name:'Галицький',order_source:'site',deal_status:'won',report_token:'a'.repeat(64),report_expires_at:new Date(Date.now()+86400000).toISOString()};
    window['A·CEIL'].API.projects.replaceAll([A,B]);
    _sb=null; _sbUser=null; _currentProjectId=A.id; _activeObjectId=A.id;
    renderProjects(); editProject(B.id);
   });
   await page.waitForFunction(() => document.getElementById('editReportState').textContent.includes('КП активне'));
   const local=await page.evaluate(() => ({
    name:document.getElementById('editProjName').value,
    source:document.getElementById('editOrderSource').value,
    status:document.getElementById('editDealStatus').value,
    report:window.A_CEIL_ReportLinks.status('local-target').status,
    alias:window.A_CEIL_ReportLinks.resolveProject('target-alias')?.id,
    missing:window.A_CEIL_ReportLinks.resolveProject('missing'),
    badge:[...document.querySelectorAll('.rp-project-card')].find(x=>x.textContent.includes('Галицький'))?.querySelector('.aceil-report-active-badge')?.textContent
   }));
   assert.deepEqual(local,{name:'Галицький',source:'site',status:'won',report:'active',alias:'local-target',missing:null,badge:'🔗 ЗВІТ'});
   await page.evaluate(async()=>{
    document.getElementById('editOrderSource').value='instagram';
    document.getElementById('editDealStatus').value='in_progress';
    await saveEditProject();
   });
   assert.deepEqual(await page.evaluate(()=>window['A·CEIL'].API.projects.list().map(p=>[p.order_source,p.deal_status])),[['call','lost'],['instagram','in_progress']]);
   // Cloud fixture: B has an outstanding request when the user switches to A.
   await page.evaluate(() => {
    window.__ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
    window.__calls=[]; window.__pending=[];
    const [a,b]=window.__ids;
    window['A·CEIL'].API.projects.replaceAll([
     {id:'cloud-a',_dbId:a,name:'Хмара A',report_token:'b'.repeat(64)},
     {id:'cloud-b',_localId:'cloud-b',_dbId:b,name:'Хмара B',report_token:'c'.repeat(64)}
    ]);
    _currentProjectId='cloud-a'; _activeObjectId='cloud-a';
    _sb={from(){return {select(){return this},eq(key,id){this.id=id;return this},single(){
     const id=this.id; window.__calls.push(id);
     if(id===b)return new Promise((resolve,reject)=>window.__pending.push({resolve,reject}));
     return Promise.resolve({data:{id:a,report_token:null},error:null});
    }}}};
    editProject('cloud-b');
   });
   await page.waitForFunction(() => window.__pending.length===1);
   await page.evaluate(() => editProject('cloud-a'));
   await page.waitForFunction(() => document.getElementById('editReportState').textContent.includes('не створено'));
   await page.evaluate(() => window.__pending[0].resolve({data:{id:window.__ids[1],report_token:'c'.repeat(64)},error:null}));
   await page.waitForTimeout(60);
   assert.deepEqual(await page.evaluate(() => ({calls:window.__calls,name:document.getElementById('editProjName').value,none:document.getElementById('editReportState').textContent.includes('не створено'),url:document.getElementById('editReportAccess').dataset.url})),{calls:['22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111'],name:'Хмара A',none:true,url:''});
   // Rejected stale requests must not replace the current modal with an error.
   await page.evaluate(() => editProject('cloud-b'));
   await page.waitForFunction(() => window.__pending.length===2);
   await page.evaluate(() => editProject(window.__ids[0]));
   await page.waitForFunction(() => document.getElementById('editReportState').textContent.includes('не створено'));
   await page.evaluate(() => window.__pending[1].reject(new Error('stale request')));
   await page.waitForTimeout(60);
   assert.match(await page.locator('#editReportState').textContent(),/не створено/);
   await page.evaluate(async()=>{
    _sbUser={id:'test-owner'};
    _sb={from(){return {select(){return this},eq(){return Promise.resolve({data:[{id:window.__ids[1],report_token:'c'.repeat(64)}],error:null})}}},rpc:async()=>({data:[],error:null})};
    await window.A_CEIL_ProjectCRM.refresh();
   });
   const revoke=await page.evaluate(async () => {
    window.__rpc=[];
    _sbUser={id:'test-owner'};
    _sb={rpc:async(name,args)=>{window.__rpc.push({name,args});return {error:null}},from(){return {select(){return this},eq(){return Promise.resolve({data:[],error:null})}}}};
    let missing=false;
    try {await window.A_CEIL_ReportLinks.revoke('missing')}catch(e){missing=e.message.includes('не знайдено')}
    await window.A_CEIL_ReportLinks.revoke('cloud-b');
    const items=window['A·CEIL'].API.projects.list();
    return {missing,calls:window.__rpc.filter(x=>x.name==='aceil_revoke_report_link'),a:items.find(x=>x._dbId===window.__ids[0]).report_token,b:items.find(x=>x._dbId===window.__ids[1]).report_token};
   });
   assert.deepEqual(revoke,{missing:true,calls:[{name:'aceil_revoke_report_link',args:{p_project_id:'22222222-2222-4222-8222-222222222222'}}],a:null,b:null});
   await page.waitForTimeout(60);
   assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.rp-project-card')].find(x=>x.textContent.includes('Хмара B'))?.querySelector('.aceil-report-active-badge') !== null),false);
   // A was refreshed to null above; use a distinct token to verify isolation too.
   const isolation=await page.evaluate(async()=>{
    const items=window['A·CEIL'].API.projects.list(); items[0].report_token='d'.repeat(64); items[1].report_token='e'.repeat(64);
    window['A·CEIL'].API.projects.replaceAll(items);
    await window.A_CEIL_ReportLinks.revoke('cloud-b');
    return window['A·CEIL'].API.projects.list().map(x=>x.report_token);
   });
   assert.deepEqual(isolation,['d'.repeat(64),null]);
   await page.close();
   console.log('project report identity OK at '+width+'px');
  }
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
