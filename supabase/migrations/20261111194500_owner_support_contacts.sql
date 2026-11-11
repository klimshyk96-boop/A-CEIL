-- A·CEIL owner-managed PUBLIC support contacts. No contact is prefilled.
-- The browser can read only values deliberately published by the owner via RPC.
create table if not exists public.aceil_support_contacts(
  singleton smallint primary key default 1 check(singleton=1),
  contacts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.aceil_support_contacts enable row level security;
revoke all on table public.aceil_support_contacts from public,anon,authenticated;

-- Public-read RPC returns only voluntarily published contact fields.
create or replace function public.aceil_support_public()
returns jsonb
language sql stable security definer set search_path = ''
as $$
 select coalesce(
   (select s.contacts from public.aceil_support_contacts s where s.singleton=1),
   '{}'::jsonb
 );
$$;
revoke all on function public.aceil_support_public() from public;
grant execute on function public.aceil_support_public() to anon,authenticated;

create or replace function public.aceil_support_save(p_contacts jsonb)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid:=auth.uid();
  v_field text;
  v_value text;
  v_new jsonb:='{}'::jsonb;
begin
  if v_owner is null or not exists(
    select 1 from public.profiles p
    where p.id=v_owner and p.app_role='owner'
      and p.is_active=true and p.approval_status='approved'
  ) then raise exception 'owner access required'; end if;
  if p_contacts is null or jsonb_typeof(p_contacts)<>'object' then
    raise exception 'invalid contacts object'; end if;
  for v_field,v_value in
    select key, value #>> '{}' from jsonb_each(p_contacts)
  loop
    if v_field not in ('phone','email','telegram','viber','whatsapp',
                       'facebook','instagram','website','extra_title','extra_url','note')
       or jsonb_typeof(p_contacts->v_field)<>'string'
    then raise exception 'invalid contact field'; end if;
    v_value:=btrim(v_value);
    if length(v_value)>(case when v_field='note' then 500 else 300 end) then
      raise exception 'contact field too long'; end if;
    if v_value='' then continue; end if;
    if v_field='email'
       and v_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'invalid email'; end if;
    if v_field='phone' and v_value !~ '^\+?[0-9 ()-]{6,40}$' then
      raise exception 'invalid phone'; end if;
    if v_field in ('facebook','instagram','website','extra_url')
       and v_value !~* '^https://[a-z0-9][a-z0-9._-]*(/[^[:space:]]*)?$'
    then raise exception 'Use an https:// link'; end if;
    if v_field='telegram'
       and v_value !~* '^(@?[a-z0-9_]{5,32}|https://t\.me/[a-z0-9_+/.-]+)$' then
      raise exception 'invalid Telegram address'; end if;
    if v_field='whatsapp'
       and v_value !~* '^(\+?[0-9 ()-]{6,40}|https://wa\.me/[0-9]+(\?[^[:space:]]*)?)$'
    then raise exception 'invalid WhatsApp address'; end if;
    if v_field='viber'
       and v_value !~* '^(\+?[0-9 ()-]{6,40}|viber://[^[:space:]]+|https://[^[:space:]]+)$'
    then raise exception 'invalid Viber address'; end if;
    v_new:=v_new||jsonb_build_object(v_field,v_value);
  end loop;

  insert into public.aceil_support_contacts(singleton,contacts,updated_at,updated_by)
  values(1,v_new,now(),v_owner)
  on conflict(singleton) do update
  set contacts=excluded.contacts,updated_at=now(),updated_by=v_owner;
  return true;
end;
$$;
revoke all on function public.aceil_support_save(jsonb) from public,anon;
grant execute on function public.aceil_support_save(jsonb) to authenticated;
