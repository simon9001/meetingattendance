import React from 'react';
import { useGetMeetingsQuery, useGetReportsQuery } from '../../features/apis/apiSlice';
import { PageSpinner } from '../../components/shared/Feedback';
import { resolveDepartmentDisplay } from '../../types/formConfig';

export const HRAnalyticsPage: React.FC = () => {
  const { data: meetingsResponse, isLoading: isMeetingsLoading } = useGetMeetingsQuery(undefined, {
    pollingInterval: 5000,
  });
  const { data: reportsResponse, isLoading: isReportsLoading } = useGetReportsQuery(undefined, {
    pollingInterval: 5000,
  });

  const meetings = Array.isArray(meetingsResponse?.data) ? meetingsResponse.data : [];
  const reports = Array.isArray(reportsResponse?.data) ? reportsResponse.data : [];

  const totalMeetings = meetings.length;
  const archivedCount = reports.filter((r: any) => r.status === 'archived' || r.status === 'submitted_to_hr').length;

  const staffCount = React.useMemo(() => {
    return reports.reduce((sum: number, r: any) => sum + (r.total_staff || 0), 0);
  }, [reports]);

  const visitorCount = React.useMemo(() => {
    return reports.reduce((sum: number, r: any) => sum + (r.total_visitors || 0), 0);
  }, [reports]);

  const totalAttendees = staffCount + visitorCount;

  const deptStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    reports.forEach((r: any) => {
      const deptName = resolveDepartmentDisplay(r.meetings, '');
      if (deptName) {
        stats[deptName] = (stats[deptName] || 0) + (r.total_staff || 0);
      }
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [reports]);

  const isLoading = isMeetingsLoading || isReportsLoading;

  return (
    <div>
      {isLoading ? (
      <PageSpinner text="Loading analytics..." />
      ) : (
        <>
          <div className="grid-stats">
            <div className="card-stat primary">
              <div className="stat-info">
                <span className="stat-value">{totalMeetings}</span>
                <span className="stat-label">Total Conducted Sessions</span>
              </div>
            </div>
            <div className="card-stat">
              <div className="stat-info">
                <span className="stat-value">{totalAttendees}</span>
                <span className="stat-label">Total Sign-ins Recorded</span>
              </div>
            </div>
            <div className="card-stat">
              <div className="stat-info">
                <span className="stat-value">{archivedCount}</span>
                <span className="stat-label">Archived HR Files</span>
              </div>
            </div>
          </div>

          <div className="live-dashboard-grid">
            <div className="dashboard-panel">
              <div className="panel-header"><h3>Participation Mix</h3></div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="attendance-chart-container" style={{ width: '100%', maxWidth: 300 }}>
                  <div className="chart-bar-wrapper">
                    <div className="chart-bar staff" style={{ height: `${totalAttendees > 0 ? (staffCount / totalAttendees) * 140 : 0}px` }}>
                      <span className="chart-bar-val">{staffCount}</span>
                    </div>
                    <span className="chart-bar-label">Staff</span>
                  </div>
                  <div className="chart-bar-wrapper">
                    <div className="chart-bar visitor" style={{ height: `${totalAttendees > 0 ? (visitorCount / totalAttendees) * 140 : 0}px` }}>
                      <span className="chart-bar-val">{visitorCount}</span>
                    </div>
                    <span className="chart-bar-label">Visitors</span>
                  </div>
                </div>
                <div style={{ width: '100%', fontSize: 13, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>Staff Attendees</span>
                    <strong>{staffCount} ({totalAttendees > 0 ? Math.round((staffCount / totalAttendees) * 100) : 0}%)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span>Visitor Attendees</span>
                    <strong>{visitorCount} ({totalAttendees > 0 ? Math.round((visitorCount / totalAttendees) * 100) : 0}%)</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="panel-header"><h3>Active Departments Participation</h3></div>
              <div className="panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {deptStats.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>No department stats available yet.</p>
                  ) : (
                    deptStats.map((stat, i) => {
                      const pct = totalAttendees > 0 ? Math.round((stat.count / totalAttendees) * 100) : 0;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                            <span>{stat.name}</span>
                            <strong>{stat.count}</strong>
                          </div>
                          <div style={{ height: 8, backgroundColor: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--kenha-yellow)' }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
