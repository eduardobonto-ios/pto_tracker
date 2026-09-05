import { CalendarClock, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Misc';
import { EligibilityBadge } from '@/components/StatusBadge';
import { formatDateLong, formatDays } from '@/lib/utils';
import type { Employee, PTOBalance } from '@/types';

/** Personal PTO summary — the hero card on the dashboard and My PTO. */
export function PTOBalanceCard({
  employee,
  balance,
  compact,
}: {
  employee: Employee;
  balance: PTOBalance;
  compact?: boolean;
}) {
  const overdrawn = balance.daysRemaining < 0;

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-[radial-gradient(120%_140%_at_100%_0%,#152238_0%,#0D1729_60%)] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-300">
              <Wallet size={13} /> My PTO Balance
            </p>
            <p className="mt-2 text-[13px] text-navy-200">
              {employee.name} · {employee.jobTitle}
            </p>
          </div>
          <EligibilityBadge eligible={balance.eligible} />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-navy-300">Days remaining</p>
            <p
              className={`mt-1 text-[38px] font-bold leading-none tracking-tight ${
                overdrawn ? 'text-danger-500' : 'text-white'
              }`}
            >
              {formatDays(balance.daysRemaining)}
              <span className="ml-1.5 text-[14px] font-semibold text-navy-300">
                of {formatDays(balance.totalPto)}
              </span>
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-navy-300">Used</p>
              <p className="mt-1 text-lg font-bold text-white">
                {formatDays(balance.daysUsed)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-navy-300">Pending</p>
              <p className="mt-1 text-lg font-bold text-warning-500">
                {formatDays(balance.pendingDays)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-300 to-brand-400 transition-all duration-700"
              style={{ width: `${Math.min(balance.percentUsed, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-medium text-navy-300">
            <span>{balance.percentUsed}% of allowance used</span>
            <span>
              {balance.pendingDays > 0
                ? `${formatDays(balance.pendingDays)} day(s) awaiting review`
                : 'No pending requests'}
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="grid gap-px bg-slateish-200/70 sm:grid-cols-3">
          <Stat label="Hire date" value={formatDateLong(employee.hireDate)} />
          <Stat
            label="Eligibility date"
            value={formatDateLong(balance.eligibilityDate)}
            icon={<CalendarClock size={13} className="text-accent-500" />}
          />
          <Stat
            label="Annual allowance"
            value={`${formatDays(employee.annualPtoAllowance)} days`}
          />
        </div>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slateish-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[13.5px] font-semibold text-navy-900">{value}</p>
    </div>
  );
}

/** Compact usage row used inside lists. */
export function UsageMeter({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <ProgressBar value={percent} className="w-24" />
      <span className="w-9 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-navy-800">
        {percent}%
      </span>
    </div>
  );
}
