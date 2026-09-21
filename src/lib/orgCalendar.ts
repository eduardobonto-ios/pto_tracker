/**
 * Reads the organisation's shared Microsoft 365 calendar via a Supabase Edge
 * Function (`supabase/functions/read-org-calendar`), so the PTO Calendar can
 * show company events and holidays alongside leave.
 *
 * One-way and read-only: Microsoft owns this data, the PTO Tracker only
 * displays it. Nothing is stored — each view fetches the range it needs.
 *
 * This can't run in the browser, because it needs the Graph app's client
 * secret. Setup is documented in
 * `supabase/functions/SETUP.md`; until it exists, every call
 * here fails and resolves to an empty list. That is deliberate — the PTO
 * Calendar must keep working on Supabase data alone, exactly as it does today,
 * so a Microsoft outage or a lapsed client secret degrades to "no company
 * events" rather than a broken page.
 */

import { supabase } from './supabaseClient';
import type { OrgCalendarEvent } from '@/types';

/**
 * Fetch org-calendar events overlapping the inclusive date range.
 * Never throws and never rejects — returns [] if the integration is
 * unconfigured or Graph is unreachable.
 */
export async function fetchOrgCalendar(
  startIso: string,
  endIso: string,
): Promise<OrgCalendarEvent[]> {
  try {
    const { data, error } = await supabase.functions.invoke<{ events: OrgCalendarEvent[] }>(
      'read-org-calendar',
      { body: { start: startIso, end: endIso } },
    );
    if (error) throw error;
    return data?.events ?? [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[PTO Tracker] org calendar read failed for ${startIso}..${endIso}:`, err);
    return [];
  }
}
