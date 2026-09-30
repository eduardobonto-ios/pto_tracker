// Run with:  npx tsx src/lib/pto.entitlement.test.ts
// (or paste into any TS runner — no framework, no imports beyond the module.)
//
// Covers the PH/US entitlement split confirmed with Princes 2026-09-24/25.
// This decides how much leave real people get, so the cases below are the ones
// that would be expensive to get wrong.
import { accruedDays, computeEntitlement, currentPtoYearStart, eligibilityDateFor } from './pto';
import type { Employee } from '@/types';

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
check('US eligible on day one', eligibilityDateFor(us({ hireDate: '2026-08-11' })), '2026-08-11');
check('override beats the PH rule',
  eligibilityDateFor(ph({ hireDate: '2025-01-08', eligibilityDateOverride: '2025-03-01' })), '2025-03-01');
check('override beats the US rule',
  eligibilityDateFor(us({ hireDate: '2026-08-11', eligibilityDateOverride: '2026-01-01' })), '2026-01-01');
// Month-overflow: 31 Aug + 6 months must not land in March.
check('eligibility clamps short months', eligibilityDateFor(ph({ hireDate: '2024-08-31' })), '2025-02-28');

// --- US: fixed, never grows ------------------------------------------------
check('US takes fixedPtoDays', computeEntitlement(us({ fixedPtoDays: 22, hireDate: '2026-08-11' }), AS_OF), 22);
check('US does not grow with tenure',
  computeEntitlement(us({ fixedPtoDays: 20, hireDate: '2019-06-13' }), AS_OF), 20);
check('US with no fixed days reads 0',
  computeEntitlement(us({ fixedPtoDays: undefined, hireDate: '2026-01-06' }), AS_OF), 0);
// Hired today: eligible immediately, so entitlement is live at once.
check('US hired today is already entitled',
  computeEntitlement(us({ fixedPtoDays: 10, hireDate: '2026-09-25' }), AS_OF), 10);

// --- US tenure ramp: 10 base, +1 per year of service, cap 15 ---------------
// From Jason Welsford's policy email, applied by patch_011. The two real
// people on this plan, with their directory hire dates:
check('Darwin Mushrush (hired 2026-01-12, 0 yrs) → 10',
  computeEntitlement(ramp({ hireDate: '2026-01-12' }), AS_OF), 10);
check('Daniel York (hired 2025-01-06, 1 yr) → 11',
  computeEntitlement(ramp({ hireDate: '2025-01-06' }), AS_OF), 11);
// The cap has to land exactly on the fifth anniversary — that is the whole
// reason the ramp keys off service rather than starting everyone at 10 today.
check('four years of service → 14',
  computeEntitlement(ramp({ hireDate: '2022-01-06' }), AS_OF), 14);
check('five years of service → 15',
  computeEntitlement(ramp({ hireDate: '2021-01-06' }), AS_OF), 15);
check('ramp caps at 15 and does not keep climbing',
  computeEntitlement(ramp({ hireDate: '2010-01-06' }), AS_OF), 15);
// The ramp counts HIRE anniversaries. Everything else in this file counts
// eligibility anniversaries, so this is the case that catches a copy-paste.
check('ramp keys off hire date, not the eligibility override',
  computeEntitlement(ramp({ hireDate: '2025-01-06', eligibilityDateOverride: '2026-01-06' }), AS_OF), 11);
// patch_011 leaves fixed_pto_days populated on ramp employees on purpose.
check('tenure ramp ignores a stale fixedPtoDays',
  computeEntitlement(ramp({ fixedPtoDays: 20, hireDate: '2026-01-12' }), AS_OF), 10);
check('ramp still waits for a future eligibility override',
  computeEntitlement(ramp({ hireDate: '2020-01-06', eligibilityDateOverride: '2027-01-01' }), AS_OF), 0);
// Feb 29 has no anniversary in a common year; it must clamp back, not skip to
// Mar 1 and lose a day of service.
check('ramp clamps a Feb 29 hire date',
  computeEntitlement(ramp({ hireDate: '2024-02-29' }), AS_OF), 12);
// ptoPlan is a US-only concept — it must not leak into the PH rules.
check('ptoPlan is ignored for PH staff',
  computeEntitlement(ph({ ptoPlan: 'tenure_ramp', hireDate: '2025-01-08' }), AS_OF), 7);
// The ramp moves entitlement; it must NOT move the annual reset, which still
// follows the eligibility override.
check('ramp leaves the reset on the eligibility override',
  currentPtoYearStart(ramp({ hireDate: '2025-01-06', eligibilityDateOverride: '2026-01-06' }), AS_OF),
  '2026-01-06');

// --- PH: base 5, +2 per eligibility anniversary, cap 10 --------------------
// Hired 2025-01-08 → eligible 2025-07-08 → one anniversary passed (2026-07-08).
check('PH one anniversary → 7', computeEntitlement(ph({ hireDate: '2025-01-08' }), AS_OF), 7);
// Hired 2025-06-30 → eligible 2025-12-30 → none passed yet.
check('PH no anniversary yet → 5', computeEntitlement(ph({ hireDate: '2025-06-30' }), AS_OF), 5);
// Hired 2023-07-10 → eligible 2024-01-10 → two passed → 9.
check('PH two anniversaries → 9', computeEntitlement(ph({ hireDate: '2023-07-10' }), AS_OF), 9);
// Hired 2022-09-26 → eligible 2023-03-26 → three passed → 11, capped.
check('PH caps at 10', computeEntitlement(ph({ hireDate: '2022-09-26' }), AS_OF), 10);
check('PH not yet eligible → 0', computeEntitlement(ph({ hireDate: '2026-05-26' }), AS_OF), 0);
// The ramp must key off ELIGIBILITY, not hire date — these differ by 6 months.
check('PH ramp keys off eligibility not hire',
  computeEntitlement(ph({ hireDate: '2025-06-23' }), AS_OF), 5);
check('override shifts the ramp too',
  computeEntitlement(ph({ hireDate: '2025-06-23', eligibilityDateOverride: '2025-01-01' }), AS_OF), 7);

// --- PTO year reset --------------------------------------------------------
check('PH year starts on eligibility anniversary',
  currentPtoYearStart(ph({ hireDate: '2025-01-08' }), AS_OF), '2026-07-08');
check('US year starts on hire anniversary (= eligibility)',
  currentPtoYearStart(us({ hireDate: '2025-12-01' }), AS_OF), '2025-12-01');
check('before any anniversary the cycle starts at eligibility',
  currentPtoYearStart(ph({ hireDate: '2025-06-30' }), AS_OF), '2025-12-30');
check('before eligibility the cycle floors at eligibility',
  currentPtoYearStart(ph({ hireDate: '2026-05-26' }), AS_OF), '2026-11-26');
check('reset follows the override',
  currentPtoYearStart(ph({ hireDate: '2025-06-23', eligibilityDateOverride: '2025-01-01' }), AS_OF),
  '2026-01-01');

// --- Territory Managers ----------------------------------------------------
// Two rules, both keyed off PTO_TERRITORY_MANAGER_JOB_TITLES:
//   1. eligible from day one, either region (confirmed 2026-09-30)
//   2. the full max at once, no ramp (confirmed 2026-09-25)
const tm = (over: Partial<Employee> = {}): Employee =>
  ph({ jobTitle: 'Territory Manager', ...over });

check('TM is eligible on the hire date, not six months later',
  eligibilityDateFor(tm({ hireDate: '2025-06-15' })), '2025-06-15');
check('same hire date, non-TM, still waits six months',
  eligibilityDateFor(ph({ hireDate: '2025-06-15' })), '2025-12-15');
// Dylan Lavern's real case: hired 2026-06-15. Under the old rule he was not
// eligible until 2026-12-15 and read 0 days.
check('TM hired 2026-06-15 is eligible and on the max',
  computeEntitlement(tm({ hireDate: '2026-06-15' }), AS_OF), 10);
check('TM gets the max with no anniversaries passed',
  computeEntitlement(tm({ hireDate: '2025-06-15' }), AS_OF), 10);
check('same dates, non-TM, reads the base',
  computeEntitlement(ph({ hireDate: '2025-06-15' }), AS_OF), 5);
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
check('same hire date, non-TM, resets six months later',
  currentPtoYearStart(ph({ hireDate: '2025-02-17' }), AS_OF), '2026-08-17');
// US takes precedence — fixedPtoDays wins even for a Territory Manager.
check('US Territory Manager takes fixed days, not 10',
  computeEntitlement(us({ jobTitle: 'Territory Manager', fixedPtoDays: 20 }), AS_OF), 20);

// --- biweekly accrual ------------------------------------------------------
// 26 periods of 14 days, counted from the employee's own PTO year start.
// A US 'fixed' 26-day case would divide evenly; these are the real shapes.
//
// Chris Stolzer: 20 days, cycle starts 2026-08-11. By AS_OF (25 Sep 2026)
// 45 days have passed = 3 whole periods -> 20 * 3/26 = 2.3.
check('accrues 3 periods into a cycle',
  accruedDays(us({ fixedPtoDays: 20, hireDate: '2008-08-11', eligibilityDateOverride: '2026-08-11' }), AS_OF),
  2.3);
// Day one of a cycle is zero — the whole point of the change.
check('a fresh cycle starts at zero',
  accruedDays(us({ fixedPtoDays: 20, hireDate: '2020-09-25', eligibilityDateOverride: '2026-09-25' }), AS_OF), 0);
// 13 days in is still zero: periods are whole, not pro-rated daily.
check('a part period accrues nothing',
  accruedDays(us({ fixedPtoDays: 20, hireDate: '2020-09-12', eligibilityDateOverride: '2026-09-12' }), AS_OF), 0);
check('one whole period accrues one 26th',
  accruedDays(us({ fixedPtoDays: 26, hireDate: '2020-09-11', eligibilityDateOverride: '2026-09-11' }), AS_OF), 1);
// Late in a cycle it clamps to the entitlement rather than overshooting:
// 26 x 14 = 364, so days 364 and 365 would otherwise exceed it.
check('clamps at the full entitlement near cycle end',
  accruedDays(us({ fixedPtoDays: 20, hireDate: '2015-09-26', eligibilityDateOverride: '2025-09-26' }), AS_OF), 20);
// Nothing accrues before eligibility, because there is no entitlement yet.
check('not yet eligible accrues nothing',
  accruedDays(ph({ hireDate: '2026-05-26' }), AS_OF), 0);
// A Territory Manager accrues against 10 from their hire date, not from a
// six-month mark — the day-one rule moves the cycle, so it moves accrual too.
// Cycle starts 2026-02-17; 220 days to AS_OF = 15 periods -> 10 * 15/26 = 5.8.
check('TM accrues from the hire anniversary',
  accruedDays(tm({ hireDate: '2025-02-17' }), AS_OF), 5.8);
// The same dates without the TM title: eligible 2025-08-17, so the cycle only
// started 2026-08-17 (39 days = 2 periods) against a 7-day entitlement.
// Six times less accrued from one job title — the two rules compose.
check('a non-TM on the same dates accrues from the six-month mark',
  accruedDays(ph({ hireDate: '2025-02-17' }), AS_OF), 0.5);
// Accrual never exceeds the entitlement it is dividing up.
check('accrued never exceeds the annual entitlement',
  accruedDays(ph({ hireDate: '2022-09-26' }), AS_OF) <= computeEntitlement(ph({ hireDate: '2022-09-26' }), AS_OF),
  true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
