-- Let an administrator edit an account: email, full name, application role,
-- job title and department. Replaces pto_update_account_email, which only
-- moved the address.
--
-- EVERY ONE OF THESE IS LOAD-BEARING SOMEWHERE, which is why they move in one
-- transaction and the function reports what else it touched:
--
--   email       login (pto_verify_login), notification target, approver
--               routing key, and the tenure-ramp list in lib/theme.ts
--   job_title   PTO_TERRITORY_MANAGER_JOB_TITLES puts PH Territory Managers on
--               the tenure ramp by TITLE, so renaming a title can move
--               somebody between a 5-day and a 10-day plan
--   department  department-based approver routing matches on it
--   app_role    decides who can reach Account Management at all
--
-- The account row and the employee row are both updated, because they
-- duplicate name, email, job title and department and the app reads from both.
--
-- GUARDS: a malformed address; an address another account already holds, case
-- insensitively, since sign-in matches that way; and removing the last active
-- Admin, which would lock everybody out of account management for good.

drop function if exists pto_update_account_email(text, text);

create or replace function pto_update_account_details(
  p_account_id text,
  p_email text,
  p_full_name text,
  p_app_role pto_app_role,
  p_job_title text,
  p_department pto_department
)
returns table (account_id text, email text, notice text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_old pto_accounts;
  v_new_email text := lower(trim(p_email));
  v_name text := trim(p_full_name);
  v_title text := trim(p_job_title);
  v_routes integer := 0;
  v_admins integer;
  v_notes text[] := '{}';
begin
  select * into v_old from pto_accounts a where a.id = p_account_id;
  if v_old.id is null then
    raise exception 'No account found.';
  end if;

  if v_new_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That does not look like an email address.';
  end if;
  if exists (select 1 from pto_accounts a
              where lower(a.email) = v_new_email and a.id <> p_account_id) then
    raise exception 'Another account already uses %.', v_new_email;
  end if;
  if v_name = '' then
    raise exception 'Full name cannot be empty.';
  end if;

  -- Never leave the system without an administrator.
  if v_old.app_role = 'Admin' and p_app_role <> 'Admin' then
    select count(*) into v_admins from pto_accounts
     where app_role = 'Admin' and status = 'Active' and id <> p_account_id;
    if v_admins = 0 then
      raise exception 'This is the last active administrator - promote someone else first.';
    end if;
  end if;

  update pto_accounts
     set email = v_new_email, full_name = v_name, app_role = p_app_role,
         job_title = v_title, department = p_department
   where id = p_account_id;

  if v_old.employee_id is not null then
    update pto_employees
       set email = v_new_email, name = v_name, app_role = p_app_role,
           job_title = v_title, department = p_department
     where id = v_old.employee_id;
  end if;

  if lower(v_old.email) <> v_new_email then
    update pto_approver_routing set approver_email = v_new_email
     where lower(approver_email) = lower(v_old.email);
    get diagnostics v_routes = row_count;
    if v_routes > 0 then
      v_notes := array_append(v_notes, v_routes || ' approver routing rule(s) repointed.');
    end if;
    v_notes := array_append(v_notes, 'They sign in with the new address from now on.');
    v_notes := array_append(v_notes, 'If they are on the tenure ramp, PTO_GREEN_PLAN_EMAILS in lib/theme.ts must be updated and deployed too.');
  end if;

  if v_old.job_title is distinct from v_title then
    v_notes := array_append(v_notes, 'Job title changed from "' || v_old.job_title || '" to "' || v_title ||
      '". Territory Manager is a plan rule, so check their entitlement still looks right.');
  end if;
  if v_old.department is distinct from p_department then
    v_notes := array_append(v_notes, 'Department changed, which can change who approves their leave.');
  end if;
  if v_old.app_role is distinct from p_app_role then
    v_notes := array_append(v_notes, 'Application role is now ' || p_app_role || '.');
  end if;

  return query select p_account_id, v_new_email,
    coalesce(array_to_string(v_notes, ' '), '')::text;
end;
$$;

grant execute on function
  pto_update_account_details(text, text, text, pto_app_role, text, pto_department)
to anon, authenticated;

-- PostgREST caches the schema; without this it keeps answering
-- "Could not find the function ... in the schema cache".
notify pgrst, 'reload schema';
