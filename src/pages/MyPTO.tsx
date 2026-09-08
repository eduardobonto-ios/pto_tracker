import { useMemo, useState } from 'react';
import { Search, ShieldAlert, UserCheck, Users, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardBody } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { useApp } from '@/context/AppContext';
import { cn, formatDate, formatDays } from '@/lib/utils';
import { DEPARTMENTS } from '@/types';

/** Green → yellow → orange → red, matching the legacy spreadsheet's usage heat-map. */
function usedToneClasses(pct: number) {
  if (pct >= 90) return 'bg-red-100 text-red-700';
  if (pct >= 51) return 'bg-orange-100 text-orange-700';
  if (pct >= 36) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-700';
}

/**
 * A spreadsheet-style mirror of the legacy "PTO Tracker" sheet, styled to
 * match the PTO Requests log. Management-only (see `ManagementRoute` in
 * App.tsx); everyone else gets this information folded into their "My PTO
 * Balance" card on PTO Requests instead.
 */
export function MyPTOPage() {
  const { employees, balances, summary } = useApp();

  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [eligibility, setEligibility] = useState('all');

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

  const rows = filtered.map((employee) => ({ employee, balance: balances[employee.id] }));

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
                  <Th>Role</Th>
                  <Th>Department</Th>
                  <Th>Email</Th>
                  <Th>Hire Date</Th>
                  <Th>Eligibility Date</Th>
                  <Th>Eligible</Th>
                  <Th align="right">Total PTO</Th>
                  <Th align="right">Days Used</Th>
                  <Th align="right">Days Remaining</Th>
                  <Th align="right">% Used</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ employee, balance }) => (
                  <Tr key={employee.id}>
                    <Td className="font-semibold text-navy-900">{employee.jobTitle}</Td>
                    <Td className="whitespace-nowrap">{employee.department}</Td>
                    <Td className="whitespace-nowrap">{employee.email}</Td>
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
    </AppLayout>
  );
}
