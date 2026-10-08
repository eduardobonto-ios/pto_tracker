import { useMemo, useState } from 'react';
import { Search, ShieldAlert, UserCheck, Users, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardBody } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Drawer } from '@/components/ui/Modal';
import { SortableTh, Table, Td, Tr, type SortState } from '@/components/ui/Table';
import { EmployeeDetails } from '@/components/EmployeeDetails';
import { useApp } from '@/context/AppContext';
import { cn, formatDate, formatDays } from '@/lib/utils';
import { DEPARTMENTS, type Employee } from '@/types';

/** Green → yellow → orange → red, matching the legacy spreadsheet's usage heat-map. */
function usedToneClasses(pct: number) {
  if (pct >= 90) return 'bg-red-100 text-red-700';
  if (pct >= 51) return 'bg-orange-100 text-orange-700';
  if (pct >= 36) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-700';
}

/** Every column on the tracker is sortable — see the note on `sort` below. */
type TrackerSortKey =
  | 'name'
  | 'jobTitle'
  | 'department'
  | 'hireDate'
  | 'eligibilityDate'
  | 'eligible'
  | 'totalPto'
  | 'daysUsed'
  | 'daysRemaining'
  | 'percentUsed';

/**
 * A spreadsheet-style mirror of the legacy "PTO Tracker" sheet, styled to
 * match the PTO Requests log. Management-only (see `ManagementRoute` in
 * App.tsx); everyone else gets this information folded into their "My PTO
 * Balance" card on PTO Requests instead.
 */
export function MyPTOPage() {
  const { employees, balances, requests, summary } = useApp();

  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [eligibility, setEligibility] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Track the selection by id, not by object: an edit replaces the employee
  // in state, and a held object would leave the drawer showing stale values.
  const selected: Employee | null = selectedId
    ? employees.find((e) => e.id === selectedId) ?? null
    : null;
  const selectedRequests = useMemo(
    () =>
      selected
        ? requests
            .filter((r) => r.employeeId === selected.id)
            .sort((a, b) => b.startDate.localeCompare(a.startDate))
        : [],
    [requests, selected],
  );

  const notEligible = employees.filter((e) => !balances[e.id]?.eligible);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (department !== 'all' && e.department !== department) return false;
      const b = balances[e.id];
      if (eligibility === 'eligible' && !b?.eligible) return false;
      if (eligibility === 'not-eligible' && b?.eligible) return false;
      if (q && !`${e.name} ${e.email} ${e.jobTitle} ${e.department}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [employees, balances, query, department, eligibility]);

  // Sorting lives here rather than in a shared table because this page builds
  // its own markup — the roster on /employees uses EmployeeTable and has its
  // own copy. Will asked for the PTO Requests arrows on this view
  // (2026-10-06); the first attempt added them to EmployeeTable, which is a
  // different page he never looks at.
  const [sort, setSort] = useState<SortState<TrackerSortKey>>({ key: 'name', direction: 'asc' });

  const toggleSort = (key: TrackerSortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  const rows = useMemo(() => {
    const value = (employee: Employee): string | number => {
      const b = balances[employee.id];
      switch (sort.key) {
        case 'name':
          return employee.name;
        case 'jobTitle':
          return employee.jobTitle;
        case 'department':
          return employee.department;
        // ISO dates compare correctly as text — no parsing, no timezone.
        case 'hireDate':
          return employee.hireDate;
        case 'eligibilityDate':
          return b?.eligibilityDate ?? '';
        // Numeric so ascending groups the not-yet-eligible first, which is the
        // list an admin is usually after.
        case 'eligible':
          return b?.eligible ? 1 : 0;
        case 'totalPto':
          return b?.totalPto ?? 0;
        case 'daysUsed':
          return b?.daysUsed ?? 0;
        case 'daysRemaining':
          return b?.daysRemaining ?? 0;
        case 'percentUsed':
          return b?.percentUsed ?? 0;
      }
    };
    const factor = sort.direction === 'asc' ? 1 : -1;
    // Copy before sorting; `filtered` belongs to the caller.
    return [...filtered]
      .sort((a, b) => {
        const av = value(a);
        const bv = value(b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
        return String(av).localeCompare(String(bv)) * factor;
      })
      .map((employee) => ({ employee, balance: balances[employee.id] }));
  }, [filtered, balances, sort]);

  return (
    <AppLayout
      title="PTO Tracker"
      subtitle="PTO allowances, eligibility and balances for the whole team"
      fillHeight
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Members" value={summary.totalMembers} icon={Users} tone="brand" />
          <StatCard
            label="Eligible"
            value={summary.eligibleEmployees}
            icon={UserCheck}
            tone="success"
          />
          <StatCard
            label="Not Yet Eligible"
            value={notEligible.length}
            icon={ShieldAlert}
            tone={notEligible.length ? 'danger' : 'neutral'}
            hint="Within 6 months of hire"
          />
          <StatCard
            label="Total PTO Pool"
            value={formatDays(summary.totalPtoPool)}
            suffix="days"
            icon={Wallet}
            tone="accent"
          />
        </div>

        <Card className="shrink-0">
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Search">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Name, email or role…"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Field label="Department">
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="all">All departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Eligibility">
                <Select value={eligibility} onChange={(e) => setEligibility(e.target.value)}>
                  <option value="all">All</option>
                  <option value="eligible">Eligible only</option>
                  <option value="not-eligible">Not yet eligible</option>
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slateish-200/80 bg-white shadow-card">
          <div className="scroll-slim h-full overflow-auto">
            <Table className="min-w-[1100px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <SortableTh sortKey="name" sort={sort} onSort={toggleSort}>Name</SortableTh>
                  <SortableTh sortKey="jobTitle" sort={sort} onSort={toggleSort}>Role</SortableTh>
                  <SortableTh sortKey="department" sort={sort} onSort={toggleSort}>Department</SortableTh>
                  <SortableTh sortKey="hireDate" sort={sort} onSort={toggleSort}>Hire Date</SortableTh>
                  <SortableTh sortKey="eligibilityDate" sort={sort} onSort={toggleSort}>Eligibility Date</SortableTh>
                  <SortableTh sortKey="eligible" sort={sort} onSort={toggleSort}>Eligible</SortableTh>
                  <SortableTh sortKey="totalPto" sort={sort} onSort={toggleSort} align="right">Total PTO</SortableTh>
                  <SortableTh sortKey="daysUsed" sort={sort} onSort={toggleSort} align="right">Days Used</SortableTh>
                  <SortableTh sortKey="daysRemaining" sort={sort} onSort={toggleSort} align="right">Days Remaining</SortableTh>
                  <SortableTh sortKey="percentUsed" sort={sort} onSort={toggleSort} align="right">% Used</SortableTh>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ employee, balance }) => (
                  <Tr
                    key={employee.id}
                    onClick={() => setSelectedId(employee.id)}
                    className="cursor-pointer"
                  >
                    <Td className="font-semibold text-navy-900">{employee.name}</Td>
                    <Td className="whitespace-nowrap">{employee.jobTitle}</Td>
                    <Td className="whitespace-nowrap">{employee.department}</Td>
                    <Td className="whitespace-nowrap tabular-nums">
                      {formatDate(employee.hireDate)}
                    </Td>
                    <Td
                      className={cn(
                        'whitespace-nowrap tabular-nums font-medium',
                        balance?.eligible
                          ? 'bg-success-50 text-success-700'
                          : 'bg-warning-50 text-warning-700',
                      )}
                    >
                      {formatDate(balance?.eligibilityDate)}
                    </Td>
                    <Td
                      className={cn(
                        'font-semibold',
                        balance?.eligible
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      {balance?.eligible ? 'Yes' : 'No'}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {formatDays(balance?.totalPto ?? 0)}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {(balance?.daysUsed ?? 0).toFixed(1)}
                    </Td>
                    <Td align="right" className="font-semibold tabular-nums text-navy-900">
                      {(balance?.daysRemaining ?? 0).toFixed(1)}
                    </Td>
                    <Td
                      align="right"
                      className={cn(
                        'font-semibold tabular-nums',
                        usedToneClasses(balance?.percentUsed ?? 0),
                      )}
                    >
                      {balance?.percentUsed ?? 0}%
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        description={selected ? `${selected.jobTitle} · ${selected.department}` : undefined}
      >
        {selected && (
          <EmployeeDetails
            employee={selected}
            balance={balances[selected.id]}
            requests={selectedRequests}
          />
        )}
      </Drawer>
    </AppLayout>
  );
}
