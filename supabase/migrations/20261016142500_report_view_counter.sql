-- A·CEIL: унікальні перегляди публічних звітів.
-- Один браузерний сеанс рахується один раз; перегляди власника не рахуються.

create table if not exists public.aceil_report_views (
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (project_id, session_id)
);

alter table public.aceil_report_views enable row level security;

revoke all on table public.aceil_report_views from anon, authenticated;

create or replace function public.aceil_record_report_view(
  p_token text,
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
  v_owner_id uuid;
  v_count bigint;
begin
  if p_token is null
     or p_token !~ '^[a-f0-9]{20,64}$'
     or p_session_id is null
     or length(p_session_id) < 20
     or length(p_session_id) > 80 then
    return jsonb_build_object('recorded', false);
  end if;

  select p.id, p.user_id
    into v_project_id, v_owner_id
    from public.projects p
   where lower(p.report_token) = lower(p_token)
     and (p.report_expires_at is null or p.report_expires_at > now())
   limit 1;

  if v_project_id is null then
    return jsonb_build_object('recorded', false);
  end if;

  if auth.uid() is not null and auth.uid() = v_owner_id then
    select count(*) into v_count
      from public.aceil_report_views v
     where v.project_id = v_project_id;
    return jsonb_build_object('recorded', false, 'owner', true, 'count', v_count);
  end if;

  insert into public.aceil_report_views(project_id, session_id)
  values (v_project_id, p_session_id)
  on conflict (project_id, session_id) do nothing;

  select count(*) into v_count
    from public.aceil_report_views v
   where v.project_id = v_project_id;

  return jsonb_build_object('recorded', true, 'count', v_count);
end;
$$;

create or replace function public.aceil_get_report_view_counts()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_object_agg(p.id::text, coalesce(v.view_count, 0)),
    '{}'::jsonb
  )
  from public.projects p
  left join (
    select project_id, count(*)::bigint as view_count
      from public.aceil_report_views
     group by project_id
  ) v on v.project_id = p.id
  where p.user_id = auth.uid()
    and p.report_token is not null;
$$;

revoke all on function public.aceil_record_report_view(text, text) from public;
revoke all on function public.aceil_get_report_view_counts() from public;
grant execute on function public.aceil_record_report_view(text, text) to anon, authenticated;
grant execute on function public.aceil_get_report_view_counts() to authenticated;
