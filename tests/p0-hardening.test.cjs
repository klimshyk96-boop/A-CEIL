'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const migration=read('supabase/migrations/20261111213000_p0_access_storage_owner.sql');
const undo=read('supabase/rollback/20261111213000_p0_access_storage_owner.down.sql');
const auth=read('js/auth/033-aceil-supabase-auth-offline-access.js');
const queue=read('js/projects/032-aceil-pending-sync-queue.js');

assert.doesNotMatch(migration,/create or replace function public\.get_my_access\(\)/i,'own-workspace access stays unchanged');
assert.match(migration,/public\.aceil_demo_has_access\(\)/i);
assert.match(migration,/aceil_projects_identity_immutable/i);
assert.match(migration,/new\.user_id is distinct from old\.user_id/i);
assert.match(migration,/new\.id is distinct from old\.id/i);
assert.match(migration,/owner_id=\(select auth\.uid\(\)\)::text/i);
assert.match(migration,/for insert to authenticated/i);
assert.match(migration,/for update to authenticated/i);
assert.match(migration,/for select to authenticated/i);
for(const fn of ['aceil_publish_report_link','aceil_publish_report_snapshot','aceil_save_film_catalog','aceil_get_film_catalog']){
  const at=migration.indexOf('FUNCTION public.'+fn+'(');
  assert.ok(at>0,'missing '+fn);
  assert.match(migration.slice(at,at+1500),/A_CEIL_ACCOUNT_INACTIVE_OR_DEMO_EXPIRED/i,'access guard for '+fn);
}
assert.match(migration,/public\.aceil_is_platform_admin\(\) or public\.can_access_nomenclature\(p_user_id\)/i,'platform owner can copy target wall catalog');
assert.match(migration,/revoke execute on function public\.aceil_cleanup_report_links\(\) from public,anon,authenticated/i);

assert.match(queue,/delete updatePayload\.user_id/,'pending queue may not transfer project ownership');
assert.match(auth,/delete updatePayload\.user_id/,'direct saves may not transfer project ownership');
assert.doesNotMatch(queue,/from\("projects"\)\.update\(payload\)/,'update must strip owner before saving');
assert.doesNotMatch(auth,/from\("projects"\)\.update\(payload\)/,'direct update must strip owner');
assert.match(undo,/drop trigger if exists aceil_projects_identity_immutable/i);
assert.match(undo,/CREATE OR REPLACE FUNCTION public\.get_my_access\(\)/i);
assert.match(undo,/CREATE OR REPLACE FUNCTION public\.aceil_publish_report_snapshot/i);
assert.match(undo,/grant execute on function public\.aceil_cleanup_report_links\(\) to public/i);
assert.match(undo,/create policy "roomator reports update"/i);
assert.match(undo,/4737fa66e4392566b29b7bc0eccd575d27f032c9/,'rollback commit retained');

console.log('P0 access, DEMO, Storage RLS, owner immutability, reversible SQL: OK');
