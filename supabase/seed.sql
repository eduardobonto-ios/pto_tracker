-- Valveman PTO Tracker — seed data
--
-- Run this after schema.sql. Transcribed 1:1 from src/data/employees.ts,
-- src/data/accounts.ts, src/data/requests.ts, src/lib/theme.ts as they stood
-- at migration time — ids match exactly so nothing needs remapping.

-- ---------------------------------------------------------------------------
-- pto_employees (from src/data/employees.ts)
-- ---------------------------------------------------------------------------

insert into pto_employees (id, sheet_no, name, email, job_title, department, hire_date, annual_pto_allowance, app_role, active) values
('emp-01', 1, 'Princes Aloha Gomez', 'princes@valveman.com', 'Team Manager', 'Management', '2025-12-08', 5, 'Admin', true),
('emp-02', 2, 'Kazutomo Nishimura', 'kazu@valveman.com', 'Executive Assistant', 'Administration', '2022-09-26', 5, 'Employee', true),
('emp-03', 3, 'April Lopez', 'april@valveman.com', 'Executive Assistant', 'Administration', '2025-01-08', 5, 'Admin', true),
('emp-04', 4, 'Jlydie Bagasala', 'product@valveman.com', 'Vendor Success Specialist', 'Operations', '2023-07-10', 5, 'Employee', true),
('emp-05', 5, 'Mabel Rojas', 'support2@valveman.com', 'Order Processing Lead', 'Operations', '2025-06-30', 5, 'Employee', true),
('emp-06', 6, 'Veam Chavez', 'vchavez@fswelsford.com', 'Technical Admin Assistant', 'Technical', '2025-06-23', 5, 'Employee', true),
('emp-07', 7, 'Sharlyn Bacalso', 'sharlyn@valveman.com', 'Invoicing Specialist', 'Finance', '2026-01-26', 5, 'Employee', true),
('emp-08', 8, 'Elysabel Del Rosario', 'elysabel@valveman.com', 'Executive Assistant', 'Administration', '2026-04-20', 5, 'Employee', true),
('emp-09', 9, 'Justin Mar Tizon', 'justine@valveman.com', 'Order Processing Specialist', 'Operations', '2026-04-13', 5, 'Employee', true),
('emp-10', 10, 'Victor Joshua Estacio', 'joshua@valveman.com', 'Applications Engineer', 'Sales / Operations', '2026-05-26', 5, 'Employee', true),
('emp-11', 11, 'Cleon Kemp', 'cleon@valveman.com', 'Territory Manager', 'Sales', '2024-10-14', 10, 'Employee', true),
('emp-12', 12, 'Josh Kirk', 'josh@valveman.com', 'Territory Manager', 'Sales', '2025-02-17', 10, 'Employee', true),
('emp-13', 13, 'Dylan Lavern', 'dylan@valveman.com', 'Territory Manager', 'Sales', '2025-06-15', 10, 'Employee', true),
('emp-14', 14, 'Amr Shweiky', 'amr@valveman.com', 'Territory Manager', 'Sales', '2025-02-17', 10, 'Employee', true),
('emp-15', 15, 'Will Welsford', 'wberget@fswelsford.com', 'Administrator', 'Management', '2023-01-01', 10, 'Admin', true),
('emp-16', 16, 'Gilbert', 'gilbert@valveman.com', 'Administrator', 'Management', '2023-01-01', 10, 'Admin', true);

-- ---------------------------------------------------------------------------
-- pto_accounts (from src/data/accounts.ts)
-- ---------------------------------------------------------------------------

insert into pto_accounts (id, employee_id, email, full_name, app_role, job_title, department, hire_date, annual_pto_allowance, status, created_at, must_change_password) values
('acct-01', 'emp-01', 'princes@valveman.com', 'Princes Aloha Gomez', 'Admin', 'Team Manager', 'Management', '2025-12-08', 5, 'Active', '2026-08-13', false),
('acct-02', 'emp-02', 'kazu@valveman.com', 'Kazutomo Nishimura', 'Employee', 'Executive Assistant', 'Administration', '2022-09-26', 5, 'Active', '2026-08-13', false),
('acct-03', 'emp-03', 'april@valveman.com', 'April Lopez', 'Admin', 'Executive Assistant', 'Administration', '2025-01-08', 5, 'Active', '2026-08-13', false),
('acct-04', 'emp-04', 'product@valveman.com', 'Jlydie Bagasala', 'Employee', 'Vendor Success Specialist', 'Operations', '2023-07-10', 5, 'Active', '2026-08-13', false),
('acct-05', 'emp-05', 'support2@valveman.com', 'Mabel Rojas', 'Employee', 'Order Processing Lead', 'Operations', '2025-06-30', 5, 'Active', '2026-08-15', false),
('acct-06', 'emp-06', 'vchavez@fswelsford.com', 'Veam Chavez', 'Employee', 'Technical Admin Assistant', 'Technical', '2025-06-23', 5, 'Active', '2026-08-15', false),
('acct-07', 'emp-07', 'sharlyn@valveman.com', 'Sharlyn Bacalso', 'Employee', 'Invoicing Specialist', 'Finance', '2026-01-26', 5, 'Active', '2026-08-15', false),
('acct-08', 'emp-08', 'elysabel@valveman.com', 'Elysabel Del Rosario', 'Employee', 'Executive Assistant', 'Administration', '2026-04-20', 5, 'Active', '2026-08-18', false),
('acct-09', 'emp-09', 'justine@valveman.com', 'Justin Mar Tizon', 'Employee', 'Order Processing Specialist', 'Operations', '2026-04-13', 5, 'Active', '2026-08-18', false),
('acct-10', 'emp-10', 'joshua@valveman.com', 'Victor Joshua Estacio', 'Employee', 'Applications Engineer', 'Sales / Operations', '2026-05-26', 5, 'Active', '2026-08-18', true),
('acct-11', 'emp-11', 'cleon@valveman.com', 'Cleon Kemp', 'Employee', 'Territory Manager', 'Sales', '2024-10-14', 10, 'Active', '2026-08-20', false),
('acct-12', 'emp-12', 'josh@valveman.com', 'Josh Kirk', 'Employee', 'Territory Manager', 'Sales', '2025-02-17', 10, 'Active', '2026-08-20', false),
('acct-13', 'emp-13', 'dylan@valveman.com', 'Dylan Lavern', 'Employee', 'Territory Manager', 'Sales', '2025-06-15', 10, 'Active', '2026-08-20', false),
('acct-14', 'emp-14', 'amr@valveman.com', 'Amr Shweiky', 'Employee', 'Territory Manager', 'Sales', '2025-02-17', 10, 'Active', '2026-08-27', true),
('acct-15', 'emp-15', 'wberget@fswelsford.com', 'Will Welsford', 'Admin', 'Administrator', 'Management', '2023-01-01', 10, 'Active', '2026-08-13', false),
('acct-16', 'emp-16', 'gilbert@valveman.com', 'Gilbert', 'Admin', 'Administrator', 'Management', '2023-01-01', 10, 'Active', '2026-08-13', false);

-- ---------------------------------------------------------------------------
-- pto_requests (from src/data/requests.ts, hydrated exactly as `hydrate()` did)
-- ---------------------------------------------------------------------------

insert into pto_requests (id, employee_id, request_date, leave_type, start_date, end_date, duration_type, days, status, pay_status, coverage, reason, notes, rejection_reason, reviewed_by, reviewed_at, timeline) values

('PTO-2026-001', 'emp-12', '2026-01-05', 'Vacation Leave', '2026-01-12', '2026-01-16', 'Full Day', 5, 'Approved', 'Paid', 'Cleon Kemp', 'Winter break with family', 'Vacation Leave — Winter break with family', null, 'Princes Aloha Gomez', '2026-01-05T14:22:00',
 '[{"id":"PTO-2026-001-t1","label":"Submitted","at":"2026-01-05T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-001-t2","label":"Reviewed","at":"2026-01-05T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-001-t3","label":"Approved","at":"2026-01-05T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-002', 'emp-11', '2026-01-12', 'Vacation Leave', '2026-01-19', '2026-01-21', 'Full Day', 3, 'Approved', 'Paid', 'Josh Kirk', 'Ski trip booked before the season', 'Vacation Leave — Ski trip booked before the season', null, 'Princes Aloha Gomez', '2026-01-12T14:22:00',
 '[{"id":"PTO-2026-002-t1","label":"Submitted","at":"2026-01-12T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-002-t2","label":"Reviewed","at":"2026-01-12T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-002-t3","label":"Approved","at":"2026-01-12T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-003', 'emp-02', '2026-02-10', 'Personal Leave', '2026-02-13', '2026-02-13', 'Full Day', 1, 'Approved', 'Paid', 'April Lopez', 'Bank and government errands', 'Personal Leave — Bank and government errands', null, 'Princes Aloha Gomez', '2026-02-10T14:22:00',
 '[{"id":"PTO-2026-003-t1","label":"Submitted","at":"2026-02-10T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-003-t2","label":"Reviewed","at":"2026-02-10T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-003-t3","label":"Approved","at":"2026-02-10T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-004', 'emp-13', '2026-02-23', 'Vacation Leave', '2026-03-02', '2026-03-04', 'Full Day', 3, 'Approved', 'Paid', 'Amr Shweiky', 'Anniversary trip', 'Vacation Leave — Anniversary trip', null, 'Princes Aloha Gomez', '2026-02-23T14:22:00',
 '[{"id":"PTO-2026-004-t1","label":"Submitted","at":"2026-02-23T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-004-t2","label":"Reviewed","at":"2026-02-23T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-004-t3","label":"Approved","at":"2026-02-23T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-005', 'emp-03', '2026-03-02', 'Vacation Leave', '2026-03-09', '2026-03-12', 'Full Day', 4, 'Approved', 'Paid', 'Elysabel Del Rosario', 'Family trip to Bohol', 'Vacation Leave — Family trip to Bohol', null, 'Princes Aloha Gomez', '2026-03-02T14:22:00',
 '[{"id":"PTO-2026-005-t1","label":"Submitted","at":"2026-03-02T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-005-t2","label":"Reviewed","at":"2026-03-02T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-005-t3","label":"Approved","at":"2026-03-02T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-006', 'emp-12', '2026-03-16', 'Vacation Leave', '2026-03-23', '2026-03-27', 'Full Day', 5, 'Approved', 'Paid', 'Amr Shweiky', 'Trip to Colorado', 'Vacation Leave — Trip to Colorado', null, 'Princes Aloha Gomez', '2026-03-16T14:22:00',
 '[{"id":"PTO-2026-006-t1","label":"Submitted","at":"2026-03-16T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-006-t2","label":"Reviewed","at":"2026-03-16T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-006-t3","label":"Approved","at":"2026-03-16T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-007', 'emp-11', '2026-04-06', 'Vacation Leave', '2026-04-13', '2026-04-15', 'Full Day', 3, 'Approved', 'Paid', 'Amr Shweiky', 'Family vacation', 'Vacation Leave — Family vacation', null, 'Princes Aloha Gomez', '2026-04-06T14:22:00',
 '[{"id":"PTO-2026-007-t1","label":"Submitted","at":"2026-04-06T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-007-t2","label":"Reviewed","at":"2026-04-06T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-007-t3","label":"Approved","at":"2026-04-06T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-008', 'emp-14', '2026-04-20', 'Vacation Leave', '2026-04-27', '2026-04-29', 'Full Day', 3, 'Approved', 'Paid', 'Dylan Lavern', 'Family visit abroad', 'Vacation Leave — Family visit abroad', null, 'Princes Aloha Gomez', '2026-04-20T14:22:00',
 '[{"id":"PTO-2026-008-t1","label":"Submitted","at":"2026-04-20T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-008-t2","label":"Reviewed","at":"2026-04-20T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-008-t3","label":"Approved","at":"2026-04-20T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-009', 'emp-06', '2026-05-11', 'Sick Leave', '2026-05-15', '2026-05-15', 'Full Day', 1, 'Approved', 'Paid', 'Jason Bauman', 'Fever — advised to rest', 'Sick Leave — Fever — advised to rest', null, 'Princes Aloha Gomez', '2026-05-11T14:22:00',
 '[{"id":"PTO-2026-009-t1","label":"Submitted","at":"2026-05-11T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-009-t2","label":"Reviewed","at":"2026-05-11T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-009-t3","label":"Approved","at":"2026-05-11T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-010', 'emp-12', '2026-05-18', 'Personal Leave', '2026-05-25', '2026-05-26', 'Full Day', 2, 'Approved', 'Paid', 'Cleon Kemp', 'House move', 'Personal Leave — House move', null, 'Princes Aloha Gomez', '2026-05-18T14:22:00',
 '[{"id":"PTO-2026-010-t1","label":"Submitted","at":"2026-05-18T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-010-t2","label":"Reviewed","at":"2026-05-18T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-010-t3","label":"Approved","at":"2026-05-18T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-011', 'emp-13', '2026-06-01', 'Emergency Leave', '2026-06-05', '2026-06-05', 'Full Day', 1, 'Approved', 'Paid', 'Josh Kirk', 'Family matter', 'Emergency Leave — Family matter', null, 'Princes Aloha Gomez', '2026-06-01T14:22:00',
 '[{"id":"PTO-2026-011-t1","label":"Submitted","at":"2026-06-01T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-011-t2","label":"Reviewed","at":"2026-06-01T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-011-t3","label":"Approved","at":"2026-06-01T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-012', 'emp-01', '2026-06-22', 'Sick Leave', '2026-06-26', '2026-06-26', 'Full Day', 1, 'Approved', 'Paid', 'Kazutomo Nishimura', 'Migraine', 'Sick Leave — Migraine', null, 'Princes Aloha Gomez', '2026-06-22T14:22:00',
 '[{"id":"PTO-2026-012-t1","label":"Submitted","at":"2026-06-22T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-012-t2","label":"Reviewed","at":"2026-06-22T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-012-t3","label":"Approved","at":"2026-06-22T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-013', 'emp-11', '2026-06-29', 'Half Day Leave', '2026-07-02', '2026-07-02', 'Half Day (AM)', 0.5, 'Approved', 'Paid', 'Josh Kirk', 'Half Day AM — dentist appointment', 'Half Day Leave — Half Day AM — dentist appointment', null, 'Princes Aloha Gomez', '2026-06-29T14:22:00',
 '[{"id":"PTO-2026-013-t1","label":"Submitted","at":"2026-06-29T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-013-t2","label":"Reviewed","at":"2026-06-29T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-013-t3","label":"Approved","at":"2026-06-29T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-014', 'emp-12', '2026-07-06', 'Sick Leave', '2026-07-10', '2026-07-10', 'Full Day', 1, 'Approved', 'Paid', 'myself', 'Flu', 'Sick Leave — Flu', null, 'Princes Aloha Gomez', '2026-07-06T14:22:00',
 '[{"id":"PTO-2026-014-t1","label":"Submitted","at":"2026-07-06T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-014-t2","label":"Reviewed","at":"2026-07-06T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-014-t3","label":"Approved","at":"2026-07-06T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-015', 'emp-14', '2026-07-13', 'Vacation Leave', '2026-07-20', '2026-07-22', 'Full Day', 3, 'Approved', 'Paid', 'Cleon Kemp', 'Summer break', 'Vacation Leave — Summer break', null, 'Princes Aloha Gomez', '2026-07-13T14:22:00',
 '[{"id":"PTO-2026-015-t1","label":"Submitted","at":"2026-07-13T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-015-t2","label":"Reviewed","at":"2026-07-13T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-015-t3","label":"Approved","at":"2026-07-13T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-016', 'emp-06', '2026-07-28', 'Vacation Leave', '2026-07-31', '2026-07-31', 'Full Day', 1, 'Approved', 'Paid', 'Jason Bauman', 'Family Event', 'Vacation Leave — Family Event', null, 'Princes Aloha Gomez', '2026-07-28T14:22:00',
 '[{"id":"PTO-2026-016-t1","label":"Submitted","at":"2026-07-28T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-016-t2","label":"Reviewed","at":"2026-07-28T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-016-t3","label":"Approved","at":"2026-07-28T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-017', 'emp-03', '2026-08-03', 'Emergency Leave', '2026-07-30', '2026-07-30', 'Full Day', 1, 'Approved', 'Paid', 'N/A', 'Power interruption', 'Emergency Leave — Power interruption', null, 'Princes Aloha Gomez', '2026-08-03T14:22:00',
 '[{"id":"PTO-2026-017-t1","label":"Submitted","at":"2026-08-03T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-017-t2","label":"Reviewed","at":"2026-08-03T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-017-t3","label":"Approved","at":"2026-08-03T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-018', 'emp-07', '2026-08-04', 'Vacation Leave', '2026-08-06', '2026-08-06', 'Full Day', 1, 'Approved', 'Paid', 'Nancy/Princes', 'Get together with a friend visiting from the US', 'Vacation Leave — Get together with a friend visiting from the US', null, 'Princes Aloha Gomez', '2026-08-04T14:22:00',
 '[{"id":"PTO-2026-018-t1","label":"Submitted","at":"2026-08-04T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-018-t2","label":"Reviewed","at":"2026-08-04T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-018-t3","label":"Approved","at":"2026-08-04T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-019', 'emp-13', '2026-08-10', 'Half Day Leave', '2026-08-14', '2026-08-14', 'Half Day (PM)', 0.5, 'Approved', 'Paid', 'Cleon Kemp', 'Half Day PM — school event', 'Half Day Leave — Half Day PM — school event', null, 'Princes Aloha Gomez', '2026-08-10T14:22:00',
 '[{"id":"PTO-2026-019-t1","label":"Submitted","at":"2026-08-10T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-019-t2","label":"Reviewed","at":"2026-08-10T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-019-t3","label":"Approved","at":"2026-08-10T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-020', 'emp-09', '2026-08-17', 'Vacation Leave', '2026-08-24', '2026-08-25', 'Full Day', 2, 'Rejected', 'Unpaid', 'Mabel Rojas', 'Beach trip with friends', 'Vacation Leave — Beach trip with friends',
 'Not yet eligible for paid PTO — eligibility begins 10/13/2026. Please refile closer to the date, or refile as unpaid leave with department approval.',
 'Princes Aloha Gomez', '2026-08-17T14:22:00',
 '[{"id":"PTO-2026-020-t1","label":"Submitted","at":"2026-08-17T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-020-t2","label":"Reviewed","at":"2026-08-17T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-020-t3","label":"Rejected","at":"2026-08-17T14:22:00","actor":"Princes Aloha Gomez","note":"Not yet eligible for paid PTO — eligibility begins 10/13/2026. Please refile closer to the date, or refile as unpaid leave with department approval."}]'::jsonb),

('PTO-2026-021', 'emp-08', '2026-08-24', 'Unpaid Leave', '2026-09-17', '2026-09-18', 'Full Day', 2, 'Approved', 'Unpaid', 'April Lopez', 'Family obligation — not yet PTO-eligible, filed as unpaid', 'Unpaid Leave — Family obligation — not yet PTO-eligible, filed as unpaid', null, 'Princes Aloha Gomez', '2026-08-24T14:22:00',
 '[{"id":"PTO-2026-021-t1","label":"Submitted","at":"2026-08-24T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-021-t2","label":"Reviewed","at":"2026-08-24T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-021-t3","label":"Approved","at":"2026-08-24T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-022', 'emp-12', '2026-08-26', 'Half Day Leave', '2026-09-08', '2026-09-08', 'Half Day (PM)', 0.5, 'Approved', 'Unpaid', 'myself', 'Half Day PM — work the 2nd half of the day', 'Half Day Leave — Half Day PM — work the 2nd half of the day', null, 'Princes Aloha Gomez', '2026-08-26T14:22:00',
 '[{"id":"PTO-2026-022-t1","label":"Submitted","at":"2026-08-26T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-022-t2","label":"Reviewed","at":"2026-08-26T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-022-t3","label":"Approved","at":"2026-08-26T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-023', 'emp-10', '2026-08-28', 'Unpaid Leave', '2026-09-25', '2026-09-25', 'Full Day', 1, 'Approved', 'Unpaid', 'Mabel Rojas', 'Personal errand — not yet PTO-eligible', 'Unpaid Leave — Personal errand — not yet PTO-eligible', null, 'Princes Aloha Gomez', '2026-08-28T14:22:00',
 '[{"id":"PTO-2026-023-t1","label":"Submitted","at":"2026-08-28T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."},{"id":"PTO-2026-023-t2","label":"Reviewed","at":"2026-08-28T14:05:00","actor":"Princes Aloha Gomez","note":"Coverage and team availability checked."},{"id":"PTO-2026-023-t3","label":"Approved","at":"2026-08-28T14:22:00","actor":"Princes Aloha Gomez"}]'::jsonb),

('PTO-2026-024', 'emp-05', '2026-09-01', 'Vacation Leave', '2026-09-14', '2026-09-15', 'Full Day', 2, 'Pending', 'Paid', 'Justin Mar Tizon', 'Long weekend in Baguio with family', 'Vacation Leave — Long weekend in Baguio with family', null, null, null,
 '[{"id":"PTO-2026-024-t1","label":"Submitted","at":"2026-09-01T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."}]'::jsonb),

('PTO-2026-025', 'emp-04', '2026-09-02', 'Personal Leave', '2026-09-21', '2026-09-21', 'Full Day', 1, 'Pending', 'Paid', 'Mabel Rojas', 'Passport renewal appointment', 'Personal Leave — Passport renewal appointment', null, null, null,
 '[{"id":"PTO-2026-025-t1","label":"Submitted","at":"2026-09-02T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."}]'::jsonb),

('PTO-2026-026', 'emp-06', '2026-09-03', 'Half Day Leave', '2026-09-11', '2026-09-11', 'Half Day (AM)', 0.5, 'Pending', 'Paid', 'April Lopez', 'Half Day AM — medical check-up', 'Half Day Leave — Half Day AM — medical check-up', null, null, null,
 '[{"id":"PTO-2026-026-t1","label":"Submitted","at":"2026-09-03T09:12:00","actor":"Employee","note":"Request filed through the PTO Tracker."}]'::jsonb);

-- Keep the sequence ahead of the 26 seeded requests so the next live
-- submission becomes PTO-<year>-027, not a collision.
select setval('pto_request_seq', 26, true);

-- ---------------------------------------------------------------------------
-- pto_approver_routing (from src/lib/theme.ts)
-- ---------------------------------------------------------------------------

insert into pto_approver_routing (match_type, match_value, approver_email) values
('job_title', 'Territory Manager', 'gilbert@valveman.com'),
('department', 'Administration', 'april@valveman.com');

-- ---------------------------------------------------------------------------
-- pto_settings (from src/lib/theme.ts)
-- ---------------------------------------------------------------------------

insert into pto_settings (key, value) values
('default_approver_1', 'wberget@fswelsford.com'), -- Will Welsford
('default_approver_2', 'princes@valveman.com');      -- Princes Aloha Gomez
