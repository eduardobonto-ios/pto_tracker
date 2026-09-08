import { TriangleAlert } from 'lucide-react';
import { Avatar } from '@/components/ui/Misc';
import { useApp } from '@/context/AppContext';
import { departmentLeaveConflicts } from '@/lib/pto';
import { formatDateRange } from '@/lib/utils';
import type { Employee } from '@/types';

/**
 * Warning banner shown when another employee in the same department already
 * has (or has requested) overlapping leave. Informational only — never
 * blocks submission or review.
 */
export function DepartmentLeaveNotice({
  employee,
  startDate,
  endDate,
  excludeRequestId,
}: {
  employee?: Employee;
  startDate: string;
  endDate?: string;
  excludeRequestId?: string;
}) {
  const { employees, requests } = useApp();

  if (!employee || !startDate) return null;

  const conflicts = departmentLeaveConflicts(
    employee,
    startDate,
    endDate,
    employees,
    requests,
    excludeRequestId,
  );

  if (conflicts.length === 0) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warning-200 bg-warning-50 p-3.5">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning-600" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-700">
          Department Leave Notice
        </p>
        <ul className="mt-2 space-y-1.5">
          {conflicts.map(({ employee: other, request }) => (
            <li key={request.id} className="flex items-start gap-2">
              <Avatar name={other.name} department={other.department} size="xs" className="mt-0.5" />
              <p className="text-[12.5px] leading-relaxed text-warning-700">
                <strong className="font-semibold text-navy-800">{other.name}</strong> from the{' '}
                {other.department} department is also{' '}
                {request.status === 'Pending' ? 'requesting' : 'on'} leave{' '}
                {formatDateRange(request.startDate, request.endDate)}
                {request.status === 'Pending' ? ' (pending review)' : ''}.
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
