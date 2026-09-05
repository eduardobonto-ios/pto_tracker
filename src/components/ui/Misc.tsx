import type { ReactNode } from 'react';
import { cn, initials } from '@/lib/utils';
import { departmentColor } from '@/lib/theme';

/** Circular initials avatar, tinted by department. */
export function Avatar({
  name,
  department,
  size = 'md',
  className,
}: {
  name: string;
  department?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-14 w-14 text-base',
  };
  const bg = department ? departmentColor[department] : undefined;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        'ring-2 ring-white',
        sizes[size],
        !bg && 'bg-brand-500',
        className,
      )}
      style={bg ? { background: `linear-gradient(160deg, ${bg}, ${bg}CC)` } : undefined}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** PTO usage bar. Turns amber near the limit and red once over-drawn. */
export function ProgressBar({
  value,
  className,
  showLabel,
}: {
  /** Percentage 0–100+; values above 100 render as an over-draw. */
  value: number;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(value, 100));
  const tone =
    value > 100
      ? 'from-danger-500 to-danger-600'
      : value >= 80
        ? 'from-warning-500 to-warning-600'
        : 'from-brand-400 to-brand-600';

  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slateish-100">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', tone)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slateish-500">
          <span>{value}% used</span>
          <span>{Math.max(0, 100 - value)}% left</span>
        </div>
      )}
    </div>
  );
}

/** Pill / segmented selector used for the duration picker and view toggles. */
export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap gap-1.5 rounded-xl border border-slateish-200 bg-slateish-50 p-1.5',
        className,
      )}
      role="group"
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              'rounded-lg font-semibold transition-all duration-150',
              size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-4 py-2 text-[13px]',
              active
                ? 'bg-gradient-to-b from-brand-400 to-brand-500 text-white shadow-brand-sm'
                : 'text-slateish-600 hover:bg-white hover:text-navy-800 hover:shadow-card',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Label/value row used in detail panels. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5', className)}>
      <dt className="w-40 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-slateish-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[13.5px] font-medium text-navy-800">{children}</dd>
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.08em] text-slateish-400',
        className,
      )}
    >
      {children}
    </h3>
  );
}
