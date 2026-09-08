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
 * Annual entitlement rules (see `lib/pto.ts#computeEntitlement`).
 *
 * Every employee starts at `PTO_BASE_ENTITLEMENT_DAYS` once they clear the
 * 6-month eligibility rule. From there:
 *  - Employees hired in `PTO_NEW_HIRE_COHORT_START_YEAR` or later gain
 *    `PTO_ANNUAL_INCREMENT_DAYS` on every hire-date anniversary.
 *  - Employees hired before that year instead gain
 *    `PTO_ANNUAL_INCREMENT_DAYS` on every `PTO_LEGACY_CREDIT_MONTH`/
 *    `PTO_LEGACY_CREDIT_DAY` (June 1) that passes after they're eligible.
 * Entitlement never exceeds `PTO_MAX_ENTITLEMENT_DAYS` for either cohort.
 */
export const PTO_BASE_ENTITLEMENT_DAYS = 5;
export const PTO_ANNUAL_INCREMENT_DAYS = 2;
export const PTO_MAX_ENTITLEMENT_DAYS = 10;
export const PTO_NEW_HIRE_COHORT_START_YEAR = 2026;
/** Month is 0-indexed: 5 = June. */
export const PTO_LEGACY_CREDIT_MONTH = 5;
export const PTO_LEGACY_CREDIT_DAY = 1;

/** Recipients wired up in the backend phase (see EmailPreview). */
export const PTO_NOTIFICATION_RECIPIENTS = [
  'princes@valveman.com',
  'pgomez@fswelsford.com',
] as const;

/** Team manager who gets management-level access even outside the Admin role. */
export const PRINCES_EMAIL = 'princes@valveman.com';
