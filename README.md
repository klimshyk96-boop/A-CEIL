# A·CEIL CLEAN FINAL

Production-oriented CLEAN baseline for A·CEIL, finalized after the RC1 regression pass on iPhone/Vercel.

## Runtime invariants

- Password auth hydrates cloud projects/nomenclature without requiring Google login.
- Safari/WebKit resume and Supabase realtime cleanup remain protected.
- Project repository preserves local unsynced work during cloud hydration.
- Multi-room lifecycle keeps room IDs stable and synchronizes live `rooms` with serialized room state.
- Deleted rooms must not reappear after reload.
- Opening nomenclature is read-only with respect to quantities/prices.
- Public/manager reports retain their established behavior and production report URLs.
- Parallel wall elements remain supported.
- Debug error capture remains available; empty WebKit `ERROR: null` noise is ignored.
- Measure-confidence logic remains available internally while its floating status circle is hidden.
- No application redirect from Vercel staging to production.
- No legacy service worker is registered.

## Structure

- `js/core/` — shared runtime/diagnostics.
- `js/admin/` — authentication/access/admin authority.
- `js/projects/` — project repository, persistence, project-level behavior.
- `js/rooms/` — room and multi-room lifecycle.
- `js/canvas/` — geometry/editing/render interaction.
- `js/nomenclature/` — elements/catalog/pricing isolation.
- `js/reports/` — normal, manager, cloud/public reports.
- `assets/app.css` — consolidated application styles.

## Important maintenance rule

Do not bulk-concatenate the remaining historical scripts. Browser testing showed that their independent `<script>` boundaries currently provide execution timing and fault isolation. Consolidate a legacy script only when its behavior has been moved into a canonical subsystem and verified in-browser.
