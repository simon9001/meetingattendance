import React from 'react';
import {
  Users,
  Building2,
  Lock,
  ClipboardList,
  Calendar,
  FolderArchive,
  BarChart3,
  PlusCircle,
  Send,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { KeNHALogo } from '../KeNHALogo';
import type { User } from '../../data/mockData';

interface SidebarProps {
  currentUser: User;
  activeDashboardTab: string;
  setActiveDashboardTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeDashboardTab,
  setActiveDashboardTab,
}) => {
  const closeDrawer = () => {
    const cb = document.getElementById('my-drawer-3') as HTMLInputElement | null;
    if (cb?.checked) cb.checked = false;
  };

  const NavItem = ({
    tab,
    icon,
    label,
  }: {
    tab: string;
    icon: React.ReactNode;
    label: string;
  }) => {
    const active = activeDashboardTab === tab;
    return (
      <button
        type="button"
        onClick={() => { setActiveDashboardTab(tab); closeDrawer(); }}
        className={`
          flex items-center gap-3 w-full px-3.5 py-2.5
          text-sm rounded-xl font-medium
          transition-all duration-200 cursor-pointer text-left
          ${active
            ? 'bg-[#5645d4] text-white shadow-sm font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#5645d4] dark:hover:text-white'
          }
        `}
      >
        <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const ROLE_PANEL_INFO: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
    admin: {
      title: 'Admin Panel',
      subtitle: 'System & Security',
      icon: <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />,
    },
    hr: {
      title: 'HR Portal',
      subtitle: 'Reports & Analytics',
      icon: <Briefcase size={18} className="text-indigo-600 dark:text-indigo-400" />,
    },
    organizer: {
      title: 'Organizer Portal',
      subtitle: 'Meetings & Registers',
      icon: <UserCheck size={18} className="text-indigo-600 dark:text-indigo-400" />,
    },
  };

  const currentPanel = ROLE_PANEL_INFO[currentUser.role] || {
    title: 'Dashboard',
    subtitle: 'KeNHA KMTAMS',
    icon: <LayoutDashboard size={18} className="text-indigo-600 dark:text-indigo-400" />,
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">

      {/* ── Brand / Portal Header ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex-shrink-0 p-1 bg-white rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
          <KeNHALogo height={28} width="auto" />
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[14px] font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            {currentPanel.title}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {currentPanel.subtitle}
          </span>
        </div>
      </div>

      {/* ── Navigation Menu ── */}
      <nav className="flex flex-col flex-1 p-3.5 gap-1.5 overflow-y-auto">

        {/* Admin Navigation */}
        {currentUser.role === 'admin' && (
          <>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              System Management
            </div>
            <NavItem tab="dashboard"   icon={<LayoutDashboard size={18} />} label="Overview Dashboard" />
            <NavItem tab="users"       icon={<Users size={18} />}           label="User Administration" />
            <NavItem tab="departments" icon={<Building2 size={18} />}       label="Departments" />
            <NavItem tab="security"    icon={<Lock size={18} />}            label="Security & Auth" />
            <NavItem tab="logs"        icon={<ClipboardList size={18} />}   label="System Audit Logs" />
            <NavItem tab="documents"   icon={<FileText size={18} />}        label="Document Settings" />
          </>
        )}

        {/* HR Navigation */}
        {currentUser.role === 'hr' && (
          <>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Attendance Records
            </div>
            <NavItem tab="meetings"     icon={<Calendar size={18} />}       label="All Meetings" />
            <NavItem tab="hr_archive"   icon={<FolderArchive size={18} />}   label="Submitted Reports" />
            <NavItem tab="hr_analytics" icon={<BarChart3 size={18} />}      label="HR Analytics" />
          </>
        )}

        {/* Organizer Navigation */}
        {currentUser.role === 'organizer' && (
          <>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              My Sessions
            </div>
            <NavItem tab="meetings"       icon={<Calendar size={18} />}     label="My Meetings" />
            <NavItem tab="create_meeting" icon={<PlusCircle size={18} />}   label="Create Meeting" />
            <NavItem tab="my_submissions" icon={<Send size={18} />}         label="Submitted to HR" />
          </>
        )}

      </nav>

      {/* ── User Profile Footer ── */}
      <button
        type="button"
        onClick={() => { setActiveDashboardTab('profile'); closeDrawer(); }}
        className={`border-t border-slate-100 dark:border-slate-800 p-3.5 m-2 rounded-xl flex items-center gap-3 text-left transition-colors cursor-pointer ${
          activeDashboardTab === 'profile'
            ? 'bg-[#5645d4]/10 ring-1 ring-[#5645d4]/30'
            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <div className="bg-indigo-600 text-white rounded-lg w-8 h-8 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
          {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</span>
          <span className="text-[10.5px] text-slate-400 dark:text-slate-400 truncate">
            {currentUser.email}
          </span>
        </div>
      </button>

    </div>
  );
};
