# A·CEIL reliability pass #108 (2026-11-13)

## Goal
Ensure a new edit cannot bypass a two-device conflict and malformed archived
curved-wall geometry cannot crash the report or silently produce NaN values.

## Confirmed issues
- The pending-sync queue's normalize/compaction kept only the newest operation
  for each project. This also inadvertently removed `_manualConflictRequired`
  and `_manualRestoreRequired` when a user edited a blocked object again.
  Because cloud writes use CAS revisions, those writes were still protected, but
  the UI could misleadingly clear the manual-resolution warning until retry.
- Curve solvers version 2/3 dereferenced polygon vertices without checking the
  archived room's entire `pts` array. A partial/null saved vertex could throw
  from `sourceGeometry` and interrupt preparing a multiroom report.

## Fixes
1. Preserve manual-resolution gates during compaction of subsequent saves for
   the same project. Keep newest payload, not the stale blocked payload.
   Explicit conflict resolution still unblocks a single queue entry.
2. Reject malformed/incomplete polygons in `solveData` with
   `{ok:false,error:"invalid_geometry"}` before attempting intersection math.
   `measureState` returns null rather than generating an incorrect area from a
   damaged room. Valid geometry calculations are unchanged.
3. Add fast CI tests for repeat edits after conflict, deleted cloud project
   isolation, valid curve calculations and malformed saved polygons.

## Safety and testing
- No live user data or database rows were read/changed.
- No database migrations, nomenclature prices, or existing drawings rewritten.
- Tests are mocked, deterministic, and offline.
- Manual follow-up: open two authenticated devices, edit the same room concurrently,
  confirm the conflict banner remains, export two-version JSON, and resolve safely;
  independently verify curved room PDFs on an iPhone.

## Exclusions
This pass does not claim a real two-device test with live Supabase sessions or
physical device testing. User account conflict decisions remain explicit.
