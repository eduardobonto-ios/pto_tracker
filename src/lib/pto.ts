/**
 * PTO business rules.
 *
 * Everything here is pure and frontend-only. In the backend phase these
 * functions become the reference implementation for the equivalent SQL views /
 * Supabase RPCs — keep them free of React and of data-fetching concerns.
 */

import { PTO_ELIGIBILITY_MONTHS } from './theme';
import type {
  DashboardSummary,
  DurationType,
  Employee,
  PTOBalance,
  PTORequest,
} from '@/types';
import { parseISODate, toISODate } from './utils';

export interface DepartmentLeaveConflict {
  employee: Employee;
  request: PTORequest;
}

/**
 * Company rule: an employee becomes eligible for PTO after 6 months of
 * employment. Returns the ISO date on which eligibility starts.
 */
export function eligibilityDate(hireDateIso: string): string {
  const d = parseISODate(hireDateIso);
  const target = new Date(d.getFullYear(), d.getMonth() + PTO_ELIGIBILITY_MONTHS, d.getDate());
  // Guard month-overflow (e.g. Aug 31 + 6 months → Feb 31 → Mar 3).
  if (target.getDate() !== d.getDate()) target.setDate(0);
  return toISODate(target);
}

/** Whether the employee is eligible as of `asOf` (defaults to today). */
export function isEligible(hireDateIso: string, asOf: Date = new Date()): boolean {
  return parseISODate(eligibilityDate(hireDateIso)).getTime() <= asOf.getTime();
}

/** Chargeable days implied by a duration selection over a date range. */
export function computeDays(
  startIso: string,
  endIso: string | undefined,
  duration: DurationType,
  totalHours?: number,
): number {
  const end = endIso || startIso;
  if (duration === 'Half Day (AM)' || duration === 'Half Day (PM)') return 0.5;
  if (duration === 'Custom Hours') {
    if (!totalHours || totalHours <= 0) return 0;
    // 8-hour working day, rounded to the nearest half day.
    return Math.round((totalHours / 8) * 2) / 2;
  }
  const start = parseISODate(startIso);
  const finish = parseISODate(end);
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= finish.getTime()) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count += 1; // weekdays only
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(count, 1);
}

/**
 * Balance for one employee.
 *
 * Only Approved *and* Paid requests consume the allowance. Pending days are
 * surfaced separately and never permanently deduct until approval.
 */
export function computeBalance(employee: Employee, requests: PTORequest[]): PTOBalance {
  const mine = requests.filter((r) => r.employeeId === employee.id);
  const daysUsed = round(
    mine
      .filter((r) => r.status === 'Approved' && r.payStatus === 'Paid')
      .reduce((sum, r) => sum + r.days, 0),
  );
  const pendingDays = round(
    mine.filter((r) => r.status === 'Pending').reduce((sum, r) => sum + r.days, 0),
  );
  const eligible = isEligible(employee.hireDate);
  const totalPto = employee.annualPtoAllowance;
  // An employee who has not cleared the 6-month rule cannot draw down yet, so
  // their remaining balance reads 0 until their eligibility date passes.
  const daysRemaining = eligible ? round(totalPto - daysUsed) : 0;
  const percentUsed = eligible && totalPto > 0 ? Math.round((daysUsed / totalPto) * 100) : 0;

  return {
    employeeId: employee.id,
    totalPto,
    daysUsed,
    pendingDays,
    daysRemaining,
    percentUsed,
    eligible,
    eligibilityDate: eligibilityDate(employee.hireDate),
  };
}

/** Balances keyed by employee id. */
export function computeBalances(
  employees: Employee[],
  requests: PTORequest[],
): Record<string, PTOBalance> {
  return Object.fromEntries(
    employees.map((e) => [e.id, computeBalance(e, requests)]),
  );
}

/** Company-wide roll-up powering the dashboard summary cards. */
export function computeSummary(
  employees: Employee[],
  requests: PTORequest[],
): DashboardSummary {
  const active = employees.filter((e) => e.active);
  const balances = active.map((e) => computeBalance(e, requests));
  return {
    totalMembers: active.length,
    eligibleEmployees: balances.filter((b) => b.eligible).length,
    totalPtoPool: round(balances.reduce((s, b) => s + b.totalPto, 0)),
    daysUsed: round(balances.reduce((s, b) => s + b.daysUsed, 0)),
    // Matches the spreadsheet roll-up: eligible members only, over-draws (a
    // negative balance) included rather than clamped.
    daysRemaining: round(balances.reduce((s, b) => s + b.daysRemaining, 0)),
    pendingRequests: requests.filter((r) => r.status === 'Pending').length,
  };
}

/** Requests whose date range covers `iso`. */
export function requestsOnDate(requests: PTORequest[], iso: string): PTORequest[] {
  const t = parseISODate(iso).getTime();
  return requests.filter(
    (r) =>
      parseISODate(r.startDate).getTime() <= t &&
      parseISODate(r.endDate || r.startDate).getTime() >= t,
  );
}

/**
 * Other employees in the same department whose leave overlaps the given
 * date range — powers the "Department Leave Notice" warning shown on the
 * leave request form and on the manager's review screen.
 *
 * Rejected requests are excluded; Pending and Approved both count so a
 * manager can spot a brewing conflict before it's even approved.
 */
export function departmentLeaveConflicts(
  employee: Employee,
  startDate: string,
  endDate: string | undefined,
  employees: Employee[],
  requests: PTORequest[],
  excludeRequestId?: string,
): DepartmentLeaveConflict[] {
  if (!startDate) return [];
  const start = parseISODate(startDate).getTime();
  const end = parseISODate(endDate || startDate).getTime();

  return requests
    .filter((r) => r.id !== excludeRequestId)
    .filter((r) => r.employeeId !== employee.id)
    .filter((r) => r.status !== 'Rejected')
    .filter((r) => {
      const rStart = parseISODate(r.startDate).getTime();
      const rEnd = parseISODate(r.endDate || r.startDate).getTime();
      return rStart <= end && rEnd >= start;
    })
    .reduce<DepartmentLeaveConflict[]>((acc, r) => {
      const other = employees.find((e) => e.id === r.employeeId);
      if (other && other.department === employee.department) {
        acc.push({ employee: other, request: r });
      }
      return acc;
    }, [])
    .sort((a, b) => a.request.startDate.localeCompare(b.request.startDate));
}

/** Approved requests starting on or after today, soonest first. */
export function upcomingLeave(requests: PTORequest[], asOf: Date = new Date()): PTORequest[] {
  const today = parseISODate(toISODate(asOf)).getTime();
  return requests
    .filter((r) => r.status === 'Approved' && parseISODate(r.startDate).getTime() >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Employees on approved leave today. */
export function outToday(
  employees: Employee[],
  requests: PTORequest[],
  asOf: Date = new Date(),
): Employee[] {
  const iso = toISODate(asOf);
  const ids = new Set(
    requestsOnDate(requests, iso)
      .filter((r) => r.status === 'Approved')
      .map((r) => r.employeeId),
  );
  return employees.filter((e) => ids.has(e.id));
}

/** Round to one decimal so half-days stay exact and floats don't leak. */
export function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Half-day / unpaid leave types are not charged against the paid allowance. */
export function defaultPayStatus(leaveType: string): 'Paid' | 'Unpaid' {
  return leaveType === 'Unpaid Leave' ? 'Unpaid' : 'Paid';
}
