const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','js','admin','166-aceil-admin.js'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20261111193000_existing_user_demo_and_shared_expiry.sql'),'utf8');
assert.ok(src.includes("aceil_admin_start_demo"),'existing-user demo must call owner RPC');
assert.ok(sql.includes("p.demo_enabled=false"),'do not reset a demo on accidental second click');
assert.ok(sql.includes("p.approval_status='approved'"),'approved users only');
assert.ok(sql.includes("on conflict(owner_id,user_id) do update"),'shared-project expiry upserts missing access record');
assert.ok(sql.includes('access_until=excluded.access_until'),'update field used by project RLS');
assert.ok(sql.includes("access_expires_at=excluded.access_expires_at"),'synchronize legacy expiry field');
assert.ok(sql.includes("access_until=null,access_expires_at=null"),'both fields cleared');
assert.ok(sql.includes("revoke all on function public.aceil_admin_start_demo(uuid) from public,anon"),'demo only authenticated');
assert.ok(src.includes("r.projects_access?tempAccess(uid,r):''"),'shared project expiry only when shared');

const start=src.indexOf('function render(rows){');
const end=src.indexOf('function toggleCard(',start);
assert.ok(start>=0&&end>start);
let html='';
const dummies={
  content:v=>html=v,renderSummary:()=>{},esc:x=>String(x||''),
  initials:()=>'U',workspaceBox:()=>'<div>workspace</div>',
  wallCatalogBox:()=>'',filmCatalogBox:()=>'',toggle:()=>'',
  projectScope:()=>'',tempAccess:()=>'<div>SHARED_EXPIRY_SECTION</div>',
  foldSummary:()=>'',mailFeatureReady:false,Date,adminRows:[]
};
const render=new Function(...Object.keys(dummies),src.slice(start,end)+';return render')(...Object.values(dummies));
const base={user_id:'test-user',app_role:'user',email:'test@example.test',
  approval_status:'approved',is_active:true,workspace_initialized:true,
  projects_access:false,demo_enabled:false};
render([base]);
assert.match(html,/Видати 1 годину/,'approved user may request DEMO');
assert.doesNotMatch(html,/SHARED_EXPIRY_SECTION/,'do not confuse DEMO and sharing');
assert.doesNotMatch(html,/id="aceilDemo_test-user"/,'checkbox only in new registration');
render([{...base,approval_status:'pending',is_active:false}]);
assert.match(html,/id="aceilDemo_test-user"/,'pending approval DEMO checkbox');
assert.doesNotMatch(html,/Видати 1 годину/,'pending has no separate DEMO grant');
render([{...base,demo_enabled:true}]);
assert.match(html,/ДЕМО · очікує першого входу/,'unstarted trial');
assert.match(html,/Надати повний доступ/,'convert trial to paid/full');
assert.doesNotMatch(html,/Видати 1 годину/,'do not reset existing trial');
render([{...base,demo_enabled:true,demo_started_at:'2026-01-01',
  demo_expires_at:'2026-01-01'}]);
assert.match(html,/ДЕМО завершено/,'expired status badge');
render([{...base,projects_access:true}]);
assert.match(html,/SHARED_EXPIRY_SECTION/,'keep separately granted sharing controls');
console.log('Existing-user DEMO and distinct shared expiry controls: OK');
