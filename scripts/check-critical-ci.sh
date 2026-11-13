#!/usr/bin/env bash
# Fast safe gate for every PR/main push. No browser downloads or paid services.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/check-runtime.py
node --check sw.js
node --check js/projects/032-aceil-pending-sync-queue.js
node --check js/nomenclature/232-aceil-profile-coverage.js
node --check js/nomenclature/140-aceil-universal-autocount.js
node --check js/projects/230-aceil-project-archive.js
node --check js/projects/230-aceil-project-archive.js
node --check js/auth/033-aceil-supabase-auth-offline-access.js

for name in \
  security-config \
  p0-hardening \
  pending-sync-queue \
  project-sync-revision \
  project-revision-content \
  project-mode \
  autocount-profile \
  quote-copy-workflow \
  project-archive \
  demo-access-ui \
  demo-support-visible \
  demo-existing-user \
  support-contacts \
  report-link-snapshots \
  report-publication-session \
  legacy-report-privacy \
  pwa-icon \
  stability-regression \
  honest-geometry
do
  echo "▶ Checking: $name"
  node "tests/$name.test.cjs"
done

node scripts/check-architecture.cjs
echo "A·CEIL critical smoke checks: PASS"
