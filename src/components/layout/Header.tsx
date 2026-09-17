import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Mail, Menu, Repeat2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/ui/Misc';
import { Select } from '@/components/ui/Field';
import { cn } from '@/lib/utils';

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
  const { currentUser, employees, switchUser, signOut, summary, isManagement } = useApp();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

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

        {/* Preview-only identity switcher. Replaced by real auth in phase 2. */}
        <div className="relative">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors',
              switcherOpen ? 'bg-slateish-100' : 'hover:bg-slateish-100',
            )}
          >
            <Avatar name={currentUser.name} department={currentUser.department} size="sm" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[150px] truncate text-[13px] font-semibold text-navy-900">
                {currentUser.name}
              </span>
              <span className="block text-[11.5px] text-slateish-500">
                {currentUser.appRole} · {currentUser.jobTitle}
              </span>
            </span>
            <ChevronDown size={15} className="text-slateish-400" />
          </button>

          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-[300px] animate-scale-in rounded-2xl border border-slateish-200 bg-white p-4 shadow-pop">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar
                    name={currentUser.name}
                    department={currentUser.department}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {currentUser.name}
                    </p>
                    <p className="truncate text-[12px] text-slateish-500">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    <Repeat2 size={13} /> Preview as
                  </p>
                  <Select
                    value={currentUser.id}
                    onChange={(e) => switchUser(e.target.value)}
                    className="h-9 bg-white text-[13px]"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} — {e.appRole}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-2 text-[11px] leading-relaxed text-slateish-500">
                    Prototype only. Switching identity changes the navigation and
                    permissions you see.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    signOut();
                  }}
                  className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-danger-600 transition-colors hover:bg-danger-50"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={signOut}
          aria-label="Sign out"
          className="hidden rounded-lg p-2 text-slateish-400 transition-colors hover:bg-slateish-100 hover:text-danger-600 lg:block"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
