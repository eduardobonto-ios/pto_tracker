import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  Gauge,
  History,
  Timer,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Avatar, DetailRow, ProgressBar } from '@/components/ui/Misc';
import { EligibilityBadge, PayBadge, StatusBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { upcomingLeave } from '@/lib/pto';
import { formatDateLong, formatDateRange, formatDays } from '@/lib/utils';

export function MyPTOPage() {
  const { currentUser, requests, balances } = useApp();
  const balance = balances[currentUser.id];

  const mine = useMemo(
    () => requests.filter((r) => r.employeeId === currentUser.id),
    [requests, currentUser.id],
  );
  const upcoming = useMemo(() => upcomingLeave(mine), [mine]);
  const pending = useMemo(() => mine.filter((r) => r.status === 'Pending'), [mine]);

  return (
    <AppLayout title="My PTO" subtitle={`${currentUser.jobTitle} · ${currentUser.department}`}>
      <div className="space-y-6">
        {/* Identity */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar
                  name={currentUser.name}
                  department={currentUser.department}
                  size="lg"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-navy-900">
                    {currentUser.name}
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slateish-500">
                    <span className="inline-flex items-center gap-1.5">
                      <BriefcaseBusiness size={13} className="text-accent-500" />
                      {currentUser.jobTitle}
                    </span>
                    <span className="text-slateish-300">·</span>
                    <span>{currentUser.department}</span>
                    <span className="text-slateish-300">·</span>
                    <span>{currentUser.email}</span>
                  </p>
                </div>
              </div>
              <EligibilityBadge eligible={!!balance?.eligible} />
            </div>

            <dl className="mt-5 grid gap-x-8 border-t border-slateish-200/70 pt-2 sm:grid-cols-2">
              <DetailRow label="Hire date">{formatDateLong(currentUser.hireDate)}</DetailRow>
              <DetailRow label="Eligibility date">
                {formatDateLong(balance?.eligibilityDate)}
              </DetailRow>
              <DetailRow label="Annual allowance">
                {formatDays(currentUser.annualPtoAllowance)} days
              </DetailRow>
              <DetailRow label="Eligibility status">
                {balance?.eligible ? (
                  <span className="text-success-700">Eligible for paid PTO</span>
                ) : (
                  <span className="text-danger-600">
                    Not yet eligible — unlocks {formatDateLong(balance?.eligibilityDate)}
                  </span>
                )}
              </DetailRow>
            </dl>
          </CardBody>
        </Card>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            label="Total PTO"
            value={formatDays(balance?.totalPto ?? 0)}
            suffix="days"
            icon={Wallet}
            tone="brand"
          />
          <StatCard
            label="Days Used"
            value={formatDays(balance?.daysUsed ?? 0)}
            icon={TrendingDown}
            tone="neutral"
          />
          <StatCard
            label="Pending Days"
            value={formatDays(balance?.pendingDays ?? 0)}
            icon={Clock3}
            tone={balance?.pendingDays ? 'warning' : 'neutral'}
            hint="Not yet deducted"
          />
          <StatCard
            label="Days Remaining"
            value={formatDays(balance?.daysRemaining ?? 0)}
            icon={Timer}
            tone={(balance?.daysRemaining ?? 0) < 0 ? 'danger' : 'success'}
          />
          <StatCard
            label="% Used"
            value={`${balance?.percentUsed ?? 0}%`}
            icon={Gauge}
            tone={(balance?.percentUsed ?? 0) > 100 ? 'danger' : 'accent'}
          />
        </div>

        {/* Usage bar */}
        <Card>
          <CardHeader
            title="PTO usage"
            description={`${formatDays(balance?.daysUsed ?? 0)} of ${formatDays(
              balance?.totalPto ?? 0,
            )} days used this year`}
            icon={<Gauge size={17} />}
          />
          <CardBody>
            <ProgressBar value={balance?.percentUsed ?? 0} showLabel />
            {(balance?.daysRemaining ?? 0) < 0 && (
              <p className="mt-3 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-[12.5px] font-medium text-danger-700">
                You are {formatDays(Math.abs(balance?.daysRemaining ?? 0))} day(s) over your
                annual allowance. Speak with Management about how the excess will be handled.
              </p>
            )}
            {(balance?.pendingDays ?? 0) > 0 && (
              <p className="mt-3 rounded-xl border border-warning-200 bg-warning-50 px-3.5 py-2.5 text-[12.5px] font-medium text-warning-700">
                {formatDays(balance?.pendingDays ?? 0)} day(s) are awaiting review and are not
                deducted from your balance yet.
              </p>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <ListCard
            title="Upcoming approved leave"
            description="Approved and still ahead"
            icon={<CalendarCheck2 size={17} />}
            items={upcoming}
            empty="No upcoming approved leave."
          />
          <ListCard
            title="Pending requests"
            description="Filed and awaiting a decision"
            icon={<CalendarClock size={17} />}
            items={pending}
            empty="You have nothing awaiting review."
          />
        </div>

        {/* Full history */}
        <Card>
          <CardHeader
            title="2026 PTO history"
            description={`${mine.length} request(s) on file`}
            icon={<History size={17} />}
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-slateish-200/70">
              {mine.length === 0 && (
                <li className="px-6 py-12 text-center text-[13px] text-slateish-500">
                  You haven&rsquo;t filed any PTO this year.
                </li>
              )}
              {mine.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/requests/${r.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-brand-50/50 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-navy-900">
                        {r.leaveType}
                      </p>
                      <p className="truncate text-[12px] text-slateish-500">
                        {formatDateRange(r.startDate, r.endDate)} · Coverage:{' '}
                        {r.coverage || 'N/A'}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums text-navy-800">
                      {formatDays(r.days)}d
                    </span>
                    <PayBadge payStatus={r.payStatus} />
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

function ListCard({
  title,
  description,
  icon,
  items,
  empty,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: { id: string; startDate: string; endDate: string; days: number; leaveType: string }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} icon={icon} />
      <CardBody className="p-0">
        {items.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-slateish-500">{empty}</p>
        ) : (
          <ul className="divide-y divide-slateish-200/70">
            {items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/requests/${r.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50/50 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-navy-900">
                      {r.leaveType}
                    </p>
                    <p className="truncate text-[12px] text-slateish-500">
                      {formatDateRange(r.startDate, r.endDate)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-navy-800">
                    {formatDays(r.days)}d
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
