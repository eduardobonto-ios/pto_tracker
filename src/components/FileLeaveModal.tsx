import { useEffect } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  LeaveRequestConfirmations,
  LeaveRequestFields,
  LeaveRequestSubmitActions,
  useLeaveRequestForm,
} from '@/components/PTORequestForm';

/** "File a Leave" as a centered popup, launched from a button on PTO Requests. */
export function FileLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const f = useLeaveRequestForm({ onSubmitted: onClose });

  // Start from a clean slate every time the modal is (re)opened.
  useEffect(() => {
    if (open) f.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="File a Leave"
        description="Submit a new PTO request for Management review"
        icon={<ClipboardCheck size={18} />}
        size="md"
        footer={<LeaveRequestSubmitActions f={f} />}
      >
        <LeaveRequestFields f={f} />
      </Modal>

      <LeaveRequestConfirmations f={f} />
    </>
  );
}
