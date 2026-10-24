-- Синхронізація каталогу плівок (ручні виробники / кольори / ширини + тарифи) між пристроями.
-- Один документ на користувача. Доступ лише через функції (таблиця закрита для прямого доступу).
begin;
create table if not exists public.aceil_film_catalog (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check (jsonb_typeof(data)='object' and octet_length(data::text)<=250000),
 rev bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.aceil_film_catalog enable row level security;
revoke all on public.aceil_film_catalog from anon, authenticated;

create or replace function public.aceil_get_film_catalog()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r public.aceil_film_catalog%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active=true) then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 select * into r from public.aceil_film_catalog where user_id=auth.uid();
 if not found then return jsonb_build_object('data',null,'rev',0,'uid',auth.uid()); end if;
 return jsonb_build_object('data',r.data,'rev',r.rev,'updated_at',r.updated_at,'uid',auth.uid());
end; $$;

-- p_data.uid — id акаунта, для якого клієнт збудував документ (захист від зміни акаунта під час запиту).
-- p_base_rev: ревізія, на основі якої клієнт будував документ (0 — якщо запису ще немає).
-- Якщо за цей час запис змінили з іншого пристрою — помилка 40001, клієнт перечитує й зливає.
create or replace function public.aceil_save_film_catalog(p_data jsonb, p_base_rev bigint)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare cur bigint; result bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active=true) then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 if jsonb_typeof(p_data) is distinct from 'object'
    or p_data->>'v' is distinct from '1'
    or jsonb_typeof(p_data->'custom') is distinct from 'object'
    or jsonb_typeof(p_data->'pricing') is distinct from 'object'
    or octet_length(p_data::text)>250000 then
  raise exception 'Invalid film catalog' using errcode='22023';
 end if;
 -- Клієнт вказує, для якого акаунта збудований документ; якщо сесія змінилась під час запиту — відмова.
 if p_data->>'uid' is distinct from auth.uid()::text then
  raise exception 'film_catalog_user_changed' using errcode='42501';
 end if;
 p_data := p_data - 'uid';
 select rev into cur from public.aceil_film_catalog where user_id=auth.uid() for update;
 if found then
  if cur is distinct from coalesce(p_base_rev,0) then
   raise exception 'film_catalog_conflict' using errcode='40001';
  end if;
  update public.aceil_film_catalog set data=p_data, rev=rev+1, updated_at=now()
   where user_id=auth.uid() returning rev into result;
 else
  insert into public.aceil_film_catalog(user_id,data) values(auth.uid(),p_data) returning rev into result;
 end if;
 return result;
exception when unique_violation then
 raise exception 'film_catalog_conflict' using errcode='40001';
end; $$;

revoke all on function public.aceil_get_film_catalog() from public;
revoke all on function public.aceil_save_film_catalog(jsonb,bigint) from public;
grant execute on function public.aceil_get_film_catalog() to authenticated;
grant execute on function public.aceil_save_film_catalog(jsonb,bigint) to authenticated;
commit;
