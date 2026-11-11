-- A·CEIL P0: rollback procedure, only if production regression is detected.
-- Reapply ORIGINAL code and original Storage grants/policies.
-- Frontend rollback: Vercel deployment dpl_2NWWsHrBvqwvNYdahfovNDwAj2eF / GitHub 4737fa66e4392566b29b7bc0eccd575d27f032c9.
-- WARNING: original policies/functions had security vulnerabilities. Revert only to restore service temporarily.
drop trigger if exists aceil_projects_identity_immutable on public.projects;
drop function if exists public.aceil_projects_identity_immutable();
CREATE OR REPLACE FUNCTION public.get_my_access()
 RETURNS TABLE(app_role text, is_active boolean, owner_id uuid, nomenclature_access boolean, projects_access boolean, projects_edit boolean, projects_scope text, access_until timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.app_role::text,
         (p.is_active and (not p.demo_enabled or (p.demo_expires_at is not null and p.demo_expires_at>now())))::boolean,
         p.id,true,true,true,'all'::text,
         (case when p.demo_enabled then p.demo_expires_at else null end)::timestamptz
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true and p.approval_status='approved'
  limit 1;
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

CREATE OR REPLACE FUNCTION public.aceil_cleanup_report_links()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_expired integer := 0;
  v_revoked integer := 0;
  v_projects integer := 0;
begin

  -- Прибираємо з проєктів посилання, термін яких уже минув
  update public.projects
  set
    report_token = null,
    report_published_at = null,
    report_expires_at = null
  where report_expires_at is not null
    and report_expires_at <= now();

  get diagnostics v_projects = row_count;

  -- Фізично видаляємо прострочені звіти
  with deleted as (
    delete from public.report_links
    where expires_at <= now()
    returning 1
  )
  select count(*) into v_expired from deleted;

  -- Фізично видаляємо відкликані звіти
  with deleted as (
    delete from public.report_links
    where revoked_at is not null
    returning 1
  )
  select count(*) into v_revoked from deleted;

  return jsonb_build_object(
    'ok', true,
    'expired_deleted', v_expired,
    'revoked_deleted', v_revoked,
    'projects_cleared', v_projects
  );
end;
$function$;
drop policy if exists "roomator reports insert" on storage.objects;
drop policy if exists "roomator reports select" on storage.objects;
drop policy if exists "roomator reports update" on storage.objects;
create policy "roomator reports insert" on storage.objects for insert to authenticated with check (bucket_id = 'roomator-reports'::text);
create policy "roomator reports select" on storage.objects for select to authenticated using (bucket_id = 'roomator-reports'::text);
create policy "roomator reports update" on storage.objects for update to authenticated using (bucket_id = 'roomator-reports'::text) with check (bucket_id = 'roomator-reports'::text);
grant execute on function public.aceil_publish_report_link(uuid,text,jsonb,timestamp with time zone) to public;
grant execute on function public.aceil_publish_report_snapshot(uuid,text,jsonb,timestamp with time zone) to public;
grant execute on function public.aceil_save_film_catalog(jsonb,bigint) to public;
grant execute on function public.aceil_get_film_catalog() to public;
grant execute on function public.aceil_wall_catalog_json(uuid) to public;
grant execute on function public.aceil_cleanup_report_links() to public;
select pg_notify('pgrst','reload schema');
