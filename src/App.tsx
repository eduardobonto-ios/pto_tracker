import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { LoginPage } from '@/pages/Login';
import { FirstLoginPage } from '@/pages/FirstLogin';
import { DashboardPage } from '@/pages/Dashboard';
import { FileLeavePage } from '@/pages/FileLeave';
import { MyPTOPage } from '@/pages/MyPTO';
import { PTOCalendarPage } from '@/pages/PTOCalendar';
import { PTORequestsPage } from '@/pages/PTORequests';
import { RequestDetailPage } from '@/pages/RequestDetailPage';
import { EmployeesPage } from '@/pages/Employees';
import { AccountManagementPage } from '@/pages/AccountManagement';
import { EmailPreviewPage } from '@/pages/EmailPreviewPage';

/** Admin-only route guard. Replaced by Supabase RLS + real roles in phase 2. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useApp();
  const landing = useLandingPath();
  return isAdmin ? <>{children}</> : <Navigate to={landing} replace />;
}

/** Management-only route guard (Admins + Princes Aloha Gomez). */
function ManagementRoute({ children }: { children: React.ReactNode }) {
  const { isManagement } = useApp();
  const landing = useLandingPath();
  return isManagement ? <>{children}</> : <Navigate to={landing} replace />;
}

/**
 * Post-login landing route. Admins and Princes Aloha Gomez (the team
 * manager) land on PTO Requests; everyone else lands on File a Leave.
 * Dashboard is intentionally no longer linked here — its route/source
 * below is kept for later, just not used as a landing target.
 */
function useLandingPath() {
  const { isManagement } = useApp();
  return isManagement ? '/requests' : '/file-a-leave';
}

export default function App() {
  const { session } = useApp();
  const landing = useLandingPath();
  const navigate = useNavigate();
  const prevSession = useRef(session);

  // BrowserRouter keeps the last URL across logout/login (logging out just
  // swaps in LoginPage without changing the URL), so re-entering "signed-in"
  // must explicitly send the user to their landing page rather than relying
  // on whatever route the browser was last showing.
  useEffect(() => {
    if (prevSession.current !== 'signed-in' && session === 'signed-in') {
      navigate(landing, { replace: true });
    }
    prevSession.current = session;
  }, [session, landing, navigate]);

  if (session === 'signed-out') return <LoginPage />;
  if (session === 'must-change-password') return <FirstLoginPage />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={landing} replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/file-a-leave" element={<FileLeavePage />} />
      <Route
        path="/my-pto"
        element={
          <ManagementRoute>
            <MyPTOPage />
          </ManagementRoute>
        }
      />
      <Route path="/calendar" element={<PTOCalendarPage />} />
      <Route path="/requests" element={<PTORequestsPage />} />
      <Route path="/requests/:id" element={<RequestDetailPage />} />
      <Route
        path="/employees"
        element={
          <AdminRoute>
            <EmployeesPage />
          </AdminRoute>
        }
      />
      <Route
        path="/accounts"
        element={
          <AdminRoute>
            <AccountManagementPage />
          </AdminRoute>
        }
      />
      <Route path="/email-preview" element={<EmailPreviewPage />} />
      <Route path="*" element={<Navigate to={landing} replace />} />
    </Routes>
  );
}
