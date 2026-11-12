-- Emergency revert to increment-on-every-update behavior (not recommended).
create or replace function public.aceil_projects_bump_sync_revision()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if TG_OP = 'INSERT' then new.sync_revision := 1;
  else new.sync_revision := old.sync_revision + 1;
  end if;
  return new;
end;
$$;
