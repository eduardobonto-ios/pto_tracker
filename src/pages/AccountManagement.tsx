import { useMemo, useState } from 'react';
import { KeyRound, Lock, Search, Trash2, UserMinus, UserPlus2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AccountCreationForm } from '@/components/AccountCreationForm';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, Table, TableShell, Td, Th, Tr } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Misc';
import { AccountStatusBadge, RoleBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { formatDate, generateTempPassword } from '@/lib/utils';
import type { UserAccount } from '@/types';

export function AccountManagementPage() {
  const { accounts, resetPassword, revokeAccess, restoreAccess, deleteAccount } = useApp();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== 'all' && a.appRole !== roleFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (q && !`${a.fullName} ${a.email} ${a.jobTitle} ${a.department}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [accounts, query, roleFilter, statusFilter]);

  function openReset(account: UserAccount) {
    setResetTarget(account);
    setNewTempPassword(generateTempPassword());
  }

  function confirmReset() {
    if (resetTarget) resetPassword(resetTarget.id);
    setResetTarget(null);
  }

  return (
    <AppLayout
      title="Account Management"
      subtitle="Invite-only access — only an administrator can create an account"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-brand-800">
            <Lock size={14} className="text-accent-600" /> Invite-only access (SEC-01)
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slateish-600">
            There is no public sign-up. Accounts are provisioned here, and every new employee
            is forced to set their own password the first time they sign in.
          </p>
        </div>

        <AccountCreationForm />

        <Card>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Search">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Email, name, job title…"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Field label="Application role">
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">All roles</option>
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Revoked">Revoked</option>
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <TableShell>
          <Table className="min-w-[1320px]">
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Full Name</Th>
                <Th>Application Role</Th>
                <Th>Job Title</Th>
                <Th>Department</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <EmptyState
                  colSpan={8}
                  icon={<UserPlus2 size={20} />}
                  title="No accounts match these filters"
                />
              )}
              {filtered.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.fullName} department={a.department} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-navy-900">{a.email}</p>
                        {a.mustChangePassword && (
                          <p className="truncate text-[11.5px] text-warning-600">
                            Password change pending
                          </p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap font-medium text-navy-800">{a.fullName}</Td>
                  <Td>
                    <RoleBadge role={a.appRole} />
                  </Td>
                  <Td className="whitespace-nowrap">{a.jobTitle}</Td>
                  <Td className="whitespace-nowrap">{a.department}</Td>
                  <Td>
                    <AccountStatusBadge status={a.status} />
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{formatDate(a.createdAt)}</Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => openReset(a)}>
                        <KeyRound size={13} className="text-accent-500" /> Reset password
                      </Button>
                      {a.status === 'Active' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => revokeAccess(a.id)}
                        >
                          <UserMinus size={13} className="text-accent-500" /> Revoke
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => restoreAccess(a.id)}
                        >
                          <UserPlus2 size={13} className="text-success-600" /> Restore
                        </Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(a)}>
                        <Trash2 size={13} /> Delete
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableShell>
      </div>

      {/* Reset password */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset password"
        description={`A new temporary password for ${resetTarget?.fullName ?? ''}`}
        icon={<KeyRound size={18} />}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReset}>Reset password</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-slateish-600">
          No email is sent. Copy this password and share it with{' '}
          <span className="font-semibold text-navy-800">{resetTarget?.email}</span> directly.
          They will be forced to set a new one on their next sign-in.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slateish-200 bg-slateish-50 px-4 py-3">
          <code className="font-mono text-sm tracking-wide text-navy-900">
            {newTempPassword}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigator.clipboard?.writeText(newTempPassword)}
          >
            Copy
          </Button>
        </div>
      </Modal>

      {/* Delete account */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this account?"
        description="This cannot be undone in the prototype."
        icon={<Trash2 size={18} className="text-danger-600" />}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteTarget) deleteAccount(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete account
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-slateish-600">
          <span className="font-semibold text-navy-800">{deleteTarget?.fullName}</span> (
          {deleteTarget?.email}) will lose access immediately. Consider revoking access
          instead so their PTO history stays attached to a named account.
        </p>
      </Modal>
    </AppLayout>
  );
}
