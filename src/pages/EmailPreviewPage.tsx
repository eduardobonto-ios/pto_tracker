import { useState } from 'react';
import { Mail, TriangleAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailPreview } from '@/components/EmailPreview';
import { Card, CardBody } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Field';
import { useApp } from '@/context/AppContext';
import { PTO_NOTIFICATION_RECIPIENTS } from '@/lib/theme';
import { formatDate } from '@/lib/utils';

/**
 * Email Notification Preview.
 *
 * Nothing is sent from this screen — it exists so the wording and layout of the
 * notification can be agreed before SMTP is configured in the backend phase.
 */
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
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-start gap-2.5 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3.5">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-warning-600" />
          <div>
            <p className="text-[13px] font-semibold text-warning-700">
              Preview only — no email is sent
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-warning-700/90">
              In the backend phase this notification will go to{' '}
              {PTO_NOTIFICATION_RECIPIENTS.join(' and ')} each time a request is filed, with
              the button linking to <span className="font-mono">/requests/{'{request-id}'}</span>.
            </p>
          </div>
        </div>

        <Card>
          <CardBody>
            <Field
              label="Preview with request"
              help="Pick any request to see the notification it would generate."
            >
              <Select value={requestId} onChange={(e) => setRequestId(e.target.value)}>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {empById.get(r.employeeId)?.name} · {formatDate(r.startDate)} ·{' '}
                    {r.status}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        {request ? (
          <EmailPreview request={request} />
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
