-- Bring the two action-token functions up to the definitions in schema.sql.
--
-- They were returning 10 columns; schema.sql declares 12. The missing two are
-- employee_email and pay_status, and the first of those is load-bearing: the
-- /respond page builds the filer's "your request was approved/declined" email
-- from the consume call's employee_email, so with the column absent the
-- recipient list came out empty and NOBODY WAS TOLD. Silent - the page still
-- said "Request approved" and the console logged "to no recipients".
--
-- HOW THE DRIFT HAPPENED. The Azure migration copied functions out of Supabase
-- with pg_get_functiondef, and Supabase was itself behind this repo: schema.sql
-- had been updated with the two extra columns but never re-applied there. The
-- migration faithfully carried the older version across, so both databases now
-- disagree with the file that is supposed to define them.
--
-- Found while testing the calendar fix on 2026-10-17 - the test approval
-- logged "no recipients", which should not have been possible.
--
-- DROP first: Postgres will not change a function's return type in place.

begin;

drop function if exists pto_resolve_action_token(text) cascade;
drop function if exists pto_consume_action_token(text, text, text) cascade;

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
$$;;

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

-- Dropping takes the grants with it.
grant execute on function
  pto_resolve_action_token(text),
  pto_consume_action_token(text, text, text)
to anon, authenticated;

do $$
declare n integer;
begin
  select count(*) into n
    from pg_proc p join pg_namespace x on x.oid = p.pronamespace
   where x.nspname = 'public'
     and p.proname in ('pto_resolve_action_token','pto_consume_action_token')
     and pg_get_function_result(p.oid) like '%employee_email%'
     and pg_get_function_result(p.oid) like '%pay_status%';
  if n <> 2 then
    raise exception 'expected both token functions to return employee_email and pay_status, got %', n;
  end if;
end
$$;

commit;
