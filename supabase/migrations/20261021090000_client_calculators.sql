begin;
create table if not exists public.aceil_client_calculators (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token text not null unique default replace(gen_random_uuid()::text,'-','') check (token ~ '^[a-f0-9]{32}$'),
 config jsonb not null check (jsonb_typeof(config)='object' and octet_length(config::text)<=25000),
 updated_at timestamptz not null default now()
);
alter table public.aceil_client_calculators enable row level security;
revoke all on public.aceil_client_calculators from anon, authenticated;
create or replace function public.aceil_save_client_calculator(p_config jsonb)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare result text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active=true) then raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(p_config) is distinct from 'object' or p_config->>'version' is distinct from '1' or jsonb_typeof(p_config->'items') is distinct from 'object' or octet_length(p_config::text)>25000 then raise exception 'Invalid catalogue'; end if;
 p_config=jsonb_build_object('version',1,'company',left(p_config->>'company',80),'date',left(p_config->>'date',10),'minimum',p_config->'minimum','filmCatalog',p_config->'filmCatalog','filmOverrides',p_config->'filmOverrides','items',p_config->'items','options',coalesce(p_config->'options','{}'::jsonb)) || case when p_config->>'catalogue'='true' then jsonb_build_object('catalogue',true,'products',p_config->'products','groups',p_config->'groups') else '{}'::jsonb end;
 insert into public.aceil_client_calculators(user_id,config) values(auth.uid(),p_config)
 on conflict(user_id) do update set config=excluded.config,updated_at=now()
 returning token into result;
 return result;
end; $$;
create or replace function public.aceil_get_client_calculator(p_token text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select c.config from public.aceil_client_calculators c
 join public.profiles p on p.id=c.user_id and p.is_active=true
 where c.token=p_token and p_token ~ '^[a-f0-9]{32}$';
$$;
revoke all on function public.aceil_save_client_calculator(jsonb) from public;
revoke all on function public.aceil_get_client_calculator(text) from public;
grant execute on function public.aceil_save_client_calculator(jsonb) to authenticated;
grant execute on function public.aceil_get_client_calculator(text) to anon, authenticated;
commit;
