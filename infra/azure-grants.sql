-- Table and function grants, mirroring supabase/schema.sql exactly.
-- Run AFTER the schema and functions are restored.

grant select, insert, update, delete on pto_employees, pto_accounts to anon, authenticated;
grant select on pto_requests, pto_approver_routing, pto_settings to anon, authenticated;
grant select, insert on pto_notifications to anon, authenticated;
revoke all on pto_action_tokens from anon, authenticated;
revoke all on pto_credentials from anon, authenticated;

-- The server-side role used by the calendar functions. Read-only over exactly
-- the two tables pto-calendar-feed and sync-pto-calendar touch.
grant select on pto_requests, pto_employees, pto_settings, pto_approver_routing to service_role;

grant usage, select on sequence pto_request_seq to anon, authenticated, service_role;

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
