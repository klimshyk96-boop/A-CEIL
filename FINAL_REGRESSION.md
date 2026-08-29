# FINAL regression checklist

1. Deploy as a new Vercel project and confirm the page stays on its `*.vercel.app` host.
2. Login with username/password first. Projects and nomenclature must hydrate without Google login.
3. Open a normal project. Open/close Elements without edits; price/qty must remain unchanged.
4. Open multi-room; switch A → B → A and verify isolation.
5. On a disposable project, create a room, draw, save, reload; it must remain.
6. Delete that disposable room, reload; it must not return.
7. Open normal and manager reports where applicable.
8. Background the browser for 20–30 seconds, return, and verify session/project state.
9. Logout, reload, login again by password; cloud data must load.
10. Check 🐞 Debug for any new meaningful error.
11. Optional console: `A_CEIL_CleanHealth()` should report `ok: true` after full load.
