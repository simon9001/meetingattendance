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
  // Phones get a full-width search sheet instead of the cramped inline bar
  const [sheetOpen, setSheetOpen] = useState(false);
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
        if (window.matchMedia('(max-width: 639px)').matches) setSheetOpen(true);
        else inputRef.current?.focus();
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
    const meetings: any[] = Array.isArray(meetingsResponse?.data) ? meetingsResponse.data : [];
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
    const users: any[] = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
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
    const depts: any[] = Array.isArray(deptsResponse?.data) ? deptsResponse.data : [];
    return depts.filter((d: any) => (d.name || '').toLowerCase().includes(q)).slice(0, 5);
  }, [deptsResponse, hasQuery, trimmed, currentUser.role]);

  const totalResults = featureResults.length + meetingResults.length + userResults.length + deptResults.length;

  const goToTab = (tab: string) => {
    setActiveDashboardTab(tab);
    setIsOpen(false);
    setSheetOpen(false);
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

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const closeSheet = () => {
    setSheetOpen(false);
    setIsOpen(false);
    setQuery('');
  };

  const renderField = (variant: 'bar' | 'sheet') => (
    <div className="relative w-full">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={variant === 'bar' ? inputRef : undefined}
        autoFocus={variant === 'sheet'}
        type="search"
        enterKeyHint="search"
        aria-label="Search meetings, users and features"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && variant === 'sheet') closeSheet();
          else handleKeyDown(e);
        }}
        placeholder={variant === 'sheet' ? 'Search…' : 'Search meetings, users, features…'}
        className="global-search-input"
        style={{ paddingRight: query || variant === 'sheet' ? 38 : 64 }}
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      ) : variant === 'bar' ? (
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden md:inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500 shadow-2xs">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      ) : null}
    </div>
  );

  const renderResults = (className: string) => (
    <div className={className}>
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
  );

  return (
    <>
      {/* Phones: an icon that opens a full-width search sheet */}
      <button
        type="button"
        className="icon-btn sm:hidden"
        aria-label="Search"
        title="Search"
        onClick={() => { setSheetOpen(true); setIsOpen(true); }}
      >
        <Search size={20} />
      </button>

      {/* Tablet and up: the inline search bar */}
      <div ref={containerRef} className="relative hidden sm:block w-full max-w-[580px]">
        {renderField('bar')}
        {isOpen && hasQuery && renderResults('absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto z-50 py-2')}
      </div>

      {sheetOpen && (
        <>
          <div className="search-sheet-backdrop sm:hidden" onClick={closeSheet} aria-hidden="true" />
          <div className="search-sheet sm:hidden" role="dialog" aria-label="Search">
            <div className="w-full">
              <div className="flex items-center gap-2">
                {renderField('sheet')}
                <button type="button" className="icon-btn" onClick={closeSheet} aria-label="Close search">
                  <X size={20} />
                </button>
              </div>
              {hasQuery
                ? renderResults('mt-2 max-h-[70dvh] overflow-y-auto py-1')
                : <p className="px-1 pt-3 pb-1 text-xs text-slate-500">Type at least 2 letters to search.</p>}
            </div>
          </div>
        </>
      )}
    </>
  );
};
