import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Table chrome matching the Technical Playbook Account Management table:
 * rounded white container, very light blue-gray header, thin separators.
 */
export function TableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slateish-200/80 bg-white shadow-card',
        className,
      )}
    >
      <div className="scroll-slim overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <table className={cn('w-full min-w-[720px] border-collapse text-sm', className)}>
      {children}
    </table>
  );
}

export function Th({
  className,
  children,
  align = 'left',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap bg-tablehead px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slateish-500',
        'border-b border-slateish-200/80 first:pl-5 last:pr-5',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  align = 'left',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-middle text-[13.5px] text-slateish-600 first:pl-5 last:pr-5',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-slateish-200/60 last:border-b-0',
        onClick && 'cursor-pointer transition-colors hover:bg-brand-50/50',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  colSpan,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-14 text-center">
        {icon && (
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slateish-100 text-slateish-400">
            {icon}
          </div>
        )}
        <p className="text-sm font-semibold text-navy-800">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-slateish-500">{description}</p>
        )}
      </td>
    </tr>
  );
}
