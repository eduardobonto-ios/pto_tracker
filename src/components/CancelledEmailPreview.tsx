import { Link } from 'react-router-dom';
import { Line, MetaRow } from '@/components/EmailPreview';
import { useApp } from '@/context/AppContext';
import { buildCancelledNotification, type NotificationPayload } from '@/lib/notifications';
import { formatDateRange, formatDays } from '@/lib/utils';
import type { PTORequest } from '@/types';

/**
 * Rendering of the "request cancelled" notification — sent to the same
 * approver route as the new-request notice (see the CANCELLATION note in
 * `lib/notifications.ts`), not to the employee. Counterpart to `EmailPreview`
 * (new request) and `ReviewedEmailPreview` (approved/rejected).
 *
 * If `notification` (the actual payload that was sent — see
 * `AppContext.cancelRequest`) is passed in, it's shown as-is. Otherwise this
 * rebuilds a payload for display only, using a generic "cancelled by" label
 * since the real actor/reason live only in the sent payload or the request's
 * timeline, not on `PTORequest` itself.
 */
export function CancelledEmailPreview({
  request,
  notification: notificationProp,
}: {
  request: PTORequest;
  notification?: NotificationPayload;
}) {
  const { employees, routing } = useApp();
  const employee = employees.find((e) => e.id === request.employeeId);
  const cancelledEvent = [...request.timeline].reverse().find((t) => t.label === 'Cancelled');
  const notification =
    notificationProp ??
    buildCancelledNotification(
      request,
      employees,
      routing,
      cancelledEvent?.actor ?? '—',
      cancelledEvent?.note,
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-slateish-200/80 bg-white shadow-card">
      {/* Envelope metadata */}
      <div className="space-y-1 border-b border-slateish-200/70 bg-slateish-50/70 px-5 py-3 text-[12.5px] sm:px-6">
        <MetaRow label="To">{notification.to.join(', ') || '—'}</MetaRow>
        {notification.cc.length > 0 && (
          <MetaRow label="Cc">{notification.cc.join(', ')}</MetaRow>
        )}
        <MetaRow label="From">Valveman PTO Tracker &lt;no-reply@valveman.com&gt;</MetaRow>
        <MetaRow label="Subject">
          <span className="font-semibold text-navy-900">
            Leave request cancelled — {employee?.name} ({request.id})
          </span>
        </MetaRow>
      </div>

      {/* Email body */}
      <div className="bg-canvas p-3 sm:p-4">
        <div className="mx-auto max-w-[560px] overflow-hidden rounded-2xl border border-slateish-200 bg-white shadow-card">
          <div className="bg-[radial-gradient(120%_140%_at_100%_0%,#152238_0%,#0D1729_60%)] px-6 py-4">
            <p className="text-[15px] font-bold tracking-[0.02em] text-white">VALVEMAN</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-300">
              PTO Tracker
            </p>
          </div>

          <div className="px-6 py-4">
            <p className="text-[13.5px] leading-snug text-slateish-700">
              This leave request has been cancelled and no longer needs review:
            </p>

            <div className="mt-3 space-y-1.5 rounded-xl border border-slateish-200 bg-slateish-50/70 p-3">
              <Line emoji="👤" label="Team Member" value={employee?.name ?? '—'} />
              <Line emoji="🏢" label="Department" value={employee?.department ?? '—'} />
              <Line
                emoji="📅"
                label="Dates"
                value={formatDateRange(request.startDate, request.endDate)}
              />
              <Line
                emoji="⏱"
                label="Duration"
                value={`${formatDays(request.days)} day(s) · ${request.leaveType}`}
              />
              <Line emoji="💰" label="Pay Status" value={request.payStatus} />
              <Line emoji="🚫" label="Cancelled By" value={notification.data.cancelledBy} />
              <Line emoji="📝" label="Reason" value={notification.data.cancelReason} />
            </div>

            <Link
              to={`/requests/${request.id}`}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-b from-brand-400 to-brand-500 px-5 text-[13px] font-semibold text-white shadow-brand-sm transition-all hover:from-brand-500 hover:to-brand-600"
            >
              View PTO Request
            </Link>

            <p className="mt-2.5 break-all font-mono text-[11px] text-slateish-400">
              https://pto.valveman.com/requests/{request.id}
            </p>
          </div>

          <div className="border-t border-slateish-200 px-6 py-2.5">
            <p className="text-[11px] leading-snug text-slateish-400">
              You are receiving this because you review PTO requests for Valveman. This is an
              automated message from the Valveman PTO Tracker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
