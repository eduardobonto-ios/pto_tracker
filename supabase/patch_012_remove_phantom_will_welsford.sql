-- Removes the phantom "Will Welsford" employee (emp-15). Confirmed by Eduardo
-- 2026-09-29: there is no Will Welsford. There is Will Berget, and patch_008
-- already created him properly as emp-us-10.
--
-- HOW THE PHANTOM HAPPENED: seed.sql created emp-15 as "Will Welsford" with
-- jwelsford@fswelsford.com. patch_003 then repointed that address to
-- wberget@fswelsford.com, which is Will Berget's. patch_008 later inserted the
-- real Will Berget as emp-us-10 with the same address, leaving one person on
-- two employee records -- and pto_employees.email is UNIQUE, so the two rows
-- cannot both hold that address. Exactly which one does in production is not
-- knowable from this repo, so the block below inspects rather than assumes and
-- never keys off the email.
--
-- emp-us-10 is the record that survives: it carries the correct name, job
-- title, department, region, fixed allowance, eligibility override and hire
-- date, and it is the one patch_009's leave and patch_011's corrections
-- reference. emp-15 has none of that right.
--
-- ORDER MATTERS. pto_requests.employee_id is ON DELETE CASCADE, so deleting
-- emp-15 first would silently destroy any leave filed against him. No seed or
-- patch files any, but the app has been live, so the reassignment runs first
-- and reports what it moved. pto_credentials cascades off pto_accounts, so
-- deleting the account takes the password hash with it.
--
-- Safe to run twice: it returns quietly once emp-15 is gone.

do $$
declare
  v_exists  boolean;
  v_has_us10 boolean;
  v_moved   integer;
  v_name    text;
begin
  select exists (select 1 from pto_employees where id = 'emp-15') into v_exists;
  if not v_exists then
    raise notice 'patch_012: emp-15 is already gone -- nothing to do.';
    return;
  end if;

  select name into v_name from pto_employees where id = 'emp-15';

  select exists (select 1 from pto_employees where id = 'emp-us-10') into v_has_us10;
  if not v_has_us10 then
    -- If this fires, patch_008's ten-row INSERT aborted on the duplicate
    -- email and none of the US staff were created. Deleting emp-15 here would
    -- leave nobody holding that address at all, so stop instead.
    raise exception
      'patch_012: emp-us-10 (the real Will Berget) does not exist. patch_008 '
      'most likely aborted on the duplicate email. Delete emp-15 by hand, '
      're-run patch_008 and patch_009, then run patch_011 and this patch.';
  end if;

  -- Any leave filed against the duplicate belongs to the real person.
  update pto_requests set employee_id = 'emp-us-10' where employee_id = 'emp-15';
  get diagnostics v_moved = row_count;
  raise notice 'patch_012: moved % request(s) from emp-15 to emp-us-10.', v_moved;

  -- The sign-in account, and its credentials row by cascade.
  delete from pto_accounts where id = 'acct-15' or employee_id = 'emp-15';

  delete from pto_employees where id = 'emp-15';
  raise notice 'patch_012: removed the duplicate employee emp-15 (%).', v_name;
end $$;

-- ---------------------------------------------------------------------------
-- Check: one Will, on emp-us-10, holding the approver address.
--
--   select id, name, email, job_title, pto_region from pto_employees
--   where email = (select value from pto_settings where key = 'default_approver_1');
-- ---------------------------------------------------------------------------
