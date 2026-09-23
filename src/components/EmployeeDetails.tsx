import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Avatar, DetailRow, ProgressBar } from '@/components/ui/Misc';
import { EligibilityBadge, StatusBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import type { EmployeeEditInput } from '@/context/AppContext';
import type { computeBalances } from '@/lib/pto';
import { formatDateLong, formatDateRange, formatDays } from '@/lib/utils';
import { DEPARTMENTS, type Department, type Employee, type PTORequest } from '@/types';

type Balance = ReturnType<typeof computeBalances>[string];

/**
 * Right-hand drawer body for one employee on the PTO Tracker, mirroring how
 * PTO Requests opens a record beside its table.
 *
 * Splits the record in two, because the split is the thing people get wrong:
 * the top block is *stored* data an admin can edit, the bottom is *derived*
 * and has no edit affordance at all.
 *
 * Total PTO belongs in the derived half. It is NOT the employee's stored
 * `annualPtoAllowance` — no calculation reads that column. `computeEntitlement`
 * works it out from job title and hire date, so those two fields are what move
 * it. Days used, remaining and % used come from the approved request log via
 * `computeBalance`, and update as leave is filed and approved.
 */
export function EmployeeDetails({
  employee,
  balance,
  requests,
}: {
  employee: Employee;
  balance: Balance | undefined;
  requests: PTORequest[];
}) {
  const { isAdmin, updateEmployee } = useApp();
  const [editing, setEditing] = useState(false);

  // Reset back to the read-only view when the drawer swaps to another person,
  // so a half-finished edit never carries across to the wrong employee.
  useEffect(() => {
    setEditing(false);
  }, [employee.id]);

  if (!balance) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar name={employee.name} department={employee.department} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-navy-900">{employee.name}</h3>
              <p className="truncate text-[13px] text-slateish-500">{employee.email}</p>
            </div>
          </div>
          {isAdmin && !editing && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <EmployeeEditForm
            employee={employee}
            onCancel={() => setEditing(false)}
            onSave={(input) => updateEmployee(employee.id, input)}
            onSaved={() => setEditing(false)}
          />
        ) : (
          <dl className="mt-4 divide-y divide-slateish-200/70 border-t border-slateish-200/70 pt-2">
            <DetailRow label="Role">{employee.jobTitle}</DetailRow>
            <DetailRow label="Department">{employee.department}</DetailRow>
            <DetailRow label="Hire date">{formatDateLong(employee.hireDate)}</DetailRow>
          </dl>
        )}
      </div>

      <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slateish-400">
          Calculated
        </h4>
        <p className="mb-3 text-[12px] leading-snug text-slateish-500">
          Worked out from the role, the hire date and approved leave. These update
          themselves — there is nothing to edit here.
        </p>
        <dl className="divide-y divide-slateish-200/70 border-t border-slateish-200/70 pt-2">
          <DetailRow label="Eligibility date">
            {formatDateLong(balance.eligibilityDate)}
          </DetailRow>
          <DetailRow label="Eligible">
            <EligibilityBadge eligible={balance.eligible} />
          </DetailRow>
          {/* The entitlement is computed by `computeEntitlement`, NOT read from
              the employee's stored `annualPtoAllowance` — that column is legacy
              and no calculation consults it. Showing the stored value here made
              the drawer disagree with the table, which is the bug this fixes. */}
          <DetailRow label="Total PTO">{formatDays(balance.totalPto)} days</DetailRow>
          <DetailRow label="Days used">{formatDays(balance.daysUsed)}</DetailRow>
          <DetailRow label="Pending">{formatDays(balance.pendingDays)}</DetailRow>
          <DetailRow label="Days remaining">
            <span className={balance.daysRemaining < 0 ? 'font-semibold text-danger-600' : undefined}>
              {formatDays(balance.daysRemaining)}
            </span>
          </DetailRow>
        </dl>
        <div className="mt-4">
          <ProgressBar value={balance.percentUsed} showLabel />
        </div>
      </div>

      <div className="rounded-2xl border border-slateish-200/80 bg-white p-5 shadow-card">
        <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slateish-400">
          Request history ({requests.length})
        </h4>
        {requests.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-slateish-500">No PTO filed this year.</p>
        ) : (
          <ul className="divide-y divide-slateish-200/70">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/requests/${r.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-brand-600"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-navy-900">{r.leaveType}</p>
                    <p className="truncate text-[12px] text-slateish-500">
                      {formatDateRange(r.startDate, r.endDate)} · {formatDays(r.days)} day(s)
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * The editable half — only fields something actually reads. Changing the job
 * title or hire date shifts the calculated block above, which is the point of
 * allowing edits at all. There is deliberately no allowance input: see
 * `EmployeeEditInput`.
 */
function EmployeeEditForm({
  employee,
  onCancel,
  onSave,
  onSaved,
}: {
  employee: Employee;
  onCancel: () => void;
  onSave: (input: EmployeeEditInput) => Promise<string | null>;
  onSaved: () => void;
}) {
  const [name, setName] = useState(employee.name);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle);
  const [department, setDepartment] = useState<Department>(employee.department);
  const [hireDate, setHireDate] = useState(employee.hireDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const message = await onSave({ name, jobTitle, department, hireDate });
    setSaving(false);
    if (message) setError(message);
    else onSaved();
  };

  return (
    <form
      className="mt-4 space-y-4 border-t border-slateish-200/70 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label="Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field
        label="Role"
        help="Drives entitlement: Territory Managers get the full 10 days as soon as they are eligible."
      >
        <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </Field>
      <Field label="Department">
        <Select value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Hire date"
        required
        help="Eligibility is six months after this date, and entitlement grows from it — so changing this moves both."
      >
        <Input
          type="date"
          value={hireDate}
          onChange={(e) => setHireDate(e.target.value)}
          required
        />
      </Field>
      <p className="rounded-lg bg-slateish-50 px-3 py-2 text-[12px] leading-snug text-slateish-600">
        Total PTO is not set per person — it is worked out from the role and hire date by the
        entitlement rules, so there is no allowance field to edit.
      </p>

      {error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-700">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
      <p className="text-[12px] text-slateish-500">{employee.email}</p>
    </form>
  );
}
