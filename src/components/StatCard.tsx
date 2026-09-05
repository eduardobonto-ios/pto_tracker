import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<Tone, { icon: string; glow: string }> = {
  brand: { icon: 'bg-brand-50 text-brand-600', glow: 'from-brand-100/70' },
  accent: { icon: 'bg-accent-100/60 text-accent-600', glow: 'from-accent-100/60' },
  success: { icon: 'bg-success-50 text-success-600', glow: 'from-success-100/60' },
  warning: { icon: 'bg-warning-50 text-warning-600', glow: 'from-warning-100/60' },
  danger: { icon: 'bg-danger-50 text-danger-600', glow: 'from-danger-100/60' },
  neutral: { icon: 'bg-slateish-100 text-slateish-600', glow: 'from-slateish-100/70' },
};

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone = 'brand',
  hint,
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slateish-200/80 bg-white p-5',
        'shadow-card transition-shadow duration-200 hover:shadow-card-hover',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br to-transparent opacity-70',
          t.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slateish-500">
            {label}
          </p>
          <p className="mt-2 flex items-baseline gap-1 text-[28px] font-bold leading-none tracking-tight text-navy-900">
            {value}
            {suffix && (
              <span className="text-[13px] font-semibold text-slateish-400">{suffix}</span>
            )}
          </p>
          {hint && <p className="mt-2 text-[12px] text-slateish-500">{hint}</p>}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            t.icon,
          )}
        >
          <Icon size={19} strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}
