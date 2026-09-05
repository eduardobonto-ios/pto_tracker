import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PTO_NOTIFICATION_RECIPIENTS } from '@/lib/theme';
import { formatDateRange, formatDays } from '@/lib/utils';
import type { PTORequest } from '@/types';

/**
 * Rendering of the notification that will be sent once SMTP is wired up in the
 * backend phase. Nothing is sent from this prototype.
 */
export function EmailPreview({ request }: { request: PTORequest }) {
  const { employees } = useApp();
  const employee = employees.find((e) => e.id === request.employeeId);

  return (
    <div className="overflow-hidden rounded-2xl border border-slateish-200/80 bg-white shadow-card">
      {/* Envelope metadata */}
      <div className="space-y-1 border-b border-slateish-200/70 bg-slateish-50/70 px-5 py-3 text-[12.5px] sm:px-6">
        <MetaRow label="To">
          {PTO_NOTIFICATION_RECIPIENTS.join(', ')}
        </MetaRow>
        <MetaRow label="From">Valveman PTO Tracker &lt;no-reply@valveman.com&gt;</MetaRow>
        <MetaRow label="Subject">
          <span className="font-semibold text-navy-900">
            New leave request pending review — {employee?.name} ({request.id})
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
              A new leave request has been filed and is pending your review:
            </p>

            <div className="mt-3 space-y-1.5 rounded-xl border border-slateish-200 bg-slateish-50/70 p-3">
              <Line emoji="👤" label="Team Member" value={employee?.name ?? '—'} />
              <Line emoji="💼" label="Role" value={employee?.jobTitle ?? '—'} />
              <Line emoji="🏢" label="Department" value={employee?.department ?? '—'} />
              <Line
                emoji="📅"
                label="Dates"
                value={formatDateRange(request.startDate, request.endDate)}
              />
              <Line
                emoji="⏱"
                label="Duration"
                value={`${formatDays(request.days)} day(s) · ${request.durationType}`}
              />
              <Line emoji="💰" label="Pay Status" value={request.payStatus} />
              <Line emoji="🤝" label="Coverage / POC" value={request.coverage || 'N/A'} />
              <Line
                emoji="📝"
                label="Notes"
                value={`${request.leaveType} — ${request.reason || 'No additional detail'}`}
              />
            </div>

            <p className="mt-3 text-[13.5px] leading-snug text-slateish-700">
              Open the PTO Tracker to approve or decline:
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
              You are receiving this because you review PTO requests for Valveman. This is an
              automated message from the Valveman PTO Tracker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-slateish-400">
        {label}
      </span>
      <span className="min-w-0 break-words text-slateish-600">{children}</span>
    </div>
  );
}

function Line({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <p className="flex gap-2 text-[13.5px] leading-relaxed">
      <span aria-hidden className="shrink-0">
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="font-semibold text-navy-900">{label}:</span>{' '}
        <span className="text-slateish-700">{value}</span>
      </span>
    </p>
  );
}
