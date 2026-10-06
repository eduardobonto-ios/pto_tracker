import { clsx, type ClassValue } from 'clsx';
import { PTO_HOURS_PER_DAY } from './theme';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className joiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse an ISO `YYYY-MM-DD` string as a *local* date (no timezone drift). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format an ISO date as `M/D/YYYY`, matching the legacy spreadsheet. */
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Format an ISO date as `Mon D, YYYY`. */
export function formatDateLong(iso?: string): string {
  if (!iso) return '—';
  return parseISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date range, collapsing single-day ranges to one date. */
export function formatDateRange(startIso: string, endIso?: string): string {
  if (!endIso || endIso === startIso) return formatDateLong(startIso);
  return `${formatDateLong(startIso)} – ${formatDateLong(endIso)}`;
}

/** Format an ISO datetime as `Mon D, YYYY · h:mm AM`. */
export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Today, as an ISO `YYYY-MM-DD` local date string. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Render a day count, keeping the `.5` for half days and dropping `.0`. */
export function formatDays(days: number): string {
  // Only as much precision as the number actually needs. toFixed(1) used to
  // turn 0.75 of a day into "0.8", which is wrong on a figure someone is
  // being paid against.
  return Number.isInteger(days) ? `${days}` : `${Math.round(days * 100) / 100}`;
}

/** Initials for an avatar, e.g. "Josh Kirk" → "JK". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Inclusive count of calendar days between two ISO dates. */
export function inclusiveDayCount(startIso: string, endIso: string): number {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

/** Slug-safe unique id for mock records. */
export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a temporary password in the same shape the Technical Playbook uses:
 * short, mixed-case, alphanumeric, no ambiguous characters.
 */
export function generateTempPassword(length = 7): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(digits), pick(lower)];
  while (chars.length < length) chars.push(pick(all));
  // Fisher–Yates so the guaranteed classes aren't always in the same slots.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Sort people by first name, A first.
 *
 * `Employee.name` is stored "First Last", so a plain locale compare on the
 * whole string already orders by first name — "Amr Shweiky" before "April
 * Lopez" before "Chris Stolzer". Written as its own comparator anyway, because
 * the intent is not obvious from `a.name.localeCompare(b.name)` and the next
 * person to touch it should not have to re-derive why that is enough.
 *
 * Case-insensitive via localeCompare's default collation, so a lowercase entry
 * does not sink to the bottom.
 */
export function byFirstName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name);
}

/**
 * A leave length for display, in hours when days would read as a rounding
 * artefact.
 *
 * Leave is stored in days, which reads badly below half a day: Ryan Driscoll's
 * one-hour personal leave is 0.125 days, and "0.1" tells nobody anything. Will
 * asked for hours "if necessary" (2026-10-06), so anything under half a day
 * renders as hours and everything else stays in days.
 *
 * `totalHours` is the figure the employee actually entered and is preferred
 * when present; otherwise the hours are derived back from the stored days.
 */
export function formatLeaveLength(days: number, totalHours?: number): string {
  if (days <= 0 || days >= 0.5) return formatDays(days);
  const hours = totalHours && totalHours > 0 ? totalHours : days * PTO_HOURS_PER_DAY;
  // Shown as entered, to two decimals. Rounding to quarter hours seemed tidier
  // until it turned the legacy import's genuine 0.8h entries into 0.75h.
  return `${Math.round(hours * 100) / 100}h`;
}

/**
 * A request id with the year dropped: `PTO-2026-057` reads `PTO-057`.
 *
 * Display only — the stored id keeps its year, and the PTO Requests table
 * still shows it in full in its own column, so nothing that someone might
 * quote at support is lost. Requested by Will 2026-10-06: "remove the date
 * next to PTO under the team members name".
 */
export function shortRequestId(id: string): string {
  return id.replace(/^(PTO)-\d{4}-(.+)$/, '$1-$2');
}
