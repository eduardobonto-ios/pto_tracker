import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import {
  EmptyState,
  SortableTh,
  Table,
  TableShell,
  Td,
  Th,
  Tr,
  type SortState,
} from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Misc';
import { EligibilityBadge } from '@/components/StatusBadge';
import { UsageMeter } from '@/components/PTOBalanceCard';
import { formatDate, formatDays } from '@/lib/utils';
import type { Employee, PTOBalance } from '@/types';

type SortKey =
  | 'name'
  | 'jobTitle'
  | 'department'
  | 'email'
  | 'hireDate'
  | 'eligibilityDate'
  | 'eligible'
  | 'totalPto'
  | 'accruedDays'
  | 'daysUsed'
  | 'daysRemaining'
  | 'percentUsed';

/**
 * Admin roster — replaces the "PTO Tracker" tab of the Google Sheet.
 *
 * Every column sorts, matching PTO Requests. Unlike that table, this one opens
 * already sorted — alphabetically by first name — because a roster is a
 * find-a-person list and there is no meaningful arrival order to preserve.
 *
 * The four balance columns come from `balances`, not from the employee row, so
 * they sort on the computed figure rather than on anything stored.
 */
export function EmployeeTable({
  employees,
  balances,
  onSelect,
}: {
  employees: Employee[];
  balances: Record<string, PTOBalance>;
  onSelect?: (employee: Employee) => void;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'name', direction: 'asc' });

  // First click sorts ascending, clicking the same header again flips it.
  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  const sorted = useMemo(() => {
    // Dates are ISO strings, so comparing them as text is already
    // chronological — no parsing, no timezone to get wrong.
    const value = (e: Employee): string | number => {
      const b = balances[e.id];
      switch (sort.key) {
        case 'name':
          return e.name;
        case 'jobTitle':
          return e.jobTitle;
        case 'department':
          return e.department;
        case 'email':
          return e.email;
        case 'hireDate':
          return e.hireDate;
        case 'eligibilityDate':
          return b?.eligibilityDate ?? '';
        // Sorted as a number so ascending groups the not-yet-eligible first,
        // which is the list an admin is usually looking for.
        case 'eligible':
          return b?.eligible ? 1 : 0;
        case 'totalPto':
          return b?.totalPto ?? 0;
        case 'accruedDays':
          return b?.accruedDays ?? 0;
        case 'daysUsed':
          return b?.daysUsed ?? 0;
        case 'daysRemaining':
          return b?.daysRemaining ?? 0;
        case 'percentUsed':
          return b?.percentUsed ?? 0;
      }
    };

    const factor = sort.direction === 'asc' ? 1 : -1;
    // Copy first: sorting in place would mutate the caller's array.
    return [...employees].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      const as = String(av);
      const bs = String(bv);
      // Blanks sink to the bottom in both directions, so sorting a column to
      // find something never lands you on a run of empty cells.
      if (!as && bs) return 1;
      if (as && !bs) return -1;
      return as.localeCompare(bs) * factor;
    });
  }, [employees, balances, sort]);

  return (
    <TableShell>
      <Table className="min-w-[1340px]">
        <thead>
          <tr>
            {/* Position in the current sort, so it deliberately renumbers
                rather than sorting. */}
            <Th className="w-12">#</Th>
            <SortableTh sortKey="name" sort={sort} onSort={toggleSort}>
              Team Member
            </SortableTh>
            <SortableTh sortKey="jobTitle" sort={sort} onSort={toggleSort}>
              Role
            </SortableTh>
            <SortableTh sortKey="department" sort={sort} onSort={toggleSort}>
              Department
            </SortableTh>
            <SortableTh sortKey="email" sort={sort} onSort={toggleSort}>
              Email
            </SortableTh>
            <SortableTh sortKey="hireDate" sort={sort} onSort={toggleSort}>
              Hire Date
            </SortableTh>
            <SortableTh sortKey="eligibilityDate" sort={sort} onSort={toggleSort}>
              Eligibility Date
            </SortableTh>
            <SortableTh sortKey="eligible" sort={sort} onSort={toggleSort}>
              Eligible
            </SortableTh>
            <SortableTh sortKey="totalPto" sort={sort} onSort={toggleSort} align="right">
              Total PTO
            </SortableTh>
            <SortableTh sortKey="accruedDays" sort={sort} onSort={toggleSort} align="right">
              Accrued
            </SortableTh>
            <SortableTh sortKey="daysUsed" sort={sort} onSort={toggleSort} align="right">
              Days Used
            </SortableTh>
            <SortableTh sortKey="daysRemaining" sort={sort} onSort={toggleSort} align="right">
              Days Remaining
            </SortableTh>
            <SortableTh sortKey="percentUsed" sort={sort} onSort={toggleSort}>
              % Used
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <EmptyState
              colSpan={13}
              icon={<Users size={20} />}
              title="No employees match these filters"
            />
          )}
          {sorted.map((e, i) => {
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
                {/* What they have actually earned so far this cycle, and the
                    figure Days Remaining draws against — not the annual total. */}
                <Td align="right" className="tabular-nums text-navy-900">
                  {formatDays(b?.accruedDays ?? 0)}
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
