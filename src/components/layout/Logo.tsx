import { cn } from '@/lib/utils';

/**
 * Valveman suite mark — two droplet forms in brand blue and cyan, matching the
 * visual language of the Technical Playbook header.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-9 w-9', className)} fill="none" aria-hidden>
      <path
        d="M17 6c4.9 5.6 7.7 9.9 7.7 14A7.7 7.7 0 0 1 17 27.7 7.7 7.7 0 0 1 9.3 20C9.3 15.9 12.1 11.6 17 6Z"
        fill="url(#vm-blue)"
      />
      <path
        d="M33 15c4.1 4.7 6.4 8.3 6.4 11.8a6.4 6.4 0 1 1-12.8 0c0-3.5 2.3-7.1 6.4-11.8Z"
        fill="url(#vm-cyan)"
      />
      <path
        d="M10 40h28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".35"
      />
      <defs>
        <linearGradient id="vm-blue" x1="9" y1="6" x2="27" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6BAAE9" />
          <stop offset="1" stopColor="#2B589A" />
        </linearGradient>
        <linearGradient id="vm-cyan" x1="27" y1="15" x2="41" y2="33" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6FDDFB" />
          <stop offset="1" stopColor="#0387B5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoLockup({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark className="h-10 w-10 text-white" />
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="text-[15px] font-bold tracking-[0.02em] text-white">VALVEMAN</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-300">
            PTO Tracker
          </div>
        </div>
      )}
    </div>
  );
}
