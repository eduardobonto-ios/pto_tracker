// Run with:  deno run supabase/functions/read-org-calendar/ics.test.ts
import { parseIcs } from './ics.ts';
import { PTO_MARKER_PREFIX, ptoMarkerLine } from '../_shared/ptoMarker.ts';

let pass = 0, fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n       got  ${g}\n       want ${w}`); }
}
const cal = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;
const ev = (b: string) => cal(`BEGIN:VEVENT\r\n${b}\r\nEND:VEVENT`);

// all-day single: DTEND is exclusive, so a one-day holiday must not bleed into the 19th
check('all-day exclusive end',
  parseIcs(ev('UID:a\r\nSUMMARY:Labour Day\r\nDTSTART;VALUE=DATE:20260918\r\nDTEND;VALUE=DATE:20260919'), '2026-09-01', '2026-09-30')
    .map(e => [e.startDate, e.endDate, e.isAllDay, e.subject]),
  [['2026-09-18', '2026-09-18', true, 'Labour Day']]);

// multi-day all-day: 21st-23rd inclusive (DTEND 24th exclusive)
check('multi-day all-day',
  parseIcs(ev('UID:b\r\nSUMMARY:Shutdown\r\nDTSTART;VALUE=DATE:20260921\r\nDTEND;VALUE=DATE:20260924'), '2026-09-01', '2026-09-30')
    .map(e => [e.startDate, e.endDate]),
  [['2026-09-21', '2026-09-23']]);

// timed event: end date is NOT decremented
check('timed event same day',
  parseIcs(ev('UID:c\r\nSUMMARY:All Hands\r\nDTSTART:20260917T140000Z\r\nDTEND:20260917T150000Z'), '2026-09-01', '2026-09-30')
    .map(e => [e.startDate, e.endDate, e.isAllDay]),
  [['2026-09-17', '2026-09-17', false]]);

// missing DTEND -> single day
check('missing DTEND',
  parseIcs(ev('UID:d\r\nSUMMARY:X\r\nDTSTART;VALUE=DATE:20260910'), '2026-09-01', '2026-09-30').map(e => [e.startDate, e.endDate]),
  [['2026-09-10', '2026-09-10']]);

// weekly recurrence expands into the window
check('weekly RRULE',
  parseIcs(ev('UID:e\r\nSUMMARY:Standup\r\nDTSTART;VALUE=DATE:20260907\r\nDTEND;VALUE=DATE:20260908\r\nRRULE:FREQ=WEEKLY'), '2026-09-01', '2026-09-30')
    .map(e => e.startDate),
  ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);

// yearly recurrence from years earlier still lands
check('yearly RRULE from 2020',
  parseIcs(ev('UID:f\r\nSUMMARY:Founded\r\nDTSTART;VALUE=DATE:20200918\r\nDTEND;VALUE=DATE:20200919\r\nRRULE:FREQ=YEARLY'), '2026-09-01', '2026-09-30')
    .map(e => e.startDate),
  ['2026-09-18']);

// BYDAY + INTERVAL
check('biweekly BYDAY=MO,WE',
  parseIcs(ev('UID:g\r\nSUMMARY:Sync\r\nDTSTART;VALUE=DATE:20260907\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE'), '2026-09-01', '2026-09-30')
    .map(e => e.startDate),
  ['2026-09-07', '2026-09-09', '2026-09-21', '2026-09-23']);

// COUNT is consumed by occurrences BEFORE the window
check('COUNT counts pre-window occurrences',
  parseIcs(ev('UID:h\r\nSUMMARY:Y\r\nDTSTART;VALUE=DATE:20260810\r\nRRULE:FREQ=WEEKLY;COUNT=4'), '2026-09-01', '2026-09-30')
    .map(e => e.startDate),
  ['2026-08-31'].filter(d => d >= '2026-09-01'));  // 10,17,24,31 Aug -> none in Sept

// UNTIL stops the series
check('UNTIL',
  parseIcs(ev('UID:i\r\nSUMMARY:Z\r\nDTSTART;VALUE=DATE:20260907\r\nRRULE:FREQ=WEEKLY;UNTIL=20260915T000000Z'), '2026-09-01', '2026-09-30')
    .map(e => e.startDate),
  ['2026-09-07', '2026-09-14']);

// EXDATE removes one occurrence
check('EXDATE',
  parseIcs(ev('UID:j\r\nSUMMARY:W\r\nDTSTART;VALUE=DATE:20260907\r\nRRULE:FREQ=WEEKLY\r\nEXDATE;VALUE=DATE:20260914'), '2026-09-01', '2026-09-30')
    .map(e => e.startDate),
  ['2026-09-07', '2026-09-21', '2026-09-28']);

// multi-day event straddling the window start must still appear
check('event straddling window start',
  parseIcs(ev('UID:k\r\nSUMMARY:Long\r\nDTSTART;VALUE=DATE:20260828\r\nDTEND;VALUE=DATE:20260903'), '2026-09-01', '2026-09-30')
    .map(e => [e.startDate, e.endDate]),
  [['2026-08-28', '2026-09-02']]);

// Line folding: RFC 5545 removes BOTH the CRLF and the single leading
// whitespace, so the continuation joins with no space. Escapes are unescaped.
check('folded line and escapes',
  parseIcs(ev('UID:l\r\nSUMMARY:Company Picnic\\, all\r\n  welcome\r\nDTSTART;VALUE=DATE:20260912'), '2026-09-01', '2026-09-30')
    .map(e => e.subject),
  ['Company Picnic, all welcome']);

// out-of-window event excluded
check('out of window excluded',
  parseIcs(ev('UID:m\r\nSUMMARY:Later\r\nDTSTART;VALUE=DATE:20261105'), '2026-09-01', '2026-09-30').length, 0);

// missing SUMMARY
check('missing SUMMARY',
  parseIcs(ev('UID:n\r\nDTSTART;VALUE=DATE:20260915'), '2026-09-01', '2026-09-30').map(e => e.subject),
  ['(No subject)']);

// --- filtering out the tracker's own pushed leave (one shared calendar) ---
const EX = { excludeMarker: PTO_MARKER_PREFIX };

// an event the tracker wrote is dropped
check('PTO-authored event filtered out',
  parseIcs(ev(`UID:p1\r\nSUMMARY:Josh Kirk \u2014 PTO (Vacation Leave)\r\nDESCRIPTION:Department: Operations\\nCoverage: Dylan\\n\\n${ptoMarkerLine('PTO-2026-002')}\r\nDTSTART;VALUE=DATE:20260914\r\nDTEND;VALUE=DATE:20260915`), '2026-09-01', '2026-09-30', EX).length,
  0);

// a genuine company event on the SAME calendar survives
check('company event kept alongside it',
  parseIcs(cal(`BEGIN:VEVENT\r\nUID:p2\r\nSUMMARY:Josh Kirk \u2014 PTO (Vacation Leave)\r\nDESCRIPTION:${ptoMarkerLine('PTO-2026-002')}\r\nDTSTART;VALUE=DATE:20260914\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:p3\r\nSUMMARY:Company Shutdown\r\nDTSTART;VALUE=DATE:20260916\r\nEND:VEVENT`), '2026-09-01', '2026-09-30', EX)
    .map(e => e.subject),
  ['Company Shutdown']);

// without the option nothing is filtered — the filter must be opt-in
check('no filtering when option omitted',
  parseIcs(ev(`UID:p4\r\nSUMMARY:X\r\nDESCRIPTION:${ptoMarkerLine('PTO-2026-002')}\r\nDTSTART;VALUE=DATE:20260914`), '2026-09-01', '2026-09-30').length,
  1);

// a company event that merely mentions "PTO" is NOT filtered
check('lookalike company event survives',
  parseIcs(ev('UID:p5\r\nSUMMARY:PTO policy briefing\r\nDESCRIPTION:Discussing the PTO tracker rollout\r\nDTSTART;VALUE=DATE:20260914'), '2026-09-01', '2026-09-30', EX)
    .map(e => e.subject),
  ['PTO policy briefing']);

// the marker survives ICS line folding, which Exchange applies to long bodies
check('marker still matched across a folded line',
  parseIcs(ev('UID:p6\r\nSUMMARY:Y\r\nDESCRIPTION:Department: Ops\\n\\n[pto-tra\r\n cker:PTO-2026-002] Created automatically\r\nDTSTART;VALUE=DATE:20260914'), '2026-09-01', '2026-09-30', EX).length,
  0);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) Deno.exit(1);
