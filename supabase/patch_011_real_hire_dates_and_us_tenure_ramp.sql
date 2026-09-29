-- Real US hire dates, Chris Stolzer down to 20 days, and a tenure ramp for
-- Darwin Mushrush and Daniel York. From Jason Welsford's PTO policy email,
-- with the dates taken from the FSW Group Team Directory (Google Sheet,
-- "Active Team" tab), confirmed by Eduardo 2026-09-29.
--
-- ---------------------------------------------------------------------------
-- 1. HIRE DATES. patch_008 warned in writing that the US hire dates were
--    approximations: the source sheet had no hire-date column, so it used
--    "Time Period Beginning", which is the CURRENT cycle's start. The
--    directory has the real "Work Anniversary" values, and the warning was
--    exactly right -- correct month and day, wrong year. Eight of ten were
--    wrong, some by decades (Russ Bailey reads 2026; he started in 1990).
--
--    THIS CHANGES NOBODY'S BALANCE. For US staff nothing derives from
--    hire_date: eligibility_date_override drives both eligibility and the
--    annual reset, and entitlement is fixed_pto_days. The overrides are left
--    untouched, so every cycle start and every current balance is preserved.
--    Hire date only becomes load-bearing for the two employees moved onto the
--    tenure ramp in section 3.
--
-- 2. CHRIS STOLZER 22 -> 20. His 22 is 15 vacation + 5 sick + 2 personal from
--    the Welsford PTO sheet. The policy email puts him at 20 with the rest of
--    that group. He is the only person in the email whose entitlement falls.
--
-- 3. THE TENURE RAMP. "Put Darwin and Dan at 10 days, increase them 1 day per
--    year until they reach 5 years service. Their cap will be 15 days PTO."
--
--    Those two clauses contradict each other for Daniel York, who already has
--    a year of service. Starting him at 10 today would put him at 14 -- not
--    15 -- when he hits five years in Jan 2030, so the stated cap would never
--    land. The ramp is therefore keyed to service rather than to today:
--
--        entitlement = 10 + 1 * (completed years since hire), capped at 15
--
--    which gives Darwin 10 (hired Jan 2026, 0 years) and Daniel 11 (hired
--    Jan 2025, 1 year), and puts BOTH at exactly 15 on their fifth
--    anniversary. See PTO_TENURE_RAMP_* in src/lib/theme.ts. Daniel gaining a
--    day today is the visible consequence; flag it if that is not intended.
--
--    The ramp counts anniversaries of the HIRE date, because "5 years
--    service" means service. The annual reset still keys off
--    eligibility_date_override, which for these two is their cycle start from
--    the Welsford sheet. Those two dates are now genuinely different things
--    and are deliberately not unified.
--
--    Jason Welsford also proposed putting ValveMan Territory Managers on this
--    same plan. That is explicitly "unless Gil disagrees" and is NOT applied
--    here -- PH Territory Managers still take PTO_MAX_ENTITLEMENT_DAYS
--    immediately, as confirmed 2026-09-25. Moving them later is a matter of
--    setting pto_plan on four rows.
-- ---------------------------------------------------------------------------

-- Which entitlement plan a US employee is on. 'fixed' is the existing
-- behaviour: fixed_pto_days, never moves with tenure. 'tenure_ramp' derives it
-- from hire_date instead and ignores fixed_pto_days entirely.
--
-- Ignored for PH staff, whose entitlement computeEntitlement derives from the
-- eligibility ramp and the Territory Manager rule.
alter table pto_employees
  add column if not exists pto_plan text not null default 'fixed'
    check (pto_plan in ('fixed', 'tenure_ramp'));

comment on column pto_employees.pto_plan is
  'US only: ''fixed'' takes fixed_pto_days; ''tenure_ramp'' derives 10 + 1/year from hire_date, capped at 15, and ignores fixed_pto_days.';

-- ---------------------------------------------------------------------------
-- Real hire dates, from the directory's Work Anniversary column.
-- eligibility_date_override is deliberately NOT touched.
-- ---------------------------------------------------------------------------

update pto_employees set hire_date = '2008-08-11' where id = 'emp-us-01'; -- Chris Stolzer,    18 yrs (was 2026-08-11)
update pto_employees set hire_date = '2008-08-18' where id = 'emp-us-02'; -- Darlene Driscoll, 18 yrs (was 2026-08-18)
update pto_employees set hire_date = '2021-08-09' where id = 'emp-us-03'; -- Janet Hays,        5 yrs (was 2026-08-09)
update pto_employees set hire_date = '2011-09-06' where id = 'emp-us-04'; -- Ryan Driscoll,    15 yrs (was 2026-09-06)
update pto_employees set hire_date = '1990-06-13' where id = 'emp-us-05'; -- Russ Bailey,      36 yrs (was 2026-06-13)
update pto_employees set hire_date = '2006-07-15' where id = 'emp-us-06'; -- Jason Bauman,     20 yrs (was 2026-07-15)
update pto_employees set hire_date = '2009-12-01' where id = 'emp-us-07'; -- Steven Limanni,   16 yrs (was 2025-12-01)
update pto_employees set hire_date = '2025-01-06' where id = 'emp-us-08'; -- Daniel York,       1 yr  (was 2026-01-06)
-- emp-us-09 Darwin Mushrush (2026-01-12) and emp-us-10 Will Berget
-- (2026-08-19) were already correct.

-- pto_accounts carries its own copy of hire_date for the Account Management
-- tab, so it has to move with it or the two screens disagree.
update pto_accounts a
set hire_date = e.hire_date
from pto_employees e
where a.employee_id = e.id
  and e.id like 'emp-us-%'
  and a.hire_date <> e.hire_date;

-- ---------------------------------------------------------------------------
-- Chris Stolzer: 22 -> 20.
-- ---------------------------------------------------------------------------

update pto_employees
set fixed_pto_days = 20, annual_pto_allowance = 20
where id = 'emp-us-01';

update pto_accounts
set annual_pto_allowance = 20
where employee_id = 'emp-us-01';

-- ---------------------------------------------------------------------------
-- Darwin Mushrush and Daniel York onto the tenure ramp.
--
-- fixed_pto_days is left in place rather than nulled. Nothing reads it for a
-- tenure_ramp employee (see the test "tenure ramp ignores a stale
-- fixedPtoDays"), and leaving it means flipping pto_plan back to 'fixed' can
-- never silently resolve to 0.
-- ---------------------------------------------------------------------------

update pto_employees
set pto_plan = 'tenure_ramp'
where id in ('emp-us-08', 'emp-us-09');

-- ---------------------------------------------------------------------------
-- Check: Darwin 10, Daniel 11, everyone else unmoved except Chris at 20.
--
--   select e.name, e.hire_date, e.pto_plan, e.fixed_pto_days,
--          e.eligibility_date_override
--   from pto_employees e where e.id like 'emp-us-%' order by e.sheet_no;
-- ---------------------------------------------------------------------------
