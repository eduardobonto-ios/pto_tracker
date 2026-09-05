import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

/**
 * Primary actions use the Valveman light-blue treatment shared with the
 * Technical Playbook. Green and red are reserved for semantic approve/reject
 * and destructive actions only.
 */
const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand-400 to-brand-500 text-white shadow-brand-sm ' +
    'hover:from-brand-500 hover:to-brand-600 active:from-brand-600 active:to-brand-700 ' +
    'disabled:from-brand-200 disabled:to-brand-300 disabled:shadow-none',
  secondary:
    'bg-white text-navy-800 border border-slateish-200 shadow-card ' +
    'hover:bg-slateish-50 hover:border-slateish-300 active:bg-slateish-100',
  ghost: 'bg-transparent text-slateish-600 hover:bg-slateish-100 hover:text-navy-800',
  subtle: 'bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100',
  success:
    'bg-gradient-to-b from-success-500 to-success-600 text-white shadow-sm ' +
    'hover:from-success-600 hover:to-success-700',
  danger:
    'bg-white text-danger-600 border border-danger-200 hover:bg-danger-50 hover:border-danger-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', block, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold',
        'transition-all duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  );
});
