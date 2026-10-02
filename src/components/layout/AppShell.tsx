import React from 'react';
import { LogOut, Menu, ChevronDown, UserCircle, Home } from 'lucide-react';
import type { User } from '../../data/mockData';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { LetterheadBanner } from './LetterheadBanner';

interface AppShellProps {
  currentUser: User;
  handleLogout: () => void;
  activeDashboardTab: string;
  setActiveDashboardTab?: (tab: string) => void;
  onOpenProfile?: () => void;
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  handleLogout,
  setActiveDashboardTab,
  onOpenProfile,
  children,
  sidebar,
}) => {
  const handleGoHome = () => {
    const homeTab = currentUser.role === 'admin' ? 'dashboard' : 'meetings';
    setActiveDashboardTab?.(homeTab);
  };

  return (
    <div className="drawer lg:drawer-open h-screen overflow-hidden">
      <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />

      {/* ── drawer-content ─────────────────────────────────────────── */}
      <div className="drawer-content flex flex-col h-screen overflow-hidden">

        {/* ── STICKY masthead + utility bar ────────────────────────── */}
        <header className="sticky top-0 z-30 flex-shrink-0 bg-white shadow-md">

          {/* Official KeNHA letterhead — compact in app chrome; the address
              strip is reserved for the printed register and the public pages. */}
          <LetterheadBanner variant="compact" />

          <div className="flex items-center gap-1.5 sm:gap-3 bg-white h-14 sm:h-16 px-2 sm:px-6 border-t border-slate-100">

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Mobile / tablet menu */}
            <label
              htmlFor="my-drawer-3"
              className="icon-btn lg:hidden"
              aria-label="Open navigation menu"
              title="Menu"
            >
              <Menu size={22} />
            </label>

            {/* Home — the sidebar brand covers this on phones */}
            <button
              type="button"
              onClick={handleGoHome}
              title="Go to Home Dashboard"
              className="icon-btn hidden sm:inline-flex"
            >
              <Home size={18} className="text-brand-700" />
              <span className="hidden md:inline">Home</span>
            </button>
          </div>

          {/* Search: full bar from tablet up, an icon that opens a sheet on phones */}
          <div className="flex-1 min-w-0 flex justify-start sm:justify-center">
            <GlobalSearch
              currentUser={currentUser}
              setActiveDashboardTab={setActiveDashboardTab ?? (() => {})}
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

            {/* Interactive Live Notifications & Anomaly Center */}
            <NotificationDropdown
              currentUser={currentUser}
              onNavigateTab={setActiveDashboardTab}
            />

            {/* User Profile Dropdown */}
            <div className="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className="icon-btn !px-1.5 sm:!px-2.5"
                aria-label={`Account menu for ${currentUser.name}`}
                aria-haspopup="menu"
              >
                <span className="avatar-chip">
                  {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden md:inline text-slate-800">Hey, {currentUser.name.split(' ')[0]}</span>
                <ChevronDown className="hidden sm:block text-slate-500" size={16} />
              </button>

              <ul
                tabIndex={0}
                role="menu"
                className="dropdown-content menu bg-white rounded-xl z-50 mt-2 w-64 max-w-[calc(100vw-24px)] p-2 shadow-xl border border-slate-200 text-sm"
              >
                <li className="menu-title px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 font-normal truncate">{currentUser.email}</div>
                </li>
                <li className="mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleGoHome();
                      (document.activeElement as HTMLElement | null)?.blur();
                    }}
                    className="flex items-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Home className="mr-3 text-brand-700" size={16} aria-hidden="true" />
                    Home Dashboard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfile?.();
                      (document.activeElement as HTMLElement | null)?.blur();
                    }}
                    className="flex items-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <UserCircle className="mr-3 text-slate-500" size={16} aria-hidden="true" />
                    My Profile
                  </button>
                </li>
                <li className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer font-medium"
                  >
                    <LogOut className="mr-3" size={16} aria-hidden="true" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
          </div>
        </header>

        {/* ── Page content — scrollable ───────────────────────────── */}
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 text-slate-900">
          <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            {children}
          </div>
        </main>
      </div>

      {/* ── drawer-side ─────────────────────────────────────────────── */}
      <div className="drawer-side z-40 h-screen">
        <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay" />
        <aside className="bg-white border-r border-slate-200 w-64 min-h-full h-full overflow-y-auto">
          {sidebar}
        </aside>
      </div>
    </div>
  );
};
