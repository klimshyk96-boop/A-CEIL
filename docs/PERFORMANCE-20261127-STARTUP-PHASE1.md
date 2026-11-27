# A·CEIL — mobile startup performance, Phase 1 (2026-11-27)

## User complaint and baseline
A PageSpeed Insights screenshot showed **mobile Performance 40**, Accessibility 79,
Best Practices 100 and SEO 80. These are reported scores, not post-fix metrics.
The current index contains **176 external classic scripts**, only **2**
previously marked defer, and **174 parser-blocking** script tags. The page
contains 5 inline scripts, a boot splash, 4 CSS stylesheets and a local PWA.
The script order is important because legacy modules wrap globals.

## Low-risk change
- Add `defer` to every existing external classic script, preserving **exact
  existing order**, paths and synchronous global script semantics.
  Avoid `async` and `type=module` because they break the legacy dependency
  chain. The browser can now finish HTML parsing before executing ordered
  modules instead of blocking parsing for each network response.
- Leave the synchronous initial theme-bootstrap inline script untouched to
  prevent wrong-theme flash. The other inline scripts only attach listeners or
  define functions and remain in their existing positions.
- Remove `user-scalable=no, maximum-scale=1` from the iOS viewport declaration.
  Pinch-to-zoom is an accessibility requirement; iPhone native zoom and touch
  behavior must be verified.
- Add a concise `meta description` while retaining the Ukrainian page title.
- Bump VERSION/index/sw cache IDs together to preserve versioned offline files.
- Do not touch drawing data, local storage, synchronization, Supabase RPC or
  project record structures.

## Regression gates
- `tests/startup-nonblocking.test.cjs`: zero parser-blocking or async external
  scripts, exact order, identical PWA versions, viewport zoom allowed.
- `tests/startup-defer-browser.test.cjs`: Chromium 390px/1440px with local
  mock cloud; check editor globals, no page errors, full loading and print
  navigation timings.
- Browser workflow also runs existing real mobile project/variant/PDF QA and
  `verify-pwa.cjs` to check local offline boot (no cloud writes, test data only).
- Existing fast critical gate and complete browser suite remain unchanged.

## Acceptance and next phases
The first release should improve parser and first-render behavior. It does NOT
prove a particular PageSpeed increase until a fresh public mobile Lighthouse
report is run. Keep the old 40/79/100/80 as baseline, compare LCP, FCP, TBT
and CLS after deploy. Phase 2 should use startup JS coverage to identify
modules safe for *on-demand* loading; do not remove features or reorder global
wrappers without separate browser+offline tests. Phase 3 addresses icon button
names, focus order, contrast and remaining SEO/report findings.
