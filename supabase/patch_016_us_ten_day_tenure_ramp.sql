-- Puts every US employee on ten initial days onto the tenure ramp, rather
-- than only the two the policy email happened to name. Confirmed by Eduardo
-- 2026-10-02.
--
-- The rule as stated is general: US staff starting at ten days gain one a year
-- on their hire date, capped at fifteen. patch_011 applied it to Darwin
-- Mushrush and Daniel York because the email named them, which left Will
-- Berget -- also US, also ten days -- flat at ten forever for no reason other
-- than not being mentioned. The 20-day group is explicitly excluded: they are
-- "as is", no yearly increase, and they stay 'fixed'.
--
-- MATCHED ON THE FIGURE, NOT ON NAMES, so the rule holds for anyone added
-- later on ten days without someone remembering to come back here. Today it
-- catches exactly three rows and two of them are already set, so Will Berget
-- is the only change.
--
-- NOTHING MOVES TODAY. Will was hired 2026-08-19 and has no completed year of
-- service, so the ramp gives 10 + 1 x 0 = 10 -- identical to the fixed figure
-- he already had. It first takes effect on his 2027-08-19 anniversary, when
-- he goes to 11.
--
-- Note for whoever adds the next US employee: pto_plan defaults to 'fixed',
-- and the app's account-creation path always writes 'fixed'. A new US hire on
-- ten days needs this set, either by re-running this patch or by hand.

update pto_employees
set pto_plan = 'tenure_ramp'
where pto_region = 'US'
  and fixed_pto_days = 10
  and pto_plan <> 'tenure_ramp';

-- ---------------------------------------------------------------------------
-- Check: Darwin, Daniel and Will on 'tenure_ramp'; everyone on 20 'fixed'.
--
--   select name, hire_date, fixed_pto_days, pto_plan
--   from pto_employees where pto_region = 'US' order by fixed_pto_days, name;
-- ---------------------------------------------------------------------------
