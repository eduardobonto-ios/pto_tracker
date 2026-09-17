-- Adds real password storage/verification (see schema.sql for the
-- pto_credentials table + pto_set_password/pto_verify_login/
-- pto_change_password functions and their doc comments — this patch just
-- applies the same DDL to the already-live database), then resets every
-- existing account's password to '1234' and forces a change on next sign-in.
--
-- Run once in the Supabase SQL Editor.

create table if not exists pto_credentials (
  account_id text primary key references pto_accounts(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table pto_credentials enable row level security;
-- No policies at all — default-deny, only reachable via the functions below.
revoke all on pto_credentials from anon, authenticated;

create or replace function pto_set_password(
  p_account_id text,
  p_new_password text,
  p_force_change boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into pto_credentials (account_id, password_hash, updated_at)
  values (p_account_id, crypt(p_new_password, gen_salt('bf')), now())
  on conflict (account_id) do update
    set password_hash = excluded.password_hash, updated_at = now();

  update pto_accounts set must_change_password = p_force_change where id = p_account_id;
end;
$$;

create or replace function pto_verify_login(p_email text, p_password text)
returns table(account_id text, employee_id text, must_change_password boolean)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account pto_accounts;
  v_hash text;
begin
  select * into v_account from pto_accounts a
  where lower(a.email) = lower(trim(p_email)) and a.status = 'Active';
  if v_account.id is null then
    return;
  end if;

  select c.password_hash into v_hash from pto_credentials c where c.account_id = v_account.id;
  if v_hash is null or crypt(p_password, v_hash) <> v_hash then
    return;
  end if;

  return query select v_account.id, v_account.employee_id, v_account.must_change_password;
end;
$$;

create or replace function pto_change_password(
  p_account_id text,
  p_current_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text;
begin
  select password_hash into v_hash from pto_credentials where account_id = p_account_id;
  if v_hash is null or crypt(p_current_password, v_hash) <> v_hash then
    return false;
  end if;

  update pto_credentials set password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  where account_id = p_account_id;
  update pto_accounts set must_change_password = false where id = p_account_id;
  return true;
end;
$$;

grant execute on function
  pto_set_password(text, text, boolean),
  pto_verify_login(text, text),
  pto_change_password(text, text, text)
to anon, authenticated;

-- Reset every existing account to '1234', forcing a change on next sign-in.
insert into pto_credentials (account_id, password_hash, updated_at)
select id, crypt('1234', gen_salt('bf')), now() from pto_accounts
on conflict (account_id) do update
  set password_hash = excluded.password_hash, updated_at = now();

update pto_accounts set must_change_password = true;
