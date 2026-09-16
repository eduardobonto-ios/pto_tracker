import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import { AppProvider } from '@/context/AppContext';
import { EmailActionPage } from '@/pages/EmailAction';
import './index.css';

/**
 * `/respond` (the email approve/reject landing page) is public and
 * unauthenticated, so it's kept outside `<AppProvider>` entirely — it must
 * not depend on the app's employees/accounts/requests being loaded first.
 */
function Root() {
  const location = useLocation();
  if (location.pathname === '/respond') return <EmailActionPage />;
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
);
