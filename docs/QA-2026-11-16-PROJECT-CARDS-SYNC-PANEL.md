# A·CEIL — compact project cards and sync-panel lifecycle (2026-11-16)

## iPhone feedback
Two screenshots at 08:37/08:38 showed:
1. In the Projects list, the object card spread title, status, room count,
   area, perimeter, variants and 4 tall action buttons across an oversized
   layout with substantial vertical space.
2. After successfully confirming equal local/cloud drawings
   (revision 77 vs 78 for «Соборна 11.11»), the amber sync helper panel
   remained on-screen even while the card below had switched to «Хмара».

## Root cause
- The original renderer produces a horizontal card with a fixed 112px
  thumbnail and a 90px-wide *vertical* actions rail. On a narrow iPhone,
  wrapping metrics and variants makes the card several hundred pixels high.
- `A_CEIL_ConflictResolver` updated local state and refreshed the project
  list after a successful acknowledgement. However, `renderProjects()`
  re-renders **only** `#projectsList`, not its sibling
  `#aceilSyncRescuePanel`. The stale warning therefore remained visible.

## Changes
- At <=700px render a two-column card (76px preview + all information),
  with horizontal one-row actions underneath: Open, edit, archive, trash.
  Keep the project title, status badges, room/area/perimeter and estimate
  selector visible; remove only the duplicate «Багатокімнатний» label
  when the number of rooms is already shown. Do not alter click handlers.
- Sync helper panel now has a small header and a separate accessible Close
  control. Closing is only a display action, not an acknowledgement.
- Successful exact-match confirmation, confirmed local-to-cloud update, and
  explicit cloud-version selection dismiss the helper automatically **only**
  when the exact same project's revision is confirmed, no local dirty flag
  remains, and no matching pending queue entry exists.
- A stale panel may also close when a fresh projects-list render discovers
  that the same project is already confirmed. Never hide a still-blocked
  conflict.
- Updated app cache version so iPhone PWA sees new UI.

## Verification / safety
- `tests/project-compact-cards.test.cjs` checks mobile CSS, single-install
  behavior, and safe close button.
- `tests/sync-conflict-resolver.test.cjs` checks successful close after
  equal revisions and both explicit choices, while a real conflict and an
  unrelated project's panel remain visible.
- No Supabase schema, database rows, drawings, price calculations or
  project metadata changed by this release.
- Physical iPhone visual verification is still required after deploy.
