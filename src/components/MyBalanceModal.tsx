import { Wallet } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PTOBalanceCard } from '@/components/PTOBalanceCard';
import type { Employee, PTOBalance } from '@/types';

/** Admin's own PTO balance, tucked behind an icon since the aside is used for the team log instead. */
export function MyBalanceModal({
  open,
  onClose,
  employee,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  balance?: PTOBalance;
}) {
  return (
    <Modal open={open} onClose={onClose} title="My PTO Balance" icon={<Wallet size={18} />} size="md">
      {balance && <PTOBalanceCard employee={employee} balance={balance} />}
    </Modal>
  );
}
