-- Rollback snapshot taken 2026-10-02, before patch_017 / patch_018.
-- Restores every employee row to the plan and override it held then.

update pto_employees set eligibility_date_override = '2026-06-01', pto_plan = 'fixed' where id = 'emp-01';  -- Princes Aloha Gomez
update pto_employees set eligibility_date_override = '2026-06-01', pto_plan = 'fixed' where id = 'emp-02';  -- Kazutomo Nishimura
update pto_employees set eligibility_date_override = '2026-06-01', pto_plan = 'fixed' where id = 'emp-03';  -- April Lopez
update pto_employees set eligibility_date_override = '2026-06-01', pto_plan = 'fixed' where id = 'emp-04';  -- Jlydie Bagasala
update pto_employees set eligibility_date_override = '2026-06-30', pto_plan = 'fixed' where id = 'emp-05';  -- Mabel Rojas
update pto_employees set eligibility_date_override = '2026-06-23', pto_plan = 'fixed' where id = 'emp-06';  -- Veam Chavez
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-07';  -- Sharlyn Bacalso
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-08';  -- Elysabel Del Rosario
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-09';  -- Justin Mar Tizon
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-10';  -- Victor Joshua Estacio
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-11';  -- Cleon Kemp
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-12';  -- Josh Kirk
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-13';  -- Dylan Lavern
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-14';  -- Amr Shweiky
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-17';  -- Eduardo Bonto
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-oz8k67e';  -- Eduardo Bonto Test Account
update pto_employees set eligibility_date_override = '2026-08-11', pto_plan = 'fixed' where id = 'emp-us-01';  -- Chris Stolzer
update pto_employees set eligibility_date_override = '2008-08-18', pto_plan = 'fixed' where id = 'emp-us-02';  -- Darlene Driscoll
update pto_employees set eligibility_date_override = '2021-08-09', pto_plan = 'fixed' where id = 'emp-us-03';  -- Janet Hays
update pto_employees set eligibility_date_override = '2011-09-06', pto_plan = 'fixed' where id = 'emp-us-04';  -- Ryan Driscoll
update pto_employees set eligibility_date_override = '1990-06-13', pto_plan = 'fixed' where id = 'emp-us-05';  -- Russ Bailey
update pto_employees set eligibility_date_override = '2006-07-15', pto_plan = 'fixed' where id = 'emp-us-06';  -- Jason Bauman
update pto_employees set eligibility_date_override = '2009-12-01', pto_plan = 'fixed' where id = 'emp-us-07';  -- Steven Limanni
update pto_employees set eligibility_date_override = '2025-01-06', pto_plan = 'tenure_ramp' where id = 'emp-us-08';  -- Dan York
update pto_employees set eligibility_date_override = '2026-01-12', pto_plan = 'tenure_ramp' where id = 'emp-us-09';  -- Darwin Mushrush
update pto_employees set eligibility_date_override = '2026-08-19', pto_plan = 'fixed' where id = 'emp-us-10';  -- Will Berget
update pto_employees set eligibility_date_override = null, pto_plan = 'fixed' where id = 'emp-us-11';  -- Nancy Mullen
