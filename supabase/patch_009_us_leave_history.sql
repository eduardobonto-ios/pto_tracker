-- Imports the US staff's recorded leave from the "Dates Used" column of the
-- Welsford PTO spreadsheet, so Days Used stops reading 0 for them. Confirmed
-- with Eduardo 2026-09-25.
--
-- The app derives days-used from this table rather than storing a figure, so
-- these rows ARE the number the PTO Tracker shows.
--
--   Chris Stolzer      10 entries
--   Darlene Driscoll   5 entries
--   Janet Hays         1 entries
--   Ryan Driscoll      4 entries
--   Dan York           5 entries
--   Darwin Mushrush    1 entries
--   Will Berget        1 entries
--
-- NOT IMPORTED: Russ Bailey, Jason Bauman and Steven Limanni. Their usage
-- reads "?" in the source with #VALUE! remaining, so there is nothing to
-- import. They stay at 0 used until someone supplies real figures.
--
-- Every itemised list reconciles exactly against the sheet's own Days Used
-- cell. Chris Stolzer is the one that looks wrong and is not: his entries sum
-- to 7.5, but his 2026-07-31 sick day falls before his 2026-08-11 cycle start,
-- so only 6.5 counts — which is what the sheet says. computeBalance filters on
-- startDate >= currentPtoYearStart, so the app reaches 6.5 the same way while
-- keeping the earlier day in his history.
--
-- Judgement calls, all cosmetic (these people hold ONE pooled allowance, so
-- the leave type does not affect any balance):
--   * "PTO" in the sheet maps to Vacation Leave. Darwin and Will are both
--     10/0/0 in the source, so all their days are vacation days anyway.
--   * 0.5-day entries become Half Day (AM); the sheet does not say which half.
--   * Ryan Driscoll's 0.1-day entries become Custom Hours (0.8h). Unusual, but
--     it is what the source records.
--   * request_date is the leave date itself — the sheet does not record when
--     anything was filed.

insert into pto_requests (
  id, employee_id, request_date, leave_type, start_date, end_date,
  duration_type, total_hours, days, status, pay_status, coverage, reason,
  notes, timeline
) values
  ('PTO-2026-048', 'emp-us-01', '2026-07-31', 'Sick Leave', '2026-07-31', '2026-07-31', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-048-t1','label','Submitted','at','2026-07-31T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-048-t2','label','Approved','at','2026-07-31T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-049', 'emp-us-01', '2026-08-18', 'Sick Leave', '2026-08-18', '2026-08-18', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-049-t1','label','Submitted','at','2026-08-18T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-049-t2','label','Approved','at','2026-08-18T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-050', 'emp-us-01', '2026-08-28', 'Vacation Leave', '2026-08-28', '2026-08-28', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-050-t1','label','Submitted','at','2026-08-28T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-050-t2','label','Approved','at','2026-08-28T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-051', 'emp-us-01', '2026-09-01', 'Sick Leave', '2026-09-01', '2026-09-01', 'Half Day (AM)', null, 0.5, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-051-t1','label','Submitted','at','2026-09-01T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-051-t2','label','Approved','at','2026-09-01T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-052', 'emp-us-01', '2026-09-14', 'Sick Leave', '2026-09-14', '2026-09-14', 'Half Day (AM)', null, 0.5, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-052-t1','label','Submitted','at','2026-09-14T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-052-t2','label','Approved','at','2026-09-14T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-053', 'emp-us-01', '2026-09-29', 'Sick Leave', '2026-09-29', '2026-09-29', 'Half Day (AM)', null, 0.5, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-053-t1','label','Submitted','at','2026-09-29T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-053-t2','label','Approved','at','2026-09-29T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-054', 'emp-us-01', '2026-10-13', 'Sick Leave', '2026-10-13', '2026-10-13', 'Half Day (AM)', null, 0.5, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-054-t1','label','Submitted','at','2026-10-13T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-054-t2','label','Approved','at','2026-10-13T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-055', 'emp-us-01', '2026-10-20', 'Sick Leave', '2026-10-20', '2026-10-20', 'Half Day (AM)', null, 0.5, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-055-t1','label','Submitted','at','2026-10-20T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-055-t2','label','Approved','at','2026-10-20T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-056', 'emp-us-01', '2026-11-30', 'Vacation Leave', '2026-11-30', '2026-11-30', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-056-t1','label','Submitted','at','2026-11-30T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-056-t2','label','Approved','at','2026-11-30T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-057', 'emp-us-01', '2026-12-01', 'Vacation Leave', '2026-12-01', '2026-12-01', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-057-t1','label','Submitted','at','2026-12-01T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-057-t2','label','Approved','at','2026-12-01T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-058', 'emp-us-02', '2026-08-30', 'Sick Leave', '2026-08-30', '2026-08-30', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-058-t1','label','Submitted','at','2026-08-30T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-058-t2','label','Approved','at','2026-08-30T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-059', 'emp-us-02', '2026-09-01', 'Sick Leave', '2026-09-01', '2026-09-01', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-059-t1','label','Submitted','at','2026-09-01T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-059-t2','label','Approved','at','2026-09-01T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-060', 'emp-us-02', '2026-09-02', 'Sick Leave', '2026-09-02', '2026-09-02', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-060-t1','label','Submitted','at','2026-09-02T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-060-t2','label','Approved','at','2026-09-02T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-061', 'emp-us-02', '2026-09-03', 'Personal Leave', '2026-09-03', '2026-09-03', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Personal Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-061-t1','label','Submitted','at','2026-09-03T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-061-t2','label','Approved','at','2026-09-03T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-062', 'emp-us-02', '2026-09-04', 'Personal Leave', '2026-09-04', '2026-09-04', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Personal Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-062-t1','label','Submitted','at','2026-09-04T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-062-t2','label','Approved','at','2026-09-04T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-063', 'emp-us-03', '2026-08-28', 'Sick Leave', '2026-08-28', '2026-08-28', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Sick Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-063-t1','label','Submitted','at','2026-08-28T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-063-t2','label','Approved','at','2026-08-28T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-064', 'emp-us-04', '2026-09-11', 'Personal Leave', '2026-09-11', '2026-09-11', 'Custom Hours', 0.8, 0.1, 'Approved', 'Paid', '', '', 'Personal Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-064-t1','label','Submitted','at','2026-09-11T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-064-t2','label','Approved','at','2026-09-11T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-065', 'emp-us-04', '2026-09-17', 'Personal Leave', '2026-09-17', '2026-09-17', 'Custom Hours', 0.8, 0.1, 'Approved', 'Paid', '', '', 'Personal Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-065-t1','label','Submitted','at','2026-09-17T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-065-t2','label','Approved','at','2026-09-17T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-066', 'emp-us-04', '2026-11-11', 'Vacation Leave', '2026-11-11', '2026-11-11', 'Half Day (AM)', null, 0.5, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-066-t1','label','Submitted','at','2026-11-11T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-066-t2','label','Approved','at','2026-11-11T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-067', 'emp-us-04', '2026-11-19', 'Personal Leave', '2026-11-19', '2026-11-19', 'Custom Hours', 0.8, 0.1, 'Approved', 'Paid', '', '', 'Personal Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-067-t1','label','Submitted','at','2026-11-19T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-067-t2','label','Approved','at','2026-11-19T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-068', 'emp-us-08', '2026-09-14', 'Vacation Leave', '2026-09-14', '2026-09-14', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-068-t1','label','Submitted','at','2026-09-14T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-068-t2','label','Approved','at','2026-09-14T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-069', 'emp-us-08', '2026-09-15', 'Vacation Leave', '2026-09-15', '2026-09-15', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-069-t1','label','Submitted','at','2026-09-15T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-069-t2','label','Approved','at','2026-09-15T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-070', 'emp-us-08', '2026-09-16', 'Vacation Leave', '2026-09-16', '2026-09-16', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-070-t1','label','Submitted','at','2026-09-16T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-070-t2','label','Approved','at','2026-09-16T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-071', 'emp-us-08', '2026-09-17', 'Vacation Leave', '2026-09-17', '2026-09-17', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-071-t1','label','Submitted','at','2026-09-17T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-071-t2','label','Approved','at','2026-09-17T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-072', 'emp-us-08', '2026-09-18', 'Vacation Leave', '2026-09-18', '2026-09-18', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-072-t1','label','Submitted','at','2026-09-18T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-072-t2','label','Approved','at','2026-09-18T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-073', 'emp-us-09', '2026-09-18', 'Vacation Leave', '2026-09-18', '2026-09-18', 'Full Day', null, 1.0, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-073-t1','label','Submitted','at','2026-09-18T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-073-t2','label','Approved','at','2026-09-18T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.'))),
  ('PTO-2026-074', 'emp-us-10', '2026-09-03', 'Vacation Leave', '2026-09-03', '2026-09-03', 'Half Day (AM)', null, 0.5, 'Approved', 'Paid', '', '', 'Vacation Leave',
   jsonb_build_array(
     jsonb_build_object('id','PTO-2026-074-t1','label','Submitted','at','2026-09-03T09:00:00','actor','Employee','note','Imported from the US PTO spreadsheet.'),
     jsonb_build_object('id','PTO-2026-074-t2','label','Approved','at','2026-09-03T09:00:00','actor','Management','note','Imported from the US PTO spreadsheet.')))
on conflict (id) do nothing;

-- patch_007 left the sequence at 47; step it past the ids used above so the
-- next request filed in the app does not collide.
select setval('pto_request_seq', 74, true);
