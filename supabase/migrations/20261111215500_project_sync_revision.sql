-- Atomic optimistic locking for A·CEIL project writes.
-- Backward-compatible schema expansion: old clients keep working, but every
-- UPDATE advances the revision so new clients detect concurrent writes.
alter table public.projects
  add column if not exists sync_revision bigint not null default 1;

create or replace function public.aceil_projects_bump_sync_revision()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if TG_OP = 'INSERT' then
    -- Restoring old trash snapshots may explicitly provide NULL for a new column.
    new.sync_revision := 1;
  else
    new.sync_revision := old.sync_revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists aceil_projects_sync_revision_bump on public.projects;
create trigger aceil_projects_sync_revision_bump
  before insert or update on public.projects
  for each row
  execute function public.aceil_projects_bump_sync_revision();

comment on column public.projects.sync_revision is
  'Server-managed row revision; compare atomically in UPDATE WHERE to prevent lost updates.';
