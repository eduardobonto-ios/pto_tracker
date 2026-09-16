-- Fix: Will Welsford's email was seeded as jwelsford@fswelsford.com; the
-- correct address is wberget@fswelsford.com. pto_employees and pto_accounts
-- were already corrected directly (the app has write access to those two
-- tables); pto_settings has no write policy for the app, so run this once.

update pto_settings
set value = 'wberget@fswelsford.com'
where key = 'default_approver_1' and value = 'jwelsford@fswelsford.com';
