-- A·CEIL: immutable public report snapshots.
-- A project may have many shared estimate variants. Publishing a new variant
-- must never replace the payload behind an older URL.

create table if not exists public.aceil_report_snapshots (
  token text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null,
  payload jsonb not null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  constraint aceil_report_snapshots_token_format
    check (token ~ '^[a-f0-9]{20,64}$')
);

create index if not exists aceil_report_snapshots_project_published_idx
  on public.aceil_report_snapshots(project_id, published_at desc);

alter table public.aceil_report_snapshots enable row level security;
revoke all on table public.aceil_report_snapshots from anon, authenticated;

create or replace function public.aceil_publish_report_snapshot(
  p_project_id uuid,
  p_token text,
  p_payload jsonb,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_token is null or lower(p_token) !~ '^[a-f0-9]{20,64}$' then
    raise exception 'invalid report token' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid report payload' using errcode = '22023';
  end if;

  select p.user_id into v_owner_id
    from public.projects p
   where p.id = p_project_id;

  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'project not found' using errcode = '42501';
  end if;

  insert into public.aceil_report_snapshots(
    token, project_id, owner_id, payload, published_at, expires_at, revoked_at
  )
  values (
    lower(p_token), p_project_id, v_owner_id, p_payload, now(), p_expires_at, null
  );

  return jsonb_build_object(
    'status', 'active',
    'token', lower(p_token),
    'projectId', p_project_id,
    'expiresAt', p_expires_at
  );
end;
$$;

create or replace function public.aceil_get_public_report_snapshot(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.aceil_report_snapshots%rowtype;
begin
  if p_token is null or lower(p_token) !~ '^[a-f0-9]{20,64}$' then
    return jsonb_build_object('status', 'not_found');
  end if;

  select s.* into v_row
    from public.aceil_report_snapshots s
   where s.token = lower(p_token)
   limit 1;

  if v_row.token is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_row.revoked_at is not null then
    return jsonb_build_object('status', 'revoked');
  end if;
  if v_row.expires_at is not null and v_row.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', 'active',
    'payload', v_row.payload,
    'expiresAt', v_row.expires_at
  );
end;
$$;

create or replace function public.aceil_revoke_report_snapshot(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.aceil_report_snapshots s
     set revoked_at = coalesce(s.revoked_at, now())
    from public.projects p
   where s.token = lower(p_token)
     and p.id = s.project_id
     and p.user_id = auth.uid()
  returning s.project_id into v_project_id;

  return jsonb_build_object('revoked', v_project_id is not null);
end;
$$;

-- Keep unique-view counting compatible with immutable tokens. Counts remain
-- aggregated per project, so the current project cards need no schema change.
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
     or lower(p_token) !~ '^[a-f0-9]{20,64}$'
     or p_session_id is null
     or length(p_session_id) < 20
     or length(p_session_id) > 80 then
    return jsonb_build_object('recorded', false);
  end if;

  select s.project_id, s.owner_id
    into v_project_id, v_owner_id
    from public.aceil_report_snapshots s
   where s.token = lower(p_token)
     and s.revoked_at is null
     and (s.expires_at is null or s.expires_at > now())
   limit 1;

  if v_project_id is null then
    select p.id, p.user_id
      into v_project_id, v_owner_id
      from public.projects p
     where lower(p.report_token) = lower(p_token)
       and (p.report_expires_at is null or p.report_expires_at > now())
     limit 1;
  end if;

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

revoke all on function public.aceil_publish_report_snapshot(uuid, text, jsonb, timestamptz) from public;
revoke all on function public.aceil_get_public_report_snapshot(text) from public;
revoke all on function public.aceil_revoke_report_snapshot(text) from public;
revoke all on function public.aceil_record_report_view(text, text) from public;

grant execute on function public.aceil_publish_report_snapshot(uuid, text, jsonb, timestamptz) to authenticated;
grant execute on function public.aceil_get_public_report_snapshot(text) to anon, authenticated;
grant execute on function public.aceil_revoke_report_snapshot(text) to authenticated;
grant execute on function public.aceil_record_report_view(text, text) to anon, authenticated;
