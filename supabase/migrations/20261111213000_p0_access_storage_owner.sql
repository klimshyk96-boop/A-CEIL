-- A·CEIL P0 security hardening. Read companion rollback before executing.
-- Pre-state: main 4737fa66e4392566b29b7bc0eccd575d27f032c9; Vercel dpl_2NWWsHrBvqwvNYdahfovNDwAj2eF.
-- No user project/report payloads are deleted or updated by this migration.
CREATE OR REPLACE FUNCTION public.aceil_publish_report_link(p_project_id uuid, p_token text, p_payload jsonb, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_hash text;
  v_id uuid;
begin
  if not public.aceil_demo_has_access() then
    raise exception 'A_CEIL_ACCOUNT_INACTIVE_OR_DEMO_EXPIRED' using errcode='42501';
  end if;
  if v_user is null then
    raise exception 'authentication required';
  end if;

  if p_token !~ '^[a-f0-9]{32,64}$' then
    raise exception 'invalid report token';
  end if;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid report payload';
  end if;

  if p_expires_at <= now()
     or p_expires_at > now() + interval '366 days' then
    raise exception 'invalid expiration date';
  end if;

  select p.user_id
  into v_owner
  from public.projects p
  where p.id = p_project_id
    and public.can_access_project(p.user_id, p.id);

  if v_owner is null then
    raise exception 'project not found or access denied';
  end if;

  if v_owner <> v_user and not exists (
    select 1
    from public.user_access ua
    where ua.owner_id = v_owner
      and ua.user_id = v_user
      and ua.projects_access = true
      and ua.report_publish = true
      and (
        ua.access_until is null
        or ua.access_until > now()
      )
  ) then
    raise exception 'report publish access required';
  end if;

  v_hash := encode(
    sha256(convert_to(lower(p_token), 'UTF8')),
    'hex'
  );

  update public.report_links
  set revoked_at = now()
  where project_id = p_project_id
    and owner_id = v_owner
    and revoked_at is null;

  insert into public.report_links(
    project_id,
    owner_id,
    token_hash,
    payload,
    expires_at
  )
  values(
    p_project_id,
    v_owner,
    v_hash,
    p_payload,
    p_expires_at
  )
  returning id into v_id;

  update public.projects
  set report_token = p_token,
      report_published_at = now(),
      report_expires_at = p_expires_at
  where id = p_project_id
    and user_id = v_owner;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'owner_id', v_owner,
    'expires_at', p_expires_at
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.aceil_publish_report_snapshot(p_project_id uuid, p_token text, p_payload jsonb, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_owner_id uuid;
begin
  if not public.aceil_demo_has_access() then
    raise exception 'A_CEIL_ACCOUNT_INACTIVE_OR_DEMO_EXPIRED' using errcode='42501';
  end if;
  if auth.uid() is null then
    raise exception 'authentication required'
      using errcode = '42501';
  end if;

  if p_token is null
     or lower(p_token) !~ '^[a-f0-9]{20,64}$' then
    raise exception 'invalid report token'
      using errcode = '22023';
  end if;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid report payload'
      using errcode = '22023';
  end if;

  select p.user_id
    into v_owner_id
    from public.projects p
   where p.id = p_project_id;

  if v_owner_id is null
     or v_owner_id <> auth.uid() then
    raise exception 'project not found'
      using errcode = '42501';
  end if;

  insert into public.aceil_report_snapshots (
    token,
    project_id,
    owner_id,
    payload,
    published_at,
    expires_at,
    revoked_at
  )
  values (
    lower(p_token),
    p_project_id,
    v_owner_id,
    p_payload,
    now(),
    p_expires_at,
    null
  );

  return jsonb_build_object(
    'status', 'active',
    'token', lower(p_token),
    'projectId', p_project_id,
    'expiresAt', p_expires_at
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.aceil_save_film_catalog(p_data jsonb, p_base_rev bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  cur bigint;
  current_data jsonb;
  result bigint;
begin
  if not public.aceil_demo_has_access() then
    raise exception 'A_CEIL_ACCOUNT_INACTIVE_OR_DEMO_EXPIRED' using errcode='42501';
  end if;
  if auth.uid() is null or not exists (
    select 1 from profiles
    where id = auth.uid() and is_active = true
  ) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_data) is distinct from 'object'
    or p_data->>'v' is distinct from '1'
    or jsonb_typeof(p_data->'custom') is distinct from 'object'
    or jsonb_typeof(p_data->'pricing') is distinct from 'object'
    or octet_length(p_data::text) > 250000
  then
    raise exception 'Invalid film catalog' using errcode = '22023';
  end if;

  if p_data->>'uid' is distinct from auth.uid()::text then
    raise exception 'film_catalog_user_changed' using errcode = '42501';
  end if;

  p_data := p_data - 'uid';

  perform pg_advisory_xact_lock(
    hashtextextended(auth.uid()::text, 0)
  );

  select rev, data into cur, current_data
  from aceil_film_catalog
  where user_id = auth.uid()
  for update;

  if found then
    if cur is distinct from coalesce(p_base_rev, 0)
      or current_data#>>'{custom,catalogReset}'
        is distinct from p_data#>>'{custom,catalogReset}'
    then
      raise exception 'film_catalog_conflict' using errcode = '40001';
    end if;

    update aceil_film_catalog
    set data = p_data,
        rev = rev + 1,
        updated_at = now()
    where user_id = auth.uid()
    returning rev into result;
  else
    insert into aceil_film_catalog (user_id, data)
    values (auth.uid(), p_data)
    returning rev into result;
  end if;

  return result;

exception when unique_violation then
  raise exception 'film_catalog_conflict' using errcode = '40001';
end;
$function$;

CREATE OR REPLACE FUNCTION public.aceil_get_film_catalog()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.aceil_film_catalog%rowtype;
begin
  if not public.aceil_demo_has_access() then
    raise exception 'A_CEIL_ACCOUNT_INACTIVE_OR_DEMO_EXPIRED' using errcode='42501';
  end if;
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active=true) then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 select * into r from public.aceil_film_catalog where user_id=auth.uid();
 if not found then return jsonb_build_object('data',null,'rev',0,'uid',auth.uid()); end if;
 return jsonb_build_object('data',r.data,'rev',r.rev,'updated_at',r.updated_at,'uid',auth.uid());
end; $function$;

CREATE OR REPLACE FUNCTION public.aceil_wall_catalog_json(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with json_rows as (
    select
      e.value as raw,
      e.ord::bigint as ord,
      trim(
        case
          when jsonb_typeof(e.value) = 'string'
            then e.value #>> '{}'
          else e.value ->> 'name'
        end
      ) as name,
      coalesce(
        nullif(
          trim(
            case
              when jsonb_typeof(e.value) = 'object'
                then e.value ->> 'color'
            end
          ),
          ''
        ),
        '#f97316'
      ) as color
    from public.nomenclature n
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(n.wall_presets) = 'array'
          then n.wall_presets
        else '[]'::jsonb
      end
    ) with ordinality e(value, ord)
    where n.user_id = p_user_id
      and public.aceil_demo_has_access()
      and (public.aceil_is_platform_admin() or public.can_access_nomenclature(p_user_id))
  ),
  candidates as (
    select
      case
        when jsonb_typeof(raw) = 'object'
          then raw || jsonb_build_object(
            'name', name,
            'color', color
          )
        else jsonb_build_object(
          'name', name,
          'color', color
        )
      end as item,
      name,
      0 as source_order,
      ord
    from json_rows
    where coalesce(name, '') <> ''

    union all

    select
      jsonb_build_object(
        'name', trim(w.name),
        'color', coalesce(
          nullif(trim(w.color), ''),
          '#f97316'
        )
      ),
      trim(w.name),
      1,
      coalesce(w.sort_order, 0)::bigint
    from public.wall_presets w
    where w.user_id = p_user_id
      and public.aceil_demo_has_access()
      and (public.aceil_is_platform_admin() or public.can_access_nomenclature(p_user_id))
      and coalesce(trim(w.name), '') <> ''
  ),
  ranked as (
    select
      item,
      source_order,
      ord,
      row_number() over (
        partition by lower(
          regexp_replace(
            trim(name),
            '[[:space:]]+',
            ' ',
            'g'
          )
        )
        order by source_order, ord
      ) as rn
    from candidates
  )
  select coalesce(
    jsonb_agg(item order by source_order, ord),
    '[]'::jsonb
  )
  from ranked
  where rn = 1;
$function$;

-- Keep get_my_access() unchanged: flags grant access to users' OWN workspaces.
-- Shared-owner permissions remain enforced separately in user_access and table RLS.

-- Prevent loss of project ownership/identity when a shared editor saves a room.
create or replace function public.aceil_projects_identity_immutable()
returns trigger language plpgsql security invoker set search_path=''
as $identity$
begin
 if new.user_id is distinct from old.user_id or new.id is distinct from old.id then
   raise exception 'A_CEIL_PROJECT_IDENTITY_IMMUTABLE' using errcode='42501';
 end if;
 return new;
end;
$identity$;
drop trigger if exists aceil_projects_identity_immutable on public.projects;
create trigger aceil_projects_identity_immutable
before update of user_id,id on public.projects
for each row execute function public.aceil_projects_identity_immutable();


-- Storage owner separation. Keep bucket public for legacy report URLs until migration.
drop policy if exists "roomator reports insert" on storage.objects;
drop policy if exists "roomator reports select" on storage.objects;
drop policy if exists "roomator reports update" on storage.objects;
create policy "roomator reports insert" on storage.objects
  for insert to authenticated
  with check (bucket_id='roomator-reports'
    and owner_id=(select auth.uid())::text);
create policy "roomator reports select" on storage.objects
  for select to authenticated
  using (bucket_id='roomator-reports'
    and owner_id=(select auth.uid())::text);
create policy "roomator reports update" on storage.objects
  for update to authenticated
  using (bucket_id='roomator-reports'
    and owner_id=(select auth.uid())::text)
  with check (bucket_id='roomator-reports'
    and owner_id=(select auth.uid())::text);

-- PostgreSQL grants EXECUTE to PUBLIC by default: remove bypassable RPC surface.
revoke execute on function public.aceil_publish_report_link(uuid,text,jsonb,timestamp with time zone) from public,anon,authenticated;
grant execute on function public.aceil_publish_report_link(uuid,text,jsonb,timestamp with time zone) to authenticated;
revoke execute on function public.aceil_publish_report_snapshot(uuid,text,jsonb,timestamp with time zone) from public,anon,authenticated;
grant execute on function public.aceil_publish_report_snapshot(uuid,text,jsonb,timestamp with time zone) to authenticated;
revoke execute on function public.aceil_save_film_catalog(jsonb,bigint) from public,anon,authenticated;
grant execute on function public.aceil_save_film_catalog(jsonb,bigint) to authenticated;
revoke execute on function public.aceil_get_film_catalog() from public,anon,authenticated;
grant execute on function public.aceil_get_film_catalog() to authenticated;
revoke execute on function public.aceil_wall_catalog_json(uuid) from public,anon,authenticated;
grant execute on function public.aceil_wall_catalog_json(uuid) to authenticated;
revoke execute on function public.aceil_cleanup_report_links() from public,anon,authenticated;
select pg_notify('pgrst','reload schema');
