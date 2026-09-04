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
            ? 'bg-brand-500 text-onyx-950 shadow-sm font-bold shadow-brand-500/20'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
          }
        `}
      >
        <span className={`flex-shrink-0 ${active ? 'text-onyx-950' : 'text-slate-400'}`}>
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
      icon: <ShieldCheck size={18} className="text-brand-700" />,
    },
    hr: {
      title: 'HR Portal',
      subtitle: 'Reports & Analytics',
      icon: <Briefcase size={18} className="text-brand-700" />,
    },
    organizer: {
      title: 'Organizer Portal',
      subtitle: 'Meetings & Registers',
      icon: <UserCheck size={18} className="text-brand-700" />,
    },
  };

  const currentPanel = ROLE_PANEL_INFO[currentUser.role] || {
    title: 'Dashboard',
    subtitle: 'KeNHA KMTAMS',
    icon: <LayoutDashboard size={18} className="text-brand-700" />,
  };

  return (
    <div className="flex flex-col h-full w-full bg-white border-r border-slate-200">

      {/* ── Brand / Portal Header (Clickable to return Home) ── */}
      <button
        type="button"
        onClick={() => {
          const homeTab = currentUser.role === 'admin' ? 'dashboard' : 'meetings';
          setActiveDashboardTab(homeTab);
          closeDrawer();
        }}
        title="Go to Home Dashboard"
        className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 text-left w-full hover:bg-slate-50 transition-all cursor-pointer group select-none"
      >
        <div className="flex-shrink-0 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs group-hover:scale-105 group-hover:shadow-sm transition-transform">
          <KeNHALogo height={28} width="auto" />
        </div>
        <div className="flex flex-col leading-tight min-w-0 flex-1">
          <span className="text-[14px] font-extrabold text-slate-900 tracking-tight truncate group-hover:text-brand-700 transition-colors">
            {currentPanel.title}
          </span>
          <span className="text-[11px] text-slate-500 font-medium truncate">
            {currentPanel.subtitle}
          </span>
        </div>
      </button>

      {/* ── Navigation Menu ── */}
      <nav className="flex flex-col flex-1 p-3.5 gap-1.5 overflow-y-auto">

        {/* Admin Navigation */}
        {currentUser.role === 'admin' && (
          <>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
        className={`border-t border-slate-100 p-3.5 m-2 rounded-xl flex items-center gap-3 text-left transition-colors cursor-pointer ${
          activeDashboardTab === 'profile'
            ? 'bg-brand-500/20 ring-1 ring-brand-500/50'
            : 'bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <div className="bg-onyx-900 text-brand-500 border border-brand-500/40 rounded-lg w-8 h-8 flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-2xs">
          {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</span>
          <span className="text-[10.5px] text-slate-500 truncate">
            {currentUser.email}
          </span>
        </div>
      </button>

    </div>
  );
};
