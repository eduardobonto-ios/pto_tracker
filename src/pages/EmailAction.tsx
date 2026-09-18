import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, CircleSlash, Clock3, Mail, ShieldAlert } from 'lucide-react';
import { LogoLockup } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { consumeActionToken, logNotification, resolveActionToken, type TokenResolution } from '@/lib/supabaseActions';
import { buildReviewedNotificationFromToken, sendNotification } from '@/lib/notifications';
import { formatDateRange, formatDays } from '@/lib/utils';

/**
 * Public, unauthenticated page a manager lands on after clicking Approve or
 * Decline in the "new request" email — see `lib/notifications.ts` and
 * `supabase/schema.sql` (`pto_resolve_action_token` / `pto_consume_action_token`).
 * Deliberately does not use `AppContext` — it must work without the app's
 * employees/accounts/requests being loaded, or even login existing at all.
 */
export function EmailActionPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState<TokenResolution | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TokenResolution | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    resolveActionToken(token)
      .then(setResolution)
      .catch(() => setError('Something went wrong loading this link.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirm() {
    setSubmitting(true);
    setError('');
    try {
      // `resolution.valid` (checked before this button is even rendered) means
      // this token hadn't been actioned yet, so this call is the one that
      // actually performs the transition — consuming it only updates the
      // database (see notifications.ts), so this page must send the filer's
      // "reviewed" email itself.
      const wasFreshAction = resolution?.valid === true;
      const outcome = await consumeActionToken(token, reason.trim() || undefined);
      setResult(outcome);
      if (wasFreshAction && (outcome.status === 'Approved' || outcome.status === 'Rejected')) {
        const notification = sendNotification(
          buildReviewedNotificationFromToken(
            {
              requestId: outcome.requestId ?? '',
              status: outcome.status,
              leaveType: outcome.leaveType ?? '',
              startDate: outcome.startDate ?? '',
              endDate: outcome.endDate,
              employeeEmail: outcome.employeeEmail,
              payStatus: outcome.payStatus,
            },
            'Email link',
            outcome.status === 'Rejected' ? reason.trim() || 'Rejected via email.' : undefined,
          ),
        );
        logNotification(notification);
      }
    } catch {
      setError('Something went wrong submitting your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const active = result ?? resolution;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-[480px]">
        <div className="mb-7 flex items-center justify-center">
          <LogoLockup className="h-16" />
        </div>

        <div className="rounded-2xl border border-slateish-200/80 bg-white p-6 shadow-card sm:p-7">
          {loading ? (
            <Notice icon={<Clock3 size={18} />} title="Loading…" />
          ) : !token || !active ? (
            <Notice
              icon={<ShieldAlert size={18} className="text-danger-600" />}
              title="This link isn't valid"
              detail="Open the PTO Tracker directly and sign in to review this request."
            />
          ) : error ? (
            <Notice icon={<ShieldAlert size={18} className="text-danger-600" />} title="Something went wrong" detail={error} />
          ) : result ? (
            <Notice
              icon={
                result.status === 'Approved' ? (
                  <Check size={18} className="text-success-600" />
                ) : (
                  <CircleSlash size={18} className="text-danger-600" />
                )
              }
              title={
                result.status === 'Approved'
                  ? 'Request approved'
                  : result.status === 'Rejected'
                    ? 'Request rejected'
                    : 'Already handled'
              }
              detail={`${result.employeeName ?? 'This request'} — ${
                result.leaveType ?? ''
              } · ${formatDateRange(result.startDate ?? '', result.endDate ?? undefined)}`}
            />
          ) : !resolution?.valid ? (
            <ExpiredOrUsedNotice reason={resolution?.reason ?? 'not_found'} resolution={resolution} />
          ) : (
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slateish-400">
                <Mail size={13} /> {resolution.action === 'approve' ? 'Approve request' : 'Decline request'}
              </p>
              <h1 className="mt-1.5 text-[18px] font-semibold text-navy-900">
                {resolution.employeeName}
              </h1>
              <div className="mt-3 space-y-1.5 rounded-xl border border-slateish-200 bg-slateish-50/70 p-3.5 text-[13px]">
                <p>
                  <span className="font-semibold text-navy-800">Leave type:</span> {resolution.leaveType}
                </p>
                <p>
                  <span className="font-semibold text-navy-800">Dates:</span>{' '}
                  {formatDateRange(resolution.startDate ?? '', resolution.endDate ?? undefined)}
                </p>
                <p>
                  <span className="font-semibold text-navy-800">Duration:</span>{' '}
                  {formatDays(resolution.days ?? 0)} day(s)
                </p>
              </div>

              {resolution.action === 'reject' && (
                <div className="mt-4">
                  <Field label="Reason (optional)" help="Shown to the employee.">
                    <Textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Two territory managers are already out that week."
                    />
                  </Field>
                </div>
              )}

              <Button
                block
                size="lg"
                variant={resolution.action === 'reject' ? 'danger' : 'success'}
                className="mt-5"
                onClick={confirm}
                disabled={submitting}
              >
                {submitting
                  ? 'Submitting…'
                  : resolution.action === 'approve'
                    ? 'Approve this request'
                    : 'Reject this request'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpiredOrUsedNotice({
  reason,
  resolution,
}: {
  reason: string;
  resolution: TokenResolution | null;
}) {
  if (reason === 'already_handled') {
    return (
      <Notice
        icon={<Check size={18} className="text-success-600" />}
        title="Already reviewed"
        detail={`This request is already ${resolution?.status?.toLowerCase() ?? 'handled'} — no further action needed.`}
      />
    );
  }
  if (reason === 'used') {
    return (
      <Notice
        icon={<CircleSlash size={18} className="text-slateish-500" />}
        title="This link was already used"
        detail="Open the PTO Tracker and sign in to see the current status."
      />
    );
  }
  if (reason === 'expired') {
    return (
      <Notice
        icon={<Clock3 size={18} className="text-warning-600" />}
        title="This link has expired"
        detail="Open the PTO Tracker and sign in to review this request."
      />
    );
  }
  return (
    <Notice
      icon={<ShieldAlert size={18} className="text-danger-600" />}
      title="This link isn't valid"
      detail="Open the PTO Tracker directly and sign in to review this request."
    />
  );
}

function Notice({ icon, title, detail }: { icon: React.ReactNode; title: string; detail?: string }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slateish-100">
        {icon}
      </div>
      <p className="text-[15px] font-semibold text-navy-900">{title}</p>
      {detail && <p className="mt-1.5 text-[13px] leading-relaxed text-slateish-500">{detail}</p>}
    </div>
  );
}
