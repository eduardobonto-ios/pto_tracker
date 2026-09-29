/**
 * Valveman design tokens (TS mirror of `tailwind.config.js`).
 *
 * Use these when a colour is needed outside of a Tailwind class — inline SVG
 * fills, canvas/chart libraries, dynamically generated styles. Never hard-code
 * a Valveman hex inside a component; import from here instead.
 */

export const colors = {
  navy: {
    50: '#F3F6FB',
    100: '#E4EAF4',
    200: '#C6D2E6',
    300: '#9AACC9',
    400: '#6B80A3',
    500: '#4A5F82',
    600: '#334566',
    700: '#22314D',
    800: '#152238',
    900: '#0D1729',
    950: '#08101E',
  },
  brand: {
    50: '#F0F7FE',
    100: '#DDEDFC',
    200: '#C1DEFA',
    300: '#96C7F4',
    400: '#6BAAE9',
    500: '#4A8CD8',
    600: '#356FBE',
    700: '#2B589A',
    800: '#274A7D',
    900: '#254068',
  },
  accent: {
    100: '#D2F4FE',
    200: '#ABEBFD',
    300: '#6FDDFB',
    400: '#2CC6F0',
    500: '#0FAAD8',
    600: '#0387B5',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  success: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857' },
  warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
  danger: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
  canvas: '#F5F8FC',
  tableHead: '#F1F6FC',
} as const;

/** Department accent colours, used for calendar chips and avatars. */
export const departmentColor: Record<string, string> = {
  Management: colors.brand[600],
  Administration: colors.accent[500],
  Operations: colors.brand[400],
  Technical: colors.navy[500],
  Finance: colors.accent[600],
  Sales: colors.brand[700],
  'Sales / Operations': colors.navy[400],
  Other: colors.slate[400],
};

export const APP_NAME = 'Valveman PTO Tracker';
export const APP_SUITE = 'Valveman Internal Suite';

/** Eligibility rule: PTO unlocks after this many months of employment. */
export const PTO_ELIGIBILITY_MONTHS = 6;

/**
 * Annual entitlement rules (see `lib/pto.ts#computeEntitlement`). Confirmed
 * with Princes 2026-09-24/25.
 *
 * Which rules apply is decided by `Employee.ptoRegion`, NOT the email domain —
 * Veam Chavez and Sharlyn Bacalso are both @fswelsford.com but PH-based.
 *
 *  PH: eligible six months after hire. Entitlement starts at
 *      `PTO_BASE_ENTITLEMENT_DAYS` and gains `PTO_ANNUAL_INCREMENT_DAYS` on
 *      every anniversary of the ELIGIBILITY date, capped at
 *      `PTO_MAX_ENTITLEMENT_DAYS`.
 *  US: eligible from day one. Entitlement is `Employee.fixedPtoDays` — a
 *      negotiated per-person figure (the sum of their vacation, sick and
 *      personal days) that never grows with tenure.
 *
 * Both regions reset their days-used counter on the anniversary of the
 * eligibility date. `Employee.eligibilityDateOverride` replaces the derived
 * eligibility date for either region, and therefore moves both the ramp and
 * the reset.
 *
 * The old June-1 / hire-date cohort split is gone, along with
 * `usesAnniversaryReset`. Everything now keys off eligibility.
 *
 * `PTO_TERRITORY_MANAGER_JOB_TITLES` short-circuits PH staff to the maximum
 * the moment they are eligible, with no graduated ramp. Confirmed with Princes
 * via Eduardo 2026-09-25 — Territory Managers get the full ten immediately.
 */
export const PTO_BASE_ENTITLEMENT_DAYS = 5;
export const PTO_ANNUAL_INCREMENT_DAYS = 2;
export const PTO_MAX_ENTITLEMENT_DAYS = 10;

/**
 * The US tenure ramp — `Employee.ptoPlan === 'tenure_ramp'`.
 *
 * From Jason Welsford's policy email: "Put Darwin and Dan at 10 days, increase
 * them 1 day per year until they reach 5 years service. Their cap will be 15
 * days PTO." Applied via patch_011, confirmed by Eduardo 2026-09-29.
 *
 * KEYED OFF THE HIRE DATE, not the eligibility date — "5 years service" means
 * service. This is the only rule in the app for which a US hire date matters,
 * and it is why patch_011 had to replace the approximate dates patch_008
 * imported. The annual reset still keys off `eligibilityDateOverride`; the two
 * dates are now different things on purpose.
 *
 * WHY NOT "START BOTH AT 10 TODAY": Daniel York already had a year of service,
 * so starting him at 10 would put him at 14 at five years and the stated cap
 * would never be reached. Deriving from service instead lands both men on
 * exactly 15 on their fifth anniversary, at the cost of Daniel reading 11
 * rather than 10 today.
 *
 * `..._YEARS_TO_MAX` is documentation, not arithmetic — the cap is enforced by
 * `..._MAX_DAYS`. It is here so the day the base or increment changes, anyone
 * reading this can see whether the two still agree (10 + 1 x 5 = 15).
 */
export const PTO_TENURE_RAMP_BASE_DAYS = 10;
export const PTO_TENURE_RAMP_INCREMENT_DAYS = 1;
export const PTO_TENURE_RAMP_MAX_DAYS = 15;
export const PTO_TENURE_RAMP_YEARS_TO_MAX = 5;
/**
 * Territory Managers are treated differently in two ways, and both are keyed
 * off this list:
 *
 *  1. ELIGIBLE FROM THEIR FIRST DAY, in either region — the PH six-month rule
 *     does not apply to them. Confirmed by Eduardo 2026-09-30.
 *  2. THE FULL `PTO_MAX_ENTITLEMENT_DAYS` AT ONCE once eligible, rather than
 *     ramping from `PTO_BASE_ENTITLEMENT_DAYS`. Confirmed 2026-09-25.
 *
 * Together those mean a PH Territory Manager has ten days from day one. Rule 1
 * also moves their annual reset onto their hire anniversary — see the note in
 * `pto.ts#eligibilityDateFor`.
 *
 * Matching is by exact job title, so a retitle ("Senior Territory Manager")
 * silently drops someone out of both rules. Add the variant here if that
 * happens.
 */
export const PTO_TERRITORY_MANAGER_JOB_TITLES = ['Territory Manager'];

/**
 * Manager Approval Workflow routing (job-title/department manager overrides,
 * the Will+Princes default pair, and Princes's management-access email) used
 * to be hardcoded here. It now lives in Supabase (`pto_approver_routing` /
 * `pto_settings`) — see `lib/supabaseMappers.ts#loadApproverRouting`, loaded
 * once at startup by `AppContext` and passed into `lib/notifications.ts`.
 */
