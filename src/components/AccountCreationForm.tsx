import { useState } from 'react';
import { Check, Copy, KeyRound, RefreshCw, UserPlus } from 'lucide-react';
import { Field, Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { generateTempPassword, todayISO } from '@/lib/utils';
import { DEPARTMENTS, type AppRole, type Department } from '@/types';

const JOB_TITLE_SUGGESTIONS = [
  'Territory Manager',
  'Executive Assistant',
  'Team Manager',
  'Order Processing Specialist',
  'Order Processing Lead',
  'Applications Engineer',
  'Invoicing Specialist',
  'Vendor Success Specialist',
  'Technical Admin Assistant',
];

/**
 * All state behind the account creation form, shared by the fields and the
 * submit button so the button can live in a modal's sticky footer instead
 * of at the bottom of a long scrolling form.
 */
export function useAccountCreationForm() {
  const { createAccount, accounts } = useApp();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [appRole, setAppRole] = useState<AppRole>('Employee');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState<Department>('Operations');
  const [hireDate, setHireDate] = useState(todayISO());
  const [allowance, setAllowance] = useState('5');
  const [password, setPassword] = useState(() => generateTempPassword());
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<string | null>(null);

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is unavailable in some embedded contexts — fail quietly.
    }
  }

  function submit() {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid work email.';
    else if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase()))
      e.email = 'An account with this email already exists.';
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!hireDate) e.hireDate = 'A hire date is required — it drives PTO eligibility.';
    if (!allowance || Number(allowance) < 0) e.allowance = 'Enter a valid number of days.';
    setErrors(e);
    if (Object.keys(e).length) return;

    createAccount({
      email: email.trim(),
      fullName: fullName.trim(),
      appRole,
      jobTitle: jobTitle.trim(),
      department,
      hireDate,
      annualPtoAllowance: Number(allowance),
      tempPassword: password,
    });

    setCreated(email.trim());
    setEmail('');
    setFullName('');
    setJobTitle('');
    setAppRole('Employee');
    setDepartment('Operations');
    setHireDate(todayISO());
    setAllowance('5');
    setPassword(generateTempPassword());
    setTimeout(() => setCreated(null), 5000);
  }

  return {
    email,
    setEmail,
    fullName,
    setFullName,
    appRole,
    setAppRole,
    jobTitle,
    setJobTitle,
    department,
    setDepartment,
    hireDate,
    setHireDate,
    allowance,
    setAllowance,
    password,
    setPassword,
    copied,
    copyPassword,
    errors,
    created,
    submit,
  };
}

type AccountCreationFormState = ReturnType<typeof useAccountCreationForm>;

/** The field inputs only — no card wrapper and no submit button. */
export function AccountCreationFields({ f }: { f: AccountCreationFormState }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Work email" required error={f.errors.email}>
          <Input
            type="email"
            value={f.email}
            onChange={(e) => f.setEmail(e.target.value)}
            placeholder="name@valveman.com"
            autoComplete="off"
          />
        </Field>
        <Field label="Full name" required error={f.errors.fullName}>
          <Input
            value={f.fullName}
            onChange={(e) => f.setFullName(e.target.value)}
            placeholder="First and last name"
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Application role" required help="Admins can review requests and manage accounts.">
          <Select value={f.appRole} onChange={(e) => f.setAppRole(e.target.value as AppRole)}>
            <option value="Employee">Employee</option>
            <option value="Admin">Admin</option>
          </Select>
        </Field>
        <Field label="Job title / employee role">
          <Input
            list="job-title-suggestions"
            value={f.jobTitle}
            onChange={(e) => f.setJobTitle(e.target.value)}
            placeholder="e.g. Territory Manager"
          />
          <datalist id="job-title-suggestions">
            {JOB_TITLE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Department">
          <Select value={f.department} onChange={(e) => f.setDepartment(e.target.value as Department)}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hire date" required error={f.errors.hireDate} help="PTO unlocks 6 months later.">
          <Input type="date" value={f.hireDate} onChange={(e) => f.setHireDate(e.target.value)} />
        </Field>
        <Field
          label="Annual PTO allowance (legacy)"
          required
          error={f.errors.allowance}
          help="PTO balances are now calculated automatically from Hire Date — this value is kept for record-keeping only and no longer drives the balance."
        >
          <Input
            type="number"
            min="0"
            step="0.5"
            value={f.allowance}
            onChange={(e) => f.setAllowance(e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Temporary password"
        help="No email is sent. Copy this and share it with the employee directly — they are forced to set their own password on first login."
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateish-400"
            />
            <Input
              value={f.password}
              onChange={(e) => f.setPassword(e.target.value)}
              className="pl-9 font-mono tracking-wide"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => f.setPassword(generateTempPassword())}
            aria-label="Generate a new password"
            className="w-11 px-0"
          >
            <RefreshCw size={16} className="text-accent-500" />
          </Button>
          <Button
            variant="secondary"
            onClick={f.copyPassword}
            aria-label="Copy password"
            className="w-11 px-0"
          >
            {f.copied ? (
              <Check size={16} className="text-success-600" />
            ) : (
              <Copy size={16} className="text-accent-500" />
            )}
          </Button>
        </div>
      </Field>

      {f.created && (
        <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-[13px] font-medium text-success-700">
          <Check size={16} /> Account created for {f.created}. Share the temporary password
          with them directly.
        </div>
      )}
    </div>
  );
}

/** The submit button — kept separate so a modal can pin it in its sticky footer. */
export function AccountCreationSubmitAction({ f }: { f: AccountCreationFormState }) {
  return (
    <Button onClick={f.submit}>
      <UserPlus size={16} /> Create Account
    </Button>
  );
}
