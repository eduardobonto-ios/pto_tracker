import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-xl border border-slateish-200 bg-white px-3.5 text-sm text-navy-900 ' +
  'placeholder:text-slateish-400 shadow-[0_1px_2px_rgba(15,30,51,0.03)] ' +
  'transition-colors duration-150 ' +
  'hover:border-slateish-300 ' +
  'focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 ' +
  'disabled:cursor-not-allowed disabled:bg-slateish-50 disabled:text-slateish-500';

export function Label({
  children,
  required,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slateish-500"
      >
        {children}
        {required && <span className="ml-1 text-danger-500">*</span>}
      </label>
      {hint && <span className="text-[11px] text-slateish-400">{hint}</span>}
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  help,
  error,
  htmlFor,
  className,
  children,
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {help && !error && <p className="mt-1.5 text-[12px] text-slateish-400">{help}</p>}
      {error && <p className="mt-1.5 text-[12px] font-medium text-danger-600">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, 'h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(control, 'resize-y py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(control, 'h-11 appearance-none bg-white pr-10', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slateish-400"
        />
      </div>
    );
  },
);
