/* Static regression contract for atomic revision writes and old trash restores. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('backward compatible database trigger initializes old trash rows and advances all updates',()=>{
  const sql=read('supabase/migrations/20261111215500_project_sync_revision.sql');
  assert.match(sql,/add column if not exists sync_revision bigint not null default 1/i);
  assert.match(sql,/if TG_OP = 'INSERT' then[\s\S]*?new.sync_revision := 1/i);
  assert.match(sql,/new.sync_revision := old.sync_revision \+ 1/i);
  assert.match(sql,/before insert or update on public.projects/i);
  assert.match(sql,/for each row[\s\S]*execute function public\.aceil_projects_bump_sync_revision/i);
  assert.match(read('supabase/migrations/20261031130000_project_trash.sql'),/jsonb_populate_record\(null::public\.projects,doc\)/);
});

test('all project saves compare revision in the UPDATE and preserve failed revisions',()=>{
  const queue=read('js/projects/032-aceil-pending-sync-queue.js');
  assert.match(queue,/\.update\(updatePayload\)\.eq\("id", dbId\)\.eq\("sync_revision", expectedRevision\)/);
  assert.match(queue,/failed\._manualConflictRequired = true/);
  assert.match(queue,/!x\._manualConflictRequired/);
  assert.match(queue,/current\._cloudRevision = String\(row\.sync_revision\)/);
});

test('cloud loader provides revision and dirty cache cannot accept a new baseline',()=>{
  const load=read('js/admin/159-aceil-access-clean.js');
  const repo=read('js/projects/project-repository.js');
  assert.match(load,/_cloudRevision:p\.sync_revision==null\?null:String\(p\.sync_revision\)/);
  assert.match(repo,/if\(Object\.prototype\.hasOwnProperty\.call\(local,'_cloudRevision'\)\)/);
  assert.match(repo,/project\._cloudRevision=local\._cloudRevision/);
});
