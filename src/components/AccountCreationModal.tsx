import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  AccountCreationFields,
  AccountCreationSubmitAction,
  useAccountCreationForm,
} from '@/components/AccountCreationForm';

/** "Create an account" as a centered popup, so it no longer pushes the accounts table below the fold. */
export function AccountCreationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const f = useAccountCreationForm();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create an account"
      description="They'll sign in with their existing Google Workspace (valveman.com) or Microsoft 365 (fswelsford.com) work account — nothing to set up."
      icon={<UserPlus size={18} />}
      size="lg"
      footer={<AccountCreationSubmitAction f={f} />}
    >
      <AccountCreationFields f={f} />
    </Modal>
  );
}
