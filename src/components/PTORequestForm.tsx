import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Info, Send } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DetailRow, PillGroup } from '@/components/ui/Misc';
import { PayBadge, StatusBadge } from '@/components/StatusBadge';
import { DepartmentLeaveNotice } from '@/components/DepartmentLeaveNotice';
import { useApp, type NewRequestInput } from '@/context/AppContext';
import { computeDays, defaultPayStatus } from '@/lib/pto';
import { formatDateRange, formatDays, todayISO } from '@/lib/utils';
import {
  DURATION_TYPES,
  LEAVE_TYPES,
  PTO_STATUSES,
  type DurationType,
  type LeaveType,
  type PTOStatus,
} from '@/types';

interface FormState {
  employeeId: string;
  leaveType: LeaveType | '';
  reason: string;
  startDate: string;
  endDate: string;
  duration: DurationType;
  startTime: string;
  endTime: string;
  coverage: string;
  status: PTOStatus;
}

/**
 * All state and logic behind the leave request form, shared by the
 * full-page `PTORequestForm` and the `FileLeaveModal` popup so both
 * surfaces stay in sync without duplicating validation/submit logic.
 */
export function useLeaveRequestForm({
  onSubmitted,
}: {
  onSubmitted?: (requestId: string) => void;
} = {}) {
  const { currentUser, employees, isAdmin, submitRequest } = useApp();

  const blank = useMemo<FormState>(
    () => ({
      employeeId: currentUser.id,
      leaveType: '',
      reason: '',
      startDate: '',
      endDate: '',
      duration: 'Full Day',
      startTime: '',
      endTime: '',
      coverage: '',
      status: 'Pending',
    }),
    [currentUser.id],
  );

  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const totalHours = useMemo(() => {
    if (form.duration !== 'Custom Hours' || !form.startTime || !form.endTime) return 0;
    const [sh, sm] = form.startTime.split(':').map(Number);
    const [eh, em] = form.endTime.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
  }, [form.duration, form.startTime, form.endTime]);

  const days = useMemo(
    () =>
      form.startDate
        ? computeDays(form.startDate, form.endDate || form.startDate, form.duration, totalHours)
        : 0,
    [form.startDate, form.endDate, form.duration, totalHours],
  );

  const selectedEmployee = employees.find((e) => e.id === form.employeeId) ?? currentUser;
  const payStatus = form.leaveType ? defaultPayStatus(form.leaveType) : 'Paid';

  function validate() {
    const e: Record<string, string> = {};
    if (!form.employeeId) e.employeeId = 'Select a team member.';
    if (!form.leaveType) e.leaveType = 'Choose a leave type.';
    if (!form.startDate) e.startDate = 'A start date is required.';
    if (form.endDate && form.endDate < form.startDate)
      e.endDate = 'The end date cannot be before the start date.';
    if (!form.coverage.trim()) e.coverage = 'Tell us who covers during your absence.';
    if (form.duration === 'Custom Hours' && totalHours <= 0)
      e.startTime = 'Enter a valid start and end time.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function reset() {
    setForm(blank);
    setErrors({});
  }

  function openReview() {
    if (validate()) setReviewOpen(true);
  }

  function confirmSubmit() {
    const input: NewRequestInput = {
      employeeId: form.employeeId,
      leaveType: form.leaveType as LeaveType,
      reason: form.reason.trim(),
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      durationType: form.duration,
      startTime: form.duration === 'Custom Hours' ? form.startTime : undefined,
      endTime: form.duration === 'Custom Hours' ? form.endTime : undefined,
      totalHours: form.duration === 'Custom Hours' ? totalHours : undefined,
      days,
      coverage: form.coverage.trim(),
      payStatus,
      status: isAdmin ? form.status : 'Pending',
    };
    const created = submitRequest(input);
    setReviewOpen(false);
    setConfirmedId(created.id);
    reset();
    onSubmitted?.(created.id);
  }

  return {
    isAdmin,
    employees,
    form,
    set,
    errors,
    totalHours,
    days,
    selectedEmployee,
    payStatus,
    reset,
    openReview,
    confirmSubmit,
    reviewOpen,
    setReviewOpen,
    confirmedId,
    setConfirmedId,
  };
}

type LeaveRequestFormState = ReturnType<typeof useLeaveRequestForm>;

/** The field inputs only — no wrapping card and no submit buttons, so callers can place those wherever fits (inline, or a modal's sticky footer). */
export function LeaveRequestFields({ f }: { f: LeaveRequestFormState }) {
  const { form, set, errors, isAdmin, employees, totalHours, days, payStatus, selectedEmployee } = f;

  return (
    <div className="space-y-5">
      <Field
        label="Team member"
        required
        error={errors.employeeId}
        help={isAdmin ? 'As an admin you may file on behalf of another team member.' : 'Locked to your own account.'}
      >
        <Select
          value={form.employeeId}
          disabled={!isAdmin}
          onChange={(e) => set('employeeId', e.target.value)}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} — {e.department}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Type of leave" required error={errors.leaveType}>
        <Select value={form.leaveType} onChange={(e) => set('leaveType', e.target.value as LeaveType)}>
          <option value="">Select a leave type…</option>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Reason">
        <Textarea
          value={form.reason}
          onChange={(e) => set('reason', e.target.value)}
          placeholder="Brief reason or context for this leave..."
          rows={4}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date from" required error={errors.startDate}>
          <Input
            type="date"
            value={form.startDate}
            min="2026-01-01"
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="Date to" help="Leave blank if same as start date" error={errors.endDate}>
          <Input
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </Field>
      </div>

      <DepartmentLeaveNotice
        employee={selectedEmployee}
        startDate={form.startDate}
        endDate={form.endDate}
      />

      <Field label="Duration" required>
        <PillGroup options={DURATION_TYPES} value={form.duration} onChange={(v) => set('duration', v)} />
      </Field>

      {form.duration === 'Custom Hours' && (
        <div className="grid gap-5 rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-3">
          <Field label="Start time" error={errors.startTime}>
            <Input
              type="time"
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
              className="bg-white"
            />
          </Field>
          <Field label="End time">
            <Input
              type="time"
              value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)}
              className="bg-white"
            />
          </Field>
          <Field label="Total hours" help="Auto-calculated">
            <Input value={totalHours ? `${totalHours} h` : '—'} readOnly />
          </Field>
        </div>
      )}

      <Field label="Coverage / POC" required error={errors.coverage}>
        <Input
          value={form.coverage}
          onChange={(e) => set('coverage', e.target.value)}
          placeholder="Who covers during your absence?"
        />
      </Field>

      {isAdmin && (
        <Field
          label="Status (admin preview only)"
          help="Regular employees always file as Pending. This selector exists so the prototype can demonstrate each state."
          className="sm:max-w-xs"
        >
          <Select value={form.status} onChange={(e) => set('status', e.target.value as PTOStatus)}>
            {PTO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-slateish-200 bg-slateish-50 p-3.5">
        <Info size={16} className="mt-0.5 shrink-0 text-accent-500" />
        <p className="text-[12.5px] leading-relaxed text-slateish-600">
          This request will be charged as{' '}
          <strong className="text-navy-800">{formatDays(days)} day(s)</strong> and filed as{' '}
          <strong className="text-navy-800">{payStatus}</strong>. Pending days are shown
          separately on your balance and are only deducted once approved.
        </p>
      </div>
    </div>
  );
}

/** Clear / Submit buttons — kept separate so a modal can pin them in its sticky footer. */
export function LeaveRequestSubmitActions({ f }: { f: LeaveRequestFormState }) {
  return (
    <>
      <Button variant="secondary" onClick={f.reset}>
        Clear
      </Button>
      <Button onClick={f.openReview}>
        <Send size={15} /> Submit Request
      </Button>
    </>
  );
}

/** The review-before-submit and post-submit confirmation overlays. Independent of where the fields/buttons are rendered. */
export function LeaveRequestConfirmations({ f }: { f: LeaveRequestFormState }) {
  const { form, selectedEmployee, totalHours, days, payStatus, isAdmin } = f;

  return (
    <>
      <Modal
        open={f.reviewOpen}
        onClose={() => f.setReviewOpen(false)}
        title="Review your request"
        description="Check the details below before submitting. You can still go back and edit."
        icon={<ClipboardCheck size={18} />}
        footer={
          <>
            <Button variant="secondary" onClick={() => f.setReviewOpen(false)}>
              Back to edit
            </Button>
            <Button onClick={f.confirmSubmit}>
              <Send size={15} /> Confirm &amp; submit
            </Button>
          </>
        }
      >
        <dl className="divide-y divide-slateish-200/70">
          <DetailRow label="Employee">{selectedEmployee.name}</DetailRow>
          <DetailRow label="Leave type">{form.leaveType}</DetailRow>
          <DetailRow label="Dates">
            {form.startDate ? formatDateRange(form.startDate, form.endDate) : '—'}
          </DetailRow>
          <DetailRow label="Duration">
            {form.duration}
            {form.duration === 'Custom Hours' && totalHours ? ` · ${totalHours} h` : ''} ·{' '}
            {formatDays(days)} day(s)
          </DetailRow>
          <DetailRow label="Coverage / POC">{form.coverage || 'N/A'}</DetailRow>
          <DetailRow label="Reason">
            {form.reason.trim() || <span className="text-slateish-400">Not provided</span>}
          </DetailRow>
          <DetailRow label="Pay status">
            <PayBadge payStatus={payStatus} />
          </DetailRow>
          <DetailRow label="Status on submit">
            <StatusBadge status={isAdmin ? form.status : 'Pending'} />
          </DetailRow>
        </dl>
      </Modal>

      <Modal
        open={!!f.confirmedId}
        onClose={() => f.setConfirmedId(null)}
        title="Request submitted"
        description={`Reference ${f.confirmedId ?? ''} · filed ${todayISO()}`}
        icon={<CheckCircle2 size={18} className="text-success-600" />}
        size="sm"
        footer={<Button onClick={() => f.setConfirmedId(null)}>Done</Button>}
      >
        <p className="text-[13.5px] leading-relaxed text-slateish-600">
          Your request is now in the queue for Management review. In the backend phase an
          email notification will be sent to{' '}
          <span className="font-semibold text-navy-800">princes@valveman.com</span> and{' '}
          <span className="font-semibold text-navy-800">pgomez@fswelsford.com</span> with a
          direct link to this request.
        </p>
      </Modal>
    </>
  );
}

/** Full-page form: fields, inline submit buttons and confirmations in one self-contained card. */
export function PTORequestForm({
  onSubmitted,
}: {
  onSubmitted?: (requestId: string) => void;
}) {
  const f = useLeaveRequestForm({ onSubmitted });

  return (
    <>
      <Card>
        <CardHeader
          title="Leave request"
          description="All fields marked with an asterisk are required. Your request is routed to Management for review."
          icon={<ClipboardCheck size={17} />}
        />
        <CardBody className="space-y-5">
          <LeaveRequestFields f={f} />
          <div className="flex flex-wrap justify-end gap-2 border-t border-slateish-200/70 pt-5">
            <LeaveRequestSubmitActions f={f} />
          </div>
        </CardBody>
      </Card>

      <LeaveRequestConfirmations f={f} />
    </>
  );
}
