// Minimal iCalendar (RFC 5545) reader — just enough to render a month grid.
//
// Exists so the org-calendar overlay can run off a calendar *published* from
// Outlook, which any user can do for themselves, instead of requiring an Entra
// app registration and tenant admin consent. See ../SETUP.md.
//
// Deliberately day-granular: the PTO Calendar draws whole-day cells, so times
// and time zones are discarded and only the date part of DTSTART/DTEND is kept.
// That sidesteps VTIMEZONE parsing entirely, at the cost of an event being
// placed on its own local date rather than the viewer's.

export interface IcsEvent {
  id: string;
  subject: string;
  /** ISO date (YYYY-MM-DD) of the first day the event covers. */
  startDate: string;
  /** ISO date (YYYY-MM-DD) of the last day it covers, inclusive. */
  endDate: string;
  isAllDay: boolean;
  location?: string;
}

/** Guards against a pathological RRULE spinning forever — ~11 years of days. */
const MAX_DAYS_SCANNED = 4000;
/** Guards against one runaway series swamping the response. */
const MAX_OCCURRENCES = 400;

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

interface Prop {
  value: string;
  params: Record<string, string>;
}

/** RFC 5545 folds long lines with CRLF + a space or tab. Undo that first. */
function unfold(text: string): string {
  return text.replace(/\r?\n[ \t]/g, '');
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseLine(line: string): { name: string; prop: Prop } | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = left.split(';');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return { name: name.toUpperCase(), prop: { value, params } };
}

/** `20260918` and `20260918T090000Z` both reduce to `2026-09-18`. */
function toIsoDate(raw: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(raw.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000,
  );
}

function weekdayCode(iso: string): string {
  return WEEKDAY_CODES[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/**
 * Expand an RRULE into the start dates falling inside the window.
 *
 * Scans day by day from the series start rather than stepping by FREQ, which
 * keeps COUNT correct (occurrences before the window still consume the count)
 * and keeps the four frequencies to one predicate each. Supports FREQ, INTERVAL,
 * COUNT, UNTIL, BYDAY (weekly) and EXDATE. Rules beyond that — BYSETPOS,
 * BYMONTHDAY, nth-weekday-of-month — are not expanded; such a series yields
 * only its first occurrence.
 */
function expandRecurrence(
  startIso: string,
  rrule: string,
  exdates: Set<string>,
  windowStart: string,
  windowEnd: string,
): string[] {
  const rule: Record<string, string> = {};
  for (const pair of rrule.split(';')) {
    const eq = pair.indexOf('=');
    if (eq > 0) rule[pair.slice(0, eq).toUpperCase()] = pair.slice(eq + 1).toUpperCase();
  }

  const freq = rule.FREQ;
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return [startIso];

  const interval = Math.max(1, Number(rule.INTERVAL ?? '1') || 1);
  const count = rule.COUNT ? Number(rule.COUNT) : null;
  const until = rule.UNTIL ? toIsoDate(rule.UNTIL) : null;
  const byDay = rule.BYDAY ? rule.BYDAY.split(',').map((d) => d.slice(-2)) : [];

  const start = parts(startIso);
  const startWeekday = weekdayCode(startIso);

  const matches = (iso: string): boolean => {
    const cur = parts(iso);
    switch (freq) {
      case 'DAILY':
        return daysBetween(startIso, iso) % interval === 0;
      case 'WEEKLY': {
        // Align weeks on the series start's week, not on the calendar week.
        const weeks = Math.floor(daysBetween(startIso, iso) / 7);
        if (weeks % interval !== 0) return false;
        return byDay.length ? byDay.includes(weekdayCode(iso)) : weekdayCode(iso) === startWeekday;
      }
      case 'MONTHLY': {
        if (cur.d !== start.d) return false;
        return ((cur.y - start.y) * 12 + (cur.m - start.m)) % interval === 0;
      }
      case 'YEARLY':
        return cur.m === start.m && cur.d === start.d && (cur.y - start.y) % interval === 0;
      default:
        return false;
    }
  };

  const out: string[] = [];
  let seen = 0;
  let cursor = startIso;

  for (let i = 0; i < MAX_DAYS_SCANNED; i++) {
    if (cursor > windowEnd) break;
    if (until && cursor > until) break;
    if (count !== null && seen >= count) break;

    if (matches(cursor)) {
      seen++;
      if (cursor >= windowStart && !exdates.has(cursor)) {
        out.push(cursor);
        if (out.length >= MAX_OCCURRENCES) break;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

/**
 * Parse an ICS document, returning every event occurrence overlapping the
 * inclusive `[windowStart, windowEnd]` range.
 *
 * `options.excludeMarker` drops any event whose summary or description
 * contains that substring. Used to filter out leave the PTO Tracker itself
 * pushed, when one calendar holds both company events and PTO.
 */
export function parseIcs(
  text: string,
  windowStart: string,
  windowEnd: string,
  options: { excludeMarker?: string } = {},
): IcsEvent[] {
  const lines = unfold(text).split(/\r?\n/);
  const events: IcsEvent[] = [];

  let current: Record<string, Prop> | null = null;
  let exdates: string[] = [];

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      exdates = [];
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) {
        events.push(...buildEvents(current, exdates, windowStart, windowEnd, options.excludeMarker));
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;
    // EXDATE may repeat, and each line may hold a comma-separated list.
    if (parsed.name === 'EXDATE') {
      for (const d of parsed.prop.value.split(',')) {
        const iso = toIsoDate(d);
        if (iso) exdates.push(iso);
      }
      continue;
    }
    current[parsed.name] = parsed.prop;
  }

  return events;
}

function buildEvents(
  props: Record<string, Prop>,
  exdates: string[],
  windowStart: string,
  windowEnd: string,
  excludeMarker?: string,
): IcsEvent[] {
  if (excludeMarker) {
    const haystack = `${props.SUMMARY?.value ?? ''}\n${props.DESCRIPTION?.value ?? ''}`;
    if (haystack.includes(excludeMarker)) return [];
  }

  const dtStart = props.DTSTART;
  if (!dtStart) return [];
  const startIso = toIsoDate(dtStart.value);
  if (!startIso) return [];

  // An all-day event is flagged by VALUE=DATE, or inferred from a bare date.
  const isAllDay =
    dtStart.params.VALUE === 'DATE' || !/T\d{6}/.test(dtStart.value);

  // DTEND is exclusive for all-day events; DURATION is the fallback, and a
  // missing end means a single day.
  let endIso = startIso;
  const rawEnd = props.DTEND ? toIsoDate(props.DTEND.value) : null;
  if (rawEnd) {
    endIso = isAllDay ? addDays(rawEnd, -1) : rawEnd;
  } else if (props.DURATION) {
    const days = /P(?:(\d+)W)?(?:(\d+)D)?/.exec(props.DURATION.value);
    const span = (Number(days?.[1] ?? 0) * 7 + Number(days?.[2] ?? 0)) || 1;
    endIso = addDays(startIso, span - 1);
  }
  if (endIso < startIso) endIso = startIso;

  const spanDays = daysBetween(startIso, endIso);
  const subject = unescapeText(props.SUMMARY?.value ?? '').trim() || '(No subject)';
  const location = unescapeText(props.LOCATION?.value ?? '').trim() || undefined;
  const uid = props.UID?.value ?? `${startIso}-${subject}`;

  const starts = props.RRULE
    ? expandRecurrence(startIso, props.RRULE.value, new Set(exdates), windowStart, windowEnd)
    : [startIso];

  return starts
    .map((s) => ({
      id: starts.length > 1 ? `${uid}-${s}` : uid,
      subject,
      startDate: s,
      endDate: addDays(s, spanDays),
      isAllDay,
      location,
    }))
    // A multi-day event starting before the window still belongs on screen.
    .filter((ev) => ev.endDate >= windowStart && ev.startDate <= windowEnd);
}
