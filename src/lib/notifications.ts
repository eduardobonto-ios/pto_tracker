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
 *
 * Setup on emailjs.com:
 *   1. Create a free account, add an Email Service (connect Gmail/Workspace
 *      via OAuth) — this is the one-time step that replaces SMTP entirely.
 *   2. Create two templates and set each one's "To Email" field to
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
 *          come through as Unpaid).
 *        - "Request reviewed" template — merge fields available: dates,
 *          leaveType, payStatus, status, adminName, adminComment, requestId,
 *          requestUrl, to_email, cc_email
 *   3. Copy the Service ID, both Template IDs, and the Public Key into
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
import type { Employee, PTORequest } from '@/types';

export type NotificationKind = 'new-request' | 'request-reviewed';

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
    : [routing.willEmail, routing.princesEmail];

  const filtered = candidates.filter((email) => !isSelf(email));
  if (filtered.length > 0) return filtered;

  const fallback = employees
    .filter((e) => e.appRole === 'Admin' && e.id !== employee?.id)
    .map((e) => e.email);
  return fallback.length > 0 ? fallback : [routing.princesEmail];
}

/**
 * Sent to the appropriate manager(s) when an employee files a new request.
 * Pure/synchronous — does not mint action tokens. `AppContext.submitRequest`
 * mints `approveUrl`/`rejectUrl` separately and adds them to `data` before
 * sending, so this can also be called repeatedly for the Email Notification
 * Preview page without spending real tokens.
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
    // Princes is cc'd unless she's already a primary approver above.
    cc: to.some((email) => email.toLowerCase() === routing.princesEmail.toLowerCase())
      ? []
      : [routing.princesEmail],
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
