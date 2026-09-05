import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  interactive,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slateish-200/80 bg-white shadow-card',
        interactive && 'transition-shadow duration-200 hover:shadow-card-hover',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-slateish-200/70 px-5 py-4 sm:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-accent-500">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-navy-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-slateish-500">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('px-5 py-5 sm:px-6', className)}>{children}</div>;
}
