// Security contract for migration off the public historical reports bucket.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const frontend = read('js/reports/092-aceil-public-report-page.js');
const edge = read('supabase/functions/aceil-legacy-report/index.ts');

test('public report UI does not fetch legacy files through unrestricted public URLs', () => {
  assert.match(frontend, /functions\/v1\/aceil-legacy-report"/);
  assert.match(frontend, /method: "POST"/);
  assert.match(frontend, /body: JSON\.stringify\(\{ token: value\.toLowerCase\(\) \}\)/);
  assert.doesNotMatch(frontend, /aceil-legacy-report\?token=/);
  assert.doesNotMatch(frontend, /storage\/v1\/object\/public\/roomator-reports/);
  assert.match(frontend, /response\.status === 410 && payload\.status === "revoked"/);
  assert.match(frontend, /response\.status === 410 && payload\.status === "expired"/);
});

test('gateway restricts paths to a 20-hex capability and uses private storage access', () => {
  assert.match(edge, /\^\[a-f0-9\]\{20\}\$/);
  assert.match(edge, /object\/authenticated\/roomator-reports\/r\//);
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /report\.revoked === true/);
  assert.match(edge, /report\.expiresAt != null/);
  assert.match(edge, /Cache-Control.*no-store/);
  assert.match(edge, /req\.method !== "POST"/);
  assert.match(edge, /JSON\.parse\(raw\)/);
  assert.doesNotMatch(edge, /searchParams\.get\("token"\)/);
  assert.doesNotMatch(edge, /searchParams\.has\("health"\)/);
  assert.doesNotMatch(edge, /console\.(?:log|error)\s*\(/);
});
