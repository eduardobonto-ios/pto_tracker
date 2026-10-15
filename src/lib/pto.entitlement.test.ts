// Run with:  npx tsx src/lib/pto.entitlement.test.ts
// (or paste into any TS runner — no framework, no imports beyond the module.)
//
// Covers the PH/US entitlement split confirmed with Princes 2026-09-24/25.
// This decides how much leave real people get, so the cases below are the ones
// that would be expensive to get wrong.
import {
  accruedDays,
  computeDays,
  round,
  computeBalance,
  computeEntitlement,
  payStatusFor,
  greenPlanMismatches,
  isGreenPlanEmployee,
  currentPtoYearStart,
  eligibilityDateFor,
} from './pto';
import { PTO_ACCRUAL_ENABLED, PTO_GREEN_PLAN_EMAILS } from './theme';
import type { Employee, PTORequest } from '@/types';

let pass = 0,
  fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got),
    w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}\n       got  ${g}\n       want ${w}`);
  }
}

const AS_OF = new Date(2026, 8, 25); // 25 Sep 2026

const ph = (over: Partial<Employee> = {}): Employee =>
  ({
    id: 'e',
    sheetNo: 1,
    name: 'Test',
    email: 't@valveman.com',
    jobTitle: 'Executive Assistant',
    department: 'Administration',
    hireDate: '2025-01-08',
    annualPtoAllowance: 5,
    ptoRegion: 'PH',
    ptoPlan: 'fixed',
    appRole: 'Employee',
    active: true,
    ...over,
  }) as Employee;

const us = (over: Partial<Employee> = {}): Employee =>
  ph({ ptoRegion: 'US', email: 't@fswelsford.com', fixedPtoDays: 20, ...over });

/** US employee on the tenure ramp: 10 days, +1/year of service, cap 15. */
const ramp = (over: Partial<Employee> = {}): Employee =>
  us({ ptoPlan: 'tenure_ramp', ...over });

// --- eligibility -----------------------------------------------------------
check('PH eligible six months after hire', eligibilityDateFor(ph({ hireDate: '2025-01-08' })), '2025-07-08');
check('US waits six months too', eligibilityDateFor(us({ hireDate: '2026-08-11' })), '2027-02-11');
check('override beats the PH rule',
  eligibilityDateFor(ph({ hireDate: '2025-01-08', eligibilityDateOverride: '2025-03-01' })), '2025-03-01');
check('override beats the US rule',
  eligibilityDateFor(us({ hireDate: '2026-08-11', eligibilityDateOverride: '2026-01-01' })), '2026-01-01');
// Month-overflow: 31 Aug + 6 months must not land in March.
check('eligibility clamps short months', eligibilityDateFor(ph({ hireDate: '2024-08-31' })), '2025-02-28');

// --- US: fixed, never grows ------------------------------------------------
check('US takes fixedPtoDays', computeEntitlement(us({ fixedPtoDays: 22, hireDate: '2020-08-11' }), AS_OF), 22);
check('US does not grow with tenure',
  computeEntitlement(us({ fixedPtoDays: 20, hireDate: '2019-06-13' }), AS_OF), 20);
check('US with no fixed days reads 0',
  computeEntitlement(us({ fixedPtoDays: undefined, hireDate: '2026-01-06' }), AS_OF), 0);
// Hired today: six months short, so nothing is drawable yet. This read 10
// until 2026-10-13, when the six-month wait became universal.
check('US hired today must still wait six months',
  computeEntitlement(us({ fixedPtoDays: 10, hireDate: '2026-09-25' }), AS_OF), 0);

// --- US tenure ramp: 10 base, +1 per anniversary since the plan start ------
// Service before PTO_TENURE_RAMP_START earns nothing — everyone on the ramp
// was granted the base when the plan began, exactly as the PH plan works.
// Confirmed by Eduardo 2026-10-14. These read 11/14/15 while the ramp counted
// total service.
check('no service at all → the base', computeEntitlement(ramp({ hireDate: '2026-01-12' }), AS_OF), 10);
check('one year of service → still the base',
  computeEntitlement(ramp({ hireDate: '2025-01-06' }), AS_OF), 10);
check('four years of service → still the base',
  computeEntitlement(ramp({ hireDate: '2022-01-06' }), AS_OF), 10);
check('sixteen years of service → still the base',
  computeEntitlement(ramp({ hireDate: '2010-01-06' }), AS_OF), 10);
// An anniversary AFTER the plan start does earn one. 6 Jan 2027 is the first.
const JAN_2027 = new Date(2027, 0, 6);
check('the first anniversary after the plan start earns a day',
  computeEntitlement(ramp({ hireDate: '2025-01-06' }), JAN_2027), 11);
check('and the day before it does not',
  computeEntitlement(ramp({ hireDate: '2025-01-06' }), new Date(2027, 0, 5)), 10);
// The cap still binds, five earned increases after the plan start.
check('ramp caps at 15',
  computeEntitlement(ramp({ hireDate: '2025-01-06' }), new Date(2032, 0, 6)), 15);
check('and does not keep climbing past it',
  computeEntitlement(ramp({ hireDate: '2025-01-06' }), new Date(2040, 0, 6)), 15);
// The ramp counts HIRE anniversaries, not eligibility ones.
check('ramp keys off hire date, not the eligibility override',
  computeEntitlement(ramp({ hireDate: '2025-01-06', eligibilityDateOverride: '2026-01-06' }), JAN_2027), 11);
// patch_011 leaves fixed_pto_days populated on ramp employees on purpose.
check('tenure ramp ignores a stale fixedPtoDays',
  computeEntitlement(ramp({ fixedPtoDays: 20, hireDate: '2026-01-12' }), AS_OF), 10);
check('ramp still waits for a future eligibility override',
  computeEntitlement(ramp({ hireDate: '2020-01-06', eligibilityDateOverride: '2027-01-01' }), AS_OF), 0);
// Feb 29 has no anniversary in a common year; it must clamp back, not skip to
// Mar 1 and lose a day of service.
check('ramp clamps a Feb 29 hire date',
  computeEntitlement(ramp({ hireDate: '2024-02-29' }), new Date(2027, 2, 1)), 11);

// ptoPlan is no longer a US-only concept (patch_018). A PH employee put on
// the ramp takes 10 + 1/yr from the HIRE date, not the PH base of 5 counted
// from the plan start — the same hire date reads 5 on the PH plan and 11 here.
check('ptoPlan now applies to PH staff too',
  computeEntitlement(ph({ ptoPlan: 'tenure_ramp', hireDate: '2025-01-08' }), AS_OF), 10);
check('the same PH hire date on the default plan still reads 5',
  computeEntitlement(ph({ hireDate: '2025-01-08' }), AS_OF), 5);
// The ramp moves entitlement; it must NOT move the annual reset, which still
// follows the eligibility override.
check('ramp leaves the reset on the eligibility override',
  currentPtoYearStart(ramp({ hireDate: '2025-01-06', eligibilityDateOverride: '2026-01-06' }), AS_OF),
  '2026-01-06');

// --- PH: everyone starts on the base; +1 from the plan start onwards -------
// Confirmed by Eduardo 2026-10-13. PH staff were granted their INITIAL five
// days when the plan began (PTO_PH_RAMP_START); service before that does not
// carry. So at AS_OF every PH employee reads 5 however long they have been
// here — a four-year employee and a seven-month one are level.
check('PH long service still starts on the base',
  computeEntitlement(ph({ hireDate: '2022-09-26' }), AS_OF), 5);
check('PH three years still starts on the base',
  computeEntitlement(ph({ hireDate: '2023-07-10' }), AS_OF), 5);
check('PH one year still starts on the base',
  computeEntitlement(ph({ hireDate: '2025-01-08' }), AS_OF), 5);
// A June anniversary falls BEFORE the plan start, so it earns nothing. This is
// the case that pins the cut-off: Veam and Mabel must not rise this year.
check('an anniversary before the plan start earns nothing',
  computeEntitlement(ph({ hireDate: '2025-06-23' }), AS_OF), 5);
check('nor does a July one', computeEntitlement(ph({ hireDate: '2023-07-10' }), AS_OF), 5);
check('PH not yet eligible → 0', computeEntitlement(ph({ hireDate: '2026-05-26' }), AS_OF), 0);
// An override moves eligibility and the reset, but NOT the ramp.
check('an override does not shift the ramp',
  computeEntitlement(ph({ hireDate: '2025-06-23', eligibilityDateOverride: '2025-01-01' }), AS_OF), 5);

// A year on, the increases that have actually been earned under the plan show
// up. 1 Jul 2027 is past Kazutomo's Sep 2026 and Princes's Dec 2026
// anniversaries, and past April's Jan 2027 one.
const AS_OF_2027 = new Date(2027, 6, 1); // 1 Jul 2027
check('Kazutomo: one increase earned since the plan start',
  computeEntitlement(ph({ hireDate: '2022-09-26' }), AS_OF_2027), 6);
check('Princes: her December anniversary counts',
  computeEntitlement(ph({ hireDate: '2025-12-08' }), AS_OF_2027), 6);
check('April: her January 2027 anniversary counts',
  computeEntitlement(ph({ hireDate: '2025-01-08' }), AS_OF_2027), 6);
// Jlydie's anniversary is 10 July — still one week away at this AS_OF, and her
// 2026 one fell before the plan start, so she is on the base a year in.
check('a July anniversary has still not come round',
  computeEntitlement(ph({ hireDate: '2023-07-10' }), AS_OF_2027), 5);
// The cap still binds, five earned increases after the plan start.
check('PH caps at 10',
  computeEntitlement(ph({ hireDate: '2020-01-01' }), new Date(2032, 0, 2)), 10);

// --- ramp_exempt: the ramp's endpoints, nothing between ---------------------
// Will Berget, hired 2026-08-19. Eligible from day one, unlike everyone else,
// because the plan has to pay its base inside the hire year.
const exempt = (over: Partial<Employee> = {}): Employee =>
  us({ ptoPlan: 'ramp_exempt', fixedPtoDays: 10, ...over });
check('exempt is eligible from day one',
  eligibilityDateFor(exempt({ hireDate: '2026-08-19' })), '2026-08-19');
check('exempt reads the ramp base in the hire year',
  computeEntitlement(exempt({ hireDate: '2026-08-19' }), AS_OF), 10);
// The whole point: the first anniversary goes straight to the cap, not to 11.
check('exempt jumps to the cap on the first anniversary',
  computeEntitlement(exempt({ hireDate: '2026-08-19' }), new Date(2027, 7, 19)), 15);
check('and the day before is still the base',
  computeEntitlement(exempt({ hireDate: '2026-08-19' }), new Date(2027, 7, 18)), 10);
check('exempt stays at the cap thereafter',
  computeEntitlement(exempt({ hireDate: '2026-08-19' }), new Date(2031, 0, 1)), 15);
// A plain ramp hire on the same date would climb a day at a time instead.
check('the ordinary ramp would read 11 on that date',
  computeEntitlement(ramp({ hireDate: '2026-08-19' }), new Date(2027, 7, 19)), 11);

// --- the green list from the directory -------------------------------------
// The sheet is the source of truth and nothing syncs it, so these cases exist
// to make a drift between it and pto_plan fail loudly.
check('the green list holds the six from the directory', PTO_GREEN_PLAN_EMAILS.length, 6);
check('green is matched case-insensitively',
  isGreenPlanEmployee({ email: 'DMushrush@fswelsford.com' }), true);
check('a non-green address is not green',
  isGreenPlanEmployee({ email: 'nmullen@fswelsford.com' }), false);
check('a missing address is not green', isGreenPlanEmployee({ email: '' }), false);

// A green row stored as 'fixed' must still take the ramp, so a stale column
// cannot underpay. This is the failure the four Territory Managers hit.
check('a green row stored as fixed still takes the ramp',
  computeEntitlement(
    us({ email: 'dylan@valveman.com', ptoPlan: 'fixed', fixedPtoDays: 5, hireDate: '2024-01-01' }),
    AS_OF,
  ), 10);
// ...and it is reported rather than silently corrected.
// Filtered to the row under test: a one-element roster also reports the other
// five green addresses as absent, which is itself correct behaviour.
check('that same row is reported as a mismatch',
  greenPlanMismatches([{ name: 'Dylan Lavern', email: 'dylan@valveman.com', ptoPlan: 'fixed' }])
    .filter((m) => m.email === 'dylan@valveman.com').length, 1);
check('a correct green row is not reported',
  greenPlanMismatches([{ name: 'Dylan Lavern', email: 'dylan@valveman.com', ptoPlan: 'tenure_ramp' }])
    .filter((m) => m.email === 'dylan@valveman.com').length, 0);
// Drift the other way: someone on the ramp who is no longer green.
check('a non-green row on the ramp is reported',
  greenPlanMismatches([{ name: 'X', email: 'x@valveman.com', ptoPlan: 'tenure_ramp' }])
    .filter((m) => m.email === 'x@valveman.com').length, 1);
// Will is exempt by individual arrangement, not by being green — not a drift.
check('the exempt plan is not treated as drift',
  greenPlanMismatches([{ name: 'Will Berget', email: 'wberget@fswelsford.com', ptoPlan: 'ramp_exempt' }])
    .filter((m) => m.email === 'wberget@fswelsford.com').length, 0);
// A green address that has left the roster entirely is also drift.
check('a green address missing from the roster is reported',
  greenPlanMismatches([]).length, 6);

// --- pay status at filing time ---------------------------------------------
// Reversed on 2026-10-15: once the allowance is spent, further leave is unpaid
// rather than paid-and-negative. See payStatusFor for why accrual's removal
// changed the answer.
check('inside the allowance is paid',
  payStatusFor({ leaveType: 'Vacation Leave', eligible: true, daysAvailable: 3 }), 'Paid');
check('allowance exactly spent is unpaid',
  payStatusFor({ leaveType: 'Vacation Leave', eligible: true, daysAvailable: 0 }), 'Unpaid');
check('already overdrawn is unpaid',
  payStatusFor({ leaveType: 'Vacation Leave', eligible: true, daysAvailable: -2 }), 'Unpaid');
// A partly covered request keeps full pay: one pay status covers every day of
// a request, so marking it unpaid would cost days the employee had earned.
check('partly covered stays paid',
  payStatusFor({ leaveType: 'Vacation Leave', eligible: true, daysAvailable: 2 }), 'Paid');
// Not eligible beats everything — there is no entitlement to draw against.
check('not eligible is unpaid even with days showing',
  payStatusFor({ leaveType: 'Vacation Leave', eligible: false, daysAvailable: 5 }), 'Unpaid');
// The leave type still decides on its own.
check('Unpaid Leave is unpaid even with days left',
  payStatusFor({ leaveType: 'Unpaid Leave', eligible: true, daysAvailable: 5 }), 'Unpaid');
check('no leave type chosen yet, with days left, is paid',
  payStatusFor({ leaveType: undefined, eligible: true, daysAvailable: 5 }), 'Paid');

// --- PTO year reset --------------------------------------------------------
check('PH year starts on the hire anniversary',
  currentPtoYearStart(ph({ hireDate: '2025-01-08' }), AS_OF), '2026-01-08');
// The anchor is still the HIRE date, but a cycle cannot open before any leave
// could be taken. Hired 2025-12-01 with no anniversary yet, so the first cycle
// floors at the six-month mark. This read 2025-12-01 while US staff were
// eligible on day one.
check('a first US cycle floors at the six-month mark',
  currentPtoYearStart(us({ hireDate: '2025-12-01' }), AS_OF), '2026-06-01');
// Once an anniversary has passed the anchor wins and the floor is irrelevant —
// which is every US employee on the roster today.
check('an established US cycle follows the hire anniversary',
  currentPtoYearStart(us({ hireDate: '2020-12-01' }), AS_OF), '2025-12-01');
check('the cycle follows the hire anniversary once one has passed',
  currentPtoYearStart(ph({ hireDate: '2025-06-30' }), AS_OF), '2026-06-30');
// Floor: hired 2025-11-01, eligible 2026-05-01, and the next hire anniversary
// is still ahead — so the cycle opens at eligibility, not eight months before
// they could take anything.
check('a cycle cannot open before eligibility',
  currentPtoYearStart(ph({ hireDate: '2025-11-01' }), AS_OF), '2026-05-01');
check('before eligibility the cycle floors at eligibility',
  currentPtoYearStart(ph({ hireDate: '2026-05-26' }), AS_OF), '2026-11-26');
check('reset follows the override',
  currentPtoYearStart(ph({ hireDate: '2025-06-23', eligibilityDateOverride: '2025-01-01' }), AS_OF),
  '2026-01-01');

// --- Territory Managers ----------------------------------------------------
// Two rules, both keyed off PTO_TERRITORY_MANAGER_JOB_TITLES:
//   1. eligible from day one, either region (confirmed 2026-09-30)
//   2. the TENURE ramp, for PH staff — 10, +1 a year, cap 15 (confirmed
//      2026-10-02, patch_018; was a flat 10 with no ramp)
const tm = (over: Partial<Employee> = {}): Employee =>
  ph({ jobTitle: 'Territory Manager', ...over });

// TMs lost their day-one exemption on 2026-10-13: six months is universal.
check('TM waits six months like everyone else',
  eligibilityDateFor(tm({ hireDate: '2025-06-15' })), '2025-12-15');
check('same hire date, non-TM, waits the same six months',
  eligibilityDateFor(ph({ hireDate: '2025-06-15' })), '2025-12-15');
// Dylan Lavern's real case: hired 2026-06-15, so his six months land on
// 2026-12-15. Until then he draws nothing — this is the one person the
// universal six-month wait actually costs, and it is deliberate.
check('TM inside six months draws nothing',
  computeEntitlement(tm({ hireDate: '2026-06-15' }), AS_OF), 0);
// Cleon Kemp / Josh Kirk / Amr Shweiky: one completed year, so 11 rather than
// the flat 10 they used to read.
check('TM starts on the ramp base like everyone else',
  computeEntitlement(tm({ hireDate: '2025-06-15' }), AS_OF), 10);
check('TM ramp caps at 15, above the PH cap of 10',
  computeEntitlement(tm({ hireDate: '2025-06-15' }), new Date(2032, 5, 15)), 15);
check('same dates, non-TM, stays on the PH base',
  computeEntitlement(ph({ hireDate: '2025-06-15' }), AS_OF), 5);
// The ramp must not reach back past eligibility.
check('TM eligibility is six months after hire',
  eligibilityDateFor(tm({ hireDate: '2026-06-15' })), '2026-12-15');
// A future hire date is still a future hire date — day one is not day zero.
check('TM hired after today is not yet entitled',
  computeEntitlement(tm({ hireDate: '2026-10-01' }), AS_OF), 0);
// An override still wins over the day-one rule, in both directions.
check('override can delay a TM past their hire date',
  eligibilityDateFor(tm({ hireDate: '2025-06-15', eligibilityDateOverride: '2026-12-01' })),
  '2026-12-01');
// Rule 1 moves the reset too: the PTO year now runs from the hire
// anniversary rather than from a six-month mark.
check('TM year starts on the hire anniversary',
  currentPtoYearStart(tm({ hireDate: '2025-02-17' }), AS_OF), '2026-02-17');
// Both now reset on the hire anniversary, TM or not — the six-month split in
// the reset is gone, and only eligibility still distinguishes them.
check('same hire date, non-TM, resets on the same day',
  currentPtoYearStart(ph({ hireDate: '2025-02-17' }), AS_OF), '2026-02-17');
// US takes precedence — fixedPtoDays wins even for a Territory Manager.
check('US Territory Manager takes fixed days, not 10',
  computeEntitlement(us({ jobTitle: 'Territory Manager', fixedPtoDays: 20 }), AS_OF), 20);

// --- biweekly accrual ------------------------------------------------------
// One credit on the anniversary, +1 every 14 days, stopping at the
// entitlement. These four cases ARE Princes's worked example: a 1 January
// anniversary on ten credits reading 1, 2, 3, 4 on Jan 1 / 15 / 30 / Feb 15.
// An earlier attempt divided the entitlement by 26 and produced 0, 0.4, 0.8,
// 1.2 on the same dates, so these are the cases that pin the rate.
// Ten days on a 1 January cycle. This deliberately uses a FIXED ten-day
// employee rather than a PH one: these cases pin the accrual rate, and tying
// them to whatever the PH plan happens to pay would break them every time that
// rule moves — which it has, twice. It read a PH hire until 2026-10-13, when
// PH increases started counting from the plan start and the same hire date
// dropped from ten days to six.
const janFirst = (asOf: Date) =>
  accruedDays(us({ fixedPtoDays: 10, hireDate: '2020-01-01', eligibilityDateOverride: '2020-01-01' }), asOf);

if (!PTO_ACCRUAL_ENABLED) {
  // Accrual is off: the whole entitlement is available from the first day of
  // the cycle. The cadence cases below are kept and run only when it is on,
  // because this decision has already reversed twice.
  check('with accrual off, day one already has the whole year',
    janFirst(new Date(2027, 0, 1)), 10);
  check('and it does not change later in the cycle',
    janFirst(new Date(2027, 4, 20)), 10);
  check('a 20-day entitlement is likewise whole from day one',
    accruedDays(us({ fixedPtoDays: 20, hireDate: '2020-01-01', eligibilityDateOverride: '2020-01-01' }),
      new Date(2027, 0, 1)), 20);
} else {
  check('Princes: Jan 1 -> 1 credit', janFirst(new Date(2027, 0, 1)), 1);
  check('Princes: Jan 15 -> 2', janFirst(new Date(2027, 0, 15)), 2);
  check('Princes: Jan 30 -> 3', janFirst(new Date(2027, 0, 30)), 3);
  check('Princes: Feb 15 -> 4', janFirst(new Date(2027, 1, 15)), 4);
  // Accrual stops at the entitlement instead of running to the year end: ten
  // credits are fully banked ten periods in, around mid-May.
  check('ten days are fully accrued after ten periods',
    janFirst(new Date(2027, 4, 20)), 10);
  check('and does not keep climbing past the entitlement',
    janFirst(new Date(2027, 10, 1)), 10);
  // A bigger entitlement simply takes longer to fill.
  check('20 days is not yet full at ten periods',
    accruedDays(us({ fixedPtoDays: 20, hireDate: '2020-01-01', eligibilityDateOverride: '2020-01-01' }),
      new Date(2027, 4, 20)), 10);
  // Day one of a cycle is never empty — that was the part Princes was clearest
  // about, and the part the first attempt got wrong.
  check('a fresh cycle opens with a credit, not zero',
    accruedDays(us({ fixedPtoDays: 20, hireDate: '2020-09-25', eligibilityDateOverride: '2026-09-25' }), AS_OF), 1);
  // Periods are whole: 13 days in is still the day-one credit alone.
  check('a part period accrues nothing further',
    accruedDays(us({ fixedPtoDays: 20, hireDate: '2020-09-12', eligibilityDateOverride: '2026-09-12' }), AS_OF), 1);
}

// Nothing accrues before eligibility, because there is no entitlement yet.
check('not yet eligible accrues nothing',
  accruedDays(ph({ hireDate: '2026-05-26' }), AS_OF), 0);
// Accrual can never exceed the entitlement it is filling.
check('accrued never exceeds the annual entitlement',
  accruedDays(ph({ hireDate: '2022-09-26' }), AS_OF) <= computeEntitlement(ph({ hireDate: '2022-09-26' }), AS_OF),
  true);

// --- taken vs scheduled ----------------------------------------------------
// computeBalance reads the real clock, so these build dates relative to today
// rather than to AS_OF — otherwise the suite would rot.
const shift = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const leave = (id: string, startIso: string, days: number): PTORequest =>
  ({
    id, employeeId: 'split', requestDate: startIso, leaveType: 'Vacation Leave',
    startDate: startIso, endDate: startIso, durationType: 'Full Day', days,
    status: 'Approved', payStatus: 'Paid', coverage: '', reason: '', notes: '',
    timeline: [],
  }) as PTORequest;

// Eligible a year ago, so the cycle is well underway and plenty has accrued.
const splitter = us({
  id: 'split', fixedPtoDays: 20, hireDate: shift(-400), eligibilityDateOverride: shift(-200),
}) as Employee;
const splitBalance = computeBalance(splitter, [
  leave('past-1', shift(-30), 2),
  leave('past-2', shift(-1), 1),
  leave('future-1', shift(30), 3),
]);

check('daysUsed still counts every approved day, as the sheet does',
  splitBalance.daysUsed, 6);
check('daysTaken counts only leave that has started', splitBalance.daysTaken, 3);
check('daysScheduled counts only leave still to come', splitBalance.daysScheduled, 3);
check('taken + scheduled reconciles back to daysUsed',
  splitBalance.daysTaken + splitBalance.daysScheduled, splitBalance.daysUsed);
// Which figure remaining is measured against depends on the accrual mode.
// With accrual ON the point was that booking ahead must not read as an
// overdraft today; with it OFF, approved leave is committed when approved.
check('remaining follows the accrual mode',
  splitBalance.daysRemaining,
  PTO_ACCRUAL_ENABLED
    ? round(splitBalance.accruedDays - splitBalance.daysTaken)
    : round(splitBalance.totalPto - splitBalance.daysUsed));
if (!PTO_ACCRUAL_ENABLED) {
  check('with accrual off, remaining is simply total minus used',
    splitBalance.daysRemaining, round(splitBalance.totalPto - 6));
}
// Leave starting today counts as taken the moment it begins, not partway in.
check('leave starting today counts as taken',
  computeBalance(splitter, [leave('today', shift(0), 1)]).daysTaken, 1);

// --- short leave, in hours ------------------------------------------------
// Will, 2026-10-06: Ryan Driscoll filed a genuine 1-hour personal leave that
// was recorded as 0 days, because Custom Hours rounded to the nearest HALF
// day. 1/8 = 0.125, which rounded to 0.
const hours = (h: number) => computeDays('2026-10-08', '2026-10-08', 'Custom Hours', h);
check("Ryan's 1 hour is no longer zero", hours(1), 0.125);
check('2 hours is a quarter day', hours(2), 0.25);
check('4 hours is still exactly half a day', hours(4), 0.5);
check('8 hours is a whole day', hours(8), 1);
// The legacy import's odd 0.8h entries have to survive the round trip.
check('0.8 hours keeps its tenth of a day', hours(0.8), 0.1);
check('no hours is still nothing', hours(0), 0);
// Whole-day and half-day paths are untouched.
check('a full day is unaffected', computeDays('2026-10-08', '2026-10-08', 'Full Day'), 1);
check('a half day is unaffected', computeDays('2026-10-08', '2026-10-08', 'Half Day (AM)'), 0.5);
// Short leave must actually draw down a balance, not vanish into rounding.
const hourly = us({ id: 'split', fixedPtoDays: 20, hireDate: shift(-400), eligibilityDateOverride: shift(-200) }) as Employee;
check('an hour of leave draws down the balance',
  computeBalance(hourly, [leave('h1', shift(-5), hours(1))]).daysUsed, 0.13);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
