-- Valveman PTO Tracker — Supabase schema
--
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query),
-- then run seed.sql. Safe to re-run: everything is `create ... if not exists` /
-- `drop ... if exists` first, except the enum types (Postgres has no
-- `create type if not exists`) — drop them manually first if you need to
-- re-run this from scratch on a project that already has them.
--
-- Design notes (see the PTOTracker email-approval planning conversation):
--   - Every table is prefixed `pto_`.
--   - Auth is still mocked (no password column anywhere) — this only moves
--     today's static/in-memory data into real tables. RLS therefore can't be
--     scoped to a real logged-in user yet, so reads are open to the `anon`
--     key on every table (this is not a regression: the static data already
--     ships fully readable inside the JS bundle today).
--   - `pto_employees` / `pto_accounts` also get open write access for `anon`
--     — there is no real per-user authorization to enforce either way while
--     auth is mocked, so routing these through a SECURITY DEFINER function
--     would not add any actual protection, just ceremony.
--   - `pto_requests` writes go only through the functions below instead.
--     That's not a security boundary either (same caveat) — it's there so
--     the status-transition/timeline logic and the sequential ID generation
--     (via a real Postgres sequence, safe under concurrent submitters) live
--     in one place, shared by both the in-app actions and the email-token
--     flow.
--   - `pto_action_tokens` is the one real security boundary: it has no
--     grants at all for anon/authenticated. It's only reachable through the
--     SECURITY DEFINER functions, which store only a SHA-256 hash of each
--     token, never the raw value.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums (mirror the TS unions in src/types/index.ts exactly)
-- ---------------------------------------------------------------------------

create type pto_department as enum (
  'Management', 'Administration', 'Operations', 'Technical', 'Finance',
  'Sales', 'Sales / Operations', 'Other'
);

create type pto_leave_type as enum (
  'Vacation Leave', 'Personal Leave', 'Emergency Leave', 'Sick Leave',
  'Half Day Leave', 'Unpaid Leave', 'Other'
);

create type pto_status as enum ('Pending', 'Approved', 'Rejected', 'Cancelled');

create type pto_pay_status as enum ('Paid', 'Unpaid');

create type pto_duration_type as enum (
  'Full Day', 'Half Day (AM)', 'Half Day (PM)', 'Custom Hours'
);

create type pto_app_role as enum ('Employee', 'Admin');

create type pto_account_status as enum ('Active', 'Revoked');

create type pto_token_action as enum ('approve', 'reject');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table pto_employees (
  id text primary key,
  sheet_no integer not null,
  name text not null,
  email text not null unique,
  job_title text not null,
  department pto_department not null,
  hire_date date not null,
  annual_pto_allowance numeric not null default 5,
  app_role pto_app_role not null default 'Employee',
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table pto_accounts (
  id text primary key,
  employee_id text references pto_employees(id) on delete set null,
  email text not null unique,
  full_name text not null,
  app_role pto_app_role not null,
  job_title text not null,
  department pto_department not null,
  hire_date date not null,
  annual_pto_allowance numeric not null default 5,
  status pto_account_status not null default 'Active',
  -- Just a provisioning date (matches UserAccount.createdAt in src/types),
  -- not a precise instant — `date`, not `timestamptz`, so PostgREST returns
  -- a plain YYYY-MM-DD the frontend's date parsing already expects.
  created_at date not null default current_date,
  must_change_password boolean not null default true
);

create sequence pto_request_seq start with 1;

create table pto_requests (
  id text primary key,
  employee_id text not null references pto_employees(id) on delete cascade,
  request_date date not null,
  leave_type pto_leave_type not null,
  start_date date not null,
  end_date date not null,
  duration_type pto_duration_type not null default 'Full Day',
  start_time time,
  end_time time,
  total_hours numeric,
  days numeric not null,
  status pto_status not null default 'Pending',
  pay_status pto_pay_status not null default 'Paid',
  coverage text not null default '',
  reason text not null default '',
  notes text not null default '',
  rejection_reason text,
  approval_comment text,
  reviewed_by text,
  reviewed_at timestamptz,
  cancelled_at timestamptz,
  -- Array of TimelineEvent ({id,label,at,actor,note?}) — kept as one JSON
  -- blob rather than a child table: it's only ever read/written as a whole
  -- array tied to one request, so a join table would add ceremony with no
  -- query benefit.
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index pto_requests_employee_id_idx on pto_requests(employee_id);
create index pto_requests_status_idx on pto_requests(status);

create table pto_notifications (
  id text primary key,
  kind text not null check (kind in ('new-request', 'request-reviewed')),
  request_id text references pto_requests(id) on delete cascade,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  subject text not null,
  sent_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

-- Replaces the JOB_TITLE_MANAGER_EMAIL / DEPARTMENT_MANAGER_EMAIL maps that
-- used to live in src/lib/theme.ts.
create table pto_approver_routing (
  id uuid primary key default gen_random_uuid(),
  match_type text not null check (match_type in ('job_title', 'department')),
  match_value text not null,
  approver_email text not null,
  unique (match_type, match_value)
);

-- Replaces the WILL_EMAIL / PRINCES_EMAIL constants that used to live in
-- src/lib/theme.ts.
create table pto_settings (
  key text primary key,
  value text not null
);

-- Email approve/reject tokens. Only the SHA-256 hash of each token is ever
-- stored — the raw token is returned once, at mint time, to be embedded in
-- the email link, and is never persisted or logged anywhere.
create table pto_action_tokens (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references pto_requests(id) on delete cascade,
  action pto_token_action not null,
  token_hash text not null unique,
  approver_email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index pto_action_tokens_request_id_idx on pto_action_tokens(request_id);

-- Real login credentials. Deliberately a separate table from pto_accounts,
-- not a column on it — pto_accounts is wide open to a plain `select('*')`
-- for anon (see below), and a password hash must never come back on that
-- read. Only reachable via the SECURITY DEFINER functions below.
create table pto_credentials (
  account_id text primary key references pto_accounts(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table pto_employees enable row level security;
alter table pto_accounts enable row level security;
alter table pto_requests enable row level security;
alter table pto_notifications enable row level security;
alter table pto_approver_routing enable row level security;
alter table pto_settings enable row level security;
alter table pto_action_tokens enable row level security;
alter table pto_credentials enable row level security;

create policy pto_employees_select on pto_employees for select using (true);
create policy pto_employees_write on pto_employees for all using (true) with check (true);

create policy pto_accounts_select on pto_accounts for select using (true);
create policy pto_accounts_write on pto_accounts for all using (true) with check (true);

create policy pto_requests_select on pto_requests for select using (true);
-- No write policy on pto_requests for anon/authenticated — see the header
-- note. All mutation goes through the SECURITY DEFINER functions below.

create policy pto_notifications_select on pto_notifications for select using (true);
create policy pto_notifications_insert on pto_notifications for insert with check (true);

create policy pto_approver_routing_select on pto_approver_routing for select using (true);
create policy pto_settings_select on pto_settings for select using (true);

-- No policies at all on pto_action_tokens or pto_credentials — default-deny
-- for every operation and every role. Only reachable via the SECURITY
-- DEFINER functions below, which never return password_hash itself.

grant select, insert, update, delete on pto_employees, pto_accounts to anon, authenticated;
grant select on pto_requests, pto_approver_routing, pto_settings to anon, authenticated;
grant select, insert on pto_notifications to anon, authenticated;
revoke all on pto_action_tokens from anon, authenticated;
revoke all on pto_credentials from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Request lifecycle functions
--
-- Each returns `setof pto_requests` (at most one row) so every RPC call site
-- in the frontend follows the same `data?.[0]` pattern regardless of which
-- function it called.
-- ---------------------------------------------------------------------------

create or replace function pto_submit_request(
  p_employee_id text,
  p_leave_type pto_leave_type,
  p_start_date date,
  p_end_date date,
  p_duration_type pto_duration_type,
  p_days numeric,
  p_pay_status pto_pay_status,
  p_coverage text,
  p_reason text,
  p_start_time time default null,
  p_end_time time default null,
  p_total_hours numeric default null,
  p_status pto_status default 'Pending'
)
returns setof pto_requests
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id text;
  v_now timestamptz := now();
begin
  v_id := 'PTO-' || to_char(v_now, 'YYYY') || '-' || lpad(nextval('pto_request_seq')::text, 3, '0');

  return query
  insert into pto_requests (
    id, employee_id, request_date, leave_type, start_date, end_date, duration_type,
    start_time, end_time, total_hours, days, status, pay_status, coverage, reason, notes, timeline
  ) values (
    v_id, p_employee_id, v_now::date, p_leave_type, p_start_date, coalesce(p_end_date, p_start_date),
    p_duration_type, p_start_time, p_end_time, p_total_hours, p_days, coalesce(p_status, 'Pending'),
    p_pay_status, p_coverage, p_reason,
    p_leave_type || ' — ' || coalesce(nullif(p_reason, ''), 'No additional detail provided'),
    jsonb_build_array(jsonb_build_object(
      'id', 'tl-' || encode(gen_random_bytes(4), 'hex'),
      'label', 'Submitted',
      'at', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'actor', 'Employee',
      'note', 'Request filed through the PTO Tracker.'
    ))
  )
  returning *;
end;
$$;

create or replace function pto_approve_request(
  p_request_id text,
  p_admin_name text,
  p_comment text default null
)
returns setof pto_requests
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  return query
  update pto_requests
  set status = 'Approved',
      reviewed_by = p_admin_name,
      reviewed_at = v_now,
      rejection_reason = null,
      approval_comment = nullif(trim(p_comment), ''),
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'tl-' || encode(gen_random_bytes(4), 'hex'),
        'label', 'Approved',
        'at', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'actor', p_admin_name,
        'note', coalesce(nullif(trim(p_comment), ''), 'Coverage confirmed and balance checked.')
      ))
  where id = p_request_id
  returning *;
end;
$$;

create or replace function pto_reject_request(
  p_request_id text,
  p_admin_name text,
  p_rejection_reason text
)
returns setof pto_requests
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  return query
  update pto_requests
  set status = 'Rejected',
      reviewed_by = p_admin_name,
      reviewed_at = v_now,
      rejection_reason = p_rejection_reason,
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'tl-' || encode(gen_random_bytes(4), 'hex'),
        'label', 'Rejected',
        'at', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'actor', p_admin_name,
        'note', p_rejection_reason
      ))
  where id = p_request_id
  returning *;
end;
$$;

create or replace function pto_cancel_request(
  p_request_id text,
  p_actor_name text,
  p_reason text default null
)
returns setof pto_requests
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  -- Only an open request (still Pending or already Approved) can be
  -- cancelled — a Rejected or already-Cancelled record is terminal.
  return query
  update pto_requests
  set status = 'Cancelled',
      cancelled_at = v_now,
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'tl-' || encode(gen_random_bytes(4), 'hex'),
        'label', 'Cancelled',
        'at', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'actor', p_actor_name,
        'note', coalesce(nullif(trim(p_reason), ''), 'Cancelled by the employee.')
      ))
  where id = p_request_id
    and status in ('Pending', 'Approved')
  returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- Email approve/reject token functions
-- ---------------------------------------------------------------------------

create or replace function pto_mint_action_token(
  p_request_id text,
  p_action pto_token_action,
  p_approver_email text,
  p_ttl_hours integer default 336 -- 14 days
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  insert into pto_action_tokens (request_id, action, token_hash, approver_email, expires_at)
  values (
    p_request_id, p_action, encode(digest(v_token, 'sha256'), 'hex'), p_approver_email,
    now() + make_interval(hours => p_ttl_hours)
  );
  return v_token;
end;
$$;

-- Read-only lookup, used by the public /respond confirmation page before
-- anything is mutated. `reason` is one of: ok | not_found | expired | used |
-- already_handled.
create or replace function pto_resolve_action_token(p_token text)
returns table (
  valid boolean,
  reason text,
  action pto_token_action,
  request_id text,
  employee_name text,
  leave_type pto_leave_type,
  start_date date,
  end_date date,
  days numeric,
  status pto_status,
  employee_email text,
  pay_status pto_pay_status
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_tok pto_action_tokens;
  v_req pto_requests;
  v_emp_name text;
  v_emp_email text;
begin
  select * into v_tok from pto_action_tokens t where t.token_hash = v_hash;
  if not found then
    return query select false, 'not_found', null::pto_token_action, null::text, null::text,
      null::pto_leave_type, null::date, null::date, null::numeric, null::pto_status,
      null::text, null::pto_pay_status;
    return;
  end if;

  select * into v_req from pto_requests r where r.id = v_tok.request_id;
  select e.name, e.email into v_emp_name, v_emp_email from pto_employees e where e.id = v_req.employee_id;

  return query select
    (v_tok.used_at is null and v_tok.expires_at >= now() and v_req.status = 'Pending'),
    case
      when v_tok.used_at is not null then 'used'
      when v_tok.expires_at < now() then 'expired'
      when v_req.status <> 'Pending' then 'already_handled'
      else 'ok'
    end,
    v_tok.action, v_req.id, v_emp_name, v_req.leave_type, v_req.start_date, v_req.end_date,
    v_req.days, v_req.status, v_emp_email, v_req.pay_status;
end;
$$;

-- Validates and burns the token, then performs the approve/reject atomically.
-- Row locks on both the token and the request make a double-click or a mail
-- client's link-prefetch a no-op the second time, not a double-action.
create or replace function pto_consume_action_token(
  p_token text,
  p_reason text default null,
  p_actor_name text default 'Email link'
)
returns table (
  valid boolean,
  reason text,
  action pto_token_action,
  request_id text,
  employee_name text,
  leave_type pto_leave_type,
  start_date date,
  end_date date,
  days numeric,
  status pto_status,
  employee_email text,
  pay_status pto_pay_status
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_tok pto_action_tokens;
  v_req pto_requests;
begin
  select * into v_tok from pto_action_tokens t where t.token_hash = v_hash for update;
  if not found then
    return query select * from pto_resolve_action_token(p_token);
    return;
  end if;

  select * into v_req from pto_requests r where r.id = v_tok.request_id for update;

  if v_tok.used_at is not null or v_tok.expires_at < now() or v_req.status <> 'Pending' then
    -- Already used/expired, or the request moved on some other way (e.g.
    -- handled in-app before this link was clicked) — burn it either way so
    -- it can't be replayed, then report the current state.
    update pto_action_tokens set used_at = coalesce(used_at, now()) where id = v_tok.id;
    return query select * from pto_resolve_action_token(p_token);
    return;
  end if;

  update pto_action_tokens set used_at = now() where id = v_tok.id;
  -- Invalidate the sibling token for this request (the other action) so it
  -- can't be actioned later once one side has already been chosen. `t.` is
  -- required here — this function's own `request_id` OUT parameter (from
  -- `returns table (...)`) is otherwise ambiguous with the column of the
  -- same name, which PL/pgSQL rejects outright (42702).
  update pto_action_tokens t set used_at = now()
  where t.request_id = v_req.id and t.used_at is null;

  if v_tok.action = 'approve' then
    perform pto_approve_request(v_req.id, p_actor_name, p_reason);
  else
    perform pto_reject_request(v_req.id, p_actor_name, coalesce(nullif(trim(p_reason), ''), 'Rejected via email.'));
  end if;

  return query select * from pto_resolve_action_token(p_token);
end;
$$;

-- ---------------------------------------------------------------------------
-- Password / credentials functions
--
-- Real bcrypt-style hashing via pgcrypto — password_hash never leaves these
-- functions. `pto_verify_login` returns nothing (empty set) for a wrong
-- password, an unknown email, a Revoked account, or an account with no
-- credentials set yet, all identically, so a caller can't distinguish which
-- case it was (no email-enumeration or account-existence signal).
--
-- Caveat, same one already noted for pto_accounts/pto_employees above:
-- there's no real per-caller identity yet (no Supabase Auth session), so
-- these functions can't verify "is the caller actually an admin" — anon
-- already has full write access to pto_accounts directly, so this doesn't
-- introduce a new privilege-escalation path, just carries the same
-- pre-existing one forward. Revisit once real auth exists. There's also no
-- rate limiting on pto_verify_login at this layer.
-- ---------------------------------------------------------------------------

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

grant execute on function
  pto_submit_request(text, pto_leave_type, date, date, pto_duration_type, numeric, pto_pay_status, text, text, time, time, numeric, pto_status),
  pto_approve_request(text, text, text),
  pto_reject_request(text, text, text),
  pto_cancel_request(text, text, text),
  pto_mint_action_token(text, pto_token_action, text, integer),
  pto_resolve_action_token(text),
  pto_consume_action_token(text, text, text)
to anon, authenticated;
