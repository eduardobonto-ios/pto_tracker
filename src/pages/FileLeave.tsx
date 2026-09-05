import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PTORequestForm } from '@/components/PTORequestForm';

export function FileLeavePage() {
  const navigate = useNavigate();

  return (
    <AppLayout
      title="File a Leave"
      subtitle="Submit a new PTO request for Management review"
    >
      <div className="max-w-3xl">
        <PTORequestForm onSubmitted={() => navigate('/requests')} />
      </div>
    </AppLayout>
  );
}
