import React from 'react';
import { Moon, Sun, Users, UserCheck } from 'lucide-react';
import { PageSpinner, InlineSpinner, AlertError } from '../../components/shared/Feedback';
import { KeNHALogo } from '../../components/KeNHALogo';
import type { User } from '../../data/mockData';
import {
  useGetLiveMeetingQuery,
  useGetMeetingAttendanceQuery,
  useOpenMeetingAttendanceMutation,
  useCloseMeetingAttendanceMutation,
} from '../../features/apis/apiSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface LiveDashboardPageProps {
  meetingId: string;
  showToast: (m: string, t?: 'success' | 'error') => void;
  navigate: (path: string) => void;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  dbTick: number;
  triggerDbUpdate: () => void;
  currentUser: User | null;
}

export const LiveDashboardPage: React.FC<LiveDashboardPageProps> = ({
  meetingId,
  showToast,
  navigate,
  theme,
  setTheme,
  currentUser,
}) => {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const effectiveUser = authUser || currentUser;

  // Poll every 5 seconds for real-time updates
  const {
    data: meetingResponse,
    isLoading: isMeetingLoading,
    error: meetingError,
  } = useGetLiveMeetingQuery(meetingId, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  const {
    data: attendanceResponse,
    isLoading: isAttendanceLoading,
  } = useGetMeetingAttendanceQuery(meetingId, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  const [openMeetingAttendance, { isLoading: isOpening }] = useOpenMeetingAttendanceMutation();
  const [closeMeetingAttendance, { isLoading: isClosing }] = useCloseMeetingAttendanceMutation();

  const meeting = meetingResponse?.data;
  const attendees: any[] = attendanceResponse?.data || [];

  const isStatusLoading = isOpening || isClosing;

  const toggleStatus = async () => {
    if (!meeting) return;
    try {
      if (meeting.attendance_status === 'open') {
        await closeMeetingAttendance(meetingId).unwrap();
        showToast('Attendance registration closed.');
      } else {
        await openMeetingAttendance(meetingId).unwrap();
        showToast('Attendance registration opened!');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.data?.error || 'Failed to update meeting status', 'error');
    }
  };

  if (isMeetingLoading || isAttendanceLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <PageSpinner text="Loading live dashboard..." />
      </div>
    );
  }

  if (meetingError || !meeting) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AlertError message="Could not load the live dashboard for this meeting." />
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: 16 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const staffAttendees = attendees.filter(a => a.participant_type === 'staff');
  const visitorAttendees = attendees.filter(a => a.participant_type === 'visitor');
  const staffCount = staffAttendees.length;
  const visitorCount = visitorAttendees.length;
  const totalCount = attendees.length;

  const isOpen = meeting.attendance_status === 'open';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="app-header" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <KeNHALogo width={80} height={40} />
          <h2 style={{ fontSize: 16 }}>Live Attendance Board</h2>
          {/* Real-time indicator */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10B981', fontWeight: 600 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#10B981',
              animation: 'livePulse 2s infinite',
              display: 'inline-block'
            }}></span>
            LIVE — refreshes every 5s
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            className="theme-toggle-btn"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {effectiveUser ? (
            <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Back to Portal
            </button>
          ) : (
            <button type="button" onClick={() => navigate('/login')} className="btn btn-primary">
              Portal Sign-In
            </button>
          )}
        </div>
      </header>

      <div style={{ padding: 24, flex: 1 }}>
        {/* Meeting header info */}
        <div className="dashboard-panel" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <div>
              <span className={`badge ${isOpen ? 'badge-active' : 'badge-closed'}`}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{meeting.title}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Department: <strong>{meeting.departments?.name || '—'}</strong>
                &nbsp;|&nbsp;Venue: <strong>{meeting.venue || '—'}</strong>
              </p>
            </div>

            {/* Only show toggle if current user is an organizer or admin */}
            {effectiveUser && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={toggleStatus}
                  disabled={isStatusLoading}
                  className={`btn ${isOpen ? 'btn-danger' : 'btn-primary'}`}
                >
                  {isStatusLoading ? (
                    <>
                      <InlineSpinner />
                      Updating...
                    </>
                  ) : isOpen ? 'Close Attendance' : 'Open Attendance'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid-stats">
          <div className="card-stat primary">
            <div className="stat-icon-wrapper"><Users size={20} /></div>
            <div className="stat-info">
              <span className="stat-value">{totalCount}</span>
              <span className="stat-label">Total Attendees</span>
            </div>
          </div>
          <div className="card-stat">
            <div className="stat-icon-wrapper"><UserCheck size={20} /></div>
            <div className="stat-info">
              <span className="stat-value">{staffCount}</span>
              <span className="stat-label">KeNHA Staff</span>
            </div>
          </div>
          <div className="card-stat">
            <div className="stat-icon-wrapper"><Users size={20} /></div>
            <div className="stat-info">
              <span className="stat-value">{visitorCount}</span>
              <span className="stat-label">External Visitors</span>
            </div>
          </div>
        </div>

        {/* Feed and Chart */}
        <div className="live-dashboard-grid">
          {/* Recent Submissions Live Feed */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <h3>Recent Submissions</h3>
              <span className="badge badge-submitted" style={{ animation: 'pulse 2s infinite' }}>Live feed</span>
            </div>
            <div className="panel-body">
              {attendees.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                  No one has registered attendance yet.
                </p>
              ) : (
                <div className="live-feed-list">
                  {[...attendees].reverse().map(att => (
                    <div
                      key={att.attendance_id || att.id}
                      className={`feed-item ${att.participant_type === 'visitor' ? 'visitor' : ''}`}
                    >
                      <div className="feed-item-left">
                        <span className="feed-item-name">{att.full_name}</span>
                        <span className="feed-item-sub">
                          {att.participant_type === 'staff'
                            ? `${att.designation || ''}${att.departments?.name ? ` (${att.departments.name})` : ''}`
                            : `${att.organization || ''} — ${att.purpose || ''}`
                          }
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {att.signature_data && (
                          <img src={att.signature_data} alt="Sig" className="sig-img" />
                        )}
                        <span className="feed-item-time">
                          {att.signed_at ? new Date(att.signed_at).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Statistics Chart */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <h3>Registration Statistics</h3>
            </div>
            <div className="panel-body">
              <div className="attendance-chart-container">
                <div className="chart-bar-wrapper">
                  <div
                    className="chart-bar staff"
                    style={{ height: `${totalCount > 0 ? (staffCount / totalCount) * 150 : 0}px` }}
                  >
                    <span className="chart-bar-val">{staffCount}</span>
                  </div>
                  <span className="chart-bar-label">Staff</span>
                </div>
                <div className="chart-bar-wrapper">
                  <div
                    className="chart-bar visitor"
                    style={{ height: `${totalCount > 0 ? (visitorCount / totalCount) * 150 : 0}px` }}
                  >
                    <span className="chart-bar-val">{visitorCount}</span>
                  </div>
                  <span className="chart-bar-label">Visitors</span>
                </div>
              </div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Staff Ratio:</span>
                  <strong>{totalCount > 0 ? Math.round((staffCount / totalCount) * 100) : 0}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Visitor Ratio:</span>
                  <strong>{totalCount > 0 ? Math.round((visitorCount / totalCount) * 100) : 0}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};
