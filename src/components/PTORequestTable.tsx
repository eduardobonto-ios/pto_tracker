import { Inbox } from 'lucide-react';
import { EmptyState, Table, TableShell, Td, Th, Tr } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Misc';
import { PayBadge, StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatDays } from '@/lib/utils';
import type { Employee, PTORequest } from '@/types';

/**
 * The PTO Requests log — replaces the "PTO Log" tab of the Google Sheet.
 * Rows are clickable and open the request details drawer.
 */
export function PTORequestTable({
  requests,
  employees,
  onSelect,
}: {
  requests: PTORequest[];
  employees: Employee[];
  onSelect: (request: PTORequest) => void;
}) {
  const byId = new Map(employees.map((e) => [e.id, e]));

  return (
    <TableShell>
      <Table className="min-w-[1180px]">
        <thead>
          <tr>
            <Th>Team Member</Th>
            <Th>Department</Th>
            <Th>Request Date</Th>
            <Th>Start Date</Th>
            <Th>End Date</Th>
            <Th align="right">Days</Th>
            <Th>Status</Th>
            <Th>Coverage / POC</Th>
            <Th>Notes</Th>
            <Th>Paid / Unpaid</Th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 && (
            <EmptyState
              colSpan={10}
              icon={<Inbox size={20} />}
              title="No requests match these filters"
              description="Try clearing the search box or widening the date range."
            />
          )}
          {requests.map((r) => {
            const emp = byId.get(r.employeeId);
            return (
              <Tr key={r.id} onClick={() => onSelect(r)}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={emp?.name ?? '—'}
                      department={emp?.department}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-900">
                        {emp?.name ?? 'Unknown'}
                      </p>
                      <p className="truncate text-[12px] text-slateish-400">{r.id}</p>
                    </div>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{emp?.department ?? '—'}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(r.requestDate)}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(r.startDate)}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(r.endDate)}</Td>
                <Td align="right" className="font-semibold tabular-nums text-navy-900">
                  {formatDays(r.days)}
                </Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="max-w-[160px] truncate">{r.coverage || 'N/A'}</Td>
                <Td className="max-w-[280px]">
                  <span className="line-clamp-2 text-slateish-600">{r.notes}</span>
                </Td>
                <Td>
                  <PayBadge payStatus={r.payStatus} />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </TableShell>
  );
}
