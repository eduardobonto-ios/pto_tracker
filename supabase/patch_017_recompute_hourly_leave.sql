-- Repairs leave that was recorded as 0 days because Custom Hours rounded to
-- the nearest HALF day. Reported by Will 2026-10-06: Ryan Driscoll filed a
-- genuine 1-hour personal leave for 2026-10-08, it was approved correctly as
-- personal and as 1 hour, and it went into the table as 0 days.
--
-- One hour is 0.125 of an 8-hour day. `Math.round((1/8) * 2) / 2` is 0, so
-- anything under 2 hours vanished and anything between 2 and 6 hours was
-- rounded to the wrong half. computeDays no longer rounds to halves (see
-- lib/pto.ts); this fixes the rows already written under the old rule.
--
-- SCOPED TO ROWS THAT ARE DEMONSTRABLY WRONG: Custom Hours only, with the
-- hours recorded, and only where the stored days disagree with those hours.
-- Legacy rows that happen to be correct are left alone, as is every Full Day
-- and Half Day row -- neither path ever rounded.
--
-- The 0.8-hour entries imported for Ryan by patch_009 already hold 0.1 days,
-- which is what this formula produces, so they do not move.

update pto_requests
set days = round((total_hours / 8.0)::numeric, 4)
where duration_type = 'Custom Hours'
  and total_hours is not null
  and total_hours > 0
  and days <> round((total_hours / 8.0)::numeric, 4);

-- ---------------------------------------------------------------------------
-- Check: no Custom Hours row left on 0 days, and the hours agree.
--
--   select id, employee_id, start_date, total_hours, days
--   from pto_requests where duration_type = 'Custom Hours' order by start_date;
-- ---------------------------------------------------------------------------
