-- A·CEIL: read-only аудит безпеки Supabase. Нічого не змінює.
-- Запускати в SQL Editor проєкту (роль postgres). Кожен блок = окрема перевірка; очікуваний результат вказано в коментарі.

-- 1. Таблиці public БЕЗ увімкненого RLS. Очікування: 0 рядків
--    (застосунок використовує: projects, profiles, nomenclature, wall_presets, user_workspaces,
--     aceil_report_views, aceil_client_calculators).
select c.relname as table_without_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity
order by 1;

-- 2. Усі політики RLS. Перевірте вручну: кожна політика на projects/nomenclature/wall_presets/user_workspaces
--    має обмежувати користувача (auth.uid() = user_id або перевірка власника/адміна), без `using (true)` для anon.
select schemaname, tablename, policyname, roles, cmd, qual as using_expr, with_check
from pg_policies where schemaname='public' order by tablename, cmd, policyname;

-- 3. Політики, що дозволяють усе (using true / with check true) або ролі anon. Очікування: 0 рядків
--    (публічні звіти та калькулятор працюють через security definer RPC, а не через відкриті політики).
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and (coalesce(qual,'')~'^\(?true\)?$' or coalesce(with_check,'')~'^\(?true\)?$' or 'anon'=any(roles) or 'public'=any(roles));

-- 4. Прямі права ролей anon/authenticated на таблиці. Очікування для anon: нічого, окрім випадків, які ви свідомо відкрили.
select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')
group by grantee, table_name order by table_name, grantee;

-- 5. Функції public: security definer, search_path, і хто може їх викликати.
--    Очікування: усі security definer мають proconfig з search_path; anon має EXECUTE тільки на
--    aceil_get_public_report, aceil_record_report_view, aceil_get_client_calculator (і те, що вам потрібно публічно).
select p.proname,
       p.prosecdef as security_definer,
       p.proconfig as config,
       has_function_privilege('anon',  p.oid, 'execute') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authed_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
order by p.prosecdef desc, p.proname;

-- 6. Security definer функції БЕЗ фіксованого search_path. Очікування: 0 рядків
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%');

-- 7. Тіла адмін-функцій: кожна admin_* має на початку перевіряти роль викликача (owner/admin) і raise exception інакше.
--    Прочитайте вивід очима: шукайте перевірку на кшталт `where id = auth.uid() and app_role in ('owner','admin')`.
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'admin\_%' escape '\'
order by p.proname;

-- 8. Захист ролі/доступу в profiles. RLS обмежує рядки, але сама по собі НЕ забороняє змінювати
--    окремі стовпці. Перевірте разом політики, права UPDATE на таблицю/стовпці та захисні тригери.
--    app_role, is_active, owner_id, *_access, projects_scope мають бути захищені від звичайного користувача.
select policyname, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename='profiles' and cmd in ('UPDATE','ALL');
select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='profiles' and privilege_type='UPDATE'
  and grantee in ('anon','authenticated','PUBLIC');
select grantee, column_name, privilege_type from information_schema.column_privileges
where table_schema='public' and table_name='profiles' and privilege_type='UPDATE'
  and grantee in ('anon','authenticated','PUBLIC');
select t.tgname, pg_get_triggerdef(t.oid) as trigger_definition,
       pg_get_functiondef(t.tgfoid) as function_definition
from pg_trigger t
where t.tgrelid='public.profiles'::regclass and not t.tgisinternal;

-- 9. Публічні токени звітів: унікальність і довжина. Очікування: duplicate_tokens = 0;
--    другий запит повертає 0 рядків. Відкликання/прострочення перевіряйте окремо в реальному RPC.
select count(*) as duplicate_tokens from (select report_token from public.projects where report_token is not null group by 1 having count(*)>1) d;
select id from public.projects where report_token is not null and length(report_token) < 32 limit 20;

-- 10. Розширення та Storage-бакети (публічні бакети доступні без авторизації).
select extname from pg_extension order by 1;
select id, name, public from storage.buckets order by 1;
