-- Data cleanup: PTO-2026-020, PTO-2026-021 and PTO-2026-023 belong to
-- employees who hadn't cleared the 6-month eligibility rule at the time
-- they were filed (Justin Mar Tizon, Elysabel Del Rosario, Victor Joshua
-- Estacio). Submitting/approving is now blocked for ineligible employees
-- going forward (see PTORequestForm.tsx), but these three predate that
-- fix and need removing directly — anon has no delete grant on
-- pto_requests (see schema.sql), so run this once in the Supabase SQL
-- Editor. pto_notifications/pto_action_tokens rows for these requests
-- cascade-delete automatically.

delete from pto_requests
where id in ('PTO-2026-020', 'PTO-2026-021', 'PTO-2026-023');
