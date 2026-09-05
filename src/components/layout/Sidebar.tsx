import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { LogoLockup } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  badge?: number;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin, summary } = useApp();

  const items: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/file-a-leave', label: 'File a Leave', icon: FilePlus2 },
    { to: '/my-pto', label: 'My PTO', icon: UserRound },
    { to: '/calendar', label: 'PTO Calendar', icon: CalendarDays },
    {
      to: '/requests',
      label: 'PTO Requests',
      icon: ClipboardList,
      badge: summary.pendingRequests || undefined,
    },
    { to: '/employees', label: 'Employees', icon: Users, adminOnly: true },
    { to: '/accounts', label: 'Account Management', icon: UserCog, adminOnly: true },
    { to: '/email-preview', label: 'Email Notification', icon: Mail },
  ];

  const visible = items.filter((i) => !i.adminOnly || isAdmin);

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {visible.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium',
              'transition-all duration-150',
              isActive
                ? 'bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]'
                : 'text-navy-200/80 hover:bg-white/[0.05] hover:text-white',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              <Icon
                size={18}
                strokeWidth={2}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-accent-300' : 'text-navy-300 group-hover:text-accent-300',
                )}
              />
              <span className="truncate">{label}</span>
              {badge ? (
                <span className="ml-auto rounded-full bg-warning-500/20 px-2 py-0.5 text-[11px] font-bold text-warning-200 ring-1 ring-inset ring-warning-500/30">
                  {badge}
                </span>
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function SidebarFooter() {
  return (
    <div className="px-3 pb-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <LifeBuoy size={16} className="text-accent-300" />
          Need a hand?
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-navy-300">
          Questions about your balance or the 6-month eligibility rule? Reach out to
          Management.
        </p>
        <a
          href="mailto:princes@valveman.com"
          className="mt-3 inline-flex text-[12px] font-semibold text-accent-300 hover:text-accent-200"
        >
          princes@valveman.com
        </a>
      </div>
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'flex h-full w-[268px] flex-col bg-navy-900',
        'bg-[radial-gradient(120%_60%_at_0%_0%,#152238_0%,#0D1729_55%,#0A1322_100%)]',
        className,
      )}
    >
      <div className="px-5 py-5">
        <LogoLockup />
      </div>
      <div className="mx-3 h-px bg-white/[0.07]" />
      <div className="scroll-slim flex min-h-0 flex-1 flex-col overflow-y-auto">
        <SidebarNav />
        <div className="mt-auto">
          <SidebarFooter />
        </div>
      </div>
    </aside>
  );
}
