// Pushes approved PTO onto a shared Microsoft 365 calendar via Microsoft
// Graph (app-only, client-credentials flow) and removes it again if the
// request is later cancelled. Runs server-side only, because it needs the
// Graph app's client secret and the Supabase service-role key — neither of
// which may ever reach the browser. Invoked from the frontend via
// `src/lib/calendarSync.ts` after approve/cancel, fire-and-forget.
//
// Required secrets (`supabase secrets set NAME=value`):
//   MS_GRAPH_TENANT_ID      Azure AD (Entra) directory/tenant ID
//   MS_GRAPH_CLIENT_ID      App registration's Application (client) ID
//   MS_GRAPH_CLIENT_SECRET  App registration's client secret value
//   MS_GRAPH_CALENDAR_USER  UPN/email of the shared mailbox whose calendar
//                           is the target (e.g. ptocalendar@fswelsford.com)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically to
// every Edge Function — do not set them yourself.
//
// IMPORTANT (Azure side, not code): the app registration's Calendars.ReadWrite
// permission is an *application* permission, which by default grants access
// to every mailbox in the tenant. Scope it down to just MS_GRAPH_CALENDAR_USER
// with an Exchange Online Application Access Policy before relying on this:
//   Connect-ExchangeOnline
//   New-ApplicationAccessPolicy -AppId <client-id> `
//     -PolicyScopeGroupId <MS_GRAPH_CALENDAR_USER> `
//     -AccessRight RestrictAccess `
//     -Description "Valveman PTO Tracker -- PTO calendar mailbox only"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
// Fixed GUID namespacing this app's custom event property, so an existing
// event can be found again by PTO request id without storing our own
// event-id mapping anywhere.
const EXT_PROP_ID = '{7d3e6b4a-9c2f-4b1a-9e7a-6f2a1c9b0a11}';
const EXT_PROP_NAME = 'PTORequestId';
const EXT_PROP_KEY = `String ${EXT_PROP_ID} Name ${EXT_PROP_NAME}`;

interface SyncBody {
  requestId: string;
  action: 'upsert' | 'delete';
}

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

async function findEventId(token: string, calendarUser: string, requestId: string): Promise<string | null> {
  const filter = encodeURIComponent(
    `singleValueExtendedProperties/Any(ep: ep/id eq '${EXT_PROP_KEY}' and ep/value eq '${requestId}')`,
  );
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(calendarUser)}/events?$filter=${filter}&$select=id`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Graph event lookup failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { value: Array<{ id: string }> };
  return json.value[0]?.id ?? null;
}

/** Graph all-day events use an exclusive end date — the day *after* the last day of leave. */
function exclusiveEndDate(endDateIso: string): string {
  const d = new Date(`${endDateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const { requestId, action } = (await req.json()) as SyncBody;
    if (!requestId || !action) {
      return new Response(JSON.stringify({ error: 'requestId and action are required' }), { status: 400 });
    }

    const calendarUser = Deno.env.get('MS_GRAPH_CALENDAR_USER')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: request, error } = await supabase
      .from('pto_requests')
      .select('id, leave_type, start_date, end_date, status, coverage, pto_employees(name, department)')
      .eq('id', requestId)
      .single();
    if (error || !request) throw new Error(`Request ${requestId} not found: ${error?.message}`);

    const token = await getGraphToken();
    const existingId = await findEventId(token, calendarUser, requestId);
    const shouldExist = action === 'upsert' && request.status === 'Approved';

    if (!shouldExist) {
      if (existingId) {
        const res = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(calendarUser)}/events/${existingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok && res.status !== 404) throw new Error(`Graph delete failed: ${res.status} ${await res.text()}`);
      }
      return new Response(JSON.stringify({ status: existingId ? 'deleted' : 'noop' }), { status: 200 });
    }

    const employee = (request as unknown as { pto_employees: { name: string; department: string } }).pto_employees;
    const body = {
      subject: `${employee?.name ?? 'Employee'} — PTO (${request.leave_type})`,
      isAllDay: true,
      start: { dateTime: `${request.start_date}T00:00:00`, timeZone: 'UTC' },
      end: { dateTime: `${exclusiveEndDate(request.end_date)}T00:00:00`, timeZone: 'UTC' },
      body: {
        contentType: 'Text',
        content: `Department: ${employee?.department ?? '—'}\nCoverage: ${request.coverage || 'N/A'}\nRequest: ${request.id}`,
      },
      singleValueExtendedProperties: [{ id: EXT_PROP_KEY, value: request.id }],
    };

    const url = existingId
      ? `${GRAPH_BASE}/users/${encodeURIComponent(calendarUser)}/events/${existingId}`
      : `${GRAPH_BASE}/users/${encodeURIComponent(calendarUser)}/events`;
    const res = await fetch(url, {
      method: existingId ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Graph ${existingId ? 'update' : 'create'} failed: ${res.status} ${await res.text()}`);

    return new Response(JSON.stringify({ status: existingId ? 'updated' : 'created' }), { status: 200 });
  } catch (err) {
    console.error('[sync-pto-calendar]', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
