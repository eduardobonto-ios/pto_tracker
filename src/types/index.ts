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

/**
 * An event read from the organisation's shared Microsoft 365 calendar
 * (company events, holidays, shutdowns) and overlaid on the PTO Calendar.
 *
 * Read-only and never persisted: Microsoft owns this data, the PTO Tracker
 * only displays it. `endDate` is inclusive, unlike Graph's all-day events,
 * which use an exclusive end.
 */
export interface OrgCalendarEvent {
  id: string;
  subject: string;
  /** ISO date (YYYY-MM-DD) of the first day the event covers. */
  startDate: string;
  /** ISO date (YYYY-MM-DD) of the last day the event covers, inclusive. */
  endDate: string;
  isAllDay: boolean;
  location?: string;
}

export type PTOStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export const PTO_STATUSES: PTOStatus[] = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

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

/** PH staff accrue with tenure; US staff hold a fixed negotiated allowance. */
export type PtoRegion = 'PH' | 'US';

/**
 * Which entitlement plan an employee is on.
 *
 * `fixed`       — US: `fixedPtoDays`, a negotiated figure that never moves.
 *                 PH: the PH ramp, 5 days +2 a year, capped at 10.
 * `tenure_ramp` — derived from the hire date in either region: 10 days, +1
 *                 per year of service, capped at 15. Ignores `fixedPtoDays`.
 *
 * PH Territory Managers are on the tenure ramp by job title whatever this
 * column says — see `PTO_TERRITORY_MANAGER_JOB_TITLES` in `lib/theme.ts`.
 */
export type PtoPlan = 'fixed' | 'tenure_ramp';

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
  /**
   * Which entitlement rules apply. Deliberately explicit rather than inferred
   * from the email domain — Veam Chavez and Sharlyn Bacalso are both
   * @fswelsford.com but PH-based, so the domain proves nothing.
   */
  ptoRegion: PtoRegion;
  /**
   * US only: total annual days, fixed regardless of tenure. Null for PH, whose
   * entitlement `computeEntitlement` derives instead. Ignored entirely when
   * `ptoPlan` is `tenure_ramp`.
   */
  fixedPtoDays?: number;
  /**
   * Which entitlement plan applies. Defaults to `fixed`. `tenure_ramp` is
   * Darwin Mushrush, Daniel York, Will Berget and the four PH Territory
   * Managers — though the Territory Managers are on the ramp by job title
   * regardless of what this column holds.
   */
  ptoPlan: PtoPlan;
  /**
   * Admin-set eligibility date. When absent it is derived — hire date for US,
   * hire date + 6 months for PH.
   */
  eligibilityDateOverride?: string;
  appRole: AppRole;
  /** Optional avatar image URL; initials are used when absent. */
  avatarUrl?: string;
  active: boolean;
}

export interface TimelineEvent {
  id: string;
  label: 'Submitted' | 'Reviewed' | 'Approved' | 'Rejected' | 'Cancelled' | 'Updated';
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
  /** Optional note the admin leaves when approving — surfaced in the employee notification. */
  approvalComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Set when the employee (or an admin on their behalf) cancels the request. */
  cancelledAt?: string;
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
  /** The whole year's entitlement — what they will have accrued by year end. */
  totalPto: number;
  /**
   * How much of `totalPto` has actually been earned so far this PTO year,
   * accruing biweekly — see `PTO_ACCRUAL_*` in `lib/theme.ts`. This is the
   * figure `daysRemaining` draws against, so it is the one that answers "how
   * much can I take right now".
   */
  accruedDays: number;
  /**
   * Every approved + paid day in this PTO year, whether it has happened yet or
   * not. This is the figure the legacy spreadsheet calls "Days Used", kept
   * that way so the two still reconcile — it is `daysTaken + daysScheduled`.
   */
  daysUsed: number;
  /** Approved + paid leave that has already started. Draws against accrual. */
  daysTaken: number;
  /**
   * Approved + paid leave dated in the future. Committed, but deliberately NOT
   * charged against today's accrual — by the time it is taken it will have
   * been earned. Booking Christmas leave in September should not read as an
   * overdraft in September.
   */
  daysScheduled: number;
  /** Days sitting in Pending requests — shown separately, not deducted. */
  pendingDays: number;
  /**
   * `accruedDays − daysTaken`: what is genuinely available right now. Goes
   * negative when someone has taken more than they have earned, which is
   * allowed on purpose.
   */
  daysRemaining: number;
  /** Still to be earned this year: `totalPto − accruedDays`, never negative. */
  unaccruedDays: number;
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
