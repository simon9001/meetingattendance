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
          w-full flex items-center gap-3.5 px-4 py-2.5
          text-sm font-medium rounded-none
          transition-colors duration-150
          ${active
            ? 'text-amber-500 bg-amber-50 border-l-[3px] border-amber-400 font-semibold'
            : 'text-base-content/60 hover:text-base-content hover:bg-base-200 border-l-[3px] border-transparent'
          }
        `}
      >
        <span className={`flex-shrink-0 ${active ? 'text-amber-500' : 'text-base-content/40'}`}>
          {icon}
        </span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-base-100">

      {/* ── Logo at very top, like the reference ── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-base-200">
        <div className="flex-shrink-0">
          <KeNHALogo height={32} width="auto" />
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-col flex-1 py-3 gap-0.5">

        {/* Admin */}
        {currentUser.role === 'admin' && (
          <>
            <NavItem tab="users"       icon={<Users size={18} />}       label="User Administration" />
            <NavItem tab="departments" icon={<Building2 size={18} />}   label="Departments" />
            <NavItem tab="security"    icon={<Lock size={18} />}         label="Security Settings" />
            <NavItem tab="logs"        icon={<ClipboardList size={18} />} label="Audit Logs" />
            <NavItem tab="documents"   icon={<FileText size={18} />}      label="Document Settings" />
          </>
        )}

        {/* HR */}
        {currentUser.role === 'hr' && (
          <>
            <NavItem tab="meetings"     icon={<Calendar size={18} />}     label="All Meetings" />
            <NavItem tab="hr_archive"   icon={<FolderArchive size={18} />} label="Reports Archive" />
            <NavItem tab="hr_analytics" icon={<BarChart3 size={18} />}    label="HR Analytics" />
          </>
        )}

        {/* Organizer */}
        {currentUser.role === 'organizer' && (
          <>
            <NavItem tab="meetings"       icon={<Calendar size={18} />}   label="My Meetings" />
            <NavItem tab="create_meeting" icon={<PlusCircle size={18} />} label="Create Meeting" />
            <NavItem tab="my_submissions" icon={<Send size={18} />}       label="Submitted to HR" />
          </>
        )}

      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-base-200 px-4 py-4 flex items-center gap-3">
        <div className="bg-amber-400 text-slate-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs flex-shrink-0">
          {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-base-content truncate">{currentUser.name}</span>
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
            {currentUser.role === 'admin' ? 'ICT Admin' : currentUser.role}
          </span>
        </div>
      </div>

    </div>
  );
};
