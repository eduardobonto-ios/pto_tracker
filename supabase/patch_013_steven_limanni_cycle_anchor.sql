-- Steven Limanni's PTO year is starting eight days late.
--
-- His eligibility_date_override reads 2009-12-09, which matches neither
-- patch_008's literal (2025-12-01) nor his real hire date (2009-12-01). The
-- Welsford PTO sheet puts his Time Period Beginning at 12/1, so the 09 is a
-- typo. currentPtoYearStart rolls the anchor forward to its most recent
-- anniversary, so 2009-12-09 currently resolves to 2025-12-09.
--
-- Anchoring on his real hire date instead matches how the other nine US rows
-- are anchored and resolves to 2025-12-01, which is what the sheet expects.
--
-- NO BALANCE MOVES -- he is at 0 days used either way. This only corrects when
-- his year resets, which matters soon: his cycle turns over 1 Dec 2026.
--
-- Guarded on the current value, so it is a no-op if the date has since been
-- corrected by hand.

update pto_employees
set eligibility_date_override = '2009-12-01'
where id = 'emp-us-07'
  and eligibility_date_override = date '2009-12-09';

-- ---------------------------------------------------------------------------
-- Check: expect 2009-12-01.
--   select name, hire_date, eligibility_date_override
--   from pto_employees where id = 'emp-us-07';
-- ---------------------------------------------------------------------------
