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
node --check js/projects/238-aceil-conflict-resolver.js
node --check js/admin/166-aceil-admin.js
node --check js/core/098-aceil-geometry-core.js
node --check js/canvas/190-aceil-honest-geometry.js
node --check js/nomenclature/025-aceil-state-persistence-nomenclature.js
node --check js/reports/184-aceil-estimate-variants-ui.js
node --check js/canvas/wall-elements-parallel.js
node --check js/canvas/135-aceil-curve-fixed-ends.js
node --check js/reports/237-aceil-image-report-pdf.js
node --check js/core/019-aceil-core-ui-rooms-bulk-walls.js
node --check js/canvas/renderer.js
node --check js/reports/224-aceil-report-diagonals-menu-fix.js
node --check js/reports/104-aceil-multiroom-report-sandbox-fix.js
node --check js/nomenclature/163-aceil-price-stability.js
node --check js/rooms/multiroom-lifecycle.js
node --check js/auth/033-aceil-supabase-auth-offline-access.js

for name in \
  security-config \
  startup-nonblocking \
  p0-hardening \
  pending-sync-queue \
  project-sync-revision \
  project-revision-content \
  project-mode \
  autocount-profile \
  profile-coverage-stress \
  price-stability \
  quote-copy-workflow \
  project-archive \
  project-compact-cards \
  demo-access-ui \
  demo-support-visible \
  demo-existing-user \
  admin-user-lists \
  support-contacts \
  report-link-snapshots \
  report-trash-preservation \
  report-publication-session \
  report-pdf-export \
  report-diagonal-choices \
  diagonal-visible-report \
  sync-conflict-resolver \
  legacy-report-privacy \
  pwa-icon \
  stability-regression \
  honest-geometry \
  incomplete-measurement-no-price \
  wall-inward-offset-concave \
  curve-corrupt-geometry
do
  echo "▶ Checking: $name"
  node "tests/$name.test.cjs"
done

node scripts/check-architecture.cjs
echo "A·CEIL critical smoke checks: PASS"
