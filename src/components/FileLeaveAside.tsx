import { PTOBalanceCard } from '@/components/PTOBalanceCard';
import type { Employee, PTOBalance } from '@/types';

/** Balance summary shown alongside the PTO Requests log. */
export function FileLeaveAside({
  employee,
  balance,
}: {
  employee: Employee;
  balance?: PTOBalance;
}) {
  if (!balance) return null;
  return <PTOBalanceCard employee={employee} balance={balance} />;
}
