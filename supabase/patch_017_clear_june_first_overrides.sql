-- Puts the four PH staff still pinned to 1 June back onto their own hire
-- anniversary. Confirmed by Eduardo 2026-10-02.
--
-- WHAT THEY WERE. Princes Aloha Gomez, Kazutomo Nishimura, April Lopez and
-- Jlydie Bagasala each carried eligibility_date_override = '2026-06-01' — the
-- last survivor of the old company-wide June 1 cohort, which the code dropped
-- when everything moved onto the hire date. The column outlived the rule, and
-- because an override replaces the reset anchor (see
-- `pto.ts#currentPtoYearStart`), those four alone still turned their PTO year
-- over on 1 June while the rest of the roster used their anniversary.
--
-- Mabel Rojas and Veam Chavez are deliberately NOT touched. Their overrides
-- are 2026-06-30 and 2026-06-23 — the same month and day as their hire dates,
-- so they already reset on their anniversary and clearing the column would
-- change only the eligibility date their row displays.
--
-- ENTITLEMENT DOES NOT MOVE. The ramp counts hire anniversaries and has never
-- consulted the override, so all four keep the number of days they have today
-- (5, 10, 7, 10 respectively). What moves is the cycle boundary:
--
--   Princes Aloha Gomez  1 Jun -> 8 Jun 2026, then 8 Dec every year
--                        (hired 2025-12-08; the first cycle floors at her
--                         2026-06-08 eligibility date, as it must)
--   Kazutomo Nishimura   1 Jun -> 26 Sep
--   April Lopez          1 Jun -> 8 Jan
--   Jlydie Bagasala      1 Jun -> 10 Jul
--
-- KNOWN CONSEQUENCE, and the reason this is worth reading before running:
-- moving a cycle boundary moves which requests fall inside it, so Days Used
-- and the accrued balance change for all four. April's cycle opens EARLIER
-- (8 Jan), so leave she took between January and May 2026 comes back into the
-- current year and her Days Used rises. Kazutomo's and Jlydie's open LATER,
-- so leave before those dates drops out and their Days Used falls. No request
-- is edited or deleted — the whole log stays visible, it simply counts
-- against a different year.
--
-- Clearing the column also returns each of them to the derived eligibility
-- date (hire + 6 months). All four passed that date long ago, so nobody
-- becomes ineligible.

update pto_employees
set eligibility_date_override = null
where pto_region = 'PH'
  and eligibility_date_override = '2026-06-01';

-- ---------------------------------------------------------------------------
-- Check: no PH employee is pinned to 1 June any more.
--
--   select name, hire_date, eligibility_date_override
--   from pto_employees where pto_region = 'PH' order by sheet_no;
-- ---------------------------------------------------------------------------
