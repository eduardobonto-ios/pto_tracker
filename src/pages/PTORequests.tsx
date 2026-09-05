import { useMemo, useState } from 'react';
import { Download, Filter, RotateCcw, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PTORequestTable } from '@/components/PTORequestTable';
import { RequestDetails } from '@/components/RequestDetails';
import { Drawer } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useApp } from '@/context/AppContext';
import { formatDays } from '@/lib/utils';
import { DEPARTMENTS, PTO_STATUSES, type PTORequest } from '@/types';

export function PTORequestsPage() {
  const { requests, employees, isAdmin, currentUser } = useApp();

  const [query, setQuery] = useState('');
  const [employeeId, setEmployeeId] = useState('all');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [pay, setPay] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<PTORequest | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Employees only ever see their own log.
  const scoped = useMemo(
    () => (isAdmin ? requests : requests.filter((r) => r.employeeId === currentUser.id)),
    [requests, isAdmin, currentUser.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((r) => {
      const emp = empById.get(r.employeeId);
      if (employeeId !== 'all' && r.employeeId !== employeeId) return false;
      if (department !== 'all' && emp?.department !== department) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (pay !== 'all' && r.payStatus !== pay) return false;
      if (from && r.startDate < from) return false;
      if (to && r.startDate > to) return false;
      if (q) {
        const hay = [emp?.name, emp?.department, r.notes, r.coverage, r.leaveType, r.id]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scoped, empById, query, employeeId, department, status, pay, from, to]);

  const activeFilters =
    [employeeId, department, status, pay].filter((v) => v !== 'all').length +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  function reset() {
    setQuery('');
    setEmployeeId('all');
    setDepartment('all');
    setStatus('all');
    setPay('all');
    setFrom('');
    setTo('');
  }

  const totalDays = filtered.reduce((s, r) => s + r.days, 0);

  /** Export the current view as CSV — a like-for-like of the old sheet. */
  function exportCsv() {
    const header = [
      'Team Member',
      'Department',
      'Request Date',
      'Start Date',
      'End Date',
      'Days',
      'Status',
      'Coverage / POC',
      'Notes',
      'Paid / Unpaid',
    ];
    const rows = filtered.map((r) => {
      const e = empById.get(r.employeeId);
      return [
        e?.name ?? '',
        e?.department ?? '',
        r.requestDate,
        r.startDate,
        r.endDate,
        r.days,
        r.status,
        r.coverage,
        r.notes,
        r.payStatus,
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valveman-pto-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout
      title="PTO Requests"
      subtitle={
        isAdmin ? 'Every leave request filed in 2026' : 'Your leave request history'
      }
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
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, notes, coverage or request ID…"
                  className="pl-9"
                />
              </div>
              <Button
                variant={filtersOpen || activeFilters ? 'subtle' : 'secondary'}
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <Filter size={15} /> Filters
                {activeFilters > 0 && (
                  <span className="ml-1 rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                    {activeFilters}
                  </span>
                )}
              </Button>
              {(activeFilters > 0 || query) && (
                <Button variant="ghost" onClick={reset}>
                  <RotateCcw size={15} /> Reset
                </Button>
              )}
            </div>

            {filtersOpen && (
              <div className="grid animate-fade-in gap-4 border-t border-slateish-200/70 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {isAdmin && (
                  <Field label="Employee">
                    <Select
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    >
                      <option value="all">All employees</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Department">
                  <Select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="all">All departments</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="all">All statuses</option>
                    {PTO_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Paid / Unpaid">
                  <Select value={pay} onChange={(e) => setPay(e.target.value)}>
                    <option value="all">All</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </Select>
                </Field>
                <Field label="From">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="To">
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-slateish-200/70 pt-3.5">
              <Badge tone="brand">{filtered.length} request(s)</Badge>
              <Badge tone="neutral">{formatDays(totalDays)} day(s) total</Badge>
              <Badge tone="warning">
                {filtered.filter((r) => r.status === 'Pending').length} pending
              </Badge>
              <Badge tone="success">
                {filtered.filter((r) => r.status === 'Approved').length} approved
              </Badge>
              <span className="ml-auto hidden text-[12px] text-slateish-400 sm:block">
                Click any row to open the full request
              </span>
            </div>
          </CardBody>
        </Card>

        <PTORequestTable
          requests={filtered}
          employees={employees}
          onSelect={setSelected}
        />
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="PTO Request Details"
        description={selected?.id}
      >
        {selected && (
          <RequestDetails
            request={requests.find((r) => r.id === selected.id) ?? selected}
            onDone={() => setSelected(null)}
          />
        )}
      </Drawer>
    </AppLayout>
  );
}
