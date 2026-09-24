-- Adds the PH/US split to the entitlement rules, and imports the ten US-based
-- Welsford staff with accounts. Confirmed with Eduardo 2026-09-25.
--
-- WHY A REGION COLUMN AND NOT THE EMAIL DOMAIN: Veam Chavez and Sharlyn
-- Bacalso are both @fswelsford.com but are PH-based and ramp like everyone
-- else. The domain does not identify a US employee, so the region is explicit.
--
-- The rules this column drives (see src/lib/pto.ts):
--                    PH                          US
--   Eligible on      hire date + 6 months        hire date (day one)
--   Entitlement      5, +2 per year, cap 10      fixed_pto_days, never grows
--   Year resets on   eligibility anniversary     eligibility anniversary
--   Override         eligibility_date_override wins for both

alter table pto_employees
  add column if not exists pto_region text not null default 'PH'
    check (pto_region in ('PH', 'US')),
  -- Null for PH, where entitlement is computed. Required for US, where it is
  -- a negotiated per-person figure that never changes with tenure.
  add column if not exists fixed_pto_days numeric,
  -- Item 1: an admin may set an eligibility date by hand. Null means derive it
  -- from the hire date and region, which is the normal case.
  add column if not exists eligibility_date_override date;

comment on column pto_employees.fixed_pto_days is
  'US only: total annual days (vacation + sick + personal), fixed regardless of tenure.';

-- ---------------------------------------------------------------------------
-- The ten US employees.
--
-- HIRE DATES ARE APPROXIMATE. The source spreadsheet has no hire-date column —
-- only "Time Period Beginning", which is the CURRENT leave cycle's start, i.e.
-- the most recent anniversary. Using it as the hire date produces correct
-- behaviour (entitlement is fixed, and the reset keys off this date either
-- way), but someone hired years earlier will display a hire date later than
-- their real one. Correct them in the PTO Tracker once known; nothing
-- recalculates when you do, because nothing derives from it for US staff.
--
-- eligibility_date_override is set to the same date and IS load-bearing: it is
-- what the annual reset keys off.
--
-- Job titles and emails come from the FSW Group directory sheet. Will Berget
-- is absent from that sheet; 'Administrator' is carried over from the original
-- seed data and should be confirmed.
-- ---------------------------------------------------------------------------

insert into pto_employees (
  id, sheet_no, name, email, job_title, department, hire_date,
  annual_pto_allowance, app_role, active, pto_region, fixed_pto_days,
  eligibility_date_override
) values
  ('emp-us-01', 19, 'Chris Stolzer',    'cstolzer@fswelsford.com',  'Inside Sales',          'Sales',          '2026-08-11', 22, 'Employee', true, 'US', 22, '2026-08-11'),
  ('emp-us-02', 20, 'Darlene Driscoll', 'ddriscoll@fswelsford.com', 'Office Admin',          'Administration', '2026-08-18', 20, 'Employee', true, 'US', 20, '2026-08-18'),
  ('emp-us-03', 21, 'Janet Hays',       'jhays@fswelsford.com',     'Warehouse Manager',     'Operations',     '2026-08-09', 20, 'Employee', true, 'US', 20, '2026-08-09'),
  ('emp-us-04', 22, 'Ryan Driscoll',    'rdriscoll@fswelsford.com', 'Inside Sales',          'Sales',          '2026-09-06', 20, 'Employee', true, 'US', 20, '2026-09-06'),
  ('emp-us-05', 23, 'Russ Bailey',      'rbailey@fswelsford.com',   'Outside Sales Engineer','Sales',          '2026-06-13', 20, 'Employee', true, 'US', 20, '2026-06-13'),
  ('emp-us-06', 24, 'Jason Bauman',     'jbauman@fswelsford.com',   'Outside Sales Engineer','Sales',          '2026-07-15', 20, 'Employee', true, 'US', 20, '2026-07-15'),
  ('emp-us-07', 25, 'Steven Limanni',   'slimanni@fswelsford.com',  'Outside Sales Engineer','Sales',          '2025-12-01', 20, 'Employee', true, 'US', 20, '2025-12-01'),
  ('emp-us-08', 26, 'Dan York',         'dyork@fswelsford.com',     'Outside Sales Engineer','Sales',          '2026-01-06', 10, 'Employee', true, 'US', 10, '2026-01-06'),
  ('emp-us-09', 27, 'Darwin Mushrush',  'DMushrush@fswelsford.com', 'Outside Sales Engineer','Sales',          '2026-01-12', 10, 'Employee', true, 'US', 10, '2026-01-12'),
  ('emp-us-10', 28, 'Will Berget',      'wberget@fswelsford.com',   'Administrator',         'Management',     '2026-08-19', 10, 'Admin',    true, 'US', 10, '2026-08-19')
on conflict (id) do nothing;

-- Accounts, so they appear in every tab and can sign in.
insert into pto_accounts (
  id, employee_id, email, full_name, app_role, job_title, department,
  hire_date, annual_pto_allowance, status, must_change_password
)
select
  replace(e.id, 'emp-', 'acct-'), e.id, e.email, e.name, e.app_role,
  e.job_title, e.department, e.hire_date, e.annual_pto_allowance,
  'Active', true
from pto_employees e
where e.id like 'emp-us-%'
on conflict (id) do nothing;

-- Temporary password '1234' for all ten, bcrypt-hashed by pto_set_password.
-- must_change_password stays true, so each is forced to replace it at first
-- sign-in. Weak by design and short-lived — chase anyone who has not signed in.
select pto_set_password(id, '1234', true)
from pto_accounts
where id like 'acct-us-%';
