-- Fix: Will Welsford's email was seeded as jwelsford@fswelsford.com; the
-- correct address is wberget@fswelsford.com. pto_employees and pto_accounts
-- were already corrected directly (the app has write access to those two
-- tables); pto_settings has no write policy for the app, so run this once.

update pto_settings
set value = 'wberget@fswelsford.com'
where key = 'default_approver_1' and value = 'jwelsford@fswelsford.com';

-- 2026-09-29: the name in the comment above is wrong. There is no "Will
-- Welsford" — the person is Will Berget, and wberget@fswelsford.com is his
-- address, so the change this patch makes is correct and stays. The phantom
-- employee record it was named after is removed by patch_012.
