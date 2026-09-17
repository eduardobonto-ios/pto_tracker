import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoMark, LogoLockup } from '@/components/layout/Logo';
import { useApp } from '@/context/AppContext';

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

function MicrosoftGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  );
}

export function LoginPage() {
  const { signInWithGoogle, signInWithMicrosoft } = useApp();
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'google' | 'microsoft' | null>(null);

  // A cancelled/failed OAuth round trip redirects back with
  // ?error=...&error_description=... instead of landing in a signed-in
  // state — surface it, then clean the URL so a refresh doesn't re-show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.slice(1));
    const description = params.get('error_description') || params.get('error');
    if (description) {
      setError(description.replace(/\+/g, ' '));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  async function handle(provider: 'google' | 'microsoft') {
    setError('');
    setPending(provider);
    const message =
      provider === 'google' ? await signInWithGoogle() : await signInWithMicrosoft();
    if (message) setError(message);
    setPending(null);
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[radial-gradient(130%_100%_at_0%_0%,#1B2C48_0%,#0D1729_55%,#080F1C_100%)] p-12 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative">
          <LogoLockup className="h-16" />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[30px] font-bold leading-[1.2] tracking-tight text-white">
            Time off, tracked properly.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-navy-200">
            File leave, check your balance and see who is out — without opening a
            spreadsheet. Part of the Valveman internal software suite.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Live PTO balances with half-day accuracy',
              'One-tap approvals for Management',
              'Team availability at a glance',
            ].map((line) => (
              <li key={line} className="flex items-center gap-3 text-[13.5px] text-navy-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
                  <ShieldCheck size={13} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11.5px] text-navy-400">
          © {new Date().getFullYear()} Valveman · F.S. Welsford · Internal use only
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-1 items-center justify-center bg-canvas px-5 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-10 w-10 text-navy-900" />
            <div className="leading-none">
              <p className="text-[15px] font-bold tracking-[0.02em] text-navy-900">VALVEMAN</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-600">
                PTO Tracker
              </p>
            </div>
          </div>

          <h1 className="text-[26px] font-bold tracking-tight text-navy-900">Sign in</h1>
          <p className="mt-1.5 text-[14px] text-slateish-500">
            Sign in with your Valveman or F.S. Welsford work account.
          </p>

          <div className="mt-7 space-y-3">
            <Button
              variant="secondary"
              size="lg"
              block
              disabled={pending !== null}
              onClick={() => handle('google')}
            >
              <GoogleGlyph />
              {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              block
              disabled={pending !== null}
              onClick={() => handle('microsoft')}
            >
              <MicrosoftGlyph />
              {pending === 'microsoft' ? 'Redirecting…' : 'Continue with Microsoft'}
            </Button>
          </div>

          {error && (
            <p className="mt-5 rounded-xl border border-warning-200 bg-warning-50 px-3.5 py-2.5 text-[12.5px] font-medium text-warning-700">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-[11.5px] text-slateish-400">
            Invite-only access — an administrator must create your account before you can sign
            in.
          </p>
        </div>
      </div>
    </div>
  );
}
