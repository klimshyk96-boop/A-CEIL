-- Emergency rollback only AFTER reverting all clients that filter by sync_revision.
-- Dropping revision protection while protected clients are live blocks saves.
drop trigger if exists aceil_projects_sync_revision_bump on public.projects;
drop function if exists public.aceil_projects_bump_sync_revision();
alter table public.projects drop column if exists sync_revision;
