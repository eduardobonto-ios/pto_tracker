import { useCallback, useMemo, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar } from '@/components/Calendar';
import { RequestActions, RequestDetails } from '@/components/RequestDetails';
import { Drawer } from '@/components/ui/Modal';
import { Card, CardBody } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Field';
import { useApp } from '@/context/AppContext';
import { fetchOrgCalendar } from '@/lib/orgCalendar';
import { DEPARTMENTS, LEAVE_TYPES, type OrgCalendarEvent, type PTORequest } from '@/types';

/**
 * Visible to every employee and admin (see `App.tsx` — this route carries no
 * role guard) so the whole team can see scheduled absences.
 *
 * Leave comes solely from the in-app `requests` list — Supabase is the source
 * of truth for PTO, and nothing read from Microsoft is stored here.
 *
 * On top of that, the grid overlays read-only events from the organisation's
 * shared Microsoft 365 calendar (company events, holidays, shutdowns) via
 * `lib/orgCalendar.ts`. That overlay is strictly additive: it is fetched per
 * visible month and resolves to an empty list whenever the Microsoft
 * integration is unconfigured or unreachable, so this page keeps working on
 * Supabase data alone. Employees' personal calendars are deliberately out of
 * scope — only the one org calendar is read.
 *
 * A separate, currently dormant path pushes approved leave *to* a shared
 * Microsoft calendar (`lib/calendarSync.ts`). See
 * `supabase/functions/SETUP.md` for the setup both
 * directions share.
 */
export function PTOCalendarPage() {
  const { requests, employees, isAdmin } = useApp();

  const [department, setDepartment] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [leaveType, setLeaveType] = useState('all');
  const [showPending, setShowPending] = useState(true);
  const [selected, setSelected] = useState<PTORequest | null>(null);
  const [orgEvents, setOrgEvents] = useState<OrgCalendarEvent[]>([]);

  // Identifies the range currently on screen. Month navigation can outrun the
  // network, so a response that is no longer the visible range is discarded
  // rather than flashing the wrong month's events into the grid.
  const visibleRange = useRef('');

  const handleRangeChange = useCallback((startIso: string, endIso: string) => {
    const key = `${startIso}..${endIso}`;
    visibleRange.current = key;
    void fetchOrgCalendar(startIso, endIso).then((events) => {
      if (visibleRange.current === key) setOrgEvents(events);
    });
  }, []);

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
            orgEvents={orgEvents}
            onRangeChange={handleRangeChange}
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
