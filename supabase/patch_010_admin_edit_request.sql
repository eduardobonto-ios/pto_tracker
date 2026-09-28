-- Lets an admin correct a leave request's details after it has been filed.
-- Confirmed with Eduardo 2026-09-29.
--
-- WHY ONLY ADMINS: an employee editing their own request after approval would
-- silently move leave that a manager already signed off on — approve Sep 28-29,
-- employee quietly changes it to Oct 5-6. The app gates the UI on isAdmin, and
-- the timeline entry below makes any edit visible either way.
--
-- WHAT IS NOT EDITABLE HERE:
--   status        — approve/reject/cancel have their own functions, which send
--                   the notification emails. Changing it here would move the
--                   request without telling anyone.
--   employee_id   — reassigning leave to a different person is not a
--                   correction; cancel it and file a new one.
--   request_date  — when it was filed is a historical fact, not a detail.
--
-- Every edit appends an 'Edited' timeline entry naming the actor and spelling
-- out what moved, so an approved request that changes later says so on its own
-- record rather than changing silently.

create or replace function pto_update_request(
  p_request_id text,
  p_actor_name text,
  p_leave_type pto_leave_type,
  p_start_date date,
  p_end_date date,
  p_duration_type pto_duration_type,
  p_days numeric,
  p_pay_status pto_pay_status,
  p_coverage text,
  p_reason text,
  p_total_hours numeric default null
)
returns setof pto_requests
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_old pto_requests;
  v_now timestamptz := now();
  v_changes text[] := '{}';
  v_note text;
begin
  select * into v_old from pto_requests where id = p_request_id;
  if v_old.id is null then
    raise exception 'Request % not found', p_request_id;
  end if;
  if v_old.status = 'Cancelled' then
    raise exception 'Cancelled requests cannot be edited';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date cannot fall before the start date';
  end if;
  if p_days <= 0 then
    raise exception 'A request must be at least half a day';
  end if;

  -- Build a human-readable summary of what actually moved. Only genuinely
  -- changed fields are listed, so a no-op save does not litter the timeline.
  if v_old.leave_type <> p_leave_type then
    v_changes := v_changes || format('leave type %s -> %s', v_old.leave_type, p_leave_type);
  end if;
  if v_old.start_date <> p_start_date or v_old.end_date <> p_end_date then
    v_changes := v_changes || format('dates %s..%s -> %s..%s',
      v_old.start_date, v_old.end_date, p_start_date, p_end_date);
  end if;
  if v_old.duration_type <> p_duration_type then
    v_changes := v_changes || format('duration %s -> %s', v_old.duration_type, p_duration_type);
  end if;
  if v_old.days <> p_days then
    v_changes := v_changes || format('days %s -> %s', v_old.days, p_days);
  end if;
  if v_old.pay_status <> p_pay_status then
    v_changes := v_changes || format('%s -> %s', v_old.pay_status, p_pay_status);
  end if;
  if coalesce(v_old.coverage, '') <> coalesce(p_coverage, '') then
    v_changes := v_changes || 'coverage'::text;
  end if;
  if coalesce(v_old.reason, '') <> coalesce(p_reason, '') then
    v_changes := v_changes || 'reason'::text;
  end if;

  if array_length(v_changes, 1) is null then
    -- Nothing changed. Return the row untouched rather than recording an edit.
    return query select * from pto_requests where id = p_request_id;
    return;
  end if;

  v_note := 'Changed ' || array_to_string(v_changes, ', ') || '.';

  return query
  update pto_requests
  set leave_type = p_leave_type,
      start_date = p_start_date,
      end_date = p_end_date,
      duration_type = p_duration_type,
      days = p_days,
      pay_status = p_pay_status,
      coverage = coalesce(p_coverage, ''),
      reason = coalesce(p_reason, ''),
      total_hours = p_total_hours,
      -- notes keeps the 'Leave Type — reason' shape the rest of the app uses.
      notes = case
                when coalesce(p_reason, '') = '' then p_leave_type::text
                else p_leave_type::text || ' — ' || p_reason
              end,
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'tl-' || encode(gen_random_bytes(4), 'hex'),
        'label', 'Edited',
        'at', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'actor', p_actor_name,
        'note', v_note
      ))
  where id = p_request_id
  returning *;
end;
$$;

grant execute on function
  pto_update_request(text, text, pto_leave_type, date, date, pto_duration_type,
                     numeric, pto_pay_status, text, text, numeric)
to anon, authenticated;
