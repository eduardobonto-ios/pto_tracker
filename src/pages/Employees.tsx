import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Search, ShieldAlert, UserCheck, Users, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeeTable } from '@/components/EmployeeTable';
import { StatCard } from '@/components/StatCard';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Drawer } from '@/components/ui/Modal';
import { Avatar, DetailRow, ProgressBar } from '@/components/ui/Misc';
import { EligibilityBadge, PayBadge, StatusBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { formatDateLong, formatDateRange, formatDays } from '@/lib/utils';
import { DEPARTMENTS, type Employee } from '@/types';

export function EmployeesPage() {
  const { employees, balances, requests, summary } = useApp();

  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [eligibility, setEligibility] = useState('all');
  const [selected, setSelected] = useState<Employee | null>(null);

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

  const notEligible = employees.filter((e) => !balances[e.id]?.eligible);
  const selectedBalance = selected ? balances[selected.id] : undefined;
  const selectedRequests = useMemo(
    () => (selected ? requests.filter((r) => r.employeeId === selected.id) : []),
    [requests, selected],
  );

  function exportCsv() {
    const header = [
      '#',
      'Team Member',
      'Role',
      'Department',
      'Email',
      'Hire Date',
      'Eligibility Date',
      'Eligible',
      'Total PTO',
      'Days Used',
      'Days Remaining',
      '% Used',
    ];
    const rows = filtered.map((e, i) => {
      const b = balances[e.id];
      return [
        i + 1,
        e.name,
        e.jobTitle,
        e.department,
        e.email,
        e.hireDate,
        b?.eligibilityDate ?? '',
        b?.eligible ? 'Yes' : 'No',
        b?.totalPto ?? 0,
        b?.daysUsed ?? 0,
        b?.daysRemaining ?? 0,
        `${b?.percentUsed ?? 0}%`,
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valveman-pto-tracker.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout
      title="Employees"
      subtitle="PTO allowances, eligibility and balances for the whole team"
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={exportCsv}
          className="hidden sm:inline-flex"
        >
          <Download size={15} /> Export CSV
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

        {notEligible.length > 0 && (
          <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-danger-700">
              <ShieldAlert size={15} /> {notEligible.length} team member(s) have not cleared the
              6-month eligibility rule
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {notEligible.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-navy-800 ring-1 ring-danger-200"
                >
                  <Avatar name={e.name} department={e.department} size="xs" />
                  {e.name}
                  <span className="text-danger-600">
                    → {formatDateLong(balances[e.id]?.eligibilityDate)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <Card>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Search" className="lg:col-span-1">
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

        <EmployeeTable
          employees={filtered}
          balances={balances}
          onSelect={setSelected}
        />
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        description={`${selected?.jobTitle} · ${selected?.department}`}
      >
        {selected && selectedBalance && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
              <div className="flex items-center gap-3.5">
                <Avatar name={selected.name} department={selected.department} size="lg" />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-navy-900">
                    {selected.name}
                  </h3>
                  <p className="truncate text-[13px] text-slateish-500">{selected.email}</p>
                </div>
              </div>
              <dl className="mt-4 divide-y divide-slateish-200/70 border-t border-slateish-200/70 pt-2">
                <DetailRow label="Hire date">{formatDateLong(selected.hireDate)}</DetailRow>
                <DetailRow label="Eligibility date">
                  {formatDateLong(selectedBalance.eligibilityDate)}
                </DetailRow>
                <DetailRow label="Eligible">
                  <EligibilityBadge eligible={selectedBalance.eligible} />
                </DetailRow>
                <DetailRow label="Annual allowance">
                  {formatDays(selectedBalance.totalPto)} days
                </DetailRow>
                <DetailRow label="Days used">
                  {formatDays(selectedBalance.daysUsed)}
                </DetailRow>
                <DetailRow label="Pending">
                  {formatDays(selectedBalance.pendingDays)}
                </DetailRow>
                <DetailRow label="Remaining">
                  <span
                    className={
                      selectedBalance.daysRemaining < 0 ? 'text-danger-600' : undefined
                    }
                  >
                    {formatDays(selectedBalance.daysRemaining)}
                  </span>
                </DetailRow>
              </dl>
              <div className="mt-4">
                <ProgressBar value={selectedBalance.percentUsed} showLabel />
              </div>
            </div>

            <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slateish-400">
                Request history ({selectedRequests.length})
              </h4>
              {selectedRequests.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-slateish-500">
                  No PTO filed this year.
                </p>
              ) : (
                <ul className="divide-y divide-slateish-200/70">
                  {selectedRequests.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={`/requests/${r.id}`}
                        onClick={() => setSelected(null)}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 transition-colors hover:bg-brand-50/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-navy-900">
                            {r.leaveType}
                          </p>
                          <p className="truncate text-[12px] text-slateish-500">
                            {formatDateRange(r.startDate, r.endDate)}
                          </p>
                        </div>
                        <span className="text-[12.5px] font-semibold tabular-nums text-navy-800">
                          {formatDays(r.days)}d
                        </span>
                        <PayBadge payStatus={r.payStatus} />
                        <StatusBadge status={r.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </AppLayout>
  );
}
