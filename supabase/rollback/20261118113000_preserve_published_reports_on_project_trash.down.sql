-- WARNING: the old ON DELETE CASCADE constraints are the cause of lost reports.
-- This rollback is NOT appropriate for normal production use.
-- It refuses to run if even one published report/view refers to a project
-- currently in Trash, preventing a silent data wipe or failed FK restoration.
-- A rollback also restores the old unsafe cascade behavior; perform only
-- after explicit approval and an independently verified database backup.
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.aceil_report_snapshots s
     WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id=s.project_id)
  ) OR EXISTS (
    SELECT 1 FROM public.report_links l
     WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id=l.project_id)
  ) OR EXISTS (
    SELECT 1 FROM public.aceil_report_views v
     WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id=v.project_id)
  ) THEN
    RAISE EXCEPTION 'Unsafe rollback: orphaned reports still preserved. Do not delete them to force rollback.';
  END IF;
END;
$guard$;

ALTER TABLE public.aceil_report_snapshots
  ADD CONSTRAINT aceil_report_snapshots_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.report_links
  ADD CONSTRAINT report_links_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.aceil_report_views
  ADD CONSTRAINT aceil_report_views_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- The updated owner-only revocation functions are deliberately retained:
-- reverting them would reintroduce a permissions regression for old links.
