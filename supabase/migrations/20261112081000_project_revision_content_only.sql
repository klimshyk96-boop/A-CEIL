-- Project revisions measure user-editable drawing / estimate content, not
-- report-publishing or CRM metadata. These metadata writes do not conflict with
-- a pending room edit because the sync queue does not overwrite their columns.
create or replace function public.aceil_projects_bump_sync_revision()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if TG_OP = 'INSERT' then
    new.sync_revision := 1;
    return new;
  end if;

  if row(new.name,new.addr,new.phone,new.comment,new.area,new.per,
         new.in_corners,new.out_corners,new.thumb,new.state)
     is distinct from
     row(old.name,old.addr,old.phone,old.comment,old.area,old.per,
         old.in_corners,old.out_corners,old.thumb,old.state)
  then
    new.sync_revision := old.sync_revision + 1;
  else
    -- No writer can directly choose a sync revision, including via an RPC.
    new.sync_revision := old.sync_revision;
  end if;
  return new;
end;
$$;
