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
  logNotification,
  mintActionToken,
  rejectRequestRpc,
  submitRequestRpc,
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
 * Auth is real Supabase Auth (Google for @valveman.com, Microsoft/Azure for
 * @fswelsford.com) — see `signInWithGoogle`/`signInWithMicrosoft`. Being a
 * real identity on one of those two domains isn't enough by itself: the
 * authenticated email must also match an `Active` row in `pto_accounts`
 * (provisioned via Account Management) before `session` becomes
 * `'signed-in'` — otherwise it's `'unprovisioned'`.
 */

type Session = 'signed-out' | 'unprovisioned' | 'signed-in';

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
}

interface AppContextValue {
  session: Session;
  /** The email Supabase Auth verified, regardless of provisioning state. Null while signed out. */
  authEmail: string | null;
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

  /** Redirects to Google's OAuth consent screen; resolves with an error message only if the redirect itself couldn't start. */
  signInWithGoogle: () => Promise<string | null>;
  /** Redirects to Microsoft's OAuth consent screen; resolves with an error message only if the redirect itself couldn't start. */
  signInWithMicrosoft: () => Promise<string | null>;
  signOut: () => void;

  submitRequest: (input: NewRequestInput) => Promise<PTORequest>;
  approveRequest: (id: string, comment?: string) => void;
  rejectRequest: (id: string, rejectionReason: string) => void;
  /** Employee cancelling their own request (or an admin on their behalf). Keeps the record, just changes its status. */
  cancelRequest: (id: string, reason?: string) => void;

  createAccount: (input: NewAccountInput) => void;
  revokeAccess: (accountId: string) => void;
  restoreAccess: (accountId: string) => void;
  deleteAccount: (accountId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setAuthEmail(data.session?.user.email ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setAuthEmail(authSession?.user.email ?? null);
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // A real @valveman.com/@fswelsford.com sign-in isn't enough by itself —
  // the email must also match an Active, linked Account Management row.
  // `pto_accounts.employee_id` is nullable (`on delete set null`), so an
  // orphaned-but-Active row must not resolve to *some other* employee.
  const currentUser = useMemo(() => {
    if (!authEmail) return undefined;
    const account = accounts.find((a) => a.email.toLowerCase() === authEmail.toLowerCase());
    if (!account || account.status !== 'Active') return undefined;
    return employees.find((e) => e.id === account.employeeId);
  }, [authEmail, accounts, employees]);

  const balances = useMemo(() => computeBalances(employees, requests), [employees, requests]);
  const summary = useMemo(() => computeSummary(employees, requests), [employees, requests]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { hd: 'valveman.com' } },
    });
    return error?.message ?? null;
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: window.location.origin, queryParams: { domain_hint: 'fswelsford.com' } },
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(() => {
    void supabase.auth.signOut();
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
        const updated = await approveRequestRpc(id, currentUser?.name ?? 'Management', comment);
        if (!updated) return;
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        const notification = sendNotification(
          buildReviewedNotification(updated, employees, currentUser?.name ?? 'Management'),
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
        const updated = await rejectRequestRpc(id, currentUser?.name ?? 'Management', rejectionReason);
        if (!updated) return;
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        const notification = sendNotification(
          buildReviewedNotification(updated, employees, currentUser?.name ?? 'Management'),
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
        const updated = await cancelRequestRpc(id, currentUser?.name ?? 'Management', reason);
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
        });
        if (acctError) throw acctError;

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
            mustChangePassword: false,
            employeeId,
          },
          ...prev,
        ]);
      })().catch((err) => console.error('[PTO Tracker] failed to create account:', err));
    },
    [employees.length],
  );

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

  if (loading || !authChecked) {
    return <FullScreenNotice title="Loading Valveman PTO Tracker…" />;
  }
  if (loadError || !routing) {
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

  const session: Session = !authEmail ? 'signed-out' : currentUser ? 'signed-in' : 'unprovisioned';
  const isAdmin = currentUser?.appRole === 'Admin';
  const isManagement =
    isAdmin || currentUser?.email.toLowerCase() === routing.princesEmail.toLowerCase();

  const value: AppContextValue = {
    session,
    authEmail,
    // Only ever read by routes rendered while session === 'signed-in', where
    // currentUser is guaranteed resolved — see the `session` derivation above.
    currentUser: currentUser as Employee,
    role: currentUser?.appRole ?? 'Employee',
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
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
    submitRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    createAccount,
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
