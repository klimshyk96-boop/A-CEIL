'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const links=read('js/reports/201-aceil-report-links.js');
const publicPage=read('js/reports/092-aceil-public-report-page.js');
const migration=read('supabase/migrations/20261027183000_immutable_report_snapshots.sql');

assert.match(links,/aceil_publish_report_snapshot/);
assert.match(links,/snapshotReady/);
assert.ok(links.indexOf('aceil_publish_report_snapshot')<links.indexOf('aceil_publish_report_link'),
  'immutable snapshot must be stored before the legacy latest-link badge is refreshed');
assert.match(links,/aceil_revoke_report_snapshot/);
assert.match(publicPage,/aceil_get_public_report_snapshot/);
assert.ok(publicPage.indexOf('aceil_get_public_report_snapshot')<publicPage.indexOf('"aceil_get_public_report"'),
  'public page must resolve immutable snapshots before the historical project field');
assert.match(migration,/create table if not exists public\.aceil_report_snapshots/);
assert.match(migration,/token text primary key/);
assert.match(migration,/insert into public\.aceil_report_snapshots/);
assert.match(migration,/create or replace function public\.aceil_record_report_view/);
assert.doesNotMatch(migration,/on conflict \(project_id\)/,
  'publishing another variant must not replace the first snapshot');

new Function(links);
new Function(publicPage);
console.log('Immutable report snapshot regression tests: OK');
