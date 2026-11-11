-- A·CEIL: fix legacy "1 год" shared-project access and allow owner
-- to issue an independent 60-minute DEMO to an already approved account.
-- No existing user is converted; changes occur only through owner RPCs.

create or replace function public.aceil_admin_start_demo(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner uuid:=auth.uid();
begin
  if v_owner is null or not exists(
    select 1 from public.profiles p
    where p.id=v_owner and p.app_role='owner' and p.is_active=true
  ) then raise exception 'owner access required'; end if;
  if p_user_id is null or p_user_id=v_owner then
    raise exception 'invalid target user'; end if;

  -- A demo is deliberate and only applies to APPROVED accounts.
  -- A second call never resets a running demo or gives another free hour.
  update public.profiles p
     set demo_enabled=true,
         demo_started_at=null,
         demo_expires_at=null
   where p.id=p_user_id
     and p.app_role<>'owner'
     and p.approval_status='approved'
     and p.is_active=true
     and p.demo_enabled=false;
  return found;
end;
$$;
revoke all on function public.aceil_admin_start_demo(uuid) from public,anon;
grant execute on function public.aceil_admin_start_demo(uuid) to authenticated;

-- Shared owner-project time limit: update the EXISTING RLS field
-- (access_until), not only obsolete access_expires_at; create missing
-- user_access records without implicitly granting projects_access.
create or replace function public.admin_set_access_expiry(
  p_user_id uuid,p_hours integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_owner uuid:=auth.uid();
 v_until timestamptz;
begin
  if v_owner is null or not exists(
    select 1 from public.profiles p
    where p.id=v_owner and p.app_role='owner' and p.is_active=true
  ) then raise exception 'owner access required'; end if;
  if p_user_id is null or p_user_id=v_owner
     or not exists(select 1 from public.profiles p
       where p.id=p_user_id and p.app_role<>'owner') then
    raise exception 'invalid target user';
  end if;
  if p_hours is not null and (p_hours<0 or p_hours>24*365) then
    raise exception 'invalid access duration';
  end if;
  if p_hours is null then
    v_until:=null;
  elsif p_hours=0 then
    v_until:=now();
  else
    v_until:=now()+make_interval(hours=>p_hours);
  end if;

  insert into public.user_access(owner_id,user_id,access_until,access_expires_at)
  values(v_owner,p_user_id,v_until,v_until)
  on conflict(owner_id,user_id) do update set
    access_until=excluded.access_until,
    access_expires_at=excluded.access_expires_at,
    updated_at=now();
end;
$$;
revoke all on function public.admin_set_access_expiry(uuid,integer) from public,anon;
grant execute on function public.admin_set_access_expiry(uuid,integer) to authenticated;

create or replace function public.admin_clear_access_expiry(p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid:=auth.uid();
begin
  if v_owner is null or not exists(
    select 1 from public.profiles p
    where p.id=v_owner and p.app_role='owner' and p.is_active=true
  ) then raise exception 'owner access required'; end if;
  if p_user_id is null or p_user_id=v_owner then
    raise exception 'invalid target user'; end if;
  update public.user_access
  set access_until=null,access_expires_at=null,updated_at=now()
  where owner_id=v_owner and user_id=p_user_id;
end;
$$;
revoke all on function public.admin_clear_access_expiry(uuid) from public,anon;
grant execute on function public.admin_clear_access_expiry(uuid) to authenticated;
