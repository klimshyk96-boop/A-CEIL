# A·CEIL architecture map

## Canonical authorities

### Projects
`js/projects/project-repository.js`

Owns canonical project repository behavior, local persistence bridge, cloud hydration preservation and repository access.

### Rooms / Multi-room
`js/rooms/multiroom-lifecycle.js`

Owns room creation, stable room identity, switching lifecycle and deletion synchronization. A deletion must update both the live room collection and the serialized project room state before persistence.

### Auth / Access hydration
`js/admin/159-aceil-access-clean-v2.js`

Owns the post-login hydration path and access/realtime authority layered on the original Supabase bootstrap. Preserve safe realtime channel removal for iOS/WebKit resume.

### Runtime diagnostics
`js/core/debug-panel.js`

Single visible runtime error panel. Captures meaningful browser errors/rejections and suppresses empty WebKit noise.

### Parallel wall elements
`js/canvas/wall-elements-parallel.js`

Late renderer for multiple wall elements on the same wall using inward lanes.

## Protected invariants

1. A nomenclature modal open must not recalculate quantities or prices.
2. A project open must not mutate its stored price.
3. Save/switch room flow must persist current-room state before activating another room.
4. Deleting a room must survive reload and cloud re-hydration.
5. Public report links remain under `https://a-ceil.pp.ua/report/<token>`.
6. Staging `*.vercel.app` must never redirect the application to production.
7. Do not restore the removed legacy service worker.
8. Do not expose the hidden measure-confidence floating circle.

## Maintenance rule (RC6+)

Approved changes are made in the module/rule that actually owns the behavior. Do not add new `fix`, `hardfix`, or end-of-file override layers for ordinary changes.

- Existing room behavior/UI: edit the room renderer/lifecycle that owns it.
- Existing nomenclature layout: edit the canonical nomenclature CSS rules.
- Existing project persistence: edit `js/projects/project-repository.js`.
- Existing multi-room lifecycle: edit `js/rooms/multiroom-lifecycle.js`.
- Existing access/auth behavior: edit `js/admin/159-aceil-access-clean-v2.js`.
- Temporary diagnostic overrides are allowed only during investigation and must be consolidated or removed before MAIN.

- RC9: nomenclature item names and price inputs share the same typography; implemented in canonical assets/app.css, not an override module.

## RC10 cleanup rule

- RC10 removes deploy-package history/test clutter only; runtime files remain byte-for-byte RC9.
- Claude AST partial-definition deletions are audit candidates, not trusted patches. Same-name
  definitions are not proof of equivalence because A·CEIL still uses wrapper chains and ordered
  script loading.
