// Lets the org-calendar overlay recognise events the PTO Tracker itself wrote.
//
// When one Microsoft calendar holds both company events AND pushed PTO, the
// tracker would otherwise read its own leave back and draw it a second time —
// once in blue from Supabase, once as a grey "company event" chip. So the
// writer stamps a marker into each event's body and the reader drops anything
// carrying it.
//
// The marker lives in the BODY rather than in a Graph extended property
// because the overlay may read either from Graph or from a published ICS feed,
// and ICS carries no extended properties. The body survives both, so one
// mechanism covers both transports.
//
// It is human-readable on purpose: someone looking at the event in Outlook
// should understand why editing it there is pointless.

/** Stable prefix identifying a PTO Tracker-authored event. */
export const PTO_MARKER_PREFIX = '[pto-tracker:';

/** The line stamped into the body of every event the tracker creates. */
export function ptoMarkerLine(requestId: string): string {
  return `${PTO_MARKER_PREFIX}${requestId}] Created automatically by the Valveman-Welsford PTO Tracker. Edits made here are overwritten.`;
}

/** True if this text came from an event the tracker authored. */
export function isPtoTrackerEvent(...text: (string | null | undefined)[]): boolean {
  return text.some((t) => typeof t === 'string' && t.includes(PTO_MARKER_PREFIX));
}
