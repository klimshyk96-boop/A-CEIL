# A·CEIL stability pass — 13.11.2026

## Scope
Read-only review before changes of:
- Geometry: `js/canvas/190-aceil-honest-geometry.js`,
  `js/canvas/127-aceil-measure-confidence.js`,
  `js/nomenclature/232-aceil-profile-coverage.js`,
  `js/nomenclature/140-aceil-universal-autocount.js`.
- Price totals: `js/nomenclature/163-aceil-price-stability.js`.
- Synchronization: `js/projects/032-aceil-pending-sync-queue.js`,
  `js/projects/227-aceil-cloud-first-autosave.js` and the room lifecycle.
- Existing regressions: `tests/honest-geometry.test.cjs`,
  `tests/autocount-profile.test.cjs`,
  `tests/project-sync-revision.test.cjs`,
  `tests/report-pdf-export.test.cjs`.

## Confirmed code issues addressed
1. **Stale room index leaks the live drawing into another room's total.**
   Previously the displayed sum used `_activeRoomIdx` without verifying
   that it referred to a room in the currently opened object. After
   navigation it could substitute an unrelated canvas estimate. Use the
   stable `_activeRoomId` and match it inside the active object's
   `rooms` list; if absent, show only saved totals.
2. **Legacy unpositioned profile mark can be mistaken for side 0.**
   `Number(null) === 0` previously made an old mark with
   `sideIndex: null` look like a mark on the first wall. Preserve it
   as unpositioned. Do not rewrite the saved mark or change its price.
3. **A total chip can lag cloud synchronization or returning to the app.**
   Refresh the display on `aceil:sync-status-change` and when the
   document becomes visible, without recalculating nomenclature.

## New automated gates
- `tests/price-stability.test.cjs`: stale index, switched objects,
  matching room ID, display-only refresh, no mutation to saved estimates.
- `tests/profile-coverage-stress.test.cjs`: fixed priority,
  last-edit tie breaking, legacy null-side identity, 400 deterministic
  randomized overlap cases and no overlap/negative interval invariants.
- Fast CI includes both tests and syntax checks for the affected modules.

## Existing safeguards confirmed in the inspected code
- Pending queue uses revision-matched cloud updates and records conflicts
  rather than force-overwriting a concurrent edit.
- Price stability code derives saved-room totals from each room's own state.
- PDF room-aware pagination was fixed and deployed separately in #106.

## Out of scope / manual QA still needed
- A real two-device conflict test under unstable mobile internet and delayed
  Supabase acknowledgements.
- Browser-based tests of all complex curves, fixture icons, and customer PDFs
  on a physical iPhone.
- Full independent financial audit of all possible external/custom catalogue
  items and discounts.

Do not edit live database rows or user projects during verification. Keep
these items in the next QA pass; this release is limited to deterministic
invariants, safer calculation display, and preserving old wall marks.
