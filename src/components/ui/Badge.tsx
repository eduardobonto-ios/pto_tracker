import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slateish-100 text-slateish-700 ring-slateish-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  accent: 'bg-accent-100/70 text-accent-700 ring-accent-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  muted: 'bg-slateish-50 text-slateish-500 ring-slateish-200',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1',
        'text-[12px] font-semibold leading-none ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
