// Reads the organisation's shared Microsoft 365 calendar (company events,
// holidays, shutdowns) so the PTO Tracker can overlay it on the PTO Calendar
// page. Read-only: nothing is written back to Microsoft, and nothing read here
// is persisted in Supabase — it is fetched per view and discarded.
//
// Runs server-side because it needs the Graph app's client secret, which must
// never reach the browser. Invoked from `src/lib/orgCalendar.ts`.
//
// Required secrets (`supabase secrets set NAME=value`):
//   MS_GRAPH_TENANT_ID          Azure AD (Entra) directory/tenant ID
//   MS_GRAPH_CLIENT_ID          App registration's Application (client) ID
//   MS_GRAPH_CLIENT_SECRET      App registration's client secret value
//   MS_GRAPH_ORG_CALENDAR_USER  UPN/email of the mailbox whose calendar is the
//                               organisation calendar (e.g. events@fswelsford.com)
//
// The first three are shared with `sync-pto-calendar`. Only the fourth is new.
//
// IMPORTANT (Azure side, not code): this needs the Calendars.Read *application*
// permission, which by default reads every mailbox in the tenant. Scope it to
// MS_GRAPH_ORG_CALENDAR_USER alone with an Exchange Online Application Access
// Policy before relying on it — see ../SETUP.md. One shared org calendar is
// deliberately the only thing this reads: employees' personal calendars are
// out of scope by design.

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

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

    const calendarUser = Deno.env.get('MS_GRAPH_ORG_CALENDAR_USER')!;
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
