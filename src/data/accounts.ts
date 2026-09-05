import type { UserAccount } from '@/types';
import { employees } from './employees';

/**
 * Mock account list for the Admin-only Account Management screen.
 *
 * In phase 2 this becomes the Supabase `auth.users` join `profiles`. Access is
 * invite-only (SEC-01) — only an administrator can provision an account, and
 * every new account is forced through a password change on first login.
 */

const createdDates: Record<string, string> = {
  'emp-01': '2026-08-13',
  'emp-02': '2026-08-13',
  'emp-03': '2026-08-13',
  'emp-04': '2026-08-13',
  'emp-05': '2026-08-15',
  'emp-06': '2026-08-15',
  'emp-07': '2026-08-15',
  'emp-08': '2026-08-18',
  'emp-09': '2026-08-18',
  'emp-10': '2026-08-18',
  'emp-11': '2026-08-20',
  'emp-12': '2026-08-20',
  'emp-13': '2026-08-20',
  'emp-14': '2026-08-27',
};

/** Accounts that have not yet completed the forced first-login change. */
const pendingFirstLogin = new Set(['emp-10', 'emp-14']);

/** Access revoked (kept for the audit trail rather than deleted). */
const revoked = new Set<string>([]);

export const userAccounts: UserAccount[] = employees.map((e) => ({
  id: `acct-${e.id.split('-')[1]}`,
  email: e.email,
  fullName: e.name,
  appRole: e.appRole,
  jobTitle: e.jobTitle,
  department: e.department,
  hireDate: e.hireDate,
  annualPtoAllowance: e.annualPtoAllowance,
  status: revoked.has(e.id) ? 'Revoked' : 'Active',
  createdAt: createdDates[e.id] ?? '2026-08-13',
  mustChangePassword: pendingFirstLogin.has(e.id),
  employeeId: e.id,
}));
