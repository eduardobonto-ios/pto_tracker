import { CalendarRange, Info, ShieldQuestion } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PTOBalanceCard } from '@/components/PTOBalanceCard';
import { formatDateLong } from '@/lib/utils';
import type { Employee, PTOBalance } from '@/types';

/** Balance summary + filing tips, shown alongside the PTO Requests log. */
export function FileLeaveAside({
  employee,
  balance,
}: {
  employee: Employee;
  balance?: PTOBalance;
}) {
  return (
    <div className="space-y-6">
      {balance && <PTOBalanceCard employee={employee} balance={balance} />}

      <Card>
        <CardHeader
          title="Before you file"
          description="A few things worth checking"
          icon={<Info size={17} />}
        />
        <CardBody className="space-y-4">
          <Tip
            icon={<CalendarRange size={15} />}
            title="Check the team calendar"
            body="Requests are easier to approve when a teammate in your department is not already out."
          />
          <Tip
            icon={<ShieldQuestion size={15} />}
            title="Eligibility"
            body={
              balance?.eligible
                ? `You became eligible on ${formatDateLong(balance.eligibilityDate)}.`
                : `Paid PTO unlocks on ${formatDateLong(
                    balance?.eligibilityDate,
                  )}. You can still file unpaid leave before then.`
            }
          />
          <Tip
            icon={<Info size={15} />}
            title="Half days count"
            body="Half Day (AM) and Half Day (PM) are charged as 0.5 days against your allowance."
          />
        </CardBody>
      </Card>
    </div>
  );
}

function Tip({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-accent-500">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-navy-900">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slateish-500">{body}</p>
      </div>
    </div>
  );
}
