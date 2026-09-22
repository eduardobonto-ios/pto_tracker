-- Two approved leave entries for Victor Joshua Estacio (emp-10) that were added
-- to the legacy 'PTO Log' sheet AFTER patch_005 imported it, so they never
-- reached Supabase and don't appear on either calendar. Sheet rows 48 and 49,
-- confirmed with Eduardo 2026-09-23.
--
-- Follows patch_005's conventions exactly:
--   * coverage is stored verbatim from the sheet. 'myself' looks wrong but the
--     sheet is full of such values — 'Me', 'ME', 'Myself', 'myslef', 'josh' are
--     all already in the table. Normalising these is a separate decision.
--   * reason is the part after the em-dash in the sheet's Notes column; notes
--     keeps the sheet's full 'Leave Type — reason' string.
--   * reviewed_by / reviewed_at stay null: the sheet does not record who
--     approved or when, and inventing it would be worse than leaving it empty.
--   * timeline is a minimal Submitted+Approved pair stamped at the sheet's own
--     Request Date, since the real timestamps aren't recorded either.
--
-- Safe to re-run: inserts are keyed on id, and setval is absolute.

insert into pto_requests (
  id, employee_id, request_date, leave_type, start_date, end_date,
  duration_type, days, status, pay_status, coverage, reason, notes,
  timeline
) values
('PTO-2026-046', 'emp-10', '2026-09-21', 'Unpaid Leave', '2026-09-25', '2026-09-25',
 'Full Day', 1.0, 'Approved', 'Unpaid', 'myself', 'family event',
 'Unpaid Leave — family event',
 jsonb_build_array(
   jsonb_build_object('id','PTO-2026-046-t1','label','Submitted','at','2026-09-21T09:00:00','actor','Employee','note','Added from the PTO Log sheet after the initial import.'),
   jsonb_build_object('id','PTO-2026-046-t2','label','Approved','at','2026-09-21T09:00:00','actor','Management','note','Added from the PTO Log sheet after the initial import.')
 )),
('PTO-2026-047', 'emp-10', '2026-09-21', 'Unpaid Leave', '2026-10-30', '2026-10-30',
 'Full Day', 1.0, 'Approved', 'Unpaid', 'myself', 'Family event',
 'Unpaid Leave — Family event',
 jsonb_build_array(
   jsonb_build_object('id','PTO-2026-047-t1','label','Submitted','at','2026-09-21T09:00:00','actor','Employee','note','Added from the PTO Log sheet after the initial import.'),
   jsonb_build_object('id','PTO-2026-047-t2','label','Approved','at','2026-09-21T09:00:00','actor','Management','note','Added from the PTO Log sheet after the initial import.')
 ))
on conflict (id) do nothing;

-- patch_005 left pto_request_seq at 45. Without this, the next request filed
-- through the app would be handed 'PTO-2026-046' and collide with the row
-- inserted above.
select setval('pto_request_seq', 47, true);
