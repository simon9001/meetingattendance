import React from 'react';
import { Moon, Sun, LogOut, Menu, Search, Bell } from 'lucide-react';
import type { User } from '../../data/mockData';
import { KeNHALogo } from '../KeNHALogo';

interface AppShellProps {
  currentUser: User;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  handleLogout: () => void;
  activeDashboardTab: string;
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  theme,
  setTheme,
  handleLogout,
  children,
  sidebar,
}) => {
  return (
    <div className="drawer lg:drawer-open h-screen overflow-hidden">
      <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />

      {/* ── drawer-content ─────────────────────────────────────────── */}
      <div className="drawer-content flex flex-col h-screen overflow-hidden">

        {/* ── STICKY Navbar ───────────────────────────────────────── */}
        <header className="sticky top-0 z-30 navbar bg-base-100 border-b border-base-300 shadow-sm px-4 h-14 min-h-14 gap-3 flex-shrink-0">

          {/* Mobile hamburger */}
          <label
            htmlFor="my-drawer-3"
            className="btn btn-ghost btn-square btn-sm drawer-button lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </label>

          {/* KeNHA Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="h-8 px-1.5 py-1 bg-white rounded border border-base-300 shadow-xs flex items-center justify-center">
              <KeNHALogo height={24} width="auto" />
            </div>
            <div className="hidden md:flex flex-col leading-none">
              <span className="text-sm font-bold text-base-content">KeNHA KMTAMS</span>
              <span className="text-[9px] font-semibold text-amber-500 uppercase tracking-widest mt-0.5">
                Attendance System
              </span>
            </div>
          </div>

          {/* Search bar — flex-1 fills remaining space */}
          <div className="flex-1 mx-3 sm:mx-6">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-3 top-2.5 size-4 text-base-content/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search meetings, attendance registers, users, departments..."
                className="input input-bordered input-sm w-full pl-10 rounded-lg text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" className="btn btn-ghost btn-circle btn-sm" title="Notifications">
              <Bell size={17} />
            </button>
            <button
              type="button"
              onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
              className="btn btn-ghost btn-circle btn-sm"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            <div className="w-px h-5 bg-base-300 mx-1.5 hidden sm:block" />

            {/* Profile chip */}
            <div className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-base-200 border border-base-300 text-xs font-semibold select-none cursor-default">
              <div className="bg-amber-400 text-slate-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px]">
                {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <span className="truncate max-w-[120px] text-base-content">{currentUser.name}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-ghost btn-circle btn-sm text-error"
              title="Sign Out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* ── Page content — scrollable ───────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 bg-base-100">
          {children}
        </main>
      </div>

      {/* ── drawer-side ─────────────────────────────────────────────── */}
      <div className="drawer-side z-40 h-screen">
        <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay" />
        <aside className="bg-base-100 border-r border-base-300 w-64 min-h-full h-full overflow-y-auto">
          {sidebar}
        </aside>
      </div>
    </div>
  );
};
