// Pure iCalendar construction for the PTO feed. Deliberately free of imports
// and I/O so it can be tested without a network or a database — the date
// arithmetic here is where this kind of code actually goes wrong.

export interface RequestRow {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_type: string;
  pay_status: string;
  pto_employees: { name: string; department: string } | null;
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** RFC 5545 §3.1: no line may exceed 75 octets; continuations start with a space. */
export function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) out.push(` ${line.slice(i, i + 74)}`);
  return out.join('\r\n');
}

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newline are special. */
export function escapeText(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const compact = (iso: string) => iso.replace(/-/g, '');

export function toVEvent(row: RequestRow, stamp: string): string[] {
  const name = row.pto_employees?.name ?? 'Employee';
  const half = row.duration_type.startsWith('Half');
  const summary = [
    `${name} — PTO (${row.leave_type})`,
    half ? ' ½ day' : '',
    row.pay_status === 'Unpaid' ? ' [Unpaid]' : '',
  ].join('');

  return [
    'BEGIN:VEVENT',
    fold(`UID:${row.id}@pto-tracker.valveman-welsford`),
    `DTSTAMP:${stamp}`,
    // All-day, so leave reads as a day band rather than a timed block. Both
    // Graph and RFC 5545 take an EXCLUSIVE end for date-valued events, so a
    // single day of leave ends on the following date.
    `DTSTART;VALUE=DATE:${compact(row.start_date)}`,
    `DTEND;VALUE=DATE:${compact(addDays(row.end_date || row.start_date, 1))}`,
    fold(`SUMMARY:${escapeText(summary)}`),
    fold(
      `DESCRIPTION:${escapeText(
        `${name}${row.pto_employees?.department ? ` · ${row.pto_employees.department}` : ''}\n` +
          `${row.leave_type} · ${row.duration_type} · ${row.pay_status}\n` +
          `Request ${row.id}\n\nFrom the Valveman-Welsford PTO Tracker. Approved leave only.`,
      )}`,
    ),
    // Leave is information, not an obligation — don't blank out anyone's
    // availability or fire reminders on their calendar.
    'TRANSP:TRANSPARENT',
    'STATUS:CONFIRMED',
    'CLASS:PUBLIC',
    'END:VEVENT',
  ];
}

/** Whole document, CRLF-terminated as the spec requires. */
export function buildIcsFeed(rows: RequestRow[], stamp: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Valveman-Welsford//PTO Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Subscribers adopt this as the calendar's display name, so it is the one
    // people actually see in Outlook and Google. Changing it only affects NEW
    // subscriptions — existing ones keep whatever name they were created with.
    'X-WR-CALNAME:FSW Group PTO',
    'X-WR-CALDESC:Approved time off from the Valveman-Welsford PTO Tracker',
    // Hints that hourly polling is plenty. Outlook treats these as advisory
    // and refreshes on its own schedule regardless.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...rows.flatMap((row) => toVEvent(row, stamp)),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** UTC timestamp in the basic format DTSTAMP requires. */
export function icsStamp(now: Date): string {
  return `${now.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;
}
