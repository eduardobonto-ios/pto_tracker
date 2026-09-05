/**
 * Domain types for the Valveman PTO Tracker.
 *
 * These deliberately mirror the shape we intend to give the Supabase tables in
 * the backend phase, so the mock data layer can be swapped for real queries
 * with minimal churn in the components.
 */

export type Department =
  | 'Management'
  | 'Administration'
  | 'Operations'
  | 'Technical'
  | 'Finance'
  | 'Sales'
  | 'Sales / Operations'
  | 'Other';

export const DEPARTMENTS: Department[] = [
  'Management',
  'Administration',
  'Operations',
  'Technical',
  'Finance',
  'Sales',
  'Sales / Operations',
  'Other',
];

export type LeaveType =
  | 'Vacation Leave'
  | 'Personal Leave'
  | 'Emergency Leave'
  | 'Sick Leave'
  | 'Half Day Leave'
  | 'Unpaid Leave'
  | 'Other';

export const LEAVE_TYPES: LeaveType[] = [
  'Vacation Leave',
  'Personal Leave',
  'Emergency Leave',
  'Sick Leave',
  'Half Day Leave',
  'Unpaid Leave',
  'Other',
];

export type PTOStatus = 'Pending' | 'Approved' | 'Rejected';

export const PTO_STATUSES: PTOStatus[] = ['Pending', 'Approved', 'Rejected'];

export type PayStatus = 'Paid' | 'Unpaid';

export type DurationType = 'Full Day' | 'Half Day (AM)' | 'Half Day (PM)' | 'Custom Hours';

export const DURATION_TYPES: DurationType[] = [
  'Full Day',
  'Half Day (AM)',
  'Half Day (PM)',
  'Custom Hours',
];

/** Application-level permission role (distinct from the employee's job title). */
export type AppRole = 'Employee' | 'Admin';

export interface Employee {
  id: string;
  /** Row number as it appears in the legacy spreadsheet. */
  sheetNo: number;
  name: string;
  email: string;
  /** Job title, e.g. "Territory Manager". */
  jobTitle: string;
  department: Department;
  /** ISO date (YYYY-MM-DD). */
  hireDate: string;
  /**
   * Annual PTO allowance in days. Deliberately per-employee — Valveman has no
   * single company-wide policy yet (observed values: 5 and 10).
   */
  annualPtoAllowance: number;
  appRole: AppRole;
  /** Optional avatar image URL; initials are used when absent. */
  avatarUrl?: string;
  active: boolean;
}

export interface TimelineEvent {
  id: string;
  label: 'Submitted' | 'Reviewed' | 'Approved' | 'Rejected' | 'Updated';
  /** ISO datetime. */
  at: string;
  actor: string;
  note?: string;
}

export interface PTORequest {
  id: string;
  employeeId: string;
  /** ISO date the request was filed. */
  requestDate: string;
  leaveType: LeaveType;
  /** ISO date. */
  startDate: string;
  /** ISO date — equals startDate for single-day leave. */
  endDate: string;
  durationType: DurationType;
  /** Present only when durationType === 'Custom Hours'. */
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  /** Total chargeable days, supports halves (0.5). */
  days: number;
  status: PTOStatus;
  payStatus: PayStatus;
  /** Who covers the employee's work — free text, "N/A" is common. */
  coverage: string;
  /** Free-text reason supplied by the employee. */
  reason: string;
  /** Combined display note: "<Leave Type> — <reason>". */
  notes: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  timeline: TimelineEvent[];
}

export type AccountStatus = 'Active' | 'Revoked';

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  appRole: AppRole;
  jobTitle: string;
  department: Department;
  hireDate: string;
  annualPtoAllowance: number;
  status: AccountStatus;
  /** ISO date the account was provisioned. */
  createdAt: string;
  /** True until the employee completes the forced first-login password change. */
  mustChangePassword: boolean;
  /** Employee record this account is attached to, when one exists. */
  employeeId?: string;
}

/** Derived, never stored — computed by `lib/pto.ts` from employees + requests. */
export interface PTOBalance {
  employeeId: string;
  totalPto: number;
  /** Approved + paid days already consumed. */
  daysUsed: number;
  /** Days sitting in Pending requests — shown separately, not deducted. */
  pendingDays: number;
  daysRemaining: number;
  percentUsed: number;
  eligible: boolean;
  /** ISO date on which the employee becomes / became eligible. */
  eligibilityDate: string;
}

export interface DashboardSummary {
  totalMembers: number;
  eligibleEmployees: number;
  totalPtoPool: number;
  daysUsed: number;
  daysRemaining: number;
  pendingRequests: number;
}
