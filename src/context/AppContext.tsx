import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { employees as seedEmployees, ptoRequests as seedRequests, userAccounts as seedAccounts } from '@/data';
import { computeBalances, computeSummary } from '@/lib/pto';
import { PRINCES_EMAIL } from '@/lib/theme';
import { todayISO, uid } from '@/lib/utils';
import type {
  AppRole,
  Employee,
  PTORequest,
  UserAccount,
} from '@/types';

/**
 * Single in-memory store for the prototype.
 *
 * PHASE 2 NOTE: every mutator below is a pure local-state update. When Supabase
 * is wired up, replace the bodies with the corresponding queries/RPCs and keep
 * the signatures — no component changes should be required.
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
  balances: ReturnType<typeof computeBalances>;
  summary: ReturnType<typeof computeSummary>;

  /** The last request submitted in this session, used by the email preview. */
  lastSubmittedId: string | null;

  signIn: (email: string) => void;
  signOut: () => void;
  completeFirstLogin: () => void;
  /** Preview-only user switcher so both roles can be demoed. */
  switchUser: (employeeId: string) => void;

  submitRequest: (input: NewRequestInput) => PTORequest;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string, rejectionReason: string) => void;

  createAccount: (input: NewAccountInput) => void;
  resetPassword: (accountId: string) => string;
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
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees);
  const [requests, setRequests] = useState<PTORequest[]>(seedRequests);
  const [accounts, setAccounts] = useState<UserAccount[]>(seedAccounts);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  const currentUser = useMemo(
    () => employees.find((e) => e.id === currentUserId) ?? employees[0],
    [employees, currentUserId],
  );

  const balances = useMemo(() => computeBalances(employees, requests), [employees, requests]);
  const summary = useMemo(() => computeSummary(employees, requests), [employees, requests]);

  const signIn = useCallback(
    (email: string) => {
      const match = employees.find(
        (e) => e.email.toLowerCase() === email.trim().toLowerCase(),
      );
      const account = accounts.find(
        (a) => a.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (match) setCurrentUserId(match.id);
      // Mock auth: any password is accepted. Accounts that have never completed
      // the forced change are routed through the first-login screen.
      setSession(account?.mustChangePassword ? 'must-change-password' : 'signed-in');
    },
    [employees, accounts],
  );

  const signOut = useCallback(() => setSession('signed-out'), []);

  const completeFirstLogin = useCallback(() => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.employeeId === currentUserId ? { ...a, mustChangePassword: false } : a,
      ),
    );
    setSession('signed-in');
  }, [currentUserId]);

  const switchUser = useCallback((employeeId: string) => {
    setCurrentUserId(employeeId);
  }, []);

  const submitRequest = useCallback(
    (input: NewRequestInput) => {
      const status = input.status ?? 'Pending';
      const now = new Date().toISOString();
      const seq = String(requests.length + 1).padStart(3, '0');
      const request: PTORequest = {
        id: `PTO-2026-${seq}`,
        employeeId: input.employeeId,
        requestDate: todayISO(),
        leaveType: input.leaveType,
        startDate: input.startDate,
        endDate: input.endDate || input.startDate,
        durationType: input.durationType,
        startTime: input.startTime,
        endTime: input.endTime,
        totalHours: input.totalHours,
        days: input.days,
        status,
        payStatus: input.payStatus,
        coverage: input.coverage,
        reason: input.reason,
        notes: `${input.leaveType} — ${input.reason || 'No additional detail provided'}`,
        timeline: [
          {
            id: uid('tl'),
            label: 'Submitted',
            at: now,
            actor: employees.find((e) => e.id === input.employeeId)?.name ?? 'Employee',
            note: 'Request filed through the PTO Tracker.',
          },
        ],
      };
      setRequests((prev) => [request, ...prev]);
      setLastSubmittedId(request.id);
      return request;
    },
    [requests.length, employees],
  );

  const approveRequest = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'Approved',
                reviewedBy: currentUser.name,
                reviewedAt: now,
                rejectionReason: undefined,
                timeline: [
                  ...r.timeline,
                  {
                    id: uid('tl'),
                    label: 'Approved' as const,
                    at: now,
                    actor: currentUser.name,
                    note: 'Coverage confirmed and balance checked.',
                  },
                ],
              }
            : r,
        ),
      );
    },
    [currentUser.name],
  );

  const rejectRequest = useCallback(
    (id: string, rejectionReason: string) => {
      const now = new Date().toISOString();
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'Rejected',
                reviewedBy: currentUser.name,
                reviewedAt: now,
                rejectionReason,
                timeline: [
                  ...r.timeline,
                  {
                    id: uid('tl'),
                    label: 'Rejected' as const,
                    at: now,
                    actor: currentUser.name,
                    note: rejectionReason,
                  },
                ],
              }
            : r,
        ),
      );
    },
    [currentUser.name],
  );

  const createAccount = useCallback((input: NewAccountInput) => {
    const employeeId = uid('emp');
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
        id: uid('acct'),
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
  }, []);

  const resetPassword = useCallback((accountId: string) => {
    // Phase 2: this calls the Supabase admin API and returns the new temp value.
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, mustChangePassword: true } : a)),
    );
    return 'reset';
  }, []);

  const revokeAccess = useCallback((accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, status: 'Revoked' } : a)),
    );
  }, []);

  const restoreAccess = useCallback((accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, status: 'Active' } : a)),
    );
  }, []);

  const deleteAccount = useCallback((accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
  }, []);

  const isAdmin = currentUser.appRole === 'Admin';
  const isManagement = isAdmin || currentUser.email.toLowerCase() === PRINCES_EMAIL;

  const value: AppContextValue = {
    session,
    currentUser,
    role: currentUser.appRole,
    isAdmin,
    isManagement,
    employees,
    requests,
    accounts,
    balances,
    summary,
    lastSubmittedId,
    signIn,
    signOut,
    completeFirstLogin,
    switchUser,
    submitRequest,
    approveRequest,
    rejectRequest,
    createAccount,
    resetPassword,
    revokeAccess,
    restoreAccess,
    deleteAccount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
