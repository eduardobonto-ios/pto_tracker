-- Fix: pto_accounts.created_at was created as `timestamptz`, so PostgREST
-- returns full datetimes like "2026-08-13T00:00:00+00:00". The frontend's
-- date parser (src/lib/utils.ts#parseISODate) expects a plain "YYYY-MM-DD"
-- date, so it silently produced an Invalid Date, showing as "NaN/NaN/NaN" on
-- the Account Management page's Created column.
--
-- This narrows the column to `date` (it only ever represented a
-- provisioning date, never a precise instant) and updates the default to
-- match. Existing values are truncated to their date part, which is exactly
-- what they already were (all seeded at midnight UTC) — no data is lost.

alter table pto_accounts
  alter column created_at type date using created_at::date,
  alter column created_at set default current_date;
