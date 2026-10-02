-- Puts the four PH Territory Managers and Will Berget onto the tenure ramp.
-- Confirmed by Eduardo 2026-10-02.
--
-- This is the decision patch_011 left open. Jason Welsford's policy email
-- proposed putting the ValveMan Territory Managers on the same plan as Darwin
-- and Dan, "unless Gil disagrees", so patch_011 applied it only to the two the
-- email named. It now applies to all of them:
--
--   Cleon Kemp     PH  hired 2024-10-14   10 -> 11
--   Josh Kirk      PH  hired 2025-02-17   10 -> 11
--   Amr Shweiky    PH  hired 2025-02-17   10 -> 11
--   Dylan Lavern   PH  hired 2026-06-15   10 -> 10  (no anniversary yet)
--   Will Berget    US  hired 2026-08-19   10 -> 10  (no anniversary yet)
--
-- Will Berget is patch_016, which was written but never run against the live
-- database — he was still 'fixed' on 2026-10-02. The predicate below is the
-- same one, so running this supersedes it.
--
-- DAY-ONE ELIGIBILITY IS UNCHANGED. PTO_TERRITORY_MANAGER_JOB_TITLES drives
-- two separate rules, and only the entitlement one moved. Dropping the other
-- would have made Dylan Lavern wait until 2026-12-15 and read 0 days in the
-- meantime; Eduardo confirmed 2026-10-02 that he keeps it.
--
-- THE CODE DOES NOT DEPEND ON THIS PATCH for the Territory Managers.
-- `pto.ts#computeEntitlement` puts PH Territory Managers on the ramp by job
-- title, because account creation always writes 'fixed' and a new Territory
-- Manager would otherwise sit on the PH ramp at 5 days until someone
-- remembered this file. The update below exists so the stored column agrees
-- with the derived rule rather than contradicting it on screen.
--
-- Will Berget is the opposite case: he is US, his title is Operations Manager,
-- and nothing derives his plan. For him this patch IS the change — without it
-- he stays on a flat ten forever instead of reaching 11 on 2027-08-19.

-- The four PH Territory Managers, matched on title so a fifth is caught too.
update pto_employees
set pto_plan = 'tenure_ramp'
where pto_region = 'PH'
  and job_title = 'Territory Manager'
  and pto_plan <> 'tenure_ramp';

-- Will Berget, and any future US hire on ten days — patch_016's predicate.
update pto_employees
set pto_plan = 'tenure_ramp'
where pto_region = 'US'
  and fixed_pto_days = 10
  and pto_plan <> 'tenure_ramp';

-- ---------------------------------------------------------------------------
-- Check: seven people on the ramp — Darwin, Daniel, Will, and the four
-- Territory Managers. Everyone on 20 stays 'fixed'.
--
--   select name, pto_region, job_title, hire_date, fixed_pto_days, pto_plan
--   from pto_employees where pto_plan = 'tenure_ramp' order by hire_date;
-- ---------------------------------------------------------------------------
