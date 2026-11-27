# A·CEIL mobile optimization phase 3: SVG light icons (2026-11-27)

## Baseline and context
User's repeated mobile PageSpeed screenshots show **40 → 77 performance**,
**79 → 87 accessibility**, best practices **100**, and SEO **80 → 90**.
This is a score difference across separate Lighthouse runs, not a controlled
field-performance measurement.

An independent, read-only Chromium QA baseline on iPhone-like 390px
viewport with **4× CPU slowdown** reports:
- **173 startup scripts**, 2222 KB JS visible in the synthetic harness
  (Supabase vendor is stubbed, so this is not real network data),
- **4 long tasks, 817 ms accumulated long-task durations**,
- **929 ms DOMContentLoaded, 1118 ms load**, all local network mock;
- CPU profile's top JavaScript module: **060-aceil-light-svg-icons.js**,
  **152 CPU samples** during initial load (next module only 33);
- The old `warmSvgCache` ran unconditionally after 600 ms,
  for each configured `lightTypes`, in **six colours at 48 px**.
  Actual render requests via `getSvgImage` use **56 px**. The warm cache
  entries are not reused and each SVG image loading event invokes draw.

## Implementation
- **Remove the unconditional boot timer**. On-demand `getSvgImage`
  remains available and is called by the canvas on first real use, with
  fallback text until the image is ready. Its onload event requests a
  redraw, retaining the full original icon functionality.
- `warmSvgCache` stays as a public helper when explicitly requested by
  existing settings flows, but only visits **icons actually placed on the
  drawing**, deduplicated by icon ID and real icon colour, at **56 px**.
- Empty projects perform **zero SVG image allocations during boot**.
- Do not modify light type definitions, icon paths, saved state, reports,
  project ownership, Supabase, or user data.
- Update PWA build version and run `tests/light-svg-idle-start.test.cjs`.
- Add lightweight profile instrumentation to mobile Chromium QA for future
  regressions. Coverage reports are lab-only, synthetic; focus on CPU work
  and actual user-visible functions rather than a guaranteed score.

## Acceptance
- CI fast tests and real browser QA must pass, including projects, estimates,
  PDF, offline PWA, Ukrainian/foreign language behavior.
- Compare **mobile profile CPU samples for 060**, long-task total and load
  timing **before/after on same lab conditions** (sample measurements
  approximate, not user-device times).
- Check a drawing with two configured light types: each icon renders after
  initial asynchronous load; no duplicate image storms or lost markers.
- Release only after green checks; compare fresh mobile PageSpeed again
  after production deployment before claiming any numeric improvement.
