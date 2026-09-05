import { useState } from 'react';
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { LogoMark } from '@/components/layout/Logo';
import { useApp } from '@/context/AppContext';

export function LoginPage() {
  const { signIn, employees } = useApp();
  const [email, setEmail] = useState('princes@valveman.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Enter your work email and password to continue.');
      return;
    }
    setError('');
    signIn(email);
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[radial-gradient(130%_100%_at_0%_0%,#1B2C48_0%,#0D1729_55%,#080F1C_100%)] p-12 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <LogoMark className="h-11 w-11 text-white" />
          <div className="leading-none">
            <p className="text-[17px] font-bold tracking-[0.02em] text-white">VALVEMAN</p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-300">
              PTO Tracker
            </p>
          </div>
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

      {/* Form panel */}
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
            Use the work email your administrator set up for you.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <Field label="Work email" required>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@valveman.com"
                  className="pl-9"
                  autoComplete="username"
                />
              </div>
            </Field>

            <Field
              label="Password"
              required
              hint={
                <button
                  type="button"
                  className="font-semibold text-accent-600 hover:text-accent-500"
                  onClick={() =>
                    setError(
                      'Password recovery is not wired up in this prototype — ask an administrator to reset your password.',
                    )
                  }
                >
                  Forgot password?
                </button>
              }
            >
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </Field>

            {error && (
              <p className="rounded-xl border border-warning-200 bg-warning-50 px-3.5 py-2.5 text-[12.5px] font-medium text-warning-700">
                {error}
              </p>
            )}

            <Button type="submit" block size="lg">
              Sign In <ArrowRight size={16} />
            </Button>
          </form>

          {/* Prototype helper — removed once real auth lands. */}
          <div className="mt-7 rounded-2xl border border-slateish-200 bg-white p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slateish-400">
              Prototype access
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slateish-500">
              Authentication is mocked — any password works. Sign in as an admin with{' '}
              <button
                type="button"
                onClick={() => setEmail('princes@valveman.com')}
                className="font-semibold text-accent-600 hover:underline"
              >
                princes@valveman.com
              </button>
              , or as an employee with{' '}
              <button
                type="button"
                onClick={() => setEmail('josh@valveman.com')}
                className="font-semibold text-accent-600 hover:underline"
              >
                josh@valveman.com
              </button>
              . Try{' '}
              <button
                type="button"
                onClick={() => setEmail('amr@valveman.com')}
                className="font-semibold text-accent-600 hover:underline"
              >
                amr@valveman.com
              </button>{' '}
              to see the forced first-login screen. ({employees.length} accounts seeded.)
            </p>
          </div>

          <p className="mt-6 text-center text-[11.5px] text-slateish-400">
            Invite-only access. Only an administrator can create an account.
          </p>
        </div>
      </div>
    </div>
  );
}
