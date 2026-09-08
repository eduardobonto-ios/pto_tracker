import { useState } from 'react';
import { CheckCircle2, Mail, TriangleAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailPreview } from '@/components/EmailPreview';
import { ReviewedEmailPreview } from '@/components/ReviewedEmailPreview';
import { Card, CardBody } from '@/components/ui/Card';
import { SectionTitle } from '@/components/ui/Misc';
import { Select } from '@/components/ui/Field';
import { useApp } from '@/context/AppContext';
import { isLiveEmailConfigured } from '@/lib/notifications';
import { PTO_NOTIFICATION_RECIPIENTS } from '@/lib/theme';
import { formatDate } from '@/lib/utils';

export function EmailPreviewPage() {
  const { requests, employees, lastSubmittedId } = useApp();
  const [requestId, setRequestId] = useState(
    lastSubmittedId ?? requests.find((r) => r.status === 'Pending')?.id ?? requests[0]?.id,
  );

  const request = requests.find((r) => r.id === requestId) ?? requests[0];
  const empById = new Map(employees.map((e) => [e.id, e]));

  return (
    <AppLayout
      title="Email Notification Preview"
      subtitle="How the review notification will look once email is wired up"
      actions={
        <Select
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          className="h-10 w-[280px]"
        >
          {requests.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id} — {empById.get(r.employeeId)?.name} · {formatDate(r.startDate)} ·{' '}
              {r.status}
            </option>
          ))}
        </Select>
      }
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {isLiveEmailConfigured() ? (
          <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-2.5">
            <CheckCircle2 size={15} className="shrink-0 text-success-600" />
            <p className="text-[12.5px] leading-snug text-success-700">
              Live sending is configured via EmailJS — this preview also reflects what was
              actually emailed. The new-request notice goes to every Admin (
              {PTO_NOTIFICATION_RECIPIENTS.join(' and ')} today), and the approved/rejected
              notice goes straight to the employee.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-2.5">
            <TriangleAlert size={15} className="shrink-0 text-warning-600" />
            <p className="text-[12.5px] leading-snug text-warning-700">
              Preview only — no email is sent yet. See the browser console for the simulated
              send log, or configure EmailJS (`lib/notifications.ts` / `.env.example`) for
              real delivery with no backend or SMTP. Once enabled, the new-request notice
              below goes to every Admin ({PTO_NOTIFICATION_RECIPIENTS.join(' and ')} today),
              and the approved/rejected notice goes straight to the employee.
            </p>
          </div>
        )}

        {request ? (
          <>
            <div>
              <SectionTitle className="mb-2">
                New request — sent to the admin/approver
              </SectionTitle>
              <EmailPreview request={request} />
            </div>

            {(request.status === 'Approved' || request.status === 'Rejected') && (
              <div>
                <SectionTitle className="mb-2">
                  Request reviewed — sent to the employee
                </SectionTitle>
                <ReviewedEmailPreview request={request} />
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardBody className="py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slateish-100 text-slateish-400">
                <Mail size={20} />
              </div>
              <p className="text-sm font-semibold text-navy-800">Nothing to preview</p>
              <p className="mt-1 text-[13px] text-slateish-500">
                File a leave request first.
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
