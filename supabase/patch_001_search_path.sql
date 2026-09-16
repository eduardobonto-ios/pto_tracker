-- Fix: pgcrypto (digest / gen_random_bytes) lives in the "extensions" schema
-- on Supabase-hosted projects, not "public". These functions were originally
-- created with a locked-down search_path that did not include it, so calls
-- like digest(...) and gen_random_bytes(...) failed with "function ... does
-- not exist". This re-creates them (create or replace) with the corrected
-- search_path — safe to run on top of an already-provisioned project, since
-- it only touches functions, not tables or data.

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
  status pto_status
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
begin
  select * into v_tok from pto_action_tokens t where t.token_hash = v_hash;
  if not found then
    return query select false, 'not_found', null::pto_token_action, null::text, null::text,
      null::pto_leave_type, null::date, null::date, null::numeric, null::pto_status;
    return;
  end if;

  select * into v_req from pto_requests r where r.id = v_tok.request_id;
  select e.name into v_emp_name from pto_employees e where e.id = v_req.employee_id;

  return query select
    (v_tok.used_at is null and v_tok.expires_at >= now() and v_req.status = 'Pending'),
    case
      when v_tok.used_at is not null then 'used'
      when v_tok.expires_at < now() then 'expired'
      when v_req.status <> 'Pending' then 'already_handled'
      else 'ok'
    end,
    v_tok.action, v_req.id, v_emp_name, v_req.leave_type, v_req.start_date, v_req.end_date,
    v_req.days, v_req.status;
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
  status pto_status
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
  -- can't be actioned later once one side has already been chosen.
  update pto_action_tokens set used_at = now()
  where request_id = v_req.id and used_at is null;

  if v_tok.action = 'approve' then
    perform pto_approve_request(v_req.id, p_actor_name, p_reason);
  else
    perform pto_reject_request(v_req.id, p_actor_name, coalesce(nullif(trim(p_reason), ''), 'Rejected via email.'));
  end if;

  return query select * from pto_resolve_action_token(p_token);
end;
$$;

grant execute on function
  pto_submit_request(text, pto_leave_type, date, date, pto_duration_type, numeric, pto_pay_status, text, text, time, time, numeric, pto_status),
  pto_approve_request(text, text, text),
  pto_reject_request(text, text, text),
  pto_cancel_request(text, text, text),
  pto_mint_action_token(text, pto_token_action, text, integer),
  pto_resolve_action_token(text),
  pto_consume_action_token(text, text, text)
to anon, authenticated;
