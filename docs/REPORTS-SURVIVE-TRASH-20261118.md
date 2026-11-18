# A·CEIL: Published reports survive Trash and Restore (2026-11-18)

## Confirmed failure

`public.aceil_trash_project` first saves the original project JSON in
`public.aceil_project_trash` and then deletes that project's row from
`public.projects`. Three database relationships previously had
`ON DELETE CASCADE`, so that deletion also destroyed:

1. All `aceil_report_snapshots` for the project (immutable, public /r/ URLs).
2. All `report_links` for the project (legacy/latest public links).
3. All `aceil_report_views` for the project (unique-view counters).

The original `project_id` and `owner_id` remain stored on each report row;
these are intentional *historical identities* that are allowed to temporarily
lack a parent in `projects`. Restoring the project from its JSON recreates
the identical UUID, automatically reattaching the already-published reports
without updating their content or URL.

## Change

Migration: `supabase/migrations/20261118113000_preserve_published_reports_on_project_trash.sql`.

- Drop only the three project-parent cascade constraints listed above.
- Keep report tokens, original project UUID, owner, payload, published_at,
  expires_at, revoked_at and unique-view statistics unchanged.
- The public report RPCs read snapshot/link payloads directly and do not require
  that the parent project still exists. A report remains available only until
  its existing expiry or explicit revocation; this migration does not extend
  expiry or reissue old tokens.
- `aceil_revoke_report_snapshot(token)` authorizes using the report's
  immutable `owner_id = auth.uid()` rather than joining a possibly trashed
  project. Legacy `aceil_revoke_report_link(project_id)` still authorizes
  against `public.can_access_project` for active projects, plus the report's
  recorded owner when the project is archived/purged.
- No new public table permissions or RLS policies are added. Publishing still
  requires an active project and the existing ownership/access checks.
- The project Trash/Restore RPCs and app UI remain unchanged.

## Scope and nuance

- Soft delete, archiving, recovery and *permanent removal of the project*
  do not shorten the **already published** report's expiration period.
  Intentional revocation still disables the public URL.
- Already deleted snapshot/legacy link rows cannot be reconstructed from an
  archived project JSON alone. For old `/r/` links lost before this migration,
  the user can restore the project and publish a **new** report URL.
- Releasing a report from Trash must not accidentally republish one with a
  revoked token; the revoked_at check remains unchanged.

## Production rollout verification

Before/after:
- Compare total immutable reports, legacy links, unique-view counts.
- Confirm all three destructive FK constraints are absent.
- Confirm both revokers retain owner checks and existing EXECUTE grants.
- Confirm active public-report RPC returns `status=active` for a pre-existing
  non-expired, non-revoked token; no report payload or token should be exposed
  in QA output.
- Run the CI regression `tests/report-trash-preservation.test.cjs` and the
  existing `report-link-snapshots` tests.
- The guarded rollback at `supabase/rollback/20261118113000_preserve_published_reports_on_project_trash.down.sql`
  **must not** be applied if any report has an archived parent. Restoring
  the original cascade is intrinsically unsafe and normally undesirable.

No live user project will be moved to Trash as part of verification.
