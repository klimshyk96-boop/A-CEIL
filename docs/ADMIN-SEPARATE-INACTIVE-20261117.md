# A·CEIL administration — separate inactive accounts (2026-11-17)

## Requested behavior
Rejected or blocked accounts should no longer mix with the main list
of active users.

## New owner-only list UI
The existing **Користувачі** administration page now shows two compact
selection buttons:
- **Активні та нові**: approved/legacy active accounts plus new registrations
  with `approval_status=pending`, even if their `is_active=false` while
  awaiting approval. These pending accounts keep their approval controls.
- **Відхилені / заблоковані**: `approval_status=rejected` OR
  `is_active=false` when the registration isn't pending. The rejected
  classification has precedence even in inconsistent legacy records marked
  `is_active=true`.

Both selectors show counts, have a useful empty-state message, and preserve
the selected list across background refreshes. Owner records remain excluded.
Totals distinguish active and rejected/blocked records without counting
pending applications as active. A rejection/block automatically moves the
user out of the main list on reload; reactivation returns them to it.
The inactive view keeps the original permission, unblock and user deletion
controls rather than removing data or changing RPC behavior.

## Safety/verification
- UI-only grouping of `admin_list_users` results, no migration and no writes.
- Administrative access remains governed by existing Supabase RPC/RLS.
- Regression coverage: `tests/admin-user-lists.test.cjs` for pending,
  active, rejected, blocked, inconsistent flags, transitions, owner exclusion,
  empty lists and refresh persistence. Existing DEMO test remains enabled.
- Cached iPhone PWA assets updated. Manual browser verification still needed
  after production deploy.
