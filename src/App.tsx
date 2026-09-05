import { Navigate, Route, Routes } from 'react-router-dom';
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
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { session } = useApp();

  if (session === 'signed-out') return <LoginPage />;
  if (session === 'must-change-password') return <FirstLoginPage />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/file-a-leave" element={<FileLeavePage />} />
      <Route path="/my-pto" element={<MyPTOPage />} />
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
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
