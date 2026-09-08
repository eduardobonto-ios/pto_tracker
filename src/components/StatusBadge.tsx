import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { AccountStatus, PayStatus, PTOStatus } from '@/types';

const statusTone: Record<PTOStatus, BadgeTone> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'neutral',
};

/** Request status: Pending = amber, Approved = green, Rejected = red, Cancelled = grey. */
export function StatusBadge({ status }: { status: PTOStatus }) {
  return (
    <Badge tone={statusTone[status]} dot>
      {status}
    </Badge>
  );
}

/** Paid = green, Unpaid = muted warning. */
export function PayBadge({ payStatus }: { payStatus: PayStatus }) {
  return (
    <Badge tone={payStatus === 'Paid' ? 'success' : 'warning'}>{payStatus}</Badge>
  );
}

/** Eligibility under the 6-month rule. */
export function EligibilityBadge({ eligible }: { eligible: boolean }) {
  return (
    <Badge tone={eligible ? 'success' : 'danger'} dot>
      {eligible ? 'Eligible' : 'Not yet eligible'}
    </Badge>
  );
}

/** Account provisioning status. */
export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge tone={status === 'Active' ? 'success' : 'danger'} dot>
      {status}
    </Badge>
  );
}

/** Application permission role. */
export function RoleBadge({ role }: { role: 'Employee' | 'Admin' }) {
  return <Badge tone={role === 'Admin' ? 'brand' : 'neutral'}>{role}</Badge>;
}
