-- A·CEIL: optional one-hour DEMO from FIRST approved sign-in.
-- The original approval flow remains unchanged for regular users.
-- Server-side restrictive RLS prevents use of protected project/catalog data
-- after expiration; a client-side countdown is only presentation.
alter table public.profiles
  add column if not exists demo_enabled boolean not null default false,
  add column if not exists demo_started_at timestamptz,
  add column if not exists demo_expires_at timestamptz;

-- RLS calls this without parameters: only the authenticated caller's
-- entitlement is visible. A missing/disabled profile never receives access.
create or replace function public.aceil_demo_has_access()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.approval_status='approved'
      and p.is_active=true
      and (p.demo_enabled=false or (p.demo_expires_at is not null and p.demo_expires_at>now()))
  );
$$;
revoke all on function public.aceil_demo_has_access() from public, anon;
grant execute on function public.aceil_demo_has_access() to authenticated;

-- Restrictive policies are combined via AND with ALL existing permissive
-- ownership/sharing policies. No previously-granted owner/user permission
-- can bypass the demo expiration.
do $$
declare t text;
begin
  foreach t in array array['projects','nomenclature','wall_presets','user_workspaces','report_links','report_acceptances']
  loop
    if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity=true)
      and not exists(select 1 from pg_policies where schemaname='public'
        and tablename=t and policyname='aceil_active_demo_guard') then
      execute format('create policy aceil_active_demo_guard on public.%I as restrictive for all to authenticated using (public.aceil_demo_has_access()) with check (public.aceil_demo_has_access())',t);
    end if;
  end loop;
end $$;

-- This RPC starts the timer ONCE, atomically. Every later call reuses the
-- persisted expiry; refreshing/reopening another device never resets it.
create or replace function public.aceil_demo_session()
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_id is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into v_profile from public.profiles where id=v_id for update;
  if not found then return jsonb_build_object('mode','blocked'); end if;
  if not v_profile.is_active or v_profile.approval_status<>'approved' then
    return jsonb_build_object('mode','blocked');
  end if;
  if not v_profile.demo_enabled then return jsonb_build_object('mode','full'); end if;
  if v_profile.demo_started_at is null then
    update public.profiles
       set demo_started_at=now(), demo_expires_at=now()+interval '1 hour'
     where id=v_id and demo_enabled=true and demo_started_at is null;
    select * into v_profile from public.profiles where id=v_id;
  end if;
  return jsonb_build_object(
    'mode',case when v_profile.demo_expires_at>now() then 'demo_active' else 'demo_expired' end,
    'started_at',v_profile.demo_started_at,
    'expires_at',v_profile.demo_expires_at,
    'remaining_seconds',greatest(0,ceil(extract(epoch from (v_profile.demo_expires_at-now())))::integer)
  );
end;
$$;
revoke all on function public.aceil_demo_session() from public, anon;
grant execute on function public.aceil_demo_session() to authenticated;

-- Admin selects DEMO or full before approving a pending request; approval
-- mail trigger fires in the same transaction and sees the committed mode.
create or replace function public.aceil_admin_approve_with_demo(
  p_user_id uuid, p_demo boolean)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := auth.uid();
begin
  if v_admin is null or not exists(
    select 1 from public.profiles
    where id=v_admin and app_role='owner' and is_active=true
  ) then raise exception 'owner access required'; end if;
  if p_user_id is null or p_user_id=v_admin or exists(
    select 1 from public.profiles where id=p_user_id and app_role='owner'
  ) then raise exception 'invalid target user'; end if;
  if not exists(select 1 from public.profiles
    where id=p_user_id and approval_status='pending') then
    raise exception 'Only a pending registration can be approved here';
  end if;
  if not public.admin_set_registration_status(p_user_id,'approved') then
    raise exception 'Approval failed';
  end if;
  update public.profiles
     set demo_enabled=coalesce(p_demo,false),
         demo_started_at=null,
         demo_expires_at=null
   where id=p_user_id;
  return found;
end;
$$;
revoke all on function public.aceil_admin_approve_with_demo(uuid,boolean) from public, anon;
grant execute on function public.aceil_admin_approve_with_demo(uuid,boolean) to authenticated;

-- Owner may grant full access after talking to the customer.
create or replace function public.aceil_admin_upgrade_demo(p_user_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := auth.uid();
begin
  if v_admin is null or not exists(
    select 1 from public.profiles
    where id=v_admin and app_role='owner' and is_active=true
  ) then raise exception 'owner access required'; end if;
  if p_user_id is null or p_user_id=v_admin then raise exception 'invalid target user'; end if;
  update public.profiles
     set demo_enabled=false,demo_started_at=null,demo_expires_at=null
   where id=p_user_id and app_role<>'owner' and approval_status='approved';
  return found;
end;
$$;
revoke all on function public.aceil_admin_upgrade_demo(uuid) from public, anon;
grant execute on function public.aceil_admin_upgrade_demo(uuid) to authenticated;

create or replace function public.aceil_admin_demo_list()
returns table(user_id uuid, demo_enabled boolean,
  demo_started_at timestamptz, demo_expires_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists(
    select 1 from public.profiles where id=auth.uid() and app_role='owner' and is_active=true
  ) then raise exception 'owner access required'; end if;
  return query
    select p.id,p.demo_enabled,p.demo_started_at,p.demo_expires_at
    from public.profiles p where p.app_role<>'owner';
end;
$$;
revoke all on function public.aceil_admin_demo_list() from public, anon;
grant execute on function public.aceil_admin_demo_list() to authenticated;

-- Preserve get_my_access's exact return signature for existing frontend.
-- Expired demos still return a row with is_active=false to inform the gate.
create or replace function public.get_my_access()
returns table(app_role text, is_active boolean, owner_id uuid,
  nomenclature_access boolean, projects_access boolean, projects_edit boolean,
  projects_scope text, access_until timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.app_role::text,
         (p.is_active and (not p.demo_enabled or (p.demo_expires_at is not null and p.demo_expires_at>now())))::boolean,
         p.id,true,true,true,'all'::text,
         (case when p.demo_enabled then p.demo_expires_at else null end)::timestamptz
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true and p.approval_status='approved'
  limit 1;
$$;
