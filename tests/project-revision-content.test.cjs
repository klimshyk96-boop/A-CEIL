const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261112081000_project_revision_content_only.sql'),'utf8');
test('revisions only increment for drawing, pricing and client fields',()=>{
  for(const field of ['name','addr','phone','comment','area','per','in_corners','out_corners','thumb','state'])
    assert.match(migration,new RegExp('new\\.'+field));
  for(const metadata of ['report_token','report_published_at','report_expires_at','deal_status','order_source'])
    assert.doesNotMatch(migration,new RegExp('new\\.'+metadata));
  assert.match(migration,/is distinct from/);
  assert.match(migration,/new\.sync_revision := old\.sync_revision \+ 1/);
  assert.match(migration,/new\.sync_revision := old\.sync_revision;/);
});
