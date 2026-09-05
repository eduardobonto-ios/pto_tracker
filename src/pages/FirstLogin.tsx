import { LogoMark } from '@/components/layout/Logo';
import { PasswordChangeForm } from '@/components/PasswordChangeForm';
import { Avatar } from '@/components/ui/Misc';
import { useApp } from '@/context/AppContext';

/** Forced first-login password change, shown before the app becomes available. */
export function FirstLoginPage() {
  const { currentUser, completeFirstLogin, signOut } = useApp();

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

        <div className="rounded-2xl border border-slateish-200/80 bg-white p-6 shadow-card sm:p-7">
          <div className="mb-6 flex items-center gap-3 border-b border-slateish-200/70 pb-5">
            <Avatar
              name={currentUser.name}
              department={currentUser.department}
              size="md"
            />
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold text-navy-900">
                Welcome, {currentUser.name.split(' ')[0]}
              </h1>
              <p className="truncate text-[12.5px] text-slateish-500">{currentUser.email}</p>
            </div>
          </div>

          <PasswordChangeForm onDone={completeFirstLogin} />
        </div>

        <button
          onClick={signOut}
          className="mx-auto mt-5 block text-[12.5px] font-medium text-slateish-500 hover:text-navy-800"
        >
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}
