import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarCheck2,
  CalendarClock,
  CircleCheckBig,
  Clock3,
  FilePlus2,
  Timer,
  TrendingDown,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Misc';
import { PTOBalanceCard } from '@/components/PTOBalanceCard';
import { PayBadge, StatusBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { outToday, upcomingLeave } from '@/lib/pto';
import { formatDateRange, formatDays } from '@/lib/utils';

export function DashboardPage() {
  const { currentUser, isAdmin, employees, requests, balances, summary } = useApp();
  const navigate = useNavigate();

  const myBalance = balances[currentUser.id];
  const myRequests = useMemo(
    () => requests.filter((r) => r.employeeId === currentUser.id),
    [requests, currentUser.id],
  );

  const scope = isAdmin ? requests : myRequests;
  const upcoming = useMemo(() => upcomingLeave(scope).slice(0, 5), [scope]);
  const pending = useMemo(
    () => scope.filter((r) => r.status === 'Pending').slice(0, 5),
    [scope],
  );
  const recent = useMemo(() => scope.slice(0, 6), [scope]);
  const away = useMemo(() => outToday(employees, requests), [employees, requests]);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  return (
    <AppLayout
      title={isAdmin ? 'Company Dashboard' : 'My Dashboard'}
      subtitle={
        isAdmin
          ? 'Company-wide PTO monitoring for 2026'
          : `Your PTO at a glance · ${currentUser.department}`
      }
      actions={
        <Button size="sm" onClick={() => navigate('/file-a-leave')} className="hidden sm:inline-flex">
          <FilePlus2 size={15} /> File a Leave
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total Members" value={summary.totalMembers} icon={Users} tone="brand" />
          <StatCard
            label="Eligible"
            value={summary.eligibleEmployees}
            icon={UserCheck}
            tone="success"
            hint="Past the 6-month rule"
          />
          <StatCard
            label="Total PTO Pool"
            value={formatDays(summary.totalPtoPool)}
            suffix="days"
            icon={Wallet}
            tone="accent"
          />
          <StatCard
            label="Days Used"
            value={formatDays(summary.daysUsed)}
            icon={TrendingDown}
            tone="neutral"
          />
          <StatCard
            label="Days Remaining"
            value={formatDays(summary.daysRemaining)}
            icon={Timer}
            tone="brand"
          />
          <StatCard
            label="Pending Requests"
            value={summary.pendingRequests}
            icon={Clock3}
            tone={summary.pendingRequests > 0 ? 'warning' : 'neutral'}
            hint={summary.pendingRequests > 0 ? 'Awaiting review' : 'Nothing to review'}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {/* Personal balance — emphasised for employees */}
          <div className={isAdmin ? 'xl:col-span-1' : 'xl:col-span-2'}>
            {myBalance && <PTOBalanceCard employee={currentUser} balance={myBalance} />}
          </div>

          {/* Pending review queue */}
          <Card className={isAdmin ? 'xl:col-span-2' : 'xl:col-span-1'}>
            <CardHeader
              title={isAdmin ? 'Pending requests' : 'My pending requests'}
              description={
                isAdmin
                  ? 'Requests waiting on Management review'
                  : 'Filed and awaiting a decision'
              }
              icon={<Clock3 size={17} />}
              action={
                <Link
                  to="/requests"
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-600 hover:text-accent-500"
                >
                  View all <ArrowUpRight size={13} />
                </Link>
              }
            />
            <CardBody className="p-0">
              {pending.length === 0 ? (
                <Empty
                  icon={<CircleCheckBig size={20} />}
                  title="Nothing pending"
                  description={
                    isAdmin
                      ? 'Every request has been reviewed.'
                      : 'You have no requests awaiting review.'
                  }
                />
              ) : (
                <ul className="divide-y divide-slateish-200/70">
                  {pending.map((r) => {
                    const emp = empById.get(r.employeeId);
                    return (
                      <li key={r.id}>
                        <Link
                          to={`/requests/${r.id}`}
                          className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50/50 sm:px-6"
                        >
                          <Avatar
                            name={emp?.name ?? '—'}
                            department={emp?.department}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-navy-900">
                              {emp?.name}
                            </p>
                            <p className="truncate text-[12px] text-slateish-500">
                              {formatDateRange(r.startDate, r.endDate)} ·{' '}
                              {formatDays(r.days)} day(s) · {r.leaveType}
                            </p>
                          </div>
                          <StatusBadge status={r.status} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming PTO */}
          <Card>
            <CardHeader
              title="Upcoming PTO"
              description="Approved leave still ahead of us"
              icon={<CalendarCheck2 size={17} />}
              action={
                <Link
                  to="/calendar"
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-600 hover:text-accent-500"
                >
                  Calendar <ArrowUpRight size={13} />
                </Link>
              }
            />
            <CardBody className="p-0">
              {upcoming.length === 0 ? (
                <Empty
                  icon={<CalendarClock size={20} />}
                  title="No upcoming leave"
                  description="Nothing approved on the calendar ahead."
                />
              ) : (
                <ul className="divide-y divide-slateish-200/70">
                  {upcoming.map((r) => {
                    const emp = empById.get(r.employeeId);
                    return (
                      <li key={r.id}>
                        <Link
                          to={`/requests/${r.id}`}
                          className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50/50 sm:px-6"
                        >
                          <Avatar
                            name={emp?.name ?? '—'}
                            department={emp?.department}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-navy-900">
                              {emp?.name}
                            </p>
                            <p className="truncate text-[12px] text-slateish-500">
                              {formatDateRange(r.startDate, r.endDate)} · {r.leaveType}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[12.5px] font-semibold tabular-nums text-navy-800">
                              {formatDays(r.days)}d
                            </span>
                            <PayBadge payStatus={r.payStatus} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Team availability */}
          <Card>
            <CardHeader
              title="Team availability"
              description={
                away.length === 0
                  ? 'Everyone is in today'
                  : `${away.length} team member(s) out today`
              }
              icon={<Users size={17} />}
            />
            <CardBody>
              {away.length > 0 && (
                <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-700">
                    Out today
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {away.map((e) => (
                      <span
                        key={e.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-navy-800 ring-1 ring-warning-200"
                      >
                        <Avatar name={e.name} department={e.department} size="xs" />
                        {e.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slateish-400">
                Available now
              </p>
              <div className="flex flex-wrap gap-2">
                {employees
                  .filter((e) => !away.some((a) => a.id === e.id))
                  .map((e) => (
                    <span
                      key={e.id}
                      title={`${e.jobTitle} · ${e.department}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slateish-50 px-2.5 py-1 text-[12px] font-medium text-slateish-600 ring-1 ring-slateish-200"
                    >
                      <Avatar name={e.name} department={e.department} size="xs" />
                      {e.name.split(' ')[0]}
                    </span>
                  ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader
            title="Recent PTO activity"
            description="Latest requests filed across the team"
            icon={<CalendarClock size={17} />}
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-slateish-200/70">
              {recent.map((r) => {
                const emp = empById.get(r.employeeId);
                return (
                  <li key={r.id}>
                    <Link
                      to={`/requests/${r.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-brand-50/50 sm:px-6"
                    >
                      <Avatar
                        name={emp?.name ?? '—'}
                        department={emp?.department}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] text-navy-900">
                          <span className="font-semibold">{emp?.name}</span>{' '}
                          <span className="text-slateish-500">
                            filed {formatDays(r.days)} day(s) of {r.leaveType.toLowerCase()}
                          </span>
                        </p>
                        <p className="truncate text-[12px] text-slateish-400">
                          {formatDateRange(r.startDate, r.endDate)} · Coverage:{' '}
                          {r.coverage || 'N/A'}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

function Empty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slateish-100 text-slateish-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-navy-800">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[13px] text-slateish-500">{description}</p>
    </div>
  );
}
