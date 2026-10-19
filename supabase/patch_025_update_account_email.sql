-- Let an administrator change a person's email address.
--
-- The address is not just a contact field. It is:
--   * the LOGIN identifier    pto_verify_login matches pto_accounts.email
--   * the NOTIFICATION target pto_employees.email receives the reviewed mail
--   * the APPROVER key        pto_approver_routing.approver_email
--   * the PLAN key            PTO_GREEN_PLAN_EMAILS in lib/theme.ts
--
-- So a change has to move all of them together, or the person keeps their old
-- login, stops getting mail, or silently drops off the tenure ramp. The two
-- columns are in sync today for all 27 and this keeps them that way.
--
-- ROUTING FOLLOWS THE PERSON. If the old address appears in
-- pto_approver_routing, those rows are repointed in the same transaction --
-- otherwise every employee they approve for would route to a dead address.
--
-- THE GREEN LIST CANNOT BE UPDATED FROM HERE. It lives in the frontend bundle
-- (lib/theme.ts), so changing a green employee's address needs a code change
-- and a deploy as well. greenPlanMismatches() reports the drift at load, and
-- the notice returned by this function warns the admin at the point of change.

create or replace function pto_update_account_email(
  p_account_id text,
  p_new_email text
)
returns table (account_id text, email text, notice text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_old text;
  v_emp text;
  v_new text := lower(trim(p_new_email));
  v_routes integer := 0;
  v_notice text := '';
begin
  if v_new !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That does not look like an email address.';
  end if;

  select a.email, a.employee_id into v_old, v_emp
    from pto_accounts a where a.id = p_account_id;
  if v_old is null then
    raise exception 'No account found.';
  end if;

  if lower(v_old) = v_new then
    return query select p_account_id, v_old, 'No change - that is already the address.'::text;
    return;
  end if;

  -- Case-insensitive, because login matches that way: two accounts differing
  -- only by case would both answer to the same sign-in.
  if exists (select 1 from pto_accounts a
              where lower(a.email) = v_new and a.id <> p_account_id) then
    raise exception 'Another account already uses %.', v_new;
  end if;

  update pto_accounts set email = v_new where id = p_account_id;
  if v_emp is not null then
    update pto_employees set email = v_new where id = v_emp;
  end if;

  update pto_approver_routing set approver_email = v_new
   where lower(approver_email) = lower(v_old);
  get diagnostics v_routes = row_count;

  if v_routes > 0 then
    v_notice := v_routes || ' approver routing rule(s) repointed. ';
  end if;
  v_notice := v_notice ||
    'They sign in with the new address from now on. If they are on the tenure ' ||
    'ramp, PTO_GREEN_PLAN_EMAILS in lib/theme.ts must be updated and deployed too.';

  return query select p_account_id, v_new, v_notice;
end;
$$;

grant execute on function pto_update_account_email(text, text) to anon, authenticated;
