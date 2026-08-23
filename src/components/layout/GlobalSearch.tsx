import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, X, LayoutDashboard, Users as UsersIcon, Building2, Lock,
  ClipboardList, FileText, Calendar, FolderArchive, BarChart3,
  PlusCircle, Send, UserCircle, CornerDownLeft,
} from 'lucide-react';
import {
  useGetMeetingsQuery,
  useGetUsersQuery,
  useGetDepartmentsQuery,
} from '../../features/apis/apiSlice';
import type { User } from '../../data/mockData';
import { resolveDepartmentDisplay } from '../../types/formConfig';

interface GlobalSearchProps {
  currentUser: User;
  setActiveDashboardTab: (tab: string) => void;
}

interface FeatureItem {
  tab: string;
  label: string;
  keywords: string;
  icon: React.ReactNode;
}

const FEATURES_BY_ROLE: Record<string, FeatureItem[]> = {
  admin: [
    { tab: 'dashboard', label: 'Overview Dashboard', keywords: 'stats analytics summary home', icon: <LayoutDashboard size={15} /> },
    { tab: 'users', label: 'User Administration', keywords: 'users accounts staff manage add edit', icon: <UsersIcon size={15} /> },
    { tab: 'departments', label: 'Departments', keywords: 'department branch division', icon: <Building2 size={15} /> },
    { tab: 'security', label: 'Security & Auth', keywords: 'password policy login security settings', icon: <Lock size={15} /> },
    { tab: 'logs', label: 'System Audit Logs', keywords: 'audit history activity logs', icon: <ClipboardList size={15} /> },
    { tab: 'documents', label: 'Document Settings', keywords: 'templates documents register export', icon: <FileText size={15} /> },
  ],
  hr: [
    { tab: 'meetings', label: 'All Meetings', keywords: 'meetings sessions events attendance', icon: <Calendar size={15} /> },
    { tab: 'hr_archive', label: 'Submitted Reports', keywords: 'reports archive documents', icon: <FolderArchive size={15} /> },
    { tab: 'hr_analytics', label: 'HR Analytics', keywords: 'analytics stats charts', icon: <BarChart3 size={15} /> },
  ],
  organizer: [
    { tab: 'meetings', label: 'My Meetings', keywords: 'meetings sessions events attendance', icon: <Calendar size={15} /> },
    { tab: 'create_meeting', label: 'Create Meeting', keywords: 'new meeting schedule', icon: <PlusCircle size={15} /> },
    { tab: 'my_submissions', label: 'Submitted to HR', keywords: 'reports submitted hr', icon: <Send size={15} /> },
  ],
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ currentUser, setActiveDashboardTab }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;

  const { data: meetingsResponse } = useGetMeetingsQuery(undefined, { skip: !hasQuery });
  const { data: usersResponse } = useGetUsersQuery(undefined, { skip: !hasQuery || currentUser.role !== 'admin' });
  const { data: deptsResponse } = useGetDepartmentsQuery(undefined, { skip: !hasQuery || currentUser.role !== 'admin' });

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const featureResults = useMemo(() => {
    const list = FEATURES_BY_ROLE[currentUser.role] || [];
    const all = [
      ...list,
      { tab: 'profile', label: 'My Profile', keywords: 'account settings profile', icon: <UserCircle size={15} /> } as FeatureItem,
    ];
    if (!hasQuery) return [];
    const q = trimmed.toLowerCase();
    return all.filter(f => f.label.toLowerCase().includes(q) || f.keywords.includes(q));
  }, [currentUser.role, hasQuery, trimmed]);

  const meetingResults = useMemo(() => {
    if (!hasQuery) return [];
    const q = trimmed.toLowerCase();
    const meetings = meetingsResponse?.data || [];
    // Quick-search is a personal convenience, not a system-wide lookup tool —
    // even though HR/admin list endpoints return every meeting (they need
    // that on the dedicated Meetings page), only surface the signed-in
    // user's own meetings here so search can't be used to browse other
    // organizers' meetings.
    return meetings
      .filter((m: any) => m.created_by === currentUser.id)
      .filter((m: any) =>
        (m.title || '').toLowerCase().includes(q) ||
        resolveDepartmentDisplay(m, '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [meetingsResponse, hasQuery, trimmed, currentUser.id]);

  const userResults = useMemo(() => {
    if (!hasQuery || currentUser.role !== 'admin') return [];
    const q = trimmed.toLowerCase();
    const users = usersResponse?.data || [];
    return users
      .filter((u: any) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [usersResponse, hasQuery, trimmed, currentUser.role]);

  const deptResults = useMemo(() => {
    if (!hasQuery || currentUser.role !== 'admin') return [];
    const q = trimmed.toLowerCase();
    const depts = deptsResponse?.data || [];
    return depts.filter((d: any) => (d.name || '').toLowerCase().includes(q)).slice(0, 5);
  }, [deptsResponse, hasQuery, trimmed, currentUser.role]);

  const totalResults = featureResults.length + meetingResults.length + userResults.length + deptResults.length;

  const goToTab = (tab: string) => {
    setActiveDashboardTab(tab);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      if (featureResults[0]) goToTab(featureResults[0].tab);
      else if (meetingResults[0]) goToTab(currentUser.role === 'organizer' ? 'meetings' : 'meetings');
      else if (userResults[0]) goToTab('users');
      else if (deptResults[0]) goToTab('departments');
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '580px', margin: '0 auto' }}>
      {/* Search Icon — Centered Vertically */}
      <div
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 10,
          color: '#94a3b8',
        }}
      >
        <Search size={16} />
      </div>

      {/* Input Field with explicit 38px left padding */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search meetings, users, features..."
        style={{
          width: '100%',
          height: '38px',
          paddingLeft: '38px',
          paddingRight: query ? '38px' : '52px',
          borderRadius: '12px',
          backgroundColor: '#f1f5f9',
          border: isOpen && hasQuery ? '1.5px solid #5645d4' : '1px solid #e2e8f0',
          fontSize: '13px',
          fontWeight: 500,
          color: '#0f172a',
          outline: 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isOpen && hasQuery ? '0 0 0 3px rgba(86, 69, 212, 0.12)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen || !hasQuery) e.currentTarget.style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={(e) => {
          if (!isOpen || !hasQuery) e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      />

      {/* Right Action: Clear Button or Cmd+K Badge */}
      {query ? (
        <button
          type="button"
          onClick={() => { setQuery(''); inputRef.current?.focus(); }}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : (
        <div
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#64748b',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          ⌘K
        </div>
      )}

      {isOpen && hasQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto z-50 py-2">
          {totalResults === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No results for "{trimmed}"
            </div>
          )}

          {featureResults.length > 0 && (
            <div className="px-2 pb-1">
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Go to</div>
              {featureResults.map(f => (
                <button
                  key={f.tab}
                  type="button"
                  onClick={() => goToTab(f.tab)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 text-left"
                >
                  <span className="text-slate-400 flex-shrink-0">{f.icon}</span>
                  <span className="truncate">{f.label}</span>
                </button>
              ))}
            </div>
          )}

          {meetingResults.length > 0 && (
            <div className="px-2 pb-1 border-t border-slate-100 pt-1">
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Meetings</div>
              {meetingResults.map((m: any) => (
                <button
                  key={m.meeting_id}
                  type="button"
                  onClick={() => goToTab('meetings')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 text-left"
                >
                  <Calendar size={15} className="text-slate-400 flex-shrink-0" />
                  <span className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{m.title}</span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {m.meeting_date} · {resolveDepartmentDisplay(m, 'No department')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {userResults.length > 0 && (
            <div className="px-2 pb-1 border-t border-slate-100 pt-1">
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Users</div>
              {userResults.map((u: any) => (
                <button
                  key={u.id || u.user_id}
                  type="button"
                  onClick={() => goToTab('users')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 text-left"
                >
                  <UsersIcon size={15} className="text-slate-400 flex-shrink-0" />
                  <span className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{u.full_name}</span>
                    <span className="text-[11px] text-slate-400 truncate">{u.email}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {deptResults.length > 0 && (
            <div className="px-2 pb-1 border-t border-slate-100 pt-1">
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Departments</div>
              {deptResults.map((d: any) => (
                <button
                  key={d.department_id}
                  type="button"
                  onClick={() => goToTab('departments')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 text-left"
                >
                  <Building2 size={15} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate font-medium">{d.name}</span>
                </button>
              ))}
            </div>
          )}

          {totalResults > 0 && (
            <div className="px-4 pt-2 mt-1 border-t border-slate-100 flex items-center gap-1.5 text-[10.5px] text-slate-400">
              <CornerDownLeft size={11} /> to open first result · Esc to close
            </div>
          )}
        </div>
      )}
    </div>
  );
};
