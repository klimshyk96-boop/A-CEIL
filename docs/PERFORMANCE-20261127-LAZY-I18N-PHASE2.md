# A·CEIL performance, phase 2 — lazy language dictionaries (2026-11-27)

## Scope
On the last published release, all 176 external classic scripts had been
changed to ordered `defer`. Three foreign-language dictionaries (EN, PL, RU)
were still downloaded and evaluated for everyone, even when the user stayed
in the Ukrainian source language. The normal UK translation MutationObserver
was also installed unnecessarily and was called on every DOM change.

## Changes
- Omit the EN, PL and RU dictionaries from the 173-script default HTML path.
  **Keep the Ukrainian, core, editor, cloud, estimates, PDF, and other modules
  in exactly the same order as before.** No feature is removed.
- On choosing EN/PL/RU, `i18n.ensureLanguage(lang)` adds a versioned local
  script URL (`js/i18n/0xx-aceil-lang-*.js?v=<current build>`), once per
  language. Concurrent calls reuse the same promise; failures allow retry.
- The user-facing language switcher waits for a dictionary before committing
  the preference or reloading. If the language cannot be downloaded (first
  choice while offline), the previous language remains selected.
- A previously selected EN/PL/RU is requested automatically on startup.
  Versioned script caching in the existing service worker makes a dictionary
  available offline after it was fetched for the same build.
- The Ukrainian source language does not start MutationObserver. Switching
  back from a foreign language disconnects the observer.
- Original synchronous `setLanguage`, `t`, `translate`, `register` and
  on-change API remain available to all legacy modules.
- Update runtime order manifest, PWA cache IDs, critical Node i18n tests and
  real Chromium mobile tests. Do not change projects, prices, sync, PDF code,
  database or user records.

## Verification
- Critical gate: `node tests/i18n-lazy.test.cjs` (default no requests,
  versioned and deduplicated download, saved Polish, offline error/retry,
  Ukrainian observer, translation compatibility).
- Browser workflow: `node tests/i18n-lazy-browser.test.cjs` + existing
  startup, projects/PDF and offline PWA tests.
- Expected initial classic script requests: **176 before; 173 after**.
  Foreign packages are requested only for active or previously selected users.
- This cuts initial parsing/evaluation for foreign dictionaries, but does
  not establish a numeric PageSpeed increase without a fresh mobile test.
- Offline caveat: a language never loaded in the current app build is
  unavailable on a first offline language switch. The switcher does not
  persist or apply the failed choice. A previously loaded dictionary is
  runtime-cached for normal offline reuse.
