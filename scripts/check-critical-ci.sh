#!/usr/bin/env bash
# Fast safe gate for every PR/main push. No browser downloads or paid services.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/check-runtime.py
node --check sw.js
node --check js/projects/032-aceil-pending-sync-queue.js
node --check js/auth/033-aceil-supabase-auth-offline-access.js

for name in \
  security-config \
  p0-hardening \
  pending-sync-queue \
  project-sync-revision \
  project-revision-content \
  project-mode \
  demo-access-ui \
  demo-support-visible \
  demo-existing-user \
  support-contacts \
  report-link-snapshots \
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
