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
--   hire date alone, old rule    eligible=false  total=0   used=0    rem=0
--   hire date alone, TM rule     eligible=true   total=10  used=2.5  rem=7.5
--   the legacy sheet             eligible=true   total=10  used=2.0  rem=8.0
--
-- The 10 comes from the second Territory Manager rule -- the full entitlement
-- at once, no ramp from 5.
--
-- ---------------------------------------------------------------------------
-- TWO REQUESTS NEED A HUMAN, AND THIS PATCH DELIBERATELY LEAVES THEM ALONE:
--
--   PTO-2026-004  2026-03-02..03-04  3.0 days  Approved/Paid  "Anniversary trip"
--   PTO-2026-011  2026-06-05         1.0 day   Approved/Paid  "Family matter"
--
-- Both predate a 2026-06-15 hire date -- he cannot have taken leave before he
-- started -- and both came from the legacy PTO Log with Princes recorded as
-- reviewer. Most likely mis-attributed rows in that log.
--
-- Moving his hire date moves his cycle start to 2026-06-15, so these two fall
-- outside it and stop drawing down his balance. That is why Days Used drops
-- 6.5 -> 2.5. They stay in his request history, visible on his record. If they
-- are genuinely his, the hire date is wrong after all; if they belong to
-- someone else, delete or reassign them (compare patch_004, which removed
-- three requests filed before their owners were eligible).
--
-- The residual 0.5 against the sheet is PTO-2026-019 (2026-08-14, Half Day PM,
-- 0.5 Paid). The app counts it; the sheet's 2.0 does not appear to. Left as-is
-- -- the request record is the better authority.
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
