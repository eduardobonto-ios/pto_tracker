// Publishes approved PTO as an iCalendar feed that Outlook (or Google, or
// Apple) can subscribe to, so leave shows up on people's Microsoft calendars
// WITHOUT any tenant admin involvement.
//
// Why this exists: writing events into a Microsoft mailbox needs an Entra app
// registration with Calendars.ReadWrite and admin consent, which is blocked on
// the MSP. Subscribing is the mirror image — the calendar lives here, Outlook
// pulls it, and nobody has to grant anything. `sync-pto-calendar` remains the
// better answer once consent lands; this gets the same leave onto the same
// screens today. See ../SETUP.md.
//
// SECURITY — read before deploying.
// Outlook cannot send an Authorization header when polling a subscribed
// calendar, so this endpoint must answer unauthenticated requests. The only
// protection is the token in the query string, which makes the feed URL a
// credential: anyone holding it can read every employee's name, department and
// leave dates. Consequences:
//   - Treat the URL like a password. Share it the way you would share one.
//   - Rotate by setting a new PTO_FEED_TOKEN. That invalidates every existing
//     subscription, and everyone must re-subscribe.
//   - It deliberately carries no leave *reasons* — those stay in the app.
//   - It returns 404, not 401, on a bad token, so probing reveals nothing.
//
// This is the same trust model as Outlook's own "Publish a calendar" feature,
// which this project already relies on for the inbound direction.
//
// Required secret:
//   PTO_FEED_TOKEN   long random string; accepted either as a path segment or
//                    as ?token=
//
// Prefer the path form when subscribing:
//   .../pto-calendar-feed/<token>/calendar.ics
// Outlook fetches subscribed calendars server-side, and that fetcher is fussy
// about URLs carrying a query string and not ending in .ics — it reports
// "Couldn't import calendar. Try again later." without explaining why. The
// query form still works for curl and for anything already subscribed.
//
// Deploy with JWT verification off, or Outlook gets a 401 and the subscription
// silently never populates:
//   supabase functions deploy pto-calendar-feed --no-verify-jwt --project-ref <ref>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildIcsFeed, icsStamp, type RequestRow } from './build.ts';

/** How far either side of today to publish. Outlook shows a rolling window. */
const MONTHS_BACK = 6;
const MONTHS_FORWARD = 12;

function shiftMonths(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const expected = Deno.env.get('PTO_FEED_TOKEN');
  const url = new URL(req.url);
  // Accept the token from either form. The path form exists because Outlook's
  // server-side fetcher balks at query strings on a calendar URL; the query
  // form is kept so anything already subscribed keeps working.
  const supplied = url.pathname.split('/').includes(expected ?? '\0')
    ? expected
    : url.searchParams.get('token');
  // 404 rather than 401: a wrong or missing token should look like nothing is
  // here, not like something worth guessing at.
  if (!expected || supplied !== expected) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('pto_requests')
      .select(
        'id, leave_type, start_date, end_date, duration_type, pay_status, pto_employees(name, department)',
      )
      .eq('status', 'Approved')
      .gte('start_date', shiftMonths(-MONTHS_BACK))
      .lte('start_date', shiftMonths(MONTHS_FORWARD))
      .order('start_date');
    if (error) throw error;

    const body = buildIcsFeed((data ?? []) as unknown as RequestRow[], icsStamp(new Date()));

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="valveman-welsford-pto.ics"',
        'Cache-Control': 'public, max-age=900',
      },
    });
  } catch (err) {
    console.error('[pto-calendar-feed]', err);
    return new Response('Internal error', { status: 500 });
  }
});
