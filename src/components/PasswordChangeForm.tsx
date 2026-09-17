import { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { cn } from '@/lib/utils';

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 10 characters', test: (v) => v.length >= 10 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /\d/.test(v) },
];

/** Forced first-login password change. Frontend-only — nothing is persisted. */
export function PasswordChangeForm({ onDone }: { onDone: () => void }) {
  const [temp, setTemp] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passed = useMemo(() => RULES.map((r) => r.test(next)), [next]);
  const strength = passed.filter(Boolean).length;

  function submit() {
    const e: Record<string, string> = {};
    if (!temp) e.temp = 'Enter the temporary password you were given.';
    if (strength < RULES.length) e.next = 'Your new password does not meet all requirements.';
    if (next !== confirm) e.confirm = 'The two passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length === 0) onDone();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/70 p-4">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent-600" />
        <p className="text-[13px] leading-relaxed text-brand-800">
          For security, you must create a new password before continuing.
        </p>
      </div>

      <Field label="Temporary password" required error={errors.temp}>
        <div className="relative">
          <Lock
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
          />
          <Input
            type={show ? 'text' : 'password'}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="The password your administrator shared"
            className="pl-9"
          />
        </div>
      </Field>

      <Field label="New password" required error={errors.next}>
        <div className="relative">
          <Lock
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
          />
          <Input
            type={show ? 'text' : 'password'}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Create a strong password"
            className="pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide passwords' : 'Show passwords'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slateish-400 hover:text-navy-700"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <div className="rounded-xl border border-slateish-200 bg-slateish-50 p-3.5">
        <div className="mb-2.5 flex gap-1">
          {RULES.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                i < strength
                  ? strength === RULES.length
                    ? 'bg-success-500'
                    : 'bg-brand-400'
                  : 'bg-slateish-200',
              )}
            />
          ))}
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {RULES.map((r, i) => (
            <li
              key={r.label}
              className={cn(
                'flex items-center gap-1.5 text-[12px]',
                passed[i] ? 'font-medium text-success-700' : 'text-slateish-500',
              )}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold text-white',
                  passed[i] ? 'bg-success-500' : 'bg-slateish-300',
                )}
              >
                ✓
              </span>
              {r.label}
            </li>
          ))}
        </ul>
      </div>

      <Field label="Confirm new password" required error={errors.confirm}>
        <div className="relative">
          <Lock
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
          />
          <Input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your new password"
            className="pl-9"
          />
        </div>
      </Field>

      <Button block size="lg" onClick={submit}>
        Update Password
      </Button>
    </div>
  );
}
