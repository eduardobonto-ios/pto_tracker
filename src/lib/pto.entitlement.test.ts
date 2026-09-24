// Run with:  npx tsx src/lib/pto.entitlement.test.ts
// (or paste into any TS runner — no framework, no imports beyond the module.)
//
// Covers the PH/US entitlement split confirmed with Princes 2026-09-24/25.
// This decides how much leave real people get, so the cases below are the ones
// that would be expensive to get wrong.
import { computeEntitlement, currentPtoYearStart, eligibilityDateFor } from './pto';
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
    appRole: 'Employee',
    active: true,
    ...over,
  }) as Employee;

const us = (over: Partial<Employee> = {}): Employee =>
  ph({ ptoRegion: 'US', email: 't@fswelsford.com', fixedPtoDays: 20, ...over });

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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
