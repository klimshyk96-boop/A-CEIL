'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migration=read('supabase/migrations/20261118113000_preserve_published_reports_on_project_trash.sql');
const trash=read('supabase/migrations/20261031130000_project_trash.sql');
const reports=read('js/reports/201-aceil-report-links.js');
const viewer=read('js/reports/092-aceil-public-report-page.js');

test('trash stores project UUID unchanged and restores the original identity',()=>{
  assert.match(trash,/insert into public\.aceil_project_trash\(/i);
  assert.match(trash,/delete from public\.projects/i);
  assert.match(trash,/insert into public\.projects\s+select \(jsonb_populate_record\(null::public\.projects,doc\)\)\.\*/i);
  assert.doesNotMatch(migration,/update\s+public\.projects\s+set\s+id/i);
});

test('all three published-report dependencies stop cascading on project trash',()=>{
  for(const [table,constraint] of [
    ['aceil_report_snapshots','aceil_report_snapshots_project_id_fkey'],
    ['report_links','report_links_project_id_fkey'],
    ['aceil_report_views','aceil_report_views_project_id_fkey']
  ]){
    assert.match(migration,new RegExp('ALTER TABLE public\\.'+table+'\\s+DROP CONSTRAINT IF EXISTS '+constraint,'i'));
  }
  assert.doesNotMatch(migration,/\bADD\s+CONSTRAINT\s+\w+[\s\S]*?\bON\s+DELETE\s+CASCADE\b/i,'migration must never recreate a destructive report FK');
  assert.doesNotMatch(migration,/TRUNCATE|DELETE FROM public\.(?:aceil_report_snapshots|report_links|aceil_report_views)/i,
    'migration must preserve every existing report and viewing counter');
});

test('public payload still reads independent of original project row',()=>{
  assert.match(viewer,/aceil_get_public_report_snapshot/);
  assert.match(viewer,/aceil_get_public_report/);
  assert.match(reports,/aceil_publish_report_snapshot/);
  assert.match(reports,/aceil_publish_report_link/);
  assert.match(migration,/WHERE s\.token = LOWER\(p_token\)\s+AND s\.owner_id = auth\.uid\(\)/i,
    'only original owner can revoke an orphaned immutable report');
  assert.match(migration,/l\.project_id = p_project_id\s+AND l\.owner_id = v_user/i,
    'legacy revocation must still be possible when project is gone');
  assert.match(migration,/s\.project_id = p_project_id\s+AND s\.owner_id = v_user/i,
    'snapshot-only archives also identify their owner');
});

test('expiry and owner boundaries stay in force',()=>{
  assert.match(migration,/no expiry extension/i);
  assert.match(migration,/IF auth\.uid\(\) IS NULL/i);
  assert.match(migration,/public\.can_access_project\(p\.user_id, p\.id\)/i);
  assert.match(migration,/ua\.report_publish = true/i);
  assert.doesNotMatch(migration,/GRANT\s+ALL|DISABLE ROW LEVEL SECURITY/i);
});
