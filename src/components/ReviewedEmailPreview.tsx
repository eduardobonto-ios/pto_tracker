import { Link } from 'react-router-dom';
import { Line, MetaRow } from '@/components/EmailPreview';
import { useApp } from '@/context/AppContext';
import { formatDateRange, formatDays } from '@/lib/utils';
import type { PTORequest } from '@/types';

/**
 * Rendering of the notification sent to the employee once their request has
 * been approved or rejected — the counterpart to `EmailPreview` (the
 * "new request" notice sent to the admin/approver). Nothing is sent from
 * this prototype; see `lib/notifications.ts` for the real send path.
 */
export function ReviewedEmailPreview({ request }: { request: PTORequest }) {
  const { employees } = useApp();
  const employee = employees.find((e) => e.id === request.employeeId);
  const approved = request.status === 'Approved';
  const adminComment = approved ? request.approvalComment : request.rejectionReason;

  return (
    <div className="overflow-hidden rounded-2xl border border-slateish-200/80 bg-white shadow-card">
      {/* Envelope metadata */}
      <div className="space-y-1 border-b border-slateish-200/70 bg-slateish-50/70 px-5 py-3 text-[12.5px] sm:px-6">
        <MetaRow label="To">{employee?.email ?? '—'}</MetaRow>
        <MetaRow label="From">Valveman PTO Tracker &lt;no-reply@valveman.com&gt;</MetaRow>
        <MetaRow label="Subject">
          <span className="font-semibold text-navy-900">
            Your PTO request was {request.status.toLowerCase()} — {request.id}
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
              {approved
                ? 'Good news — your leave request has been approved:'
                : 'Your leave request was not approved this time:'}
            </p>

            <div className="mt-3 space-y-1.5 rounded-xl border border-slateish-200 bg-slateish-50/70 p-3">
              <Line
                emoji="📅"
                label="Dates"
                value={formatDateRange(request.startDate, request.endDate)}
              />
              <Line emoji="🏷" label="Leave Type" value={request.leaveType} />
              <Line
                emoji="⏱"
                label="Duration"
                value={`${formatDays(request.days)} day(s)`}
              />
              <Line emoji={approved ? '✅' : '⛔'} label="Status" value={request.status} />
              <Line emoji="🧑‍💼" label="Reviewed By" value={request.reviewedBy ?? '—'} />
              {adminComment && (
                <Line emoji="📝" label="Admin Comments" value={adminComment} />
              )}
            </div>

            <p className="mt-3 text-[13.5px] leading-snug text-slateish-700">
              View the full request in the PTO Tracker:
            </p>

            <Link
              to={`/requests/${request.id}`}
              className="mt-2.5 inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-b from-brand-400 to-brand-500 px-5 text-[13px] font-semibold text-white shadow-brand-sm transition-all hover:from-brand-500 hover:to-brand-600"
            >
              View PTO Request
            </Link>

            <p className="mt-2.5 break-all font-mono text-[11px] text-slateish-400">
              https://pto.valveman.com/requests/{request.id}
            </p>
          </div>

          <div className="border-t border-slateish-200 px-6 py-2.5">
            <p className="text-[11px] leading-snug text-slateish-400">
              You are receiving this because you filed a PTO request with Valveman. This is an
              automated message from the Valveman PTO Tracker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
