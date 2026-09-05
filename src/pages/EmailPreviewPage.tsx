import { useState } from 'react';
import { Mail, TriangleAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailPreview } from '@/components/EmailPreview';
import { Card, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { useApp } from '@/context/AppContext';
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
        <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-2.5">
          <TriangleAlert size={15} className="shrink-0 text-warning-600" />
          <p className="text-[12.5px] leading-snug text-warning-700">
            Preview only — no email is sent. In the backend phase this goes to{' '}
            {PTO_NOTIFICATION_RECIPIENTS.join(' and ')}.
          </p>
        </div>

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
