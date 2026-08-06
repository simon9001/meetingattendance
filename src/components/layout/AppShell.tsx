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
        <header className="sticky top-0 z-30 navbar bg-base-100/90 backdrop-blur-md border-b border-base-300/80 shadow-xs px-4 sm:px-6 h-16 min-h-16 gap-4 flex-shrink-0">

          {/* Mobile hamburger */}
          <label
            htmlFor="my-drawer-3"
            className="btn btn-ghost btn-square btn-sm drawer-button lg:hidden text-base-content/80 hover:bg-base-200"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </label>

          {/* KeNHA Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-9 px-2 py-1 bg-white rounded-lg border border-base-300 shadow-xs flex items-center justify-center transition-transform hover:scale-[1.02]">
              <KeNHALogo height={26} width="auto" />
            </div>
            <div className="hidden md:flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-tight text-base-content">KeNHA KMTAMS</span>
              <span className="text-[9.5px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                Meeting Attendance System
              </span>
            </div>
          </div>

          {/* Search bar — flex-1 fills remaining space */}
          <div className="flex-1 mx-2 sm:mx-6">
            <div className="relative w-full max-w-xl mx-auto">
              <Search className="absolute left-3.5 top-2.5 size-4 text-base-content/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search meetings, attendance registers, users..."
                className="input input-sm w-full pl-10 pr-12 rounded-xl bg-base-200/60 border-base-300 text-sm focus:bg-base-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all"
              />
              <kbd className="hidden sm:inline-flex absolute right-2.5 top-2.5 items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-base-content/40 bg-base-100 border border-base-300 rounded shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            
            {/* Notifications Button */}
            <button 
              type="button" 
              className="btn btn-sm btn-ghost rounded-xl border border-base-300/80 bg-base-200/40 hover:bg-base-200 hover:border-base-300 px-3 flex items-center gap-2 text-base-content/80 relative" 
              title="Notifications"
            >
              <Bell size={16} className="text-base-content/70" />
              <span className="hidden xl:inline text-xs font-semibold">Alerts</span>
              <span className="badge badge-amber badge-xs font-bold px-1 py-1.5 text-[9px] bg-amber-400 text-slate-900 border-none">
                3
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
              className="btn btn-sm btn-ghost rounded-xl border border-base-300/80 bg-base-200/40 hover:bg-base-200 hover:border-base-300 px-3 flex items-center gap-2 text-base-content/80"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <>
                  <Moon size={16} className="text-indigo-600" />
                  <span className="hidden xl:inline text-xs font-semibold">Dark</span>
                </>
              ) : (
                <>
                  <Sun size={16} className="text-amber-400" />
                  <span className="hidden xl:inline text-xs font-semibold">Light</span>
                </>
              )}
            </button>

            <div className="w-px h-6 bg-base-300 mx-1 hidden sm:block" />

            {/* Profile chip */}
            <div className="hidden sm:flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-xl bg-base-200/60 border border-base-300/80 text-xs font-semibold select-none shadow-2xs hover:bg-base-200 transition-all cursor-default">
              <div className="relative">
                <div className="bg-amber-400 text-slate-900 rounded-lg w-7 h-7 flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-base-100 rounded-full" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="truncate max-w-[110px] text-xs font-bold text-base-content">{currentUser.name}</span>
                <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                  {currentUser.role === 'admin' ? 'ICT Admin' : currentUser.role}
                </span>
              </div>
            </div>

            {/* Prominent Sign Out Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-sm bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800/60 rounded-xl px-3 flex items-center gap-1.5 font-bold text-xs transition-all shadow-2xs hover:shadow-xs"
              title="Sign Out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign Out</span>
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
