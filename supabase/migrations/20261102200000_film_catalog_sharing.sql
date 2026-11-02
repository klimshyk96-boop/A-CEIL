-- Run after 20261024120000_film_catalog_sync.sql.
begin;
create table if not exists public.aceil_film_catalog_access (
 owner_id uuid not null references auth.users(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(owner_id,user_id), check(owner_id<>user_id)
);
create table if not exists public.aceil_film_catalog_backup (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null, replaced_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.aceil_film_catalog_access enable row level security;
alter table public.aceil_film_catalog_backup enable row level security;
revoke all on public.aceil_film_catalog_access,public.aceil_film_catalog_backup from anon,authenticated;

create or replace function public.admin_film_catalog_status()
returns table(user_id uuid,film_catalog_access boolean,film_catalog_rev bigint,film_catalog_backup boolean)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from profiles where id=auth.uid() and app_role='owner' and is_active=true) then
  raise exception 'Owner access required' using errcode='42501';
 end if;
 return query select p.id,exists(select 1 from aceil_film_catalog_access a where a.owner_id=auth.uid() and a.user_id=p.id),
  coalesce(c.rev,0),exists(select 1 from aceil_film_catalog_backup b where b.user_id=p.id and b.replaced_by=auth.uid())
  from profiles p left join aceil_film_catalog c on c.user_id=p.id where p.id<>auth.uid() and p.app_role is distinct from 'owner';
end; $$;

create or replace function public.admin_set_film_catalog_access(p_user_id uuid,p_value boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from profiles where id=auth.uid() and app_role='owner' and is_active=true) then
  raise exception 'Owner access required' using errcode='42501';
 end if;
 if p_user_id=auth.uid() or not exists(select 1 from profiles where id=p_user_id and app_role is distinct from 'owner') then
  raise exception 'Invalid recipient' using errcode='22023';
 end if;
 if p_value then insert into aceil_film_catalog_access values(auth.uid(),p_user_id) on conflict do nothing;
 else delete from aceil_film_catalog_access where owner_id=auth.uid() and user_id=p_user_id; end if;
 return true;
end; $$;

create or replace function public.aceil_list_shared_film_catalogs()
returns table(owner_id uuid,owner_name text,series_count bigint)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from profiles where id=auth.uid() and is_active=true) then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 return query select a.owner_id,coalesce(nullif(to_jsonb(p)->>'name',''),'Каталог адміністратора')::text,
  jsonb_array_length(coalesce(c.data#>'{custom,series}','[]'::jsonb))::bigint
  from aceil_film_catalog_access a join profiles p on p.id=a.owner_id and p.is_active=true and p.app_role='owner'
  join aceil_film_catalog c on c.user_id=a.owner_id where a.user_id=auth.uid();
end; $$;

-- An independent copy, not a live subscription. The previous catalog remains recoverable.
create or replace function public.aceil_replace_film_catalog(p_owner_id uuid,p_user_id uuid,p_expected_rev bigint)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare source jsonb; previous jsonb; revision bigint; result bigint;
begin
 if not exists(select 1 from profiles where id=auth.uid() and is_active=true) then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 if not exists(select 1 from profiles where id=p_owner_id and app_role='owner' and is_active=true) then
  raise exception 'Owner unavailable' using errcode='42501';
 end if;
 if not ((auth.uid()=p_owner_id) or (auth.uid()=p_user_id and exists(
  select 1 from aceil_film_catalog_access where owner_id=p_owner_id and user_id=p_user_id))) then
  raise exception 'Catalog access denied' using errcode='42501';
 end if;
 if p_user_id=p_owner_id or not exists(select 1 from profiles where id=p_user_id and app_role is distinct from 'owner') then
  raise exception 'Invalid recipient' using errcode='22023';
 end if;
 select data into source from aceil_film_catalog where user_id=p_owner_id;
 if source is null then raise exception 'Save source catalog first' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select data,rev into previous,revision from aceil_film_catalog where user_id=p_user_id for update;
 if coalesce(revision,0) is distinct from p_expected_rev then raise exception 'film_catalog_conflict' using errcode='40001'; end if;
 insert into aceil_film_catalog_backup(user_id,data,replaced_by) values(p_user_id,
  coalesce(previous,'{"v":1,"custom":{"series":[],"colors":[],"reserved":[],"deleted":{},"descorLabellImported":true,"teqtumImported":true,"teqtumRev":5},"pricing":{}}'::jsonb),auth.uid())
 on conflict(user_id) do update set data=excluded.data,replaced_by=excluded.replaced_by,created_at=now();
 source=jsonb_set(source,'{custom,catalogReset}',to_jsonb(gen_random_uuid()::text),true);
 insert into aceil_film_catalog(user_id,data,rev) values(p_user_id,source,1)
 on conflict(user_id) do update set data=excluded.data,rev=aceil_film_catalog.rev+1,updated_at=now() returning rev into result;
 return result;
end; $$;

create or replace function public.aceil_restore_film_catalog(p_user_id uuid,p_expected_rev bigint)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare previous jsonb; revision bigint; result bigint;
begin
 if not exists(select 1 from profiles where id=auth.uid() and is_active=true) then raise exception 'Authentication required' using errcode='42501'; end if;
 if auth.uid()<>p_user_id and not exists(select 1 from profiles where id=auth.uid() and app_role='owner' and is_active=true) then
  raise exception 'Access denied' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select rev into revision from aceil_film_catalog where user_id=p_user_id for update;
 if revision is distinct from p_expected_rev then raise exception 'film_catalog_conflict' using errcode='40001'; end if;
 select data into previous from aceil_film_catalog_backup where user_id=p_user_id and (p_user_id=auth.uid() or replaced_by=auth.uid()) for update;
 if previous is null then raise exception 'No backup available' using errcode='22023'; end if;
 previous=jsonb_set(previous,'{custom,catalogReset}',to_jsonb(gen_random_uuid()::text),true);
 update aceil_film_catalog set data=previous,rev=rev+1,updated_at=now() where user_id=p_user_id returning rev into result;
 delete from aceil_film_catalog_backup where user_id=p_user_id;
 return result;
end; $$;

-- Reject stale clients after a replacement, even when they obtained the new revision.
create or replace function public.aceil_save_film_catalog(p_data jsonb,p_base_rev bigint)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare cur bigint; current_data jsonb; result bigint;
begin
 if auth.uid() is null or not exists(select 1 from profiles where id=auth.uid() and is_active=true) then
  raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or p_data->>'v' is distinct from '1'
 or jsonb_typeof(p_data->'custom') is distinct from 'object' or jsonb_typeof(p_data->'pricing') is distinct from 'object'
 or octet_length(p_data::text)>250000 then raise exception 'Invalid film catalog' using errcode='22023'; end if;
 if p_data->>'uid' is distinct from auth.uid()::text then raise exception 'film_catalog_user_changed' using errcode='42501'; end if;
 p_data=p_data-'uid';
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select rev,data into cur,current_data from aceil_film_catalog where user_id=auth.uid() for update;
 if found then
  if cur is distinct from coalesce(p_base_rev,0) or current_data#>>'{custom,catalogReset}' is distinct from p_data#>>'{custom,catalogReset}' then
   raise exception 'film_catalog_conflict' using errcode='40001'; end if;
  update aceil_film_catalog set data=p_data,rev=rev+1,updated_at=now() where user_id=auth.uid() returning rev into result;
 else insert into aceil_film_catalog(user_id,data) values(auth.uid(),p_data) returning rev into result; end if;
 return result;
exception when unique_violation then raise exception 'film_catalog_conflict' using errcode='40001';
end; $$;

revoke all on function public.admin_film_catalog_status() from public;
revoke all on function public.admin_set_film_catalog_access(uuid,boolean) from public;
revoke all on function public.aceil_list_shared_film_catalogs() from public;
revoke all on function public.aceil_replace_film_catalog(uuid,uuid,bigint) from public;
revoke all on function public.aceil_restore_film_catalog(uuid,bigint) from public;
grant execute on function public.admin_film_catalog_status() to authenticated;
grant execute on function public.admin_set_film_catalog_access(uuid,boolean) to authenticated;
grant execute on function public.aceil_list_shared_film_catalogs() to authenticated;
grant execute on function public.aceil_replace_film_catalog(uuid,uuid,bigint) to authenticated;
grant execute on function public.aceil_restore_film_catalog(uuid,bigint) to authenticated;
commit;
