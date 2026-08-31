import React from 'react';
import { CalendarCheck, Users2, Building2, ClipboardCheck } from 'lucide-react';
import { PageSpinner } from '../../components/shared/Feedback';
import {
  useGetMeetingsQuery,
  useGetUsersQuery,
  useGetDepartmentsQuery,
  useGetMeetingDashboardStatsQuery,
  useGetAuditLogsQuery,
} from '../../features/apis/apiSlice';
import { resolveDepartmentDisplay } from '../../types/formConfig';

const ROLE_LABELS: Record<string, string> = {
  ict_admin: 'ICT Admins',
  hr_officer: 'HR Officers',
  meeting_creator: 'Organizers',
};

export const AdminDashboardPage: React.FC = () => {
  const { data: meetingsResponse, isLoading: isMeetingsLoading } = useGetMeetingsQuery(undefined, {
    pollingInterval: 5000,
  });
  const { data: usersResponse, isLoading: isUsersLoading } = useGetUsersQuery(undefined, {
    pollingInterval: 5000,
  });
  const { data: deptsResponse, isLoading: isDeptsLoading } = useGetDepartmentsQuery(undefined);
  const { data: statsResponse, isLoading: isStatsLoading } = useGetMeetingDashboardStatsQuery(undefined, {
    pollingInterval: 5000,
  });
  const { data: logsResponse, isLoading: isLogsLoading } = useGetAuditLogsQuery(undefined, {
    pollingInterval: 5000,
  });

  const meetings = Array.isArray(meetingsResponse?.data) ? meetingsResponse.data : [];
  const users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  const departments = Array.isArray(deptsResponse?.data) ? deptsResponse.data : [];
  const logs = Array.isArray(logsResponse?.data) ? logsResponse.data : [];

  const totalMeetings = meetings.length;
  const totalUsers = users.length;
  const totalDepartments = departments.length;
  const totalAttendance = statsResponse?.data?.totalAttendance ?? 0;

  const meetingsByStatus = React.useMemo(() => {
    const counts = { not_started: 0, open: 0, closed: 0 };
    meetings.forEach((m: any) => {
      if (m.attendance_status in counts) counts[m.attendance_status as keyof typeof counts]++;
    });
    return counts;
  }, [meetings]);

  const usersByRole = React.useMemo(() => {
    const counts: Record<string, number> = { ict_admin: 0, hr_officer: 0, meeting_creator: 0 };
    let active = 0;
    let disabled = 0;
    users.forEach((u: any) => {
      if (u.role in counts) counts[u.role]++;
      if (u.is_active) active++; else disabled++;
    });
    return { counts, active, disabled };
  }, [users]);

  const deptStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    meetings.forEach((m: any) => {
      const deptName = resolveDepartmentDisplay(m, '');
      if (deptName) stats[deptName] = (stats[deptName] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [meetings]);

  const recentLogs = React.useMemo(() => {
    return [...logs]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [logs]);

  const isLoading = isMeetingsLoading || isUsersLoading || isDeptsLoading || isStatsLoading || isLogsLoading;
  const maxDeptCount = Math.max(1, ...deptStats.map(d => d.count));
  const maxStatusCount = Math.max(1, meetingsByStatus.not_started, meetingsByStatus.open, meetingsByStatus.closed);

  if (isLoading) {
    return <PageSpinner text="Loading system dashboard..." />;
  }

  return (
    <div>
      <div className="grid-stats">
        <div className="card-stat primary">
          <div className="stat-icon-wrapper"><CalendarCheck size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalMeetings}</span>
            <span className="stat-label">Total Meetings Created</span>
          </div>
        </div>
        <div className="card-stat">
          <div className="stat-icon-wrapper"><Users2 size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalUsers}</span>
            <span className="stat-label">Total System Users</span>
          </div>
        </div>
        <div className="card-stat">
          <div className="stat-icon-wrapper"><Building2 size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalDepartments}</span>
            <span className="stat-label">Total Departments</span>
          </div>
        </div>
        <div className="card-stat">
          <div className="stat-icon-wrapper"><ClipboardCheck size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalAttendance}</span>
            <span className="stat-label">Total Attendance Recorded</span>
          </div>
        </div>
      </div>

      <div className="live-dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-header"><h3>Meetings by Status</h3></div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                { key: 'open', label: 'Open (Accepting Sign-ins)', value: meetingsByStatus.open, color: '#1aae39' },
                { key: 'not_started', label: 'Awaiting Activation', value: meetingsByStatus.not_started, color: '#dd5b00' },
                { key: 'closed', label: 'Closed', value: meetingsByStatus.closed, color: '#5645d4' },
              ] as const).map(row => (
                <div key={row.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div style={{ height: 8, backgroundColor: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(row.value / maxStatusCount) * 100}%`, backgroundColor: row.color, transition: 'width .3s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header"><h3>Users by Role</h3></div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {Object.entries(usersByRole.counts).map(([role, count]) => (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                  <span>{ROLE_LABELS[role] || role}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span className="badge badge-active">{usersByRole.active} Active</span>
              <span className="badge badge-closed">{usersByRole.disabled} Disabled</span>
            </div>
          </div>
        </div>
      </div>

      <div className="live-dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-header"><h3>Meetings by Department</h3></div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deptStats.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>No department data available yet.</p>
              ) : (
                deptStats.map((stat, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                      <span>{stat.name}</span>
                      <strong>{stat.count}</strong>
                    </div>
                    <div style={{ height: 8, backgroundColor: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(stat.count / maxDeptCount) * 100}%`, backgroundColor: 'var(--kenha-yellow)' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header"><h3>Recent System Activity</h3></div>
          <div className="panel-body">
            {recentLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>No recent activity recorded.</p>
            ) : (
              <div className="live-feed-list">
                {recentLogs.map((log: any) => (
                  <div key={log.log_id} className="feed-item">
                    <div className="feed-item-left">
                      <span className="feed-item-name">{log.profiles?.full_name || 'System / Guest'}</span>
                      <span className="feed-item-sub">{(log.details || log.action || '').toString()}</span>
                    </div>
                    <span className="feed-item-time">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
