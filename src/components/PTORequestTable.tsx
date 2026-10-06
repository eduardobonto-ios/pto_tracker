import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import {
  EmptyState,
  SortableTh,
  Table,
  TableShell,
  Td,
  Tr,
  type SortState,
} from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Misc';
import { PayBadge, StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatLeaveLength, shortRequestId } from '@/lib/utils';
import type { Employee, PTORequest } from '@/types';

/** Every column that can be sorted on. */
type SortKey =
  | 'employee'
  | 'department'
  | 'id'
  | 'requestDate'
  | 'startDate'
  | 'endDate'
  | 'days'
  | 'status'
  | 'coverage'
  | 'notes'
  | 'payStatus';

/**
 * The PTO Requests log — replaces the "PTO Log" tab of the Google Sheet.
 * Rows are clickable and open the request details drawer.
 *
 * Sorting lives here rather than in the page so every caller gets it without
 * wiring up state. Until a header is clicked the rows keep the order they
 * arrived in — newest first, straight from the query — so the default view is
 * unchanged.
 */
export function PTORequestTable({
  requests,
  employees,
  onSelect,
  showEmployeeColumns = true,
  fillHeight = false,
}: {
  requests: PTORequest[];
  employees: Employee[];
  onSelect: (request: PTORequest) => void;
  /** Team Member and Department are redundant when every row is already the viewer's own. */
  showEmployeeColumns?: boolean;
  /** Bounds the table to its container and lets it scroll internally (sticky header) instead of the whole page. */
  fillHeight?: boolean;
}) {
  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const columnCount = showEmployeeColumns ? 10 : 9;

  const [sort, setSort] = useState<SortState<SortKey> | null>(null);

  // First click sorts ascending, clicking the same header again flips it.
  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
    );

  const sorted = useMemo(() => {
    if (!sort) return requests;

    // Dates are ISO strings, so comparing them as text is already
    // chronological — no parsing needed, and no timezone to get wrong.
    const value = (r: PTORequest): string | number => {
      switch (sort.key) {
        case 'employee':
          return byId.get(r.employeeId)?.name ?? '';
        case 'department':
          return byId.get(r.employeeId)?.department ?? '';
        case 'id':
          return r.id;
        case 'requestDate':
          return r.requestDate;
        case 'startDate':
          return r.startDate;
        case 'endDate':
          return r.endDate || r.startDate;
        case 'days':
          return r.days;
        case 'status':
          return r.status;
        case 'coverage':
          return r.coverage;
        case 'notes':
          return r.notes;
        case 'payStatus':
          return r.payStatus;
      }
    };

    const factor = sort.direction === 'asc' ? 1 : -1;
    // Copy first: sorting in place would mutate the caller's array.
    return [...requests].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      // Blank coverage/notes sink to the bottom either way, so an empty cell is
      // never what you land on when you sort a column to find something.
      const as = String(av);
      const bs = String(bv);
      if (!as && bs) return 1;
      if (as && !bs) return -1;
      return as.localeCompare(bs) * factor;
    });
  }, [requests, sort, byId]);

  const table = (
    <Table className={showEmployeeColumns ? 'min-w-[1180px]' : 'min-w-[1000px]'}>
        <thead className={fillHeight ? 'sticky top-0 z-10' : undefined}>
          <tr>
            {showEmployeeColumns ? (
              <>
                <SortableTh sortKey="employee" sort={sort} onSort={toggleSort}>
                  Team Member
                </SortableTh>
                <SortableTh sortKey="department" sort={sort} onSort={toggleSort}>
                  Department
                </SortableTh>
              </>
            ) : (
              <SortableTh sortKey="id" sort={sort} onSort={toggleSort}>
                Request ID
              </SortableTh>
            )}
            <SortableTh sortKey="requestDate" sort={sort} onSort={toggleSort}>
              Request Date
            </SortableTh>
            <SortableTh sortKey="startDate" sort={sort} onSort={toggleSort}>
              Start Date
            </SortableTh>
            <SortableTh sortKey="endDate" sort={sort} onSort={toggleSort}>
              End Date
            </SortableTh>
            <SortableTh sortKey="days" sort={sort} onSort={toggleSort} align="right">
              Days
            </SortableTh>
            <SortableTh sortKey="status" sort={sort} onSort={toggleSort}>
              Status
            </SortableTh>
            <SortableTh sortKey="coverage" sort={sort} onSort={toggleSort}>
              Coverage / POC
            </SortableTh>
            <SortableTh sortKey="notes" sort={sort} onSort={toggleSort}>
              Notes
            </SortableTh>
            <SortableTh sortKey="payStatus" sort={sort} onSort={toggleSort}>
              Paid / Unpaid
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <EmptyState
              colSpan={columnCount}
              icon={<Inbox size={20} />}
              title="No requests match these filters"
              description="Try clearing the search box or widening the date range."
            />
          )}
          {sorted.map((r) => {
            const emp = byId.get(r.employeeId);
            return (
              <Tr key={r.id} onClick={() => onSelect(r)}>
                {showEmployeeColumns ? (
                  <>
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
                          {/* Year dropped — Will, 2026-10-06. The full id is
                              still in its own column and in the drawer. */}
                          <p className="truncate text-[12px] text-slateish-400">
                            {shortRequestId(r.id)}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">{emp?.department ?? '—'}</Td>
                  </>
                ) : (
                  <Td className="whitespace-nowrap font-mono text-[12px] text-slateish-500">
                    {r.id}
                  </Td>
                )}
                <Td className="whitespace-nowrap tabular-nums">{formatDate(r.requestDate)}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(r.startDate)}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(r.endDate)}</Td>
                {/* Hours below half a day, days above — a 1-hour request read
                    as 0 before `computeDays` stopped rounding to halves. */}
                <Td align="right" className="font-semibold tabular-nums text-navy-900">
                  {formatLeaveLength(r.days, r.totalHours)}
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
  );

  if (fillHeight) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slateish-200/80 bg-white shadow-card">
        <div className="scroll-slim h-full overflow-auto">{table}</div>
      </div>
    );
  }

  return <TableShell>{table}</TableShell>;
}
