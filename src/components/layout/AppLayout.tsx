import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Sidebar, SidebarFooter, SidebarNav } from './Sidebar';
import { Header } from './Header';
import { LogoLockup } from './Logo';

export function AppLayout({
  title,
  subtitle,
  actions,
  children,
  fillHeight,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Locks the page to the viewport height (no document scroll) so content that manages its own layout — e.g. the calendar month grid — can fill the remaining space exactly instead of overflowing. */
  fillHeight?: boolean;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className={fillHeight ? 'flex h-screen overflow-hidden bg-canvas' : 'flex min-h-screen bg-canvas'}>
      {/* Desktop rail */}
      <Sidebar className="fixed inset-y-0 left-0 hidden lg:flex" />

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-navy-950/60"
            onClick={() => setNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] animate-slide-in-right flex-col bg-navy-900">
            <div className="flex items-center justify-between px-5 py-5">
              <LogoLockup />
              <button
                onClick={() => setNavOpen(false)}
                className="rounded-lg p-1.5 text-navy-300 hover:bg-white/10 hover:text-white"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mx-3 h-px bg-white/[0.07]" />
            <div className="scroll-slim flex min-h-0 flex-1 flex-col overflow-y-auto">
              <SidebarNav onNavigate={() => setNavOpen(false)} />
              <div className="mt-auto">
                <SidebarFooter />
              </div>
            </div>
          </aside>
        </div>
      )}

      <div
        className={
          fillHeight
            ? 'flex min-h-0 min-w-0 flex-1 flex-col lg:pl-[268px]'
            : 'flex min-w-0 flex-1 flex-col lg:pl-[268px]'
        }
      >
        <Header
          title={title}
          subtitle={subtitle}
          actions={actions}
          onOpenNav={() => setNavOpen(true)}
        />
        <main
          className={
            fillHeight
              ? 'mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
              : 'mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
          }
        >
          {children}
        </main>
        {!fillHeight && (
          <footer className="border-t border-slateish-200/70 px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-[12px] text-slateish-400">
              Valveman PTO Tracker · Internal use only · Front-end prototype with mock data
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
