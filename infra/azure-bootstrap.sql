-- Roles and grants that Supabase's platform provided for free, recreated on a
-- vanilla Azure Database for PostgreSQL flexible server.
--
-- Run BEFORE restoring the schema. PostgREST connects as the admin user and
-- SET ROLEs to whichever role the request's JWT names in its `role` claim, so
-- these must exist first and the admin must be a member of each.
--
-- Deliberately NOT replicated from Supabase:
--   * BYPASSRLS on service_role — only a superuser can grant it, and the Azure
--     admin is not one. Nothing needs it: every table the service role reads
--     (pto_requests, pto_employees) has a permissive `using (true)` SELECT
--     policy, so ordinary grants are sufficient. pto_credentials and
--     pto_action_tokens stay default-deny for every role, exactly as on
--     Supabase — they are reachable only through the SECURITY DEFINER
--     functions, which run as their owner.
--   * The `auth` schema and auth.uid() — this app never used Supabase Auth.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit;
  end if;
end
$$;

-- PostgREST's connection role must be able to assume each of them.
grant anon, authenticated, service_role to current_user;

grant usage on schema public to anon, authenticated, service_role;
