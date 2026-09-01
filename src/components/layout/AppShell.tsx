import React from 'react';
import { LogOut, Menu, ChevronDown, UserCircle, Home } from 'lucide-react';
import type { User } from '../../data/mockData';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';

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

        {/* ── STICKY Navbar ───────────────────────────────────────── */}
        <header className="navbar bg-white shadow-md sticky top-0 z-30 py-4 px-4 sm:px-6 gap-4 flex-shrink-0">

          <div className="navbar-start flex-shrink-0 flex items-center gap-2 w-auto">
            {/* Mobile hamburger */}
            <label
              htmlFor="my-drawer-3"
              className="btn btn-ghost btn-square lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </label>

            {/* Home button */}
            <button
              type="button"
              onClick={handleGoHome}
              title="Go to Home Dashboard"
              className="btn btn-ghost btn-sm gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold px-2.5 rounded-lg transition-all cursor-pointer"
            >
              <Home size={18} className="text-[#B45309]" />
              <span className="hidden sm:inline font-bold text-xs">Home</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="navbar-center flex-1 mx-2 sm:mx-6">
            <GlobalSearch
              currentUser={currentUser}
              setActiveDashboardTab={setActiveDashboardTab ?? (() => {})}
            />
          </div>

          {/* Right actions */}
          <div className="navbar-end flex items-center gap-1 flex-shrink-0 w-auto">

            {/* Interactive Live Notifications & Anomaly Center */}
            <NotificationDropdown
              currentUser={currentUser}
              onNavigateTab={setActiveDashboardTab}
            />

            {/* User Profile Dropdown */}
            <div className="dropdown dropdown-end">
              <button type="button" tabIndex={0} className="btn btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100">
                <span className="text-slate-800 font-semibold text-xs">Hey, {currentUser.name.split(' ')[0]}</span>
                <ChevronDown className="text-slate-500" size={16} />
              </button>

              <ul
                tabIndex={0}
                className="dropdown-content menu bg-white rounded-xl z-50 mt-3 w-56 p-2 shadow-xl border border-slate-200 text-xs"
              >
                <li
                  className="menu-title px-3 py-2 border-b border-slate-100 cursor-pointer"
                  onClick={() => {
                    onOpenProfile?.();
                    (document.activeElement as HTMLElement | null)?.blur();
                  }}
                >
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
                    <Home className="mr-3 text-[#B45309]" size={16} />
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
                    <UserCircle className="mr-3 text-slate-500" size={16} />
                    My Profile
                  </button>
                </li>
                <li className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer font-medium"
                  >
                    <LogOut className="mr-3" size={16} />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* ── Page content — scrollable ───────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-900">
          {children}
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
