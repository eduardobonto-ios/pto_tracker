/**
 * PTO business rules.
 *
 * Everything here is pure and frontend-only. In the backend phase these
 * functions become the reference implementation for the equivalent SQL views /
 * Supabase RPCs — keep them free of React and of data-fetching concerns.
 */

import {
  PTO_ANNUAL_INCREMENT_DAYS,
  PTO_BASE_ENTITLEMENT_DAYS,
  PTO_ELIGIBILITY_MONTHS,
  PTO_MAX_ENTITLEMENT_DAYS,
  PTO_TENURE_RAMP_BASE_DAYS,
  PTO_TENURE_RAMP_INCREMENT_DAYS,
  PTO_TENURE_RAMP_MAX_DAYS,
  PTO_TERRITORY_MANAGER_JOB_TITLES,
} from './theme';
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
/**
 * When an employee becomes eligible to draw leave.
 *
 * An admin-set `eligibilityDateOverride` wins outright. Otherwise:
 *   US staff             eligible from their first day.
 *   Territory Managers   eligible from their first day, in either region.
 *                        Confirmed by Eduardo 2026-09-30 — the six-month rule
 *                        does not apply to them, which pairs with the existing
 *                        rule that they take the full entitlement at once
 *                        rather than ramping from the base.
 *   everyone else (PH)   six months after hire.
 *
 * THIS ALSO MOVES THE ANNUAL RESET. `currentPtoYearStart` keys off this date,
 * so making a Territory Manager eligible six months earlier starts their PTO
 * year six months earlier too — which pulls older leave back into the current
 * cycle and raises their Days Used. That is the intended reading: their year
 * runs from their hire anniversary, not from a six-month mark they never had.
 */
export function eligibilityDateFor(
  employee: Pick<Employee, 'hireDate' | 'jobTitle' | 'ptoRegion' | 'eligibilityDateOverride'>,
): string {
  if (employee.eligibilityDateOverride) return employee.eligibilityDateOverride;
  if (employee.ptoRegion === 'US') return employee.hireDate;
  if (PTO_TERRITORY_MANAGER_JOB_TITLES.includes(employee.jobTitle)) return employee.hireDate;
  return eligibilityDate(employee.hireDate);
}

/** Raw PH rule: hire date + 6 months. Prefer `eligibilityDateFor`. */
export function eligibilityDate(hireDateIso: string): string {
  const d = parseISODate(hireDateIso);
  const target = new Date(d.getFullYear(), d.getMonth() + PTO_ELIGIBILITY_MONTHS, d.getDate());
  // Guard month-overflow (e.g. Aug 31 + 6 months → Feb 31 → Mar 3).
  if (target.getDate() !== d.getDate()) target.setDate(0);
  return toISODate(target);
}

/** Anniversaries of `startIso` that have passed on or before `asOf`. */
function anniversariesSince(startIso: string, asOf: Date): number {
  const start = parseISODate(startIso);
  let count = 0;
  let year = start.getFullYear() + 1;
  for (;;) {
    const a = new Date(year, start.getMonth(), start.getDate());
    // Guard month-overflow the same way eligibilityDate does (Feb 29 → Mar 1).
    if (a.getMonth() !== start.getMonth()) a.setDate(0);
    if (a.getTime() > asOf.getTime()) break;
    count += 1;
    year += 1;
  }
  return count;
}

// `isEligible(hireDateIso)` used to live here. Removed 2026-09-30: it applied
// the PH six-month rule to a bare hire date, so it silently gave the wrong
// answer for US staff, for Territory Managers in either region, and for anyone
// with an eligibility override. It had no callers. Use
// `eligibilityDateFor(employee)` — or `computeBalance(...).eligible`, which is
// what every screen already reads.

/**
 * Whether this employee grows/resets their PTO on their hire-date
 * anniversary (true) or on the legacy June 1 date (false) — see the cohort
 * rules documented next to `PTO_NEW_HIRE_COHORT_START_YEAR` in `lib/theme.ts`.
 * Territory Managers are always on the anniversary cohort, regardless of
 * hire year.
 */


/**
 * Annual PTO entitlement, computed purely from the employee's Hire Date and
 * job title — see the rules documented next to the constants in
 * `lib/theme.ts`.
 *
 * Returns 0 for anyone who has not yet reached their eligibility date. PH
 * staff never exceed `PTO_MAX_ENTITLEMENT_DAYS` afterwards, and Territory
 * Managers reach it immediately once eligible instead of graduating.
 *
 * US staff take `fixedPtoDays`, except those on the tenure ramp
 * (`ptoPlan === 'tenure_ramp'`), who graduate from
 * `PTO_TENURE_RAMP_BASE_DAYS` to `PTO_TENURE_RAMP_MAX_DAYS` — a higher ceiling
 * than the PH cap, and the one place a US hire date is load-bearing.
 */
export function computeEntitlement(
  employee: Pick<
    Employee,
    'hireDate' | 'jobTitle' | 'ptoRegion' | 'fixedPtoDays' | 'ptoPlan' | 'eligibilityDateOverride'
  >,
  asOf: Date = new Date(),
): number {
  const eligible = parseISODate(eligibilityDateFor(employee));
  if (asOf.getTime() < eligible.getTime()) return 0;

  if (employee.ptoRegion === 'US') {
    // The tenure ramp: 10 days, +1 per completed year of SERVICE, capped at
    // 15 — see PTO_TENURE_RAMP_* in lib/theme.ts. Unlike every other rule in
    // this file it counts anniversaries of the hire date, not the eligibility
    // date, and it ignores fixedPtoDays outright.
    if (employee.ptoPlan === 'tenure_ramp') {
      const days =
        PTO_TENURE_RAMP_BASE_DAYS +
        PTO_TENURE_RAMP_INCREMENT_DAYS * anniversariesSince(employee.hireDate, asOf);
      return Math.min(days, PTO_TENURE_RAMP_MAX_DAYS);
    }
    // Otherwise a negotiated figure that never moves with tenure. It is the
    // sum of their vacation, sick and personal allowances from the US sheet.
    return employee.fixedPtoDays ?? 0;
  }

  // PH staff start at the base and gain PTO_ANNUAL_INCREMENT_DAYS on each
  // anniversary of their ELIGIBILITY date — not their hire date, and not
  // June 1. Confirmed with Princes 2026-09-24.
  if (PTO_TERRITORY_MANAGER_JOB_TITLES.includes(employee.jobTitle)) {
    return PTO_MAX_ENTITLEMENT_DAYS;
  }
  const days =
    PTO_BASE_ENTITLEMENT_DAYS + PTO_ANNUAL_INCREMENT_DAYS * anniversariesSince(eligibilityDateFor(employee), asOf);
  return Math.min(days, PTO_MAX_ENTITLEMENT_DAYS);
}


/**
 * ISO date on which the employee's *current* PTO year began — the reset
 * boundary for `daysUsed`/`pendingDays` in `computeBalance`. Anniversary-
 * cohort employees (see `usesAnniversaryReset`) reset on their most recent
 * hire-date anniversary; legacy-cohort employees reset on the most recent
 * June 1, floored at their eligibility date so a mid-cycle new eligible
 * hire doesn't inherit a start date before they could have used any leave.
 */
export function currentPtoYearStart(
  employee: Pick<Employee, 'hireDate' | 'jobTitle' | 'ptoRegion' | 'eligibilityDateOverride'>,
  asOf: Date = new Date(),
): string {
  // Both regions now reset on the anniversary of the ELIGIBILITY date — the
  // old split between hire-date and June-1 cohorts is gone. Confirmed with
  // Princes 2026-09-24. Before eligibility there is no cycle to be in, so the
  // eligibility date itself is the floor.
  const eligibleIso = eligibilityDateFor(employee);
  const eligible = parseISODate(eligibleIso);
  if (asOf.getTime() < eligible.getTime()) return eligibleIso;

  const passed = anniversariesSince(eligibleIso, asOf);
  if (passed === 0) return eligibleIso;
  const start = new Date(eligible.getFullYear() + passed, eligible.getMonth(), eligible.getDate());
  if (start.getMonth() !== eligible.getMonth()) start.setDate(0);
  return toISODate(start);
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
 * surfaced separately and never permanently deduct until approval. Cancelled
 * and Rejected requests never reach either bucket, so they never deduct.
 */
export function computeBalance(employee: Employee, requests: PTORequest[]): PTOBalance {
  // Only requests within the employee's current PTO year count toward usage
  // — see `currentPtoYearStart`. Requests from a prior PTO year that's since
  // reset no longer draw down this year's balance.
  const periodStart = currentPtoYearStart(employee);
  const mine = requests.filter(
    (r) => r.employeeId === employee.id && r.startDate >= periodStart,
  );
  const daysUsed = round(
    mine
      .filter((r) => r.status === 'Approved' && r.payStatus === 'Paid')
      .reduce((sum, r) => sum + r.days, 0),
  );
  const pendingDays = round(
    mine.filter((r) => r.status === 'Pending').reduce((sum, r) => sum + r.days, 0),
  );
  const eligible = parseISODate(eligibilityDateFor(employee)).getTime() <= Date.now();
  // Entitlement is derived from Hire Date/job title rather than the legacy
  // per-employee allowance field — see `computeEntitlement` / lib/theme.ts.
  const totalPto = computeEntitlement(employee);
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
    eligibilityDate: eligibilityDateFor(employee),
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
 * Rejected and Cancelled requests are excluded; Pending and Approved both
 * count so a manager can spot a brewing conflict before it's even approved.
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
    .filter((r) => r.status !== 'Rejected' && r.status !== 'Cancelled')
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
