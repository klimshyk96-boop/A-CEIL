# A·CEIL — prevent chains of duplicate cloud backups (2026-11-27)

## Report
On iPhone the **Резервні** tab showed three items, including:
- «Сьогодні — Копія — Резервна копія»
- «Сьогодні — Копія — Резервна копія — Резервна копія»
- A separate pending/conflicted project.

## Read-only Supabase finding
- First active backup created **2026-11-12 20:24 Kyiv**, with
  `state.recoverySourceId` pointing to a separate source project.
- Second active backup created **2026-11-13 08:53 Kyiv**, with
  `state.recoverySourceId` referencing the FIRST backup.
- Thus the second is a recursive backup-of-backup, not an alternate
  estimate or repeated rendering of one record.
- These two active cloud backups predate 27 November; screenshot does NOT
  establish that every save generates a new backup.
- No production user records were deleted, merged or altered.

## Root cause and fix
- The defensive rescue path previously only checked existing backups in
  the local project list; after login, cache refresh or blocked sync a
  backup that existed remotely could be missing locally. This allowed an
  additional backup when the user initiated a protective copy.
- Now the **explicit** rescue operation reads the current user's
  `public.projects` for an existing
  `state.recoverySourceId = source._dbId` BEFORE inserting anything.
  If found, reuse the existing cloud record ID; no additional copy.
- If Supabase reports an error or account changes mid-request, fail closed:
  keep the drawings and queue unchanged; do not create a copy blindly.
- After the cloud check, compare local list again. A per-source in-flight
  lock prevents double-tap races.
- Recognize a backup from either top-level `_recoverySourceId`,
  `state.recoverySourceId`, or the historical backup suffix. A renamed
  backup with a preserved lineage still cannot recursively back up itself.
- Existing manual protective-copy action is preserved for genuine unique
  local drawings and remains opt-in.
- Add regressions for remote-existing backup after login, cloud lookup
  failure, renamed backup with state-only lineage, state-only existing
  backup, and rapid parallel taps.
- Invalidate PWA cache; no database schema/data migration.

## Follow-up
The pre-existing archived and active backup records are intentionally left
untouched. Some may have distinct measurements, as prior investigations
demonstrated. Do not merge or delete them based on name alone; compare the
actual geometry and cloud revs first. The pending count is sync queue state,
not proof that new backups were just created.
