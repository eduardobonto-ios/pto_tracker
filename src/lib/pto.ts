/**
 * PTO business rules.
 *
 * Everything here is pure and frontend-only. In the backend phase these
 * functions become the reference implementation for the equivalent SQL views /
 * Supabase RPCs — keep them free of React and of data-fetching concerns.
 */

import {
  PTO_ACCRUAL_CREDIT_ON_ANNIVERSARY,
  PTO_ACCRUAL_DAYS_PER_PERIOD,
  PTO_ACCRUAL_ENABLED,
  PTO_ACCRUAL_PERIOD_DAYS,
  PTO_ANNUAL_INCREMENT_DAYS,
  PTO_BASE_ENTITLEMENT_DAYS,
  PTO_ELIGIBILITY_MONTHS,
  PTO_HOURS_PER_DAY,
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
 * The tenure ramp: `PTO_TENURE_RAMP_BASE_DAYS`, plus
 * `PTO_TENURE_RAMP_INCREMENT_DAYS` per completed year of SERVICE, capped at
 * `PTO_TENURE_RAMP_MAX_DAYS` — see `PTO_TENURE_RAMP_*` in `lib/theme.ts`.
 *
 * Unlike every other rule in this file it counts anniversaries of the hire
 * date, not of the eligibility date, and it ignores `fixedPtoDays` outright.
 */
function tenureRampDays(hireDateIso: string, asOf: Date): number {
  const days =
    PTO_TENURE_RAMP_BASE_DAYS +
    PTO_TENURE_RAMP_INCREMENT_DAYS * anniversariesSince(hireDateIso, asOf);
  return Math.min(days, PTO_TENURE_RAMP_MAX_DAYS);
}

/**
 * Annual PTO entitlement, computed purely from the employee's Hire Date, job
 * title and plan — see the rules documented next to the constants in
 * `lib/theme.ts`.
 *
 * Returns 0 for anyone who has not yet reached their eligibility date.
 *
 * Afterwards, in order:
 *   tenure ramp   `ptoPlan === 'tenure_ramp'` in either region, and every PH
 *                 Territory Manager by job title. 10, +1 a year, cap 15.
 *   US otherwise  `fixedPtoDays`, a negotiated figure that never moves.
 *   PH otherwise  `PTO_BASE_ENTITLEMENT_DAYS`, +`PTO_ANNUAL_INCREMENT_DAYS` a
 *                 year, capped at `PTO_MAX_ENTITLEMENT_DAYS`.
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
    if (employee.ptoPlan === 'tenure_ramp') return tenureRampDays(employee.hireDate, asOf);
    // Otherwise a negotiated figure that never moves with tenure. It is the
    // sum of their vacation, sick and personal allowances from the US sheet.
    //
    // DELIBERATELY AHEAD OF THE JOB-TITLE RULE BELOW: a US Territory Manager
    // holds a negotiated figure like the rest of the US roster, and must not
    // be dropped onto the ramp because of their title.
    return employee.fixedPtoDays ?? 0;
  }

  // PH Territory Managers are on the tenure ramp, by title rather than by
  // column. Confirmed by Eduardo 2026-10-02 — this is Jason Welsford's "put
  // the ValveMan Territory Managers on this same plan", which patch_011 left
  // pending on Gil. It replaces the flat `PTO_MAX_ENTITLEMENT_DAYS` they used
  // to take the moment they became eligible.
  //
  // KEYED OFF THE TITLE, NOT ONLY `ptoPlan`, because account creation always
  // writes 'fixed' (see `AppContext#createAccount`) — a new Territory Manager
  // would otherwise land on the PH ramp at 5 days until someone remembered to
  // change the column by hand. patch_017 sets the column too, so the stored
  // data and the derived rule agree.
  //
  // Their day-one eligibility is unchanged — see `eligibilityDateFor`. Only
  // the number of days moved.
  if (
    employee.ptoPlan === 'tenure_ramp' ||
    PTO_TERRITORY_MANAGER_JOB_TITLES.includes(employee.jobTitle)
  ) {
    return tenureRampDays(employee.hireDate, asOf);
  }
  // PH staff start at the base and gain PTO_ANNUAL_INCREMENT_DAYS on each
  // anniversary of their HIRE date. Confirmed by Eduardo 2026-10-02 — this
  // replaces the eligibility-anniversary rule confirmed with Princes
  // 2026-09-24, and brings PH into line with the US ramp, which has always
  // counted service from the hire date.
  //
  // Eligibility still gates whether anything is drawable at all (the early
  // return above), so a PH employee seven months in is eligible on 5 days and
  // reaches 7 at their first hire anniversary rather than their eighteenth
  // month.
  const days =
    PTO_BASE_ENTITLEMENT_DAYS +
    PTO_ANNUAL_INCREMENT_DAYS * anniversariesSince(employee.hireDate, asOf);
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
  // THE ANCHOR IS THE HIRE DATE, not the eligibility date. Confirmed by
  // Eduardo 2026-10-02, replacing the eligibility-anniversary rule confirmed
  // with Princes 2026-09-24 — the yearly increase and the reset both key off
  // the hire date now, so they stay six months apart no longer.
  //
  // An `eligibilityDateOverride` still wins, because it is the admin escape
  // hatch for a cycle the derived rules get wrong — it is also what carries
  // the US staff's cycle start from the Welsford sheet. Every one of those
  // overrides shares its month and day with the hire date, so this change
  // moves no US cycle; it moves the PH ones six months earlier.
  const anchorIso = employee.eligibilityDateOverride || employee.hireDate;
  const eligibleIso = eligibilityDateFor(employee);
  const eligible = parseISODate(eligibleIso);
  // Before eligibility there is no cycle to be in.
  if (asOf.getTime() < eligible.getTime()) return eligibleIso;

  const anchor = parseISODate(anchorIso);
  const passed = anniversariesSince(anchorIso, asOf);
  let start = anchor;
  if (passed > 0) {
    start = new Date(anchor.getFullYear() + passed, anchor.getMonth(), anchor.getDate());
    // Guard month-overflow the same way eligibilityDate does (Feb 29 → Feb 28).
    if (start.getMonth() !== anchor.getMonth()) start.setDate(0);
  }
  // A cycle cannot begin before the employee could take any leave. PH staff
  // hired mid-year would otherwise open a cycle months before their six-month
  // mark and count leave they were never entitled to.
  return start.getTime() < eligible.getTime() ? eligibleIso : toISODate(start);
}


/**
 * How much of this PTO year's entitlement the employee has actually earned so
 * far, accruing biweekly — see the `PTO_ACCRUAL_*` block in `lib/theme.ts`.
 *
 * One credit lands on the anniversary itself and another every
 * `PTO_ACCRUAL_PERIOD_DAYS`, `PTO_ACCRUAL_DAYS_PER_PERIOD` at a time, until
 * the annual entitlement is reached — the shape Princes was given, worked
 * through on her own 1 January / ten-credit case in `lib/theme.ts`. The year
 * is not divided up; it is earned a day at a time and then stops.
 *
 * Returns the full entitlement when accrual is switched off, which makes every
 * caller — and `daysRemaining` in particular — collapse back to the old
 * grant-it-up-front behaviour with no other change.
 */
export function accruedDays(
  employee: Pick<
    Employee,
    'hireDate' | 'jobTitle' | 'ptoRegion' | 'fixedPtoDays' | 'ptoPlan' | 'eligibilityDateOverride'
  >,
  asOf: Date = new Date(),
): number {
  const entitlement = computeEntitlement(employee, asOf);
  if (entitlement <= 0) return 0;
  if (!PTO_ACCRUAL_ENABLED) return entitlement;

  const start = parseISODate(currentPtoYearStart(employee, asOf));
  const elapsedDays = Math.floor((asOf.getTime() - start.getTime()) / 86_400_000);
  if (elapsedDays < 0) return 0;

  // The day-one credit, plus one for every completed fortnight since.
  const periods =
    (PTO_ACCRUAL_CREDIT_ON_ANNIVERSARY ? 1 : 0) +
    Math.floor(elapsedDays / PTO_ACCRUAL_PERIOD_DAYS);
  // Accrual stops at the entitlement rather than continuing to the year end,
  // so a ten-day entitlement is fully banked after ten periods.
  return round(Math.min(periods * PTO_ACCRUAL_DAYS_PER_PERIOD, entitlement));
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
    // A fraction of an 8-hour day, NOT rounded to the nearest half day.
    //
    // Rounding to halves silently destroyed every short request: one hour is
    // 0.125 of a day, which rounded to 0, so Ryan Driscoll's genuine 1-hour
    // personal leave on 2026-10-08 was filed, approved and recorded as zero
    // days. Reported by Will 2026-10-06.
    //
    // Four decimals is past the precision of any time input the form can
    // produce (it rounds to 2dp of an hour) and keeps the common cases exact:
    // 1h = 0.125, 2h = 0.25, 4h = 0.5.
    return Math.round((totalHours / PTO_HOURS_PER_DAY) * 10_000) / 10_000;
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
  const chargeable = mine.filter((r) => r.status === 'Approved' && r.payStatus === 'Paid');
  const daysUsed = round(chargeable.reduce((sum, r) => sum + r.days, 0));
  // Leave that has already started draws against what has been accrued so
  // far; leave still to come does not. Without this split, anyone who books
  // ahead reads as overdrawn on days they have not taken — Chris Stolzer
  // showed -4.2 against 3.0 days of October-to-December bookings when the
  // leave he had actually taken put him at -1.2.
  //
  // The boundary is the request's START date, so a leave that is underway
  // counts in full from its first day rather than accruing partway through.
  const todayIso = toISODate(new Date());
  const daysTaken = round(
    chargeable.filter((r) => r.startDate <= todayIso).reduce((sum, r) => sum + r.days, 0),
  );
  const daysScheduled = round(daysUsed - daysTaken);
  const pendingDays = round(
    mine.filter((r) => r.status === 'Pending').reduce((sum, r) => sum + r.days, 0),
  );
  const eligible = parseISODate(eligibilityDateFor(employee)).getTime() <= Date.now();
  // Entitlement is derived from Hire Date/job title rather than the legacy
  // per-employee allowance field — see `computeEntitlement` / lib/theme.ts.
  const totalPto = computeEntitlement(employee);
  // What they have actually earned so far, which is what they can draw on.
  const accrued = accruedDays(employee);
  // An employee who has not cleared their eligibility date cannot draw down
  // yet, so their remaining balance reads 0 until it passes.
  //
  // DELIBERATELY ALLOWED TO GO NEGATIVE. Taking more than you have accrued is
  // permitted — the email asked for it explicitly — so this is not clamped at
  // zero. Every screen that shows it renders a negative in red.
  //
  // Measured against `daysTaken`, not `daysUsed`: future-dated approved leave
  // is committed but not yet drawn, and will have been earned by the time it
  // is taken.
  const daysRemaining = eligible ? round(accrued - daysTaken) : 0;
  // % of the whole year consumed, not % of what's accrued — otherwise someone
  // one pay period into a new year reads 100% after a single day off.
  const percentUsed = eligible && totalPto > 0 ? Math.round((daysUsed / totalPto) * 100) : 0;

  return {
    employeeId: employee.id,
    totalPto,
    accruedDays: eligible ? accrued : 0,
    daysUsed,
    daysTaken,
    daysScheduled,
    pendingDays,
    daysRemaining,
    unaccruedDays: eligible ? round(Math.max(totalPto - accrued, 0)) : 0,
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

/**
 * Round to two decimals so half-days stay exact and floats don't leak.
 *
 * Two rather than one since sub-half-day leave became real: an hour is 0.125
 * of a day, and at one decimal a balance made of short requests drifted. Whole
 * days and half days are unaffected, and `formatDays` still displays at one
 * decimal, so no figure on screen changes shape.
 */
export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Half-day / unpaid leave types are not charged against the paid allowance. */
export function defaultPayStatus(leaveType: string): 'Paid' | 'Unpaid' {
  return leaveType === 'Unpaid Leave' ? 'Unpaid' : 'Paid';
}
