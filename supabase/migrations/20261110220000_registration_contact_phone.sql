-- A·CEIL: owner-only read access to voluntary registration contact phone.
-- The number is stored as auth.users.raw_user_meta_data.contact_phone by Supabase Auth.
-- Never expose auth.users or raw metadata to general authenticated clients.
create or replace function public.aceil_admin_contact_list()
returns table (user_id uuid, contact_phone text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'owner'
      and p.is_active is true
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select u.id, nullif(btrim(u.raw_user_meta_data ->> 'contact_phone'), '')
  from auth.users u;
end;
$$;

revoke all on function public.aceil_admin_contact_list() from public;
revoke all on function public.aceil_admin_contact_list() from anon;
grant execute on function public.aceil_admin_contact_list() to authenticated;
