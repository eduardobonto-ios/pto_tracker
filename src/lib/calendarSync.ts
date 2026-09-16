/**
 * PTO -> Microsoft 365 calendar sync, via a Supabase Edge Function
 * (`supabase/functions/sync-pto-calendar`) that calls Microsoft Graph.
 *
 * This can't run in the browser: it needs the Graph app's client secret,
 * which must never reach the frontend bundle (same reason the Supabase
 * service-role key never does). The Edge Function looks the request up
 * itself, using its own service-role Supabase client, and talks to Graph
 * directly — this file just fires the invoke and doesn't wait for or depend
 * on the result, exactly like `lib/notifications.ts`'s email sending.
 *
 * Setup needed before this does anything (see the Edge Function's header
 * comment for the exact Azure steps):
 *   - An Azure AD (Entra) app registration in the fswelsford.com tenant with
 *     the Calendars.ReadWrite *application* permission, admin-consented.
 *   - An Exchange Online Application Access Policy scoping that app to only
 *     the one shared PTO calendar mailbox — otherwise the app can read/
 *     write every mailbox in the tenant.
 *   - Four secrets set on the Supabase project: MS_GRAPH_TENANT_ID,
 *     MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_CALENDAR_USER.
 * Until those exist, the calls below simply fail (logged to the console,
 * never surfaced to the user) — the PTO Tracker does not require this to
 * function, same as email notifications degrade to preview-only.
 */

import { supabase } from './supabaseClient';
import type { PTORequest } from '@/types';

async function invokeSync(requestId: string, action: 'upsert' | 'delete') {
  const { error } = await supabase.functions.invoke('sync-pto-calendar', {
    body: { requestId, action },
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[PTO Tracker] calendar sync (${action}) failed for ${requestId}:`, error);
  }
}

/** Call after a request is approved — creates or updates its calendar event. */
export function syncApprovedLeaveToCalendar(request: PTORequest): void {
  void invokeSync(request.id, 'upsert');
}

/** Call after an approved request is cancelled — removes its calendar event, if any existed. */
export function removeLeaveFromCalendar(request: PTORequest): void {
  void invokeSync(request.id, 'delete');
}
