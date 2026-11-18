-- A·CEIL: Preserve already published reports when a project moves into Trash.
-- 2026-11-18. The trash RPC stores the full project JSON then deletes the active
-- projects row. Three former ON DELETE CASCADE constraints silently destroyed
-- public snapshot/link records and counters. These records intentionally keep
-- the original UUID, allowing a restored project to re-associate automatically.
--
-- Publication functions validate the currently existing project and owner;
-- keeping original project UUIDs for historical links does not grant creation
-- rights to orphan project IDs. RLS / table grants remain unchanged.
--
-- A report remains accessible only until its existing expires_at, or until
-- explicitly revoked by its original owner. No expiry extension is performed.
-- No stored projects, drawings, reports, or user data are rewritten here.

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.aceil_report_snapshots
  DROP CONSTRAINT IF EXISTS aceil_report_snapshots_project_id_fkey;

ALTER TABLE public.report_links
  DROP CONSTRAINT IF EXISTS report_links_project_id_fkey;

-- Keep unique-view counts across Trash -> Restore and let active public
-- snapshots record views while their original project is in Trash.
ALTER TABLE public.aceil_report_views
  DROP CONSTRAINT IF EXISTS aceil_report_views_project_id_fkey;

-- The existing revoker joined the live projects table. Once the parent has
-- been trashed, the original owner must still be able to revoke a token.
-- No other account may revoke it.
CREATE OR REPLACE FUNCTION public.aceil_revoke_report_snapshot(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $func$
DECLARE
  v_project_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required'
      USING errcode = '42501';
  END IF;

  UPDATE public.aceil_report_snapshots s
     SET revoked_at = COALESCE(s.revoked_at, NOW())
   WHERE s.token = LOWER(p_token)
     AND s.owner_id = auth.uid()
  RETURNING s.project_id INTO v_project_id;

  RETURN jsonb_build_object('revoked', v_project_id IS NOT NULL);
END;
$func$;

-- Legacy report-link revocation: retain permissions for live projects and
-- allow the owning account to revoke an archived/purged project's link.
CREATE OR REPLACE FUNCTION public.aceil_revoke_report_link(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $func$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT p.user_id INTO v_owner
    FROM public.projects p
   WHERE p.id = p_project_id
     AND public.can_access_project(p.user_id, p.id);

  IF v_owner IS NULL THEN
    -- A previously published link can outlive the active project row.
    SELECT l.owner_id INTO v_owner
      FROM public.report_links l
     WHERE l.project_id = p_project_id
       AND l.owner_id = v_user
     LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    SELECT s.owner_id INTO v_owner
      FROM public.aceil_report_snapshots s
     WHERE s.project_id = p_project_id
       AND s.owner_id = v_user
     LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'project not found or access denied';
  END IF;

  IF v_owner <> v_user AND NOT EXISTS (
    SELECT 1 FROM public.user_access ua
    WHERE ua.owner_id = v_owner
      AND ua.user_id = v_user
      AND ua.projects_access = true
      AND ua.report_publish = true
      AND (ua.access_until IS NULL OR ua.access_until > NOW())
  ) THEN
    RAISE EXCEPTION 'report publish access required';
  END IF;

  UPDATE public.report_links
     SET revoked_at = COALESCE(revoked_at, NOW())
   WHERE project_id = p_project_id
     AND owner_id = v_owner
     AND revoked_at IS NULL;

  UPDATE public.projects
     SET report_token = NULL,
         report_published_at = NULL,
         report_expires_at = NULL
   WHERE id = p_project_id AND user_id = v_owner;

  RETURN true;
END;
$func$;

-- Preserve the existing grants for both replaced functions.
-- Avoid REVOKE/GRANT here: CREATE OR REPLACE FUNCTION retains privileges.
