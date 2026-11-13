# A·CEIL sync conflict: single-device revision mismatch (2026-11-13)

## User observation
iPhone showed project **«Чернетка 13.11 13:29»**, local acknowledged
revision **10**, server revision **12**. The user had not used a second device.
The conflict panel listed two version replacement actions and warned that they
could destroy the other copy.

## What the code proves / does not prove
- The revision mismatch is real, but **it does not identify the device** or
  write path responsible for the two later cloud revisions.
- Autosave, room save, cloud queue, reopening the app, and metadata refresh
  can run near each other. The precise origin of these revisions cannot be
  established without the user's local+server snapshots or write logs.
- A strict revision check must remain: auto-choosing the newer revision could
  erase valid local work.
- The old conflict comparator did not normalize local `inC/outC` against
  server `in_corners/out_corners` and compared report/CRM metadata that does
  not belong to the regular drawing write path, causing avoidable false
  positive "different drawings" messages.

## Safe changes
1. When a cloud revision is newer than the local acknowledged revision, query
   the cloud record **read-only** once more and compare the complete editable
   drawing/estimate fields and canonical parsed `state`.
   If *all* fields match exactly, acknowledge the newer cloud revision
   **without writing to Supabase**. If any field differs or a check fails,
   retain the conflict and preserve both copies.
2. Normalize the difference comparator to match the sync payload's fields
   and aliases; do not use report publication/CRM fields as a drawing diff.
3. Show a compact reconciliation panel, include the locally/cloud room counts
   and changed names if available; do not assert a second device was used.
4. Show replacement choices only after the JSON backup was initiated; existing
   confirmation and fresh-revision verification remain mandatory.
5. Regression tests cover exact cloud copy at revision 12, a real different
   drawing, canonical field aliases, and the backup gate.

## Safety
No user projects, cloud rows, schema, pricing or stored drawings modified by
this code change. No API keys or account data accessed during development.
For the currently blocked revision 10 vs 12, user should download the
**two-version JSON** before choosing any overwrite. The patch does **not**
silently reconcile genuinely different documents.
