/**
 * Google Calendar sync — not implemented yet.
 *
 * The in-app PTO Calendar (`pages/PTOCalendar.tsx` / `components/Calendar.tsx`)
 * is fully self-contained and does not depend on this module or on Google in
 * any way. This file only defines the seam so a future phase can additionally
 * push approved PTO into the FSW Google Calendar without touching the
 * calendar UI.
 *
 * TODO(Google Calendar integration — future phase, needs FSW Google access):
 *   - Provision OAuth/service-account credentials for the FSW Google
 *     Workspace and store them server-side only — e.g.
 *     GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET or a service
 *     account key, plus GOOGLE_CALENDAR_ID for the target calendar. Never
 *     hardcode these, and never ship them in the frontend bundle.
 *   - Implement `pushApprovedLeaveToGoogleCalendar` below to call the Google
 *     Calendar API (events.insert / events.patch / events.delete) from a
 *     backend endpoint — this must not run in the browser, since that would
 *     expose credentials.
 *   - Call it from `AppContext` alongside `approveRequest` (create/update the
 *     event) and `cancelRequest`/`rejectRequest` (remove it), the same way
 *     `lib/notifications.ts` is wired in today.
 */

import type { PTORequest } from '@/types';

export interface CalendarSyncTarget {
  /** Not implemented — reserved for the future FSW Google Calendar ID. */
  calendarId?: string;
}

/**
 * Placeholder for the future push-to-Google-Calendar call. Intentionally a
 * no-op today — no credentials are configured, and the PTO Tracker does not
 * require this to function.
 */
export async function pushApprovedLeaveToGoogleCalendar(
  _request: PTORequest,
  _target?: CalendarSyncTarget,
): Promise<void> {
  // TODO(Google Calendar integration): implement once FSW Google Workspace
  // access and credentials are available. See the file header for the
  // configuration this will need.
}
