import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { removeLeaveFromCalendar, syncApprovedLeaveToCalendar } from '@/lib/calendarSync';
import {
  buildNewRequestNotification,
  buildReviewedNotification,
  sendNotification,
  type NotificationPayload,
} from '@/lib/notifications';
import { computeBalances, computeSummary } from '@/lib/pto';
import { supabase } from '@/lib/supabaseClient';
import {
  loadApproverRouting,
  mapAccountRow,
  mapEmployeeRow,
  mapRequestRow,
  type ApproverRouting,
} from '@/lib/supabaseMappers';
import {
  approveRequestRpc,
  cancelRequestRpc,
  changePasswordRpc,
  logNotification,
  mintActionToken,
  rejectRequestRpc,
  setPasswordRpc,
  submitRequestRpc,
  verifyLoginRpc,
} from '@/lib/supabaseActions';
import { todayISO, uid } from '@/lib/utils';
import type {
  AppRole,
  Employee,
  PTORequest,
  UserAccount,
} from '@/types';

/**
 * Single data store for the app, backed by Supabase (see `supabase/schema.sql`
 * and `supabase/seed.sql`). Employees/accounts/requests/routing are fetched
 * once on mount; every mutator below calls the matching Supabase RPC/table
 * write and then updates local state from the response.
 *
 * Passwords are real (`signIn` verifies against a bcrypt hash via the
 * `pto_verify_login` RPC — see `supabase/schema.sql`), but there's still no
 * real Supabase Auth session; `currentUserId` is just a locally-held pointer
 * set on successful sign-in, not a token.
 */

type Session = 'signed-out' | 'must-change-password' | 'signed-in';

export interface NewRequestInput {
  employeeId: string;
  leaveType: PTORequest['leaveType'];
  reason: string;
  startDate: string;
  endDate?: string;
  durationType: PTORequest['durationType'];
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  days: number;
  coverage: string;
  payStatus: PTORequest['payStatus'];
  /** Admin preview only — regular employees always file as Pending. */
  status?: PTORequest['status'];
}

export interface NewAccountInput {
  email: string;
  fullName: string;
  appRole: AppRole;
  jobTitle: string;
  department: UserAccount['department'];
  hireDate: string;
  annualPtoAllowance: number;
  tempPassword: string;
}

interface AppContextValue {
  session: Session;
  currentUser: Employee;
  /** Effective application role — drives navigation and permissions. */
  role: AppRole;
  isAdmin: boolean;
  /** Admins, plus Princes Aloha Gomez by name even if her role ever changes. */
  isManagement: boolean;

  employees: Employee[];
  requests: PTORequest[];
  accounts: UserAccount[];
  /** Approver routing config — see `lib/supabaseMappers.ts#loadApproverRouting`. */
  routing: ApproverRouting;
  balances: ReturnType<typeof computeBalances>;
  summary: ReturnType<typeof computeSummary>;

  /** The last request submitted in this session, used by the email preview. */
  lastSubmittedId: string | null;
  /** Notification log — see lib/notifications.ts. Newest first. */
  notifications: NotificationPayload[];

  /** Returns an error message on failure (wrong email/password), or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  /** Forced first-login password change. Returns an error message if `current` doesn't match, or null on success. */
  changePassword: (current: string, next: string) => Promise<string | null>;
  /** Preview-only user switcher so both roles can be demoed. */
  switchUser: (employeeId: string) => void;

  submitRequest: (input: NewRequestInput) => Promise<PTORequest>;
  approveRequest: (id: string, comment?: string) => void;
  rejectRequest: (id: string, rejectionReason: string) => void;
  /** Employee cancelling their own request (or an admin on their behalf). Keeps the record, just changes its status. */
  cancelRequest: (id: string, reason?: string) => void;

  createAccount: (input: NewAccountInput) => void;
  /** Admin-initiated reset — sets the real password directly, no current-password check. */
  resetPassword: (accountId: string, newPassword: string) => void;
  revokeAccess: (accountId: string) => void;
  restoreAccess: (accountId: string) => void;
  deleteAccount: (accountId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Default preview identity: an admin, so the full app is visible up front. */
const DEFAULT_USER_ID = 'emp-01';

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>('signed-out');
  const [currentUserId, setCurrentUserId] = useState(DEFAULT_USER_ID);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<PTORequest[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [routing, setRouting] = useState<ApproverRouting | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [employeesRes, accountsRes, requestsRes, routingData] = await Promise.all([
          supabase.from('pto_employees').select('*').order('sheet_no'),
          supabase.from('pto_accounts').select('*').order('created_at'),
          supabase
            .from('pto_requests')
            .select('*')
            .order('request_date', { ascending: false })
            .order('id', { ascending: false }),
          loadApproverRouting(),
        ]);
        if (employeesRes.error) throw employeesRes.error;
        if (accountsRes.error) throw accountsRes.error;
        if (requestsRes.error) throw requestsRes.error;
        if (cancelled) return;

        setEmployees((employeesRes.data ?? []).map(mapEmployeeRow));
        setAccounts((accountsRes.data ?? []).map(mapAccountRow));
        setRequests((requestsRes.data ?? []).map(mapRequestRow));
        setRouting(routingData);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load data from Supabase.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentUser = useMemo(
    () => employees.find((e) => e.id === currentUserId) ?? employees[0],
    [employees, currentUserId],
  );

  const balances = useMemo(() => computeBalances(employees, requests), [employees, requests]);
  const summary = useMemo(() => computeSummary(employees, requests), [employees, requests]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const result = await verifyLoginRpc(email, password);
        if (!result) return 'Incorrect email or password.';
        setCurrentUserId(result.employeeId);
        setSession(result.mustChangePassword ? 'must-change-password' : 'signed-in');
        return null;
      } catch (err) {
        console.error('[PTO Tracker] sign-in failed:', err);
        return 'Something went wrong signing in. Please try again.';
      }
    },
    [],
  );

  const signOut = useCallback(() => setSession('signed-out'), []);

  const changePassword = useCallback(
    async (current: string, next: string): Promise<string | null> => {
      const account = accounts.find((a) => a.employeeId === currentUserId);
      if (!account) return 'No account found for this session.';
      try {
        const ok = await changePasswordRpc(account.id, current, next);
        if (!ok) return 'Your current password is incorrect.';
        setAccounts((prev) =>
          prev.map((a) => (a.id === account.id ? { ...a, mustChangePassword: false } : a)),
        );
        setSession('signed-in');
        return null;
      } catch (err) {
        console.error('[PTO Tracker] password change failed:', err);
        return 'Something went wrong updating your password. Please try again.';
      }
    },
    [accounts, currentUserId],
  );

  const switchUser = useCallback((employeeId: string) => {
    setCurrentUserId(employeeId);
  }, []);

  const submitRequest = useCallback(
    async (input: NewRequestInput): Promise<PTORequest> => {
      const status = input.status ?? 'Pending';
      const request = await submitRequestRpc({
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        startDate: input.startDate,
        endDate: input.endDate || input.startDate,
        durationType: input.durationType,
        days: input.days,
        payStatus: input.payStatus,
        coverage: input.coverage,
        reason: input.reason,
        startTime: input.startTime,
        endTime: input.endTime,
        totalHours: input.totalHours,
        status,
      });
      setRequests((prev) => [request, ...prev]);
      setLastSubmittedId(request.id);

      // Notify the appropriate admin/approver that a new request needs review,
      // including single-use approve/reject links (see lib/supabaseActions.ts).
      if (routing) {
        const notification = buildNewRequestNotification(request, employees, routing);
        const primaryApprover = notification.to[0];
        if (primaryApprover) {
          try {
            const [approveToken, rejectToken] = await Promise.all([
              mintActionToken(request.id, 'approve', primaryApprover),
              mintActionToken(request.id, 'reject', primaryApprover),
            ]);
            notification.data.approveUrl = `${window.location.origin}/respond?token=${approveToken}`;
            notification.data.rejectUrl = `${window.location.origin}/respond?token=${rejectToken}`;
          } catch (err) {
            console.error('[PTO Tracker] failed to mint email action tokens:', err);
          }
        }
        const sent = sendNotification(notification);
        setNotifications((prev) => [sent, ...prev]);
        logNotification(sent);
      }

      return request;
    },
    [employees, routing],
  );

  const approveRequest = useCallback(
    (id: string, comment?: string) => {
      void (async () => {
        const updated = await approveRequestRpc(id, currentUser.name, comment);
        if (!updated) return;
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        const notification = sendNotification(
          buildReviewedNotification(updated, employees, currentUser.name),
        );
        setNotifications((prev) => [notification, ...prev]);
        logNotification(notification);
        syncApprovedLeaveToCalendar(updated);
      })().catch((err) => console.error('[PTO Tracker] failed to approve request:', err));
    },
    [currentUser?.name, employees],
  );

  const rejectRequest = useCallback(
    (id: string, rejectionReason: string) => {
      void (async () => {
        const updated = await rejectRequestRpc(id, currentUser.name, rejectionReason);
        if (!updated) return;
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        const notification = sendNotification(
          buildReviewedNotification(updated, employees, currentUser.name),
        );
        setNotifications((prev) => [notification, ...prev]);
        logNotification(notification);
      })().catch((err) => console.error('[PTO Tracker] failed to reject request:', err));
    },
    [currentUser?.name, employees],
  );

  const cancelRequest = useCallback(
    (id: string, reason?: string) => {
      void (async () => {
        const updated = await cancelRequestRpc(id, currentUser.name, reason);
        if (!updated) return;
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        // No-op on the calendar side if this request was never approved (never had an event).
        removeLeaveFromCalendar(updated);
      })().catch((err) => console.error('[PTO Tracker] failed to cancel request:', err));
    },
    [currentUser?.name],
  );

  const createAccount = useCallback(
    (input: NewAccountInput) => {
      const employeeId = uid('emp');
      const accountId = uid('acct');
      void (async () => {
        const { error: empError } = await supabase.from('pto_employees').insert({
          id: employeeId,
          sheet_no: employees.length + 1,
          name: input.fullName,
          email: input.email,
          job_title: input.jobTitle || 'Team Member',
          department: input.department,
          hire_date: input.hireDate,
          annual_pto_allowance: input.annualPtoAllowance,
          app_role: input.appRole,
          active: true,
        });
        if (empError) throw empError;

        const { error: acctError } = await supabase.from('pto_accounts').insert({
          id: accountId,
          employee_id: employeeId,
          email: input.email,
          full_name: input.fullName,
          app_role: input.appRole,
          job_title: input.jobTitle || 'Team Member',
          department: input.department,
          hire_date: input.hireDate,
          annual_pto_allowance: input.annualPtoAllowance,
          status: 'Active',
          must_change_password: true,
        });
        if (acctError) throw acctError;
        await setPasswordRpc(accountId, input.tempPassword, true);

        setEmployees((prev) => [
          ...prev,
          {
            id: employeeId,
            sheetNo: prev.length + 1,
            name: input.fullName,
            email: input.email,
            jobTitle: input.jobTitle || 'Team Member',
            department: input.department,
            hireDate: input.hireDate,
            annualPtoAllowance: input.annualPtoAllowance,
            appRole: input.appRole,
            active: true,
          },
        ]);
        setAccounts((prev) => [
          {
            id: accountId,
            email: input.email,
            fullName: input.fullName,
            appRole: input.appRole,
            jobTitle: input.jobTitle || 'Team Member',
            department: input.department,
            hireDate: input.hireDate,
            annualPtoAllowance: input.annualPtoAllowance,
            status: 'Active',
            createdAt: todayISO(),
            mustChangePassword: true,
            employeeId,
          },
          ...prev,
        ]);
      })().catch((err) => console.error('[PTO Tracker] failed to create account:', err));
    },
    [employees.length],
  );

  const resetPassword = useCallback((accountId: string, newPassword: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, mustChangePassword: true } : a)),
    );
    setPasswordRpc(accountId, newPassword, true).catch((err) =>
      console.error('[PTO Tracker] failed to persist password reset:', err),
    );
  }, []);

  const revokeAccess = useCallback((accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, status: 'Revoked' } : a)),
    );
    void supabase
      .from('pto_accounts')
      .update({ status: 'Revoked' })
      .eq('id', accountId)
      .then(({ error }) => {
        if (error) console.error('[PTO Tracker] failed to revoke access:', error);
      });
  }, []);

  const restoreAccess = useCallback((accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, status: 'Active' } : a)),
    );
    void supabase
      .from('pto_accounts')
      .update({ status: 'Active' })
      .eq('id', accountId)
      .then(({ error }) => {
        if (error) console.error('[PTO Tracker] failed to restore access:', error);
      });
  }, []);

  const deleteAccount = useCallback((accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    void supabase
      .from('pto_accounts')
      .delete()
      .eq('id', accountId)
      .then(({ error }) => {
        if (error) console.error('[PTO Tracker] failed to delete account:', error);
      });
  }, []);

  if (loading) {
    return <FullScreenNotice title="Loading Valveman PTO Tracker…" />;
  }
  if (loadError || !currentUser || !routing) {
    return (
      <FullScreenNotice
        title="Couldn't load the PTO Tracker"
        detail={
          loadError ??
          'No data came back from Supabase. Make sure supabase/schema.sql and supabase/seed.sql have been run, and that VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set in .env.'
        }
      />
    );
  }

  const isAdmin = currentUser.appRole === 'Admin';
  const isManagement = isAdmin || currentUser.email.toLowerCase() === routing.princesEmail.toLowerCase();

  const value: AppContextValue = {
    session,
    currentUser,
    role: currentUser.appRole,
    isAdmin,
    isManagement,
    employees,
    requests,
    accounts,
    routing,
    balances,
    summary,
    lastSubmittedId,
    notifications,
    signIn,
    signOut,
    changePassword,
    switchUser,
    submitRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    createAccount,
    resetPassword,
    revokeAccess,
    restoreAccess,
    deleteAccount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function FullScreenNotice({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <p className="text-[15px] font-semibold text-navy-900">{title}</p>
        {detail && <p className="mt-2 text-[13px] leading-relaxed text-slateish-500">{detail}</p>}
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
