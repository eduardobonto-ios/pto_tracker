import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-navy-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col animate-scale-in',
          'rounded-t-2xl bg-white shadow-pop sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-start gap-3 border-b border-slateish-200/70 px-5 py-4 sm:px-6">
          {icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-accent-500">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-slateish-500">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg p-1.5 text-slateish-400 transition-colors hover:bg-slateish-100 hover:text-navy-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slateish-200/70 bg-slateish-50/60 px-5 py-4 sm:rounded-b-2xl sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Right-hand slide-over used for PTO request details. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-fade-in bg-navy-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 flex h-full w-full max-w-xl animate-slide-in-right flex-col bg-canvas shadow-pop"
      >
        <div className="flex items-start gap-3 border-b border-slateish-200 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[13px] text-slateish-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg p-1.5 text-slateish-400 transition-colors hover:bg-slateish-100 hover:text-navy-800"
          >
            <X size={18} />
          </button>
        </div>
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slateish-200 bg-white px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}
