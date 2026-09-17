import { ShieldAlert, UserX } from 'lucide-react';
import { LogoMark } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';

/**
 * Shown when Supabase Auth confirms a real @valveman.com/@fswelsford.com
 * sign-in, but the email doesn't match an Active, linked Account Management
 * row — i.e. authenticated, but not provisioned into the app. Distinct from
 * the login page: this person is a real identity, just not one Account
 * Management has granted access to (yet, or any more).
 */
export function AccessPendingPage() {
  const { authEmail, accounts, signOut } = useApp();
  const match = accounts.find((a) => a.email.toLowerCase() === authEmail?.toLowerCase());
  const revoked = match?.status === 'Revoked';

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-[480px]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <LogoMark className="h-10 w-10 text-navy-900" />
          <div className="leading-none">
            <p className="text-[15px] font-bold tracking-[0.02em] text-navy-900">VALVEMAN</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-600">
              PTO Tracker
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slateish-200/80 bg-white p-6 text-center shadow-card sm:p-7">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-warning-50 text-warning-600">
            {revoked ? <ShieldAlert size={20} /> : <UserX size={20} />}
          </div>
          <h1 className="mt-4 text-[17px] font-semibold text-navy-900">
            {revoked ? 'Access revoked' : 'No account yet'}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slateish-500">
            {revoked ? (
              <>
                Access for <span className="font-medium text-navy-800">{authEmail}</span> has
                been revoked. Contact an administrator if this is a mistake.
              </>
            ) : (
              <>
                <span className="font-medium text-navy-800">{authEmail}</span> isn't set up in
                the PTO Tracker yet. Ask an administrator to create your account in Account
                Management, then sign in again.
              </>
            )}
          </p>
        </div>

        <Button variant="secondary" block className="mt-5" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
