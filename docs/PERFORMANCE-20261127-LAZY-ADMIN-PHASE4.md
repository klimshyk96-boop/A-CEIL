# A·CEIL — Mobile performance phase 4: lazy administration (2026-11-27)

## Baseline
After the previous PageSpeed improvements (screenshot: mobile 77), the app
loads 173 classic scripts, approximately 2.5MB of uncompressed source.
Chromium startup coverage (synthetic network, CPU slowdown 4×) found roughly
47KB of the 50KB administration module unused before sign-in.
The owner/admin module also includes the public support dialog.

## Change
- Keep original `js/admin/166-aceil-admin.js` unchanged, preserving user
  approval/rejection, cloud RPC authorization, support contacts, activity,
  debug, and editing behavior.
- Replace its default script tag with
  `js/admin/166-aceil-admin-loader.js`, a small compatibility facade.
- After auth, existing `A_CEIL_Admin.refreshOwner(user)` automatically
  loads the full script and invokes the original method. Admin UI access
  remains determined by the backend's protected `admin_list_users` RPC,
  not by client-side email or role guesses.
- Tapping contact/support also loads the unchanged full code, with a
  single shared request, and opens the modal automatically.
- Preserve synchronous `A_CEIL_Support.link(key,value)` so DEMO help
  links remain available before the main admin code is downloaded.
- Failed dynamic download must be retryable; no user data or sync writes.
- Cache the full admin module in the versioned PWA shell for offline
  availability, but do not evaluate it during normal editor startup.
- Update runtime manifest, architecture's strict on-demand allowlist,
  versioned PWA cache, and synthetic mobile browser/Node regression.
- No changes to drawings, prices, saved projects, or backend schema.

## Acceptance
- First load: exactly 173 classic scripts, **zero admin-full requests** in
  the page's main script chain; `A_CEIL_Admin` and `A_CEIL_Support` facade
  always exist.
- Support tap: load original full file once, contact modal opens and
  support link sanitization remains identical.
- Auth refresh: real user passed into original `refreshOwner`, auth RPC
  continues as the authority; no extra untrusted writes.
- On script failure: allow next tap to retry without closing projects.
- Existing Node critical checks and Playwright tests (projects, PDF,
  variants, startup, i18n, offline PWA) must all pass.
- After deploy rerun mobile PSI; 90+ remains a goal, not a guarantee.
