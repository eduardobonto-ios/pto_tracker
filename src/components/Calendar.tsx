import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { departmentColor } from '@/lib/theme';
import { cn, formatDays, toISODate } from '@/lib/utils';
import type { Employee, PTORequest } from '@/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
}

function buildMonth(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const todayIso = toISODate(new Date());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISODate(d);
    return { date: d, iso, inMonth: d.getMonth() === month, isToday: iso === todayIso };
  });
}

/** Month grid showing approved (and optionally pending) PTO. */
export function Calendar({
  requests,
  employees,
  showPending,
  onSelect,
}: {
  requests: PTORequest[];
  employees: Employee[];
  showPending: boolean;
  onSelect: (request: PTORequest) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const cells = useMemo(() => buildMonth(cursor.year, cursor.month), [cursor]);

  const visible = useMemo(
    () => requests.filter((r) => r.status === 'Approved' || (showPending && r.status === 'Pending')),
    [requests, showPending],
  );

  /** Map ISO date → requests covering that date. */
  const byDate = useMemo(() => {
    const map = new Map<string, PTORequest[]>();
    for (const r of visible) {
      const start = new Date(r.startDate + 'T00:00:00');
      const end = new Date((r.endDate || r.startDate) + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = toISODate(d);
        map.set(iso, [...(map.get(iso) ?? []), r]);
      }
    }
    return map;
  }, [visible]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slateish-200/80 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slateish-200/70 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded-lg border border-slateish-200 bg-white p-1.5 text-slateish-500 transition-colors hover:border-brand-300 hover:text-brand-600"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded-lg border border-slateish-200 bg-white p-1.5 text-slateish-500 transition-colors hover:border-brand-300 hover:text-brand-600"
          >
            <ChevronRight size={16} />
          </button>
          <h2 className="ml-1 text-[15px] font-semibold text-navy-900">{monthLabel}</h2>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
        >
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-slateish-200/70 bg-tablehead">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slateish-500"
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const items = byDate.get(cell.iso) ?? [];
          const weekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
          return (
            <div
              key={cell.iso}
              className={cn(
                'min-h-[104px] border-b border-r border-slateish-200/60 p-1.5 last:border-r-0',
                !cell.inMonth && 'bg-slateish-50/60',
                weekend && cell.inMonth && 'bg-slateish-50/40',
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold tabular-nums',
                    cell.isToday
                      ? 'bg-gradient-to-b from-brand-400 to-brand-500 text-white shadow-brand-sm'
                      : cell.inMonth
                        ? 'text-slateish-600'
                        : 'text-slateish-300',
                  )}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((r) => {
                  const emp = byId.get(r.employeeId);
                  const pending = r.status === 'Pending';
                  const half = r.days === 0.5 || r.durationType.startsWith('Half');
                  return (
                    <button
                      key={`${cell.iso}-${r.id}`}
                      onClick={() => onSelect(r)}
                      title={`${emp?.name} · ${r.leaveType} · ${formatDays(r.days)} day(s) · ${r.payStatus}`}
                      className={cn(
                        'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-medium',
                        'transition-transform duration-100 hover:-translate-y-px hover:shadow-card',
                        pending
                          ? 'border border-dashed border-warning-500/60 bg-warning-50 text-warning-700'
                          : 'bg-brand-50 text-navy-800 ring-1 ring-inset ring-brand-100',
                      )}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: pending
                            ? '#F59E0B'
                            : departmentColor[emp?.department ?? 'Other'],
                        }}
                      />
                      <span className="truncate">
                        {emp?.name.split(' ')[0]}
                        {half ? ' ½' : ''}
                      </span>
                      {r.payStatus === 'Unpaid' && (
                        <span className="ml-auto shrink-0 text-[9.5px] font-bold uppercase text-warning-600">
                          U
                        </span>
                      )}
                    </button>
                  );
                })}
                {items.length > 3 && (
                  <p className="px-1.5 text-[10.5px] font-semibold text-slateish-400">
                    +{items.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slateish-200/70 px-4 py-3 text-[11.5px] text-slateish-500 sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Approved
        </span>
        {showPending && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-warning-500 bg-warning-100" />{' '}
            Pending
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="font-bold text-slateish-600">½</span> Half day
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="font-bold text-warning-600">U</span> Unpaid
        </span>
      </div>
    </div>
  );
}
