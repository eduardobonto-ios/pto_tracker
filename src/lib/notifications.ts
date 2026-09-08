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
 *      {{to_email}}:
 *        - "New request" template — merge fields available: employeeName,
 *          department, leaveType, startDate, endDate, days, reason,
 *          requestId, requestUrl, to_email
 *        - "Request reviewed" template — merge fields available: dates,
 *          leaveType, status, adminName, adminComment, requestId,
 *          requestUrl, to_email
 *   3. Copy the Service ID, both Template IDs, and the Public Key into
 *      `.env` under the names above, then restart `npm run dev`.
 *
 * Leaving any of those unset keeps today's behavior: nothing is sent, the
 * payload is only logged to the console and shown on the Email Notification
 * Preview page. EmailJS's free tier has a monthly send-volume cap — check
 * current limits on their pricing page before relying on it for real use.
 */

import { PTO_NOTIFICATION_RECIPIENTS } from './theme';
import { formatDateRange, formatDays, uid } from './utils';
import type { Employee, PTORequest } from '@/types';

export type NotificationKind = 'new-request' | 'request-reviewed';

export interface NotificationPayload {
  id: string;
  kind: NotificationKind;
  requestId: string;
  to: string[];
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

/** Admins in the roster, plus the standing management addresses, deduped. */
function adminRecipients(employees: Employee[]): string[] {
  const admins = employees.filter((e) => e.appRole === 'Admin').map((e) => e.email);
  return Array.from(new Set([...admins, ...PTO_NOTIFICATION_RECIPIENTS]));
}

/** Sent to the appropriate admin/approver when an employee files a new request. */
export function buildNewRequestNotification(
  request: PTORequest,
  employees: Employee[],
): NotificationPayload {
  const employee = employees.find((e) => e.id === request.employeeId);
  return {
    id: uid('ntf'),
    kind: 'new-request',
    requestId: request.id,
    to: adminRecipients(employees),
    subject: `New leave request pending review — ${employee?.name ?? 'Unknown'} (${request.id})`,
    sentAt: new Date().toISOString(),
    data: {
      employeeName: employee?.name ?? '—',
      department: employee?.department ?? '—',
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      days: formatDays(request.days),
      reason: request.reason || 'No additional detail provided',
      requestId: request.id,
      requestUrl: `${window.location.origin}/requests/${request.id}`,
    },
  };
}

/** Sent to the employee once an admin approves or rejects their request. */
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
    subject: `Your PTO request was ${request.status.toLowerCase()} — ${request.id}`,
    sentAt: new Date().toISOString(),
    data: {
      dates: formatDateRange(request.startDate, request.endDate),
      leaveType: request.leaveType,
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
