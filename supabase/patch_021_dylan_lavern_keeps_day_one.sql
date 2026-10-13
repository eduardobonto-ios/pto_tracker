-- Dylan Lavern keeps the ten days he already had.
--
-- patch_020 made the six-month wait universal, which would have taken him to
-- zero until 2026-12-15 — he was hired 2026-06-15 and had been drawing the
-- ramp base from day one under the old US rule. Eduardo, 2026-10-13:
-- "Dylan keep his 10".
--
-- Done with eligibility_date_override, which is the admin escape hatch for a
-- cycle the derived rules get wrong, rather than by unpicking the six-month
-- rule. That keeps rule 2 intact for anyone hired from here on: Dylan is
-- grandfathered because he already had the entitlement, not because
-- Territory Managers are exempt.
--
-- The override is his HIRE date, so it changes nothing else. It is also the
-- reset anchor, and the anchor was already his hire date, so his PTO year and
-- his Days Used stay exactly where they are.
--
-- He is the only person inside six months on the US side; Darwin Mushrush
-- passed his mark on 2026-07-12.

begin;

update pto_employees
   set eligibility_date_override = hire_date
 where id = 'emp-13' and name = 'Dylan Lavern';

do $$
declare v date;
begin
  select eligibility_date_override into v from pto_employees where id = 'emp-13';
  if v is distinct from date '2026-06-15' then
    raise exception 'expected Dylan''s override to be his hire date, got %', v;
  end if;
end
$$;

commit;
