-- The approval layout Will Berget sent on 2026-10-15: a named approver for
-- each of the 27 employees, replacing the job-title and department rules.
--
-- WHY A NEW MATCH TYPE. pto_approver_routing only accepted 'job_title' and
-- 'department', which derive an approver from a category. The layout names a
-- person per person, and the two cannot be expressed as each other: Dan York
-- and Jason Bauman are both Outside Sales Engineers with different approvers,
-- and Darlene Driscoll and April Lopez are both Administration with different
-- approvers. So 'employee' is added, and it takes precedence over both.
--
-- The old job_title and department rows are left in place as the fallback for
-- anyone hired later who has no named approver yet.
--
-- Matched on NAME against the live roster rather than hardcoded ids, so a
-- rename or a reseed cannot silently point a row at the wrong person; the
-- check at the bottom fails the patch if any of the 27 fails to resolve.
--
-- Two names in the sheet differ from the tracker and are mapped here:
--   "Jydie Bagasala" -> Jlydie Bagasala
--   "Steve Limanni"  -> Steven Limanni
-- Both confirmed as the same people by their approver assignment and
-- department; flagged to Will for confirmation anyway.

begin;

alter table pto_approver_routing drop constraint if exists pto_approver_routing_match_type_check;
alter table pto_approver_routing add constraint pto_approver_routing_match_type_check
  check (match_type in ('employee', 'job_title', 'department'));

delete from pto_approver_routing where match_type = 'employee';

insert into pto_approver_routing (match_type, match_value, approver_email)
select 'employee', e.id, v.approver
from (values
  ('Abel Alia',             'princes@valveman.com'),
  ('Amr Shweiky',           'gil@valveman.com'),
  ('April Lopez',           'jwelsford@fswelsford.com'),
  ('Chris Stolzer',         'wberget@fswelsford.com'),
  ('Cleon Kemp',            'gil@valveman.com'),
  ('Dan York',              'gil@valveman.com'),
  ('Darlene Driscoll',      'wberget@fswelsford.com'),
  ('Darwin Mushrush',       'gil@valveman.com'),
  ('Dylan Lavern',          'gil@valveman.com'),
  ('Eduardo Bonto',         'princes@valveman.com'),
  ('Elysabel Del Rosario',  'gil@valveman.com'),
  ('Janet Hays',            'wberget@fswelsford.com'),
  ('Jason Bauman',          'jwelsford@fswelsford.com'),
  ('Josh Kirk',             'gil@valveman.com'),
  ('Justin Mar Tizon',      'princes@valveman.com'),
  ('Jlydie Bagasala',       'princes@valveman.com'),
  ('Kazutomo Nishimura',    'princes@valveman.com'),
  ('Mabel Rojas',           'princes@valveman.com'),
  ('Nancy Mullen',          'jwelsford@fswelsford.com'),
  ('Princes Aloha Gomez',   'wberget@fswelsford.com'),
  ('Russ Bailey',           'jwelsford@fswelsford.com'),
  ('Ryan Driscoll',         'wberget@fswelsford.com'),
  ('Sharlyn Bacalso',       'princes@valveman.com'),
  ('Steven Limanni',        'jwelsford@fswelsford.com'),
  ('Veam Chavez',           'princes@valveman.com'),
  ('Victor Joshua Estacio', 'princes@valveman.com'),
  ('Will Berget',           'jwelsford@fswelsford.com')
) as v(name, approver)
join pto_employees e on e.name = v.name;

do $$
declare n integer; selfref integer; unknown integer;
begin
  select count(*) into n from pto_approver_routing where match_type = 'employee';
  if n <> 27 then
    raise exception 'expected 27 named approvers, got % - a name failed to match the roster', n;
  end if;

  -- Nobody may approve their own leave.
  select count(*) into selfref
    from pto_approver_routing r join pto_employees e on e.id = r.match_value
   where r.match_type = 'employee' and lower(e.email) = lower(r.approver_email);
  if selfref > 0 then raise exception '% employee(s) are set to approve themselves', selfref; end if;

  -- Every approver must have an active account, or the request routes nowhere.
  select count(distinct r.approver_email) into unknown
    from pto_approver_routing r
   where r.match_type = 'employee'
     and not exists (select 1 from pto_accounts a
                      where lower(a.email) = lower(r.approver_email) and a.status = 'Active');
  if unknown > 0 then raise exception '% approver email(s) have no active account', unknown; end if;
end
$$;

commit;
