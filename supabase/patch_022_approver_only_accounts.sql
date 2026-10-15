-- Gil Welsford Jr and Jason Welsford, as APPROVER-ONLY accounts.
--
-- Will Berget's approval layout (15 Oct) routes 13 of the 27 employees to
-- these two, but neither had a tracker login. They are owners rather than
-- staff on a PTO plan: Will's entitlement email assigned days to everyone
-- except them, and Princes signed off a 27-person roster that excludes them.
-- So they get an account with NO employee record — employee_id stays null.
--
-- THIS ONLY WORKS BECAUSE OF THE CHANGE SHIPPED ALONGSIDE IT. Sign-in used to
-- key off employee_id and fall back to `employees[0]` when it found nothing,
-- so an account with no employee record would have silently signed in as
-- emp-01 — Princes — seeing her balance and filing as her. Identity now keys
-- off the ACCOUNT, and currentUser is allowed to be absent.
--
-- Admin role: they approve leave, which is an admin action in this app.

begin;

insert into pto_accounts
  (id, employee_id, email, full_name, app_role, job_title, department,
   hire_date, annual_pto_allowance, status, must_change_password)
values
  ('acct-apv-01', null, 'gil@valveman.com', 'Gil Welsford Jr', 'Admin',
   'Owner', 'Management', current_date, 0, 'Active', true),
  ('acct-apv-02', null, 'jwelsford@fswelsford.com', 'Jason Welsford', 'Admin',
   'Owner', 'Management', current_date, 0, 'Active', true)
on conflict (id) do nothing;

select pto_set_password('acct-apv-01', 'FswNJCz4JIyo', true);
select pto_set_password('acct-apv-02', 'FswpxSglfN5i', true);

do $$
declare n integer;
begin
  select count(*) into n from pto_accounts a
   join pto_credentials c on c.account_id = a.id
   where a.id in ('acct-apv-01','acct-apv-02') and a.employee_id is null;
  if n <> 2 then
    raise exception 'expected 2 approver-only accounts with credentials, found %', n;
  end if;
end
$$;

commit;
