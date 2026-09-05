import { Users } from 'lucide-react';
import { EmptyState, Table, TableShell, Td, Th, Tr } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Misc';
import { EligibilityBadge } from '@/components/StatusBadge';
import { UsageMeter } from '@/components/PTOBalanceCard';
import { formatDate, formatDays } from '@/lib/utils';
import type { Employee, PTOBalance } from '@/types';

/** Admin roster — replaces the "PTO Tracker" tab of the Google Sheet. */
export function EmployeeTable({
  employees,
  balances,
  onSelect,
}: {
  employees: Employee[];
  balances: Record<string, PTOBalance>;
  onSelect?: (employee: Employee) => void;
}) {
  return (
    <TableShell>
      <Table className="min-w-[1240px]">
        <thead>
          <tr>
            <Th className="w-12">#</Th>
            <Th>Team Member</Th>
            <Th>Role</Th>
            <Th>Department</Th>
            <Th>Email</Th>
            <Th>Hire Date</Th>
            <Th>Eligibility Date</Th>
            <Th>Eligible</Th>
            <Th align="right">Total PTO</Th>
            <Th align="right">Days Used</Th>
            <Th align="right">Days Remaining</Th>
            <Th>% Used</Th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 && (
            <EmptyState
              colSpan={12}
              icon={<Users size={20} />}
              title="No employees match these filters"
            />
          )}
          {employees.map((e, i) => {
            const b = balances[e.id];
            return (
              <Tr key={e.id} onClick={onSelect ? () => onSelect(e) : undefined}>
                <Td className="text-slateish-400 tabular-nums">{i + 1}</Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={e.name} department={e.department} size="sm" />
                    <span className="font-semibold text-navy-900">{e.name}</span>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{e.jobTitle}</Td>
                <Td className="whitespace-nowrap">{e.department}</Td>
                <Td>
                  <span className="text-slateish-500">{e.email}</span>
                </Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(e.hireDate)}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatDate(b?.eligibilityDate)}
                </Td>
                <Td>
                  <EligibilityBadge eligible={!!b?.eligible} />
                </Td>
                <Td align="right" className="font-semibold tabular-nums text-navy-900">
                  {formatDays(b?.totalPto ?? 0)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatDays(b?.daysUsed ?? 0)}
                </Td>
                <Td
                  align="right"
                  className={`font-semibold tabular-nums ${
                    (b?.daysRemaining ?? 0) < 0 ? 'text-danger-600' : 'text-navy-900'
                  }`}
                >
                  {formatDays(b?.daysRemaining ?? 0)}
                </Td>
                <Td>
                  <UsageMeter percent={b?.percentUsed ?? 0} />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </TableShell>
  );
}
