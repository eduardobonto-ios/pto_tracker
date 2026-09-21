// Run with:  deno run supabase/functions/pto-calendar-feed/build.test.ts
// No imports beyond the module under test, so this needs no network.
import { buildIcsFeed, escapeText, fold, icsStamp, toVEvent, type RequestRow } from './build.ts';

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

const STAMP = '20260922T101500Z';
const row = (over: Partial<RequestRow> = {}): RequestRow => ({
  id: 'PTO-2026-002',
  leave_type: 'Vacation Leave',
  start_date: '2026-09-14',
  end_date: '2026-09-14',
  duration_type: 'Full Day',
  pay_status: 'Paid',
  pto_employees: { name: 'Josh Kirk', department: 'Operations' },
  ...over,
});
const line = (ev: string[], prefix: string) => ev.find((l) => l.startsWith(prefix));

// A single day of leave must end on the FOLLOWING date — DTEND is exclusive.
check('single day uses exclusive end', line(toVEvent(row(), STAMP), 'DTEND'), 'DTEND;VALUE=DATE:20260915');
check('single day start', line(toVEvent(row(), STAMP), 'DTSTART'), 'DTSTART;VALUE=DATE:20260914');

// Three days, 14th-16th inclusive, ends on the 17th.
check(
  'multi-day exclusive end',
  line(toVEvent(row({ end_date: '2026-09-16' }), STAMP), 'DTEND'),
  'DTEND;VALUE=DATE:20260917',
);

// Crossing a month boundary must roll the month, not just bump the day.
check(
  'end date rolls over month',
  line(toVEvent(row({ start_date: '2026-09-30', end_date: '2026-09-30' }), STAMP), 'DTEND'),
  'DTEND;VALUE=DATE:20261001',
);

// Leap day, because February is where date arithmetic dies.
check(
  'leap day rolls to 29 Feb',
  line(toVEvent(row({ start_date: '2028-02-28', end_date: '2028-02-28' }), STAMP), 'DTEND'),
  'DTEND;VALUE=DATE:20280229',
);

// A blank end_date falls back to the start date rather than producing Invalid Date.
check(
  'empty end_date falls back to start',
  line(toVEvent(row({ end_date: '' }), STAMP), 'DTEND'),
  'DTEND;VALUE=DATE:20260915',
);

check('half day marked', line(toVEvent(row({ duration_type: 'Half Day (AM)' }), STAMP), 'SUMMARY'),
  'SUMMARY:Josh Kirk — PTO (Vacation Leave) ½ day');
check('unpaid marked', line(toVEvent(row({ pay_status: 'Unpaid' }), STAMP), 'SUMMARY'),
  'SUMMARY:Josh Kirk — PTO (Vacation Leave) [Unpaid]');
check('missing employee degrades', line(toVEvent(row({ pto_employees: null }), STAMP), 'SUMMARY'),
  'SUMMARY:Employee — PTO (Vacation Leave)');

// Reasons must never reach the feed — it is served unauthenticated.
check('no leave reason in output', toVEvent(row(), STAMP).join('\n').includes('reason'), false);

// RFC 5545 escaping.
check('escapes comma, semicolon, backslash, newline',
  escapeText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');

// Folding: first line 75 chars, continuations start with a space.
const folded = fold('X'.repeat(200)).split('\r\n');
check('fold first line is 75 octets', folded[0].length, 75);
check('fold continuations are marked', folded.slice(1).every((l) => l.startsWith(' ')), true);
check('fold round-trips', folded.map((l, i) => (i ? l.slice(1) : l)).join(''), 'X'.repeat(200));
check('short line not folded', fold('SUMMARY:short').includes('\r\n'), false);

// Whole-document shape.
const doc = buildIcsFeed([row()], STAMP);
check('CRLF line endings', doc.includes('\r\n') && !/[^\r]\n/.test(doc), true);
check('opens and closes', doc.startsWith('BEGIN:VCALENDAR') && doc.trimEnd().endsWith('END:VCALENDAR'), true);
check('one VEVENT per row', (doc.match(/BEGIN:VEVENT/g) ?? []).length, 1);
check('empty feed is still a valid calendar',
  buildIcsFeed([], STAMP).includes('BEGIN:VCALENDAR') && !buildIcsFeed([], STAMP).includes('VEVENT'), true);
check('stamp format', icsStamp(new Date('2026-09-22T10:15:00.000Z')), '20260922T101500Z');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) Deno.exit(1);
