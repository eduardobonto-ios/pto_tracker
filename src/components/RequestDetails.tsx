import { useState } from 'react';
import {
  CalendarRange,
  Check,
  CircleSlash,
  Clock3,
  FileText,
  Mail,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/Field';
import { Avatar, DetailRow, SectionTitle } from '@/components/ui/Misc';
import { PayBadge, StatusBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { formatDateLong, formatDateRange, formatDateTime, formatDays } from '@/lib/utils';
import type { PTORequest } from '@/types';

/**
 * Full detail view for one PTO request, shared by the drawer on the log page
 * and the standalone `/requests/:id` route that email links will target.
 */
export function RequestDetails({
  request,
  onDone,
}: {
  request: PTORequest;
  onDone?: () => void;
}) {
  const { employees, balances, isAdmin, approveRequest, rejectRequest } = useApp();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const employee = employees.find((e) => e.id === request.employeeId);
  const balance = employee ? balances[employee.id] : undefined;

  function handleReject() {
    if (!rejectionReason.trim()) {
      setRejectError('A reason is required so the employee knows what to do next.');
      return;
    }
    rejectRequest(request.id, rejectionReason.trim());
    setRejectOpen(false);
    setRejectionReason('');
    setRejectError('');
    onDone?.();
  }

  return (
    <div className="space-y-5">
      {/* Identity header */}
      <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar
              name={employee?.name ?? '—'}
              department={employee?.department}
              size="lg"
            />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-navy-900">
                {employee?.name ?? 'Unknown employee'}
              </h3>
              <p className="mt-0.5 truncate text-[13px] text-slateish-500">
                {employee?.jobTitle} · {employee?.department}
              </p>
              <a
                href={`mailto:${employee?.email}`}
                className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-600 hover:text-accent-500"
              >
                <Mail size={12} /> {employee?.email}
              </a>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={request.status} />
            <PayBadge payStatus={request.payStatus} />
            <span className="font-mono text-[11px] text-slateish-400">{request.id}</span>
          </div>
        </div>

        {balance && (
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slateish-200 bg-slateish-200 sm:grid-cols-4">
            <MiniStat label="Allowance" value={`${formatDays(balance.totalPto)} d`} />
            <MiniStat label="Used" value={`${formatDays(balance.daysUsed)} d`} />
            <MiniStat label="Pending" value={`${formatDays(balance.pendingDays)} d`} />
            <MiniStat
              label="Remaining"
              value={`${formatDays(balance.daysRemaining)} d`}
              danger={balance.daysRemaining < 0}
            />
          </div>
        )}
      </div>

      {/* Request facts */}
      <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
        <SectionTitle className="mb-1">Request detail</SectionTitle>
        <dl className="divide-y divide-slateish-200/70">
          <DetailRow label="Request date">{formatDateLong(request.requestDate)}</DetailRow>
          <DetailRow label="Leave type">{request.leaveType}</DetailRow>
          <DetailRow label="Start date">{formatDateLong(request.startDate)}</DetailRow>
          <DetailRow label="End date">{formatDateLong(request.endDate)}</DetailRow>
          <DetailRow label="Duration">
            {request.durationType}
            {request.totalHours ? ` · ${request.totalHours} h` : ''}
            {request.startTime && request.endTime
              ? ` (${request.startTime}–${request.endTime})`
              : ''}
          </DetailRow>
          <DetailRow label="Total days">
            <span className="font-semibold">{formatDays(request.days)}</span>
          </DetailRow>
          <DetailRow label="Paid / Unpaid">
            <PayBadge payStatus={request.payStatus} />
          </DetailRow>
          <DetailRow label="Coverage / POC">{request.coverage || 'N/A'}</DetailRow>
          <DetailRow label="Reason / notes">{request.notes}</DetailRow>
          <DetailRow label="Current status">
            <StatusBadge status={request.status} />
          </DetailRow>
          {request.reviewedBy && (
            <DetailRow label="Reviewed by">
              {request.reviewedBy} · {formatDateTime(request.reviewedAt)}
            </DetailRow>
          )}
        </dl>

        {request.rejectionReason && (
          <div className="mt-4 rounded-xl border border-danger-200 bg-danger-50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-danger-700">
              <CircleSlash size={13} /> Rejection reason
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-danger-700">
              {request.rejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
        <SectionTitle className="mb-4">Request history</SectionTitle>
        <ol className="relative space-y-5 border-l border-slateish-200 pl-6">
          {request.timeline.map((event) => (
            <li key={event.id} className="relative">
              <span
                className={`absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                  event.label === 'Approved'
                    ? 'bg-success-100 text-success-600'
                    : event.label === 'Rejected'
                      ? 'bg-danger-100 text-danger-600'
                      : 'bg-brand-100 text-brand-600'
                }`}
              >
                {event.label === 'Approved' ? (
                  <Check size={11} strokeWidth={3} />
                ) : event.label === 'Rejected' ? (
                  <X size={11} strokeWidth={3} />
                ) : (
                  <Clock3 size={11} strokeWidth={3} />
                )}
              </span>
              <p className="text-[13.5px] font-semibold text-navy-900">{event.label}</p>
              <p className="mt-0.5 text-[12px] text-slateish-400">
                {formatDateTime(event.at)} · {event.actor}
              </p>
              {event.note && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-slateish-600">
                  {event.note}
                </p>
              )}
            </li>
          ))}
          {request.status === 'Pending' && (
            <li className="relative">
              <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-warning-100 text-warning-600 ring-4 ring-white">
                <Clock3 size={11} strokeWidth={3} />
              </span>
              <p className="text-[13.5px] font-semibold text-slateish-400">
                Awaiting review
              </p>
            </li>
          )}
        </ol>
      </div>

      {/* Admin actions */}
      {isAdmin && request.status === 'Pending' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
          <p className="text-[13px] text-slateish-500">
            Approving deducts{' '}
            <strong className="text-navy-800">{formatDays(request.days)} day(s)</strong> from
            this employee&rsquo;s balance.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setRejectOpen(true)}>
              <X size={15} /> Reject request
            </Button>
            <Button
              variant="success"
              onClick={() => {
                approveRequest(request.id);
                onDone?.();
              }}
            >
              <Check size={15} /> Approve request
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 px-1 text-[12px] text-slateish-400">
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange size={13} /> {formatDateRange(request.startDate, request.endDate)}
        </span>
        <Link
          to={`/requests/${request.id}`}
          className="inline-flex items-center gap-1.5 font-medium text-accent-600 hover:text-accent-500"
        >
          <FileText size={13} /> Permanent link: /requests/{request.id}
        </Link>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this request"
        description="The reason is shown to the employee and stored on the request history."
        icon={<CircleSlash size={18} className="text-danger-600" />}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Confirm rejection
            </Button>
          </>
        }
      >
        <Field label="Rejection reason" required error={rejectError}>
          <Textarea
            autoFocus
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Two territory managers are already out that week — please refile for the following week."
          />
        </Field>
      </Modal>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slateish-400">
        {label}
      </p>
      <p
        className={`mt-1 text-[15px] font-bold tabular-nums ${
          danger ? 'text-danger-600' : 'text-navy-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
