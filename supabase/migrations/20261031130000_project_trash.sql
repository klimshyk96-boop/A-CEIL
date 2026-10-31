-- Хмарний кошик проєктів: однаковий на всіх пристроях, 30 днів зберігання.
-- Видалення і перенесення до кошика виконуються однією транзакцією.
begin;

create table if not exists public.aceil_project_trash (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  project jsonb not null check (jsonb_typeof(project) = 'object' and octet_length(project::text) <= 5000000),
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  primary key (user_id, project_id)
);

create index if not exists aceil_project_trash_expiry_idx on public.aceil_project_trash(expires_at);
alter table public.aceil_project_trash enable row level security;
revoke all on public.aceil_project_trash from anon, authenticated;

create or replace function public.aceil_trash_project(p_project_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare doc jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active=true) then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select to_jsonb(p) into doc from public.projects p
    where p.id=p_project_id and p.user_id=auth.uid() for update;
  if doc is null then
    if exists(select 1 from public.aceil_project_trash where user_id=auth.uid() and project_id=p_project_id) then return p_project_id; end if;
    raise exception 'project_not_found' using errcode='P0002';
  end if;
  insert into public.aceil_project_trash(user_id,project_id,project,deleted_at,expires_at)
    values(auth.uid(),p_project_id,doc,now(),now()+interval '30 days')
    on conflict(user_id,project_id) do update set project=excluded.project,deleted_at=excluded.deleted_at,expires_at=excluded.expires_at;
  delete from public.projects where id=p_project_id and user_id=auth.uid();
  return p_project_id;
end; $$;

create or replace function public.aceil_list_project_trash()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active=true) then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  delete from public.aceil_project_trash where user_id=auth.uid() and expires_at<=now();
  select coalesce(jsonb_agg(jsonb_build_object('project_id',project_id,'project',project,'deleted_at',deleted_at,'expires_at',expires_at) order by deleted_at desc),'[]'::jsonb)
    into result from public.aceil_project_trash where user_id=auth.uid() and expires_at>now();
  return result;
end; $$;

create or replace function public.aceil_restore_project(p_project_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare doc jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active=true) then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select project into doc from public.aceil_project_trash
    where user_id=auth.uid() and project_id=p_project_id and expires_at>now() for update;
  if doc is null then raise exception 'trash_item_not_found' using errcode='P0002'; end if;
  if exists(select 1 from public.projects where id=p_project_id and user_id=auth.uid()) then
    delete from public.aceil_project_trash where user_id=auth.uid() and project_id=p_project_id;
    return p_project_id;
  end if;
  insert into public.projects
    select (jsonb_populate_record(null::public.projects,doc)).*;
  delete from public.aceil_project_trash where user_id=auth.uid() and project_id=p_project_id;
  return p_project_id;
end; $$;

create or replace function public.aceil_purge_project_trash(p_project_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  delete from public.aceil_project_trash where user_id=auth.uid() and project_id=p_project_id;
  return found;
end; $$;

revoke all on function public.aceil_trash_project(uuid) from public;
revoke all on function public.aceil_list_project_trash() from public;
revoke all on function public.aceil_restore_project(uuid) from public;
revoke all on function public.aceil_purge_project_trash(uuid) from public;
grant execute on function public.aceil_trash_project(uuid) to authenticated;
grant execute on function public.aceil_list_project_trash() to authenticated;
grant execute on function public.aceil_restore_project(uuid) to authenticated;
grant execute on function public.aceil_purge_project_trash(uuid) to authenticated;

commit;
