import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar } from '@/components/Calendar';
import { RequestActions, RequestDetails } from '@/components/RequestDetails';
import { Drawer } from '@/components/ui/Modal';
import { Card, CardBody } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Field';
import { useApp } from '@/context/AppContext';
import { DEPARTMENTS, LEAVE_TYPES, type PTORequest } from '@/types';

export function PTOCalendarPage() {
  const { requests, employees, isAdmin } = useApp();

  const [department, setDepartment] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [leaveType, setLeaveType] = useState('all');
  const [showPending, setShowPending] = useState(true);
  const [selected, setSelected] = useState<PTORequest | null>(null);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const activeRequest = selected
    ? requests.find((r) => r.id === selected.id) ?? selected
    : null;

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const emp = empById.get(r.employeeId);
        if (department !== 'all' && emp?.department !== department) return false;
        if (employeeId !== 'all' && r.employeeId !== employeeId) return false;
        if (leaveType !== 'all' && r.leaveType !== leaveType) return false;
        return true;
      }),
    [requests, empById, department, employeeId, leaveType],
  );

  return (
    <AppLayout
      title="PTO Calendar"
      subtitle="Approved leave across the team, month by month"
      fillHeight
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <Card className="shrink-0">
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <Field label="Employee">
                <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <option value="all">All employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Leave type">
                <Select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  <option value="all">All leave types</option>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Pending requests">
                <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-slateish-200 bg-white px-3.5">
                  <input
                    type="checkbox"
                    checked={showPending}
                    onChange={(e) => setShowPending(e.target.checked)}
                    className="h-4 w-4 rounded border-slateish-300 text-brand-500 accent-[#4A8CD8] focus:ring-brand-400"
                  />
                  <span className="text-[13px] text-slateish-600">
                    Show pending on calendar
                  </span>
                </label>
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="min-h-0 flex-1">
          <Calendar
            requests={filtered}
            employees={employees}
            showPending={showPending}
            onSelect={setSelected}
          />
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="PTO Request Details"
        description={selected?.id}
        footer={
          activeRequest && isAdmin && activeRequest.status === 'Pending' ? (
            <RequestActions request={activeRequest} onDone={() => setSelected(null)} />
          ) : undefined
        }
      >
        {activeRequest && <RequestDetails request={activeRequest} />}
      </Drawer>
    </AppLayout>
  );
}
