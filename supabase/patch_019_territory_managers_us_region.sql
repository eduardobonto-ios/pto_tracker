-- Move the four Territory Managers to the US region, per the FSW Group Team
-- Directory, which Eduardo confirmed 2026-10-13 is the source of truth:
--
--   https://docs.google.com/spreadsheets/d/1tKAWrF358quaobKko4b6LU3L1X1mBLjNTW4Ibyje_P8
--
-- Its "U.S Side" column reads Yes for Amr Shweiky, Cleon Kemp, Dylan Lavern and
-- Josh Kirk, while the tracker had them as PH. They were the ONLY four
-- disagreements between the directory and the roster; every other person
-- already matched on both sides.
--
-- ENTITLEMENT AND ELIGIBILITY ARE UNCHANGED BY THIS PATCH. Both before and
-- after, all four resolve to the same two calls:
--
--   eligibility   before: PH + Territory Manager title -> hire date (day one)
--                 after:  US                           -> hire date (day one)
--   entitlement   before: PH, matched the job-title arm -> tenureRampDays(hire)
--                 after:  US + ptoPlan 'tenure_ramp'    -> tenureRampDays(hire)
--
-- Same function, same argument, so every number on every screen is identical
-- the moment this lands. The annual reset keys off eligibility, which does not
-- move either, so no leave shifts between cycles.
--
-- SETTING pto_plan IS NOT OPTIONAL. computeEntitlement tests the region BEFORE
-- it tests the Territory Manager job title:
--
--     if (employee.ptoRegion === 'US') {
--       if (employee.ptoPlan === 'tenure_ramp') return tenureRampDays(...);
--       return employee.fixedPtoDays ?? 0;        // <-- would catch these four
--     }
--
-- Their fixed_pto_days is NULL, so moving the region alone would silently drop
-- all four to ZERO days. The two columns must change together.
--
-- fixed_pto_days is set to 10 only for consistency with the three US staff
-- already on the ramp (Dan York, Darwin Mushrush, Will Berget). tenureRampDays
-- ignores the column outright; it matters only as the fallback if someone later
-- switches the plan back to 'fixed'.

begin;

update pto_employees
   set pto_region     = 'US',
       pto_plan       = 'tenure_ramp',
       fixed_pto_days = 10
 where id in ('emp-11', 'emp-12', 'emp-13', 'emp-14')
   and job_title = 'Territory Manager';

-- Expect exactly 4 rows. Anything else means the roster moved under us.
do $$
declare n integer;
begin
  select count(*) into n from pto_employees
   where id in ('emp-11','emp-12','emp-13','emp-14')
     and pto_region = 'US' and pto_plan = 'tenure_ramp';
  if n <> 4 then
    raise exception 'expected 4 Territory Managers on the US tenure ramp, found %', n;
  end if;
end
$$;

commit;

-- Verification: all 15 US-side people the directory lists, and the plan each is on.
--   select name, pto_region, pto_plan, fixed_pto_days, hire_date
--     from pto_employees where pto_region = 'US' order by name;
