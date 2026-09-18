/**
 * PTO notification / email service.
 *
 * Sends real email with zero backend and no SMTP, via EmailJS
 * (https://www.emailjs.com) — its whole model is a direct browser -> EmailJS
 * API call using a public key, with EmailJS holding the actual mailbox
 * connection (Gmail/Outlook/etc, connected once via OAuth on their
 * dashboard — no SMTP host/port/password, no app-specific password).
 *
 * Configure it by setting these in a local `.env` (see `.env.example` —
 * `.env` itself is gitignored, nothing here is hardcoded):
 *   VITE_EMAILJS_SERVICE_ID
 *   VITE_EMAILJS_PUBLIC_KEY
 *   VITE_EMAILJS_NEW_REQUEST_TEMPLATE_ID
 *   VITE_EMAILJS_REVIEWED_TEMPLATE_ID
 *   VITE_EMAILJS_CANCELLED_TEMPLATE_ID
 *   VITE_EMAILJS_SUBMITTED_TEMPLATE_ID
 * A kind with no template ID configured just fails that one send silently
 * (see `sendViaEmailJs` — `console.info`/`console.error` still log it) —
 * nothing throws, so it's easy to miss that e.g. cancellation email was
 * never actually wired up. If a kind you expect to be live isn't arriving,
 * check its env var is set in every deploy target (Vercel included — local
 * `.env` doesn't cover that), not just that EmailJS itself is configured.
 *
 * Setup on emailjs.com:
 *   1. Create a free account, add an Email Service (connect Gmail/Workspace
 *      via OAuth) — this is the one-time step that replaces SMTP entirely.
 *   2. Create four templates and set each one's "To Email" field to
 *      {{to_email}}, and its "Cc" field to {{cc_email}}:
 *        - "New request" template — merge fields available: employeeName,
 *          employeeEmail, department, leaveType, payStatus, startDate,
 *          endDate, days, reason, requestId, requestUrl, approveUrl,
 *          rejectUrl, to_email, cc_email.
 *          Add two buttons/links using approveUrl/rejectUrl so the
 *          approver can act without opening the app — see the "APPROVE/
 *          REJECT DIRECTLY FROM THE EMAIL" note below. `payStatus` is
 *          "Paid" or "Unpaid" — see `PTORequestForm.tsx#useLeaveRequestForm`
 *          for how it's derived (leave type, eligibility, and remaining
 *          balance all factor in, so a Vacation Leave request can still
 *          come through as Unpaid). This template — and only this one —
 *          contains live approve/reject links, which is exactly why the
 *          filer is never on its "To"/"Cc" (see FILER NOTIFICATIONS below).
 *        - "Request reviewed" template — merge fields available: dates,
 *          leaveType, payStatus, status, adminName, adminComment, requestId,
 *          requestUrl, to_email, cc_email
 *        - "Request cancelled" template — merge fields available:
 *          employeeName, employeeEmail, department, leaveType, payStatus,
 *          startDate, endDate, days, cancelledBy, cancelReason, requestId,
 *          requestUrl, to_email, cc_email. Sent when a Pending or Approved
 *          request is cancelled — see the CANCELLATION note below for who
 *          receives it.
 *        - "Request submitted" template — merge fields available: dates,
 *          leaveType, payStatus, days, requestId, requestUrl, to_email.
 *          Sent to the filer only, no action links — see FILER
 *          NOTIFICATIONS below.
 *   3. Copy the Service ID, all four Template IDs, and the Public Key into
 *      `.env` under the names above, then restart `npm run dev`.
 *
 * Leaving any of those unset keeps today's behavior: nothing is sent, the
 * payload is only logged to the console and shown on the Email Notification
 * Preview page. EmailJS's free tier has a monthly send-volume cap — check
 * current limits on their pricing page before relying on it for real use.
 *
 * MANAGER APPROVAL WORKFLOW — who receives the "new request" notification.
 * Primary approver(s) ("To"), most specific rule wins:
 *   1. `routing.jobTitleManagerEmail[jobTitle]` — e.g. Territory Manager ->
 *      Gil. Sourced from the `pto_approver_routing` Supabase table.
 *   2. `routing.departmentManagerEmail[department]` — e.g. Administration ->
 *      April. Same table.
 *   3. Default, for now: `routing.willEmail` and `routing.princesEmail`
 *      together, sourced from the `pto_settings` table.
 * Princes is cc'd ("Cc") whenever she isn't already a "To" approver — she's
 * a primary approver only via the default pair in (3), never otherwise.
 * See `lib/supabaseMappers.ts#loadApproverRouting`, loaded once at startup
 * by `AppContext` and passed into the builders below.
 *
 * FILER NOTIFICATIONS — the filer is never on the new-request email's "To"
 * or "Cc", even though that's the notice for *their* request: EmailJS sends
 * one identical body to every To/Cc address on a given call, and the
 * new-request email carries live, single-use approve/reject links meant
 * only for the approver — cc'ing the filer on it would hand them a working
 * self-approve button. Instead `AppContext.submitRequest` separately sends
 * `buildSubmittedNotification`, a plain confirmation with no action links,
 * to the filer alone. The filer *is* cc'd on `buildCancelledNotification`
 * below, since that one never carries action links.
 *
 * CANCELLATION — `buildCancelledNotification` reuses the exact same "To"
 * resolution as the new-request notification above (the approver route,
 * not `request.reviewedBy`), so the same people who were or would have
 * been asked to review the request also hear when it's pulled back —
 * whether it was still Pending or already Approved when cancelled. Cc adds
 * Princes (if not already To) and the filer — see FILER NOTIFICATIONS.
 *
 * APPROVE/REJECT DIRECTLY FROM THE EMAIL — now implemented. `AppContext`
 * mints a single-use, expiring, signed action token per action (via the
 * `pto_mint_action_token` Supabase RPC — only the SHA-256 hash is ever
 * stored) and injects `approveUrl`/`rejectUrl` into this payload's `data`
 * before sending. Clicking either link opens the public `/respond` route
 * (`pages/EmailAction.tsx`), which resolves and then consumes the token via
 * `pto_resolve_action_token` / `pto_consume_action_token` — no app login
 * required. `requestUrl` still deep-links into the authenticated app as a
 * fallback (e.g. after the token has expired or already been used).
 */

import { formatDateRange, formatDays, uid } from './utils';
import type { ApproverRouting } from './supabaseMappers';
import type { Employee, PayStatus, PTORequest, PTOStatus } from '@/types';

export type NotificationKind =
  | 'new-request'
  | 'request-reviewed'
  | 'request-cancelled'
  | 'request-submitted';

export interface NotificationPayload {
  id: string;
  kind: NotificationKind;
  requestId: string;
  to: string[];
  cc: string[];
  subject: string;
  sentAt: string;
  /** Display-ready fields for the email templates / EmailPreview pages. */
  data: Record<string, string>;
}

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_TEMPLATE_IDS: Record<NotificationKind, string | undefined> = {
  'new-request': import.meta.env.VITE_EMAILJS_NEW_REQUEST_TEMPLATE_ID,
  'request-reviewed': import.meta.env.VITE_EMAILJS_REVIEWED_TEMPLATE_ID,
  'request-cancelled': import.meta.env.VITE_EMAILJS_CANCELLED_TEMPLATE_ID,
  'request-submitted': import.meta.env.VITE_EMAILJS_SUBMITTED_TEMPLATE_ID,
};

/** Whether enough EmailJS config is present to attempt a real send. */
export function isLiveEmailConfigured(): boolean {
  return Boolean(EMAILJS_SERVICE_ID && EMAILJS_PUBLIC_KEY);
}

/**
 * Primary approver(s) ("To") for a new request — see the resolution order
 * documented in the file header. Whichever tier matches, the filer
 * themself is excluded (nobody approves their own leave); if that leaves
 * the list empty, falls back to every other Admin, and finally to Princes
 * alone, so a request is never left with no recipient at all.
 */
function newRequestApprovers(
  employee: Employee | undefined,
  employees: Employee[],
  routing: ApproverRouting,
): string[] {
  const isSelf = (email: string) => email.toLowerCase() === employee?.email.toLowerCase();

  const jobTitleManager = employee ? routing.jobTitleManagerEmail[employee.jobTitle] : undefined;
  const departmentManager = employee ? routing.departmentManagerEmail[employee.department] : undefined;
  const candidates =
    jobTitleManager ? [jobTitleManager]
    : departmentManager ? [departmentManager]
    // Both default slots can point at the same address (e.g. while testing
    // with a single inbox), so dedupe rather than emailing them twice.
    : dedupeEmails([routing.willEmail, routing.princesEmail]);

  const filtered = candidates.filter((email) => !isSelf(email));
  if (filtered.length > 0) return filtered;

  const fallback = employees
    .filter((e) => e.appRole === 'Admin' && e.id !== employee?.id)
    .map((e) => e.email);
  return fallback.length > 0 ? fallback : [routing.princesEmail];
}

function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter((email) => {
    const key = email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * "Cc" list for a notification already addressed ("To") to the approver
 * route: Princes, unless she's already a primary approver, plus — only when
 * `includeFiler` is true — the filer themself, so they have a record it went
 * out. `includeFiler` must stay false for any notification that can carry
 * approve/reject action links (see FILER NOTIFICATIONS in the file header).
 * Shared by the new-request and cancellation notifications, which use
 * identical "To" routing.
 */
function approverCc(
  to: string[],
  employee: Employee | undefined,
  routing: ApproverRouting,
  includeFiler: boolean,
): string[] {
  const isToAlready = (email: string) => to.some((e) => e.toLowerCase() === email.toLowerCase());
  return [
    ...(isToAlready(routing.princesEmail) ? [] : [routing.princesEmail]),
    ...(includeFiler && employee && !isToAlready(employee.email) ? [employee.email] : []),
  ];
}

/**
 * Sent to the appropriate manager(s) when an employee files a new request.
 * Pure/synchronous — does not mint action tokens. `AppContext.submitRequest`
 * mints `approveUrl`/`rejectUrl` separately and adds them to `data` before
 * sending, so this can also be called repeatedly for the Email Notification
 * Preview page without spending real tokens. Never cc's the filer — see
 * FILER NOTIFICATIONS in the file header; `buildSubmittedNotification`
 * below is what they actually get.
 */
export function buildNewRequestNotification(
  request: PTORequest,
  employees: Employee[],
  routing: ApproverRouting,
): NotificationPayload {
  const employee = employees.find((e) => e.id === request.employeeId);
  const to = newRequestApprovers(employee, employees, routing);
  return {
    id: uid('ntf'),
    kind: 'new-request',
    requestId: request.id,
    to,
    cc: approverCc(to, employee, routing, false),
    subject: `New leave request pending review — ${employee?.name ?? 'Unknown'} (${request.id})`,
    sentAt: new Date().toISOString(),
    data: {
      employeeName: employee?.name ?? '—',
      employeeEmail: employee?.email ?? '',
      department: employee?.department ?? '—',
      leaveType: request.leaveType,
      payStatus: request.payStatus,
      startDate: request.startDate,
      endDate: request.endDate,
      days: formatDays(request.days),
      reason: request.reason || 'No additional detail provided',
      requestId: request.id,
      requestUrl: `${window.location.origin}/requests/${request.id}`,
    },
  };
}

/**
 * Sent to the filer as confirmation that their request went out — the
 * counterpart to `buildNewRequestNotification` above. Deliberately carries
 * no approve/reject links (see FILER NOTIFICATIONS in the file header).
 */
export function buildSubmittedNotification(
  request: PTORequest,
  employees: Employee[],
): NotificationPayload {
  const employee = employees.find((e) => e.id === request.employeeId);
  return {
    id: uid('ntf'),
    kind: 'request-submitted',
    requestId: request.id,
    to: employee ? [employee.email] : [],
    cc: [],
    subject: `Your PTO request has been submitted — ${request.id}`,
    sentAt: new Date().toISOString(),
    data: {
      dates: formatDateRange(request.startDate, request.endDate),
      leaveType: request.leaveType,
      payStatus: request.payStatus,
      days: formatDays(request.days),
      requestId: request.id,
      requestUrl: `${window.location.origin}/requests/${request.id}`,
    },
  };
}

/** Sent to the employee once their manager/approver approves or rejects their request. */
export function buildReviewedNotification(
  request: PTORequest,
  employees: Employee[],
  adminName: string,
): NotificationPayload {
  const employee = employees.find((e) => e.id === request.employeeId);
  const adminComment =
    request.status === 'Rejected' ? request.rejectionReason : request.approvalComment;
  return {
    id: uid('ntf'),
    kind: 'request-reviewed',
    requestId: request.id,
    to: employee ? [employee.email] : [],
    cc: [],
    subject: `Your PTO request was ${request.status.toLowerCase()} — ${request.id}`,
    sentAt: new Date().toISOString(),
    data: {
      dates: formatDateRange(request.startDate, request.endDate),
      leaveType: request.leaveType,
      payStatus: request.payStatus,
      status: request.status,
      adminName,
      adminComment: adminComment || '',
      requestId: request.id,
      requestUrl: `${window.location.origin}/requests/${request.id}`,
    },
  };
}

/**
 * Same email as `buildReviewedNotification`, built from a `pto_consume_action_token`
 * outcome instead of a loaded `PTORequest`/`Employee[]` — used by the public
 * `/respond` page (`pages/EmailAction.tsx`), which acts on a signed token
 * alone and never loads `AppContext`'s app state. See the "APPROVE/REJECT
 * DIRECTLY FROM THE EMAIL" note above: consuming the token only updates the
 * database (via the same `pto_approve_request`/`pto_reject_request` RPCs the
 * in-app buttons use) — nothing there emails the filer, so the page that
 * consumed the token is responsible for sending this itself.
 */
export function buildReviewedNotificationFromToken(outcome: {
  requestId: string;
  status: PTOStatus;
  leaveType: string;
  startDate: string;
  endDate: string | null;
  employeeEmail: string | null;
  payStatus: PayStatus | null;
}, adminName: string, adminComment?: string): NotificationPayload {
  return {
    id: uid('ntf'),
    kind: 'request-reviewed',
    requestId: outcome.requestId,
    to: outcome.employeeEmail ? [outcome.employeeEmail] : [],
    cc: [],
    subject: `Your PTO request was ${outcome.status.toLowerCase()} — ${outcome.requestId}`,
    sentAt: new Date().toISOString(),
    data: {
      dates: formatDateRange(outcome.startDate, outcome.endDate ?? undefined),
      leaveType: outcome.leaveType,
      payStatus: outcome.payStatus ?? '',
      status: outcome.status,
      adminName,
      adminComment: adminComment || '',
      requestId: outcome.requestId,
      requestUrl: `${window.location.origin}/requests/${outcome.requestId}`,
    },
  };
}

/**
 * Sent to the approver route (same resolution as `buildNewRequestNotification`
 * — see the CANCELLATION note in the file header) when a Pending or Approved
 * request is cancelled, by the filer or by an admin on their behalf.
 */
export function buildCancelledNotification(
  request: PTORequest,
  employees: Employee[],
  routing: ApproverRouting,
  cancelledByName: string,
  cancelReason?: string,
): NotificationPayload {
  const employee = employees.find((e) => e.id === request.employeeId);
  const to = newRequestApprovers(employee, employees, routing);
  return {
    id: uid('ntf'),
    kind: 'request-cancelled',
    requestId: request.id,
    to,
    cc: approverCc(to, employee, routing, true),
    subject: `Leave request cancelled — ${employee?.name ?? 'Unknown'} (${request.id})`,
    sentAt: new Date().toISOString(),
    data: {
      employeeName: employee?.name ?? '—',
      employeeEmail: employee?.email ?? '',
      department: employee?.department ?? '—',
      leaveType: request.leaveType,
      payStatus: request.payStatus,
      startDate: request.startDate,
      endDate: request.endDate,
      days: formatDays(request.days),
      cancelledBy: cancelledByName,
      cancelReason: cancelReason || 'No reason provided',
      requestId: request.id,
      requestUrl: `${window.location.origin}/requests/${request.id}`,
    },
  };
}

/** POSTs one email through the EmailJS REST API — the browser-to-provider call described above. */
async function sendViaEmailJs(payload: NotificationPayload): Promise<boolean> {
  const templateId = EMAILJS_TEMPLATE_IDS[payload.kind];
  if (!templateId || payload.to.length === 0) return false;

  const res = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        ...payload.data,
        to_email: payload.to.join(','),
        cc_email: payload.cc.join(','),
        subject: payload.subject,
      },
    }),
  });
  return res.ok;
}

/**
 * Sends the notification if EmailJS is configured (see file header);
 * otherwise falls back to a console-only preview, same as before. Firing the
 * network call is fire-and-forget — callers get the payload back immediately
 * for the in-app notification log regardless of delivery outcome.
 */
export function sendNotification(payload: NotificationPayload): NotificationPayload {
  if (isLiveEmailConfigured()) {
    sendViaEmailJs(payload)
      .then((ok) => {
        // eslint-disable-next-line no-console
        console.info(
          `[PTO Tracker] ${payload.kind} notification ${ok ? 'sent' : 'failed to send'} via EmailJS to ${payload.to.join(', ') || 'no recipients'}`,
        );
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[PTO Tracker] ${payload.kind} notification failed to send via EmailJS:`, err);
      });
  } else {
    // eslint-disable-next-line no-console
    console.info(
      `[PTO Tracker] ${payload.kind} notification queued for ${payload.to.join(', ') || 'no recipients'} ` +
        '(preview only — EmailJS is not configured; see lib/notifications.ts / .env.example):',
      payload,
    );
  }
  return payload;
}
