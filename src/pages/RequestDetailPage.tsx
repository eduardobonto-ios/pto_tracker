import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequestDetails } from '@/components/RequestDetails';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';

/**
 * Standalone request view at `/requests/:id`.
 *
 * This is the URL the notification email will link to once email is wired up,
 * so it must stand on its own without any prior navigation state.
 */
export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { requests } = useApp();
  const navigate = useNavigate();

  const request = requests.find((r) => r.id === id);

  return (
    <AppLayout
      title={request ? `Request ${request.id}` : 'Request not found'}
      subtitle="PTO request details and approval"
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate('/requests')}
          className="hidden sm:inline-flex"
        >
          <ArrowLeft size={15} /> All requests
        </Button>
      }
    >
      {request ? (
        <div className="max-w-3xl">
          <RequestDetails request={request} />
        </div>
      ) : (
        <Card className="mx-auto max-w-lg">
          <CardBody className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slateish-100 text-slateish-400">
              <FileQuestion size={22} />
            </div>
            <h2 className="text-base font-semibold text-navy-900">
              We couldn&rsquo;t find that request
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-slateish-500">
              The reference <span className="font-mono">{id}</span> does not match any request
              in the log. It may have been removed.
            </p>
            <Link
              to="/requests"
              className="mt-5 inline-flex text-[13px] font-semibold text-accent-600 hover:text-accent-500"
            >
              Back to PTO Requests
            </Link>
          </CardBody>
        </Card>
      )}
    </AppLayout>
  );
}
