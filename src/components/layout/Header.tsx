import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, Menu } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/ui/Misc';

export function Header({
  title,
  subtitle,
  onOpenNav,
  actions,
}: {
  title: string;
  subtitle?: string;
  onOpenNav: () => void;
  actions?: React.ReactNode;
}) {
  const { currentUser, signOut, summary, isManagement } = useApp();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-slateish-200/80 bg-white/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          onClick={onOpenNav}
          className="-ml-1 rounded-lg p-2 text-slateish-500 transition-colors hover:bg-slateish-100 hover:text-navy-800 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold leading-tight text-navy-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12.5px] text-slateish-500">{subtitle}</p>
          )}
        </div>

        {actions}

        <div className="mx-1 hidden h-8 w-px bg-slateish-200 sm:block" />

        {/* Notifications — links to the email notification preview. Management only: it's a queue of pending approvals. */}
        {isManagement && (
          <button
            onClick={() => navigate('/email-preview')}
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-slateish-500 transition-colors hover:bg-slateish-100 hover:text-navy-800"
          >
            <Mail size={19} />
            {summary.pendingRequests ? (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {summary.pendingRequests}
              </span>
            ) : null}
          </button>
        )}

        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <Avatar name={currentUser.name} department={currentUser.department} size="sm" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[150px] truncate text-[13px] font-semibold text-navy-900">
              {currentUser.name}
            </span>
            <span className="block text-[11.5px] text-slateish-500">
              {currentUser.appRole} · {currentUser.jobTitle}
            </span>
          </span>
        </div>

        <button
          onClick={signOut}
          aria-label="Sign out"
          className="rounded-lg p-2 text-slateish-400 transition-colors hover:bg-slateish-100 hover:text-danger-600"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
