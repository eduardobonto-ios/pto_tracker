-- Will Berget is exempt from the tenure ramp.
--
-- Confirmed by Eduardo 2026-10-13: "Will is exempted, so Will next year is 15
-- already". He takes the ramp's base in his hire year and its cap from his
-- first anniversary, with none of the intervening steps:
--
--     2026: 10        2027 onwards: 15
--
-- On the ordinary ramp the same hire date would read 11 in 2027 and not reach
-- 15 until 2031, which is what the tracker was showing before this patch.
--
-- The plan also carries day-one eligibility. Six months became the universal
-- wait on the same date, and without the exemption Will would draw nothing
-- until 2027-02-19 — which contradicts him being on 10 this year.
--
-- Note the four-day discrepancy left open: the policy note said "Aug 15, 2027"
-- while his hire date is 2026-08-19, so the jump lands on the 19th here. Every
-- other rule in this system keys off the hire anniversary, so that is what
-- this follows. It matters only for leave filed between the 15th and the 19th.

begin;

alter table pto_employees drop constraint if exists pto_employees_pto_plan_check;
alter table pto_employees add constraint pto_employees_pto_plan_check
  check (pto_plan = any (array['fixed'::text, 'tenure_ramp'::text, 'ramp_exempt'::text]));

update pto_employees
   set pto_plan = 'ramp_exempt'
 where id = 'emp-us-10' and name = 'Will Berget';

do $$
declare n integer;
begin
  select count(*) into n from pto_employees where pto_plan = 'ramp_exempt';
  if n <> 1 then
    raise exception 'expected exactly one exempt employee, found %', n;
  end if;
end
$$;

commit;
