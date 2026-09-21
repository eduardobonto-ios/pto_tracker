// Reads the organisation's shared Microsoft 365 calendar (company events,
// holidays, shutdowns) so the PTO Tracker can overlay it on the PTO Calendar
// page. Read-only: nothing is written back to Microsoft, and nothing read here
// is persisted in Supabase — it is fetched per view and discarded.
//
// Runs server-side because it needs the Graph app's client secret, which must
// never reach the browser. Invoked from `src/lib/orgCalendar.ts`.
//
// Two interchangeable sources, checked in this order. Configure ONE.
//
// 1. PUBLISHED ICS FEED — needs no tenant admin at all.
//      ORG_CALENDAR_ICS_URL    the .ics link Outlook gives you for a published
//                              calendar (Outlook web → Settings → Calendar →
//                              Shared calendars → Publish a calendar)
//    Any user can publish a calendar they own, so this works today without an
//    app registration, admin consent, or an Exchange policy. The trade-off is
//    that the URL is unauthenticated — anyone holding it can read that
//    calendar — so publish only a calendar whose contents are not sensitive,
//    and republish to rotate the URL if it leaks.
//
// 2. MICROSOFT GRAPH — needs an Entra app registration and admin consent.
//      MS_GRAPH_TENANT_ID          Entra directory/tenant ID
//      MS_GRAPH_CLIENT_ID          App registration's Application (client) ID
//      MS_GRAPH_CLIENT_SECRET      App registration's client secret value
//      MS_GRAPH_ORG_CALENDAR_USER  Mailbox holding the organisation calendar
//    The first three are shared with `sync-pto-calendar`. Authenticated, and
//    updates are immediate rather than on Outlook's publish delay.
//
//    IMPORTANT (Azure side, not code): Calendars.Read as an *application*
//    permission reads every mailbox in the tenant by default. Scope it to
//    MS_GRAPH_ORG_CALENDAR_USER alone with an Exchange Online Application
//    Access Policy before relying on it — see ../SETUP.md.
//
// Either way, ONE calendar is read. Employees' personal calendars are out of
// scope by design.

import { parseIcs } from './ics.ts';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
/** Stop a hostile or misconfigured URL streaming an unbounded body at us. */
const MAX_ICS_BYTES = 5_000_000;

interface ReadBody {
  /** Inclusive ISO date (YYYY-MM-DD) of the first day to fetch. */
  start: string;
  /** Inclusive ISO date (YYYY-MM-DD) of the last day to fetch. */
  end: string;
}

interface GraphEvent {
  id: string;
  subject: string | null;
  isAllDay: boolean;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: { displayName?: string | null } | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function getGraphToken(): Promise<string> {
  const tenant = Deno.env.get('MS_GRAPH_TENANT_ID')!;
  const clientId = Deno.env.get('MS_GRAPH_CLIENT_ID')!;
  const clientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET')!;
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Graph auth failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Graph all-day events carry an *exclusive* end — an event on the 5th alone
 * ends on the 6th. Timed events end on the day they say. Both are normalised
 * here to an inclusive end date, and never before the start date.
 */
function inclusiveEnd(ev: GraphEvent): string {
  const endDay = ev.end.dateTime.slice(0, 10);
  const startDay = ev.start.dateTime.slice(0, 10);
  const end = ev.isAllDay ? addDays(endDay, -1) : endDay;
  return end < startDay ? startDay : end;
}

async function readFromIcs(url: string, start: string, end: string) {
  const res = await fetch(url, { headers: { Accept: 'text/calendar, text/plain' } });
  if (!res.ok) throw new Error(`ICS fetch failed: ${res.status} ${await res.text()}`);

  const body = await res.text();
  if (body.length > MAX_ICS_BYTES) {
    throw new Error(`ICS feed too large: ${body.length} bytes`);
  }
  if (!body.includes('BEGIN:VCALENDAR')) {
    // Outlook serves an HTML error page rather than a 4xx when a published
    // link has been revoked, so the status code alone doesn't catch it.
    throw new Error('ICS feed did not return a calendar — is the link still published?');
  }
  return parseIcs(body, start, end);
}

Deno.serve(async (req) => {
  try {
    const { start, end } = (await req.json()) as ReadBody;
    if (!ISO_DATE.test(start ?? '') || !ISO_DATE.test(end ?? '')) {
      return new Response(JSON.stringify({ error: 'start and end must be YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (end < start) {
      return new Response(JSON.stringify({ error: 'end must not precede start' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Source 1: a published ICS feed, which needs no tenant admin.
    const icsUrl = Deno.env.get('ORG_CALENDAR_ICS_URL');
    if (icsUrl) {
      const events = await readFromIcs(icsUrl, start, end);
      return new Response(JSON.stringify({ events }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Source 2: Microsoft Graph.
    const calendarUser = Deno.env.get('MS_GRAPH_ORG_CALENDAR_USER');
    if (!calendarUser) {
      // Neither source configured. Not an error — the overlay is optional, and
      // the PTO Calendar is expected to work without it.
      return new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const token = await getGraphToken();

    // calendarView expands recurring series into individual occurrences, which
    // /events does not — a weekly all-hands should appear on every week.
    const params = new URLSearchParams({
      startDateTime: `${start}T00:00:00`,
      // exclusive upper bound, so push past the last day the caller asked for
      endDateTime: `${addDays(end, 1)}T00:00:00`,
      $select: 'id,subject,start,end,isAllDay,location',
      $orderby: 'start/dateTime',
      $top: '250',
    });
    const url = `${GRAPH_BASE}/users/${encodeURIComponent(calendarUser)}/calendarView?${params}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        // Ask Graph to return start/end already converted to UTC, so the date
        // arithmetic below doesn't depend on the mailbox's own time zone.
        Prefer: 'outlook.timezone="UTC"',
      },
    });
    if (!res.ok) throw new Error(`Graph calendarView failed: ${res.status} ${await res.text()}`);

    const { value } = (await res.json()) as { value: GraphEvent[] };
    const events = value.map((ev) => ({
      id: ev.id,
      subject: ev.subject?.trim() || '(No subject)',
      startDate: ev.start.dateTime.slice(0, 10),
      endDate: inclusiveEnd(ev),
      isAllDay: ev.isAllDay,
      location: ev.location?.displayName?.trim() || undefined,
    }));

    return new Response(JSON.stringify({ events }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[read-org-calendar]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
