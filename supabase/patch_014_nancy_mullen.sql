-- Adds Nancy Mullen, the last person named in Jason Welsford's PTO policy
-- email ("Put Nancy, Darlene, Janet, Chris, and Ryan at 20 days PTO in the
-- tracker"). She was in neither the PTO Tracker nor the Welsford PTO
-- spreadsheet -- only in the FSW Group directory. Confirmed by Eduardo
-- 2026-09-29.
--
-- Sources, so the next person does not have to re-find them:
--   name, email, hire date   FSW Group Team Directory, "Active Team" tab
--                            (Work Anniversary 3 Dec 2007, 18 years service)
--   job title                FSW Group role sheet -- "Director of Operations"
--   20 days                  the policy email
--
-- NO eligibility_date_override. US staff are eligible from their first day, so
-- eligibilityDateFor falls back to hire_date, and currentPtoYearStart rolls it
-- forward to the most recent anniversary -- 2025-12-03 today, turning over
-- 3 Dec 2026. The override column exists to correct a date the rules get
-- wrong; hers are right, so leaving it null is both correct and one less
-- number to keep in step. (The eight 'fixed' US rows that still carry one are
-- now carrying a redundant copy of their hire date -- see patch_011.)
--
-- NO LEAVE HISTORY. She is absent from the Welsford PTO sheet, so there is
-- nothing to import and she starts at 0 days used, 20 remaining. If she has
-- taken leave this cycle, file it rather than adjusting a balance -- the app
-- derives days used from the request log and stores no balance anywhere.
--
-- APP ROLE IS 'Employee', DELIBERATELY. Director of Operations is senior --
-- Will Berget is an Admin on a lower title -- but app_role is a permissions
-- decision and the email does not make one. Least privilege until someone
-- says otherwise; promoting her later is a one-line update on both rows.

insert into pto_employees (
  id, sheet_no, name, email, job_title, department, hire_date,
  annual_pto_allowance, app_role, active, pto_region, fixed_pto_days,
  pto_plan, eligibility_date_override
) values (
  'emp-us-11', 29, 'Nancy Mullen', 'nmullen@fswelsford.com',
  'Director of Operations', 'Operations', '2007-12-03',
  20, 'Employee', true, 'US', 20, 'fixed', null
)
on conflict (id) do nothing;

insert into pto_accounts (
  id, employee_id, email, full_name, app_role, job_title, department,
  hire_date, annual_pto_allowance, status, must_change_password
) values (
  'acct-us-11', 'emp-us-11', 'nmullen@fswelsford.com', 'Nancy Mullen',
  'Employee', 'Director of Operations', 'Operations', '2007-12-03',
  20, 'Active', true
)
on conflict (id) do nothing;

-- Temporary password, bcrypt-hashed by pto_set_password, with
-- must_change_password left true so she has to replace it at first sign-in.
-- Same convention and the same caveat as patch_008: weak by design and
-- short-lived. Chase her if she has not signed in.
select pto_set_password('acct-us-11', '1234', true)
where exists (select 1 from pto_accounts where id = 'acct-us-11');

-- ---------------------------------------------------------------------------
-- Check: 20 days, cycle starting 2025-12-03, 0 used.
--
--   select name, job_title, hire_date, pto_region, pto_plan, fixed_pto_days,
--          eligibility_date_override
--   from pto_employees where id = 'emp-us-11';
-- ---------------------------------------------------------------------------
