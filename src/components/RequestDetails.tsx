import { useState } from 'react';
import {
  Ban,
  CalendarRange,
  Check,
  CircleSlash,
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Avatar, DetailRow, SectionTitle } from '@/components/ui/Misc';
import { PayBadge, StatusBadge } from '@/components/StatusBadge';
import { DepartmentLeaveNotice } from '@/components/DepartmentLeaveNotice';
import { useApp } from '@/context/AppContext';
import { formatDateLong, formatDateRange, formatDateTime, formatDays } from '@/lib/utils';
import type { PTORequest } from '@/types';

/**
 * Full detail view for one PTO request, shared by the drawer on the log page
 * and the standalone `/requests/:id` route that email links will target.
 */
export function RequestDetails({ request }: { request: PTORequest }) {
  const { employees, balances, currentUser, isAdmin, cancelRequest } = useApp();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const employee = employees.find((e) => e.id === request.employeeId);
  const balance = employee ? balances[employee.id] : undefined;

  // Only the requester (or an admin acting on their behalf) can cancel, and
  // only while the request is still open — a Rejected or already-Cancelled
  // record is terminal.
  const canCancel =
    (currentUser.id === request.employeeId || isAdmin) &&
    (request.status === 'Pending' || request.status === 'Approved');

  function handleCancel() {
    cancelRequest(request.id, cancelReason.trim() || undefined);
    setCancelOpen(false);
    setCancelReason('');
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
            {canCancel && (
              <Button size="sm" variant="secondary" onClick={() => setCancelOpen(true)}>
                <Ban size={14} /> Cancel request
              </Button>
            )}
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

      {request.status === 'Pending' && (
        <DepartmentLeaveNotice
          employee={employee}
          startDate={request.startDate}
          endDate={request.endDate}
          excludeRequestId={request.id}
        />
      )}

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

        {request.approvalComment && (
          <div className="mt-4 rounded-xl border border-success-100 bg-success-50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success-700">
              <MessageSquare size={13} /> Admin comments
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-success-700">
              {request.approvalComment}
            </p>
          </div>
        )}

        {request.status === 'Cancelled' && (
          <div className="mt-4 rounded-xl border border-slateish-200 bg-slateish-50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slateish-500">
              <Ban size={13} /> Cancelled
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slateish-600">
              {request.timeline.find((e) => e.label === 'Cancelled')?.note ??
                'Cancelled by the employee.'}
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
                      : event.label === 'Cancelled'
                        ? 'bg-slateish-100 text-slateish-500'
                        : 'bg-brand-100 text-brand-600'
                }`}
              >
                {event.label === 'Approved' ? (
                  <Check size={11} strokeWidth={3} />
                ) : event.label === 'Rejected' ? (
                  <X size={11} strokeWidth={3} />
                ) : event.label === 'Cancelled' ? (
                  <Ban size={11} strokeWidth={3} />
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
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this request?"
        description="The record stays in the log with a Cancelled status and no longer counts toward the PTO balance."
        icon={<Ban size={18} className="text-danger-600" />}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep request
            </Button>
            <Button variant="danger" onClick={handleCancel}>
              Confirm cancellation
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)">
          <Textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Plans changed."
          />
        </Field>
      </Modal>
    </div>
  );
}

/**
 * Approve/reject action bar for a pending request. Kept separate from
 * `RequestDetails` so callers can pin it in a modal/drawer's sticky footer
 * instead of the scrollable body — otherwise it can end up below the fold.
 */
export function RequestActions({
  request,
  onDone,
}: {
  request: PTORequest;
  onDone?: () => void;
}) {
  const { isAdmin, approveRequest, rejectRequest } = useApp();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [approveComment, setApproveComment] = useState('');

  if (!isAdmin || request.status !== 'Pending') return null;

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
    <>
      <div className="w-full">
        <Input
          value={approveComment}
          onChange={(e) => setApproveComment(e.target.value)}
          placeholder="Note to the employee (optional) — included in their notification"
          className="h-9 text-[12.5px]"
        />
      </div>
      <p className="mr-auto text-[13px] text-slateish-500">
        Approving deducts{' '}
        <strong className="text-navy-800">{formatDays(request.days)} day(s)</strong> from this
        employee&rsquo;s balance.
      </p>
      <Button variant="danger" onClick={() => setRejectOpen(true)}>
        <X size={15} /> Reject request
      </Button>
      <Button
        variant="success"
        onClick={() => {
          approveRequest(request.id, approveComment.trim() || undefined);
          onDone?.();
        }}
      >
        <Check size={15} /> Approve request
      </Button>

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
    </>
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
