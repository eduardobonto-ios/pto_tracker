-- Dylan Lavern's hire date: 2025-06-15 -> 2026-06-15. Confirmed by Eduardo
-- 2026-09-30 against two independent sources, both saying 6/15/2026:
--   * FSW Group Team Directory, Work Anniversary "Jun 15, 2026" (0 years)
--   * the legacy "PTO Tracker 2026" sheet, Hire Date column
--
-- NO ELIGIBILITY OVERRIDE, and that is the point. An earlier draft of this
-- patch set one, because under the old rule a June 2026 hire date made him
-- ineligible until 2026-12-15 and dropped him to 0 days -- while the legacy
-- sheet showed him Eligible with 10. Eduardo then confirmed the actual rule:
-- Territory Managers are eligible on their hire date, in either region. That
-- now lives in code (`pto.ts#eligibilityDateFor`), so the hire date alone
-- produces the right answer and an override would only be a redundant copy of
-- it -- the same trap the US rows fell into (see patch_011).
--
-- The 10 comes from the second Territory Manager rule -- the full entitlement
-- at once, no ramp from 5. See the correction below for the reconciliation.
--
-- ---------------------------------------------------------------------------
-- CORRECTION, 2026-09-30. An earlier version of this comment claimed two of
-- Dylan's approved requests (PTO-2026-004, 3 days on 2026-03-02, and
-- PTO-2026-011, 1 day on 2026-06-05) predated this hire date and needed a
-- human decision. THEY DO NOT EXIST. Both were read out of seed.sql, but
-- patch_005 opens with `delete from pto_requests;` and re-imports the whole
-- table from the legacy PTO Log -- so seed.sql's request rows have not been
-- live since that patch ran. Those two ids now belong to different people
-- entirely (PTO-2026-004 is Josh Kirk's 2026-05-14 half day, PTO-2026-011 is
-- Justin Mar Tizon's 2026-06-18 unpaid half day), which is exactly why a
-- delete keyed on request id would have been dangerous.
--
-- Dylan's actual leave, all of it filed after this hire date:
--   PTO-2026-016  2026-06-19..06-22  2.0  Approved/Paid
--   PTO-2026-035  2026-08-28..08-31  2.0  Approved/Unpaid
--   PTO-2026-040  2026-09-01         0.5  Approved/Unpaid
--
-- So there is nothing to clean up, and the figures reconcile exactly rather
-- than approximately:
--
--   hire date alone, old rule    eligible=false  total=0   used=0    rem=0
--   hire date alone, TM rule     eligible=true   total=10  used=2.0  rem=8.0
--   the legacy sheet             eligible=true   total=10  used=2.0  rem=8.0
--
-- Confirmed against production by the Territory Manager reconciliation query.
-- ---------------------------------------------------------------------------

update pto_employees
set hire_date = '2026-06-15'
where id = 'emp-13';

-- pto_accounts keeps its own copy for the Account Management tab.
update pto_accounts
set hire_date = '2026-06-15'
where employee_id = 'emp-13';

-- ---------------------------------------------------------------------------
-- Check: hire_date 2026-06-15, eligibility_date_override null.
--   select name, hire_date, eligibility_date_override, job_title
--   from pto_employees where id = 'emp-13';
-- ---------------------------------------------------------------------------
