import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell, CheckCheck, Clock, ShieldAlert,
  FileText, Calendar, PlayCircle, CheckCircle2, RefreshCw
} from 'lucide-react';
import {
  useGetNotificationsQuery,
  useGetMeetingsQuery,
  useGetAuditLogsQuery,
  useGetReportsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../features/apis/apiSlice';
import type { User } from '../../data/mockData';

export interface AppNotification {
  id: string;
  type: 'anomaly' | 'signature_open' | 'signature_closed' | 'meeting_arrived' | 'report_submitted' | 'general';
  title: string;
  message: string;
  timestamp: string;
  timeLabel: string;
  isRead: boolean;
  severity: 'critical' | 'warning' | 'info' | 'success';
  meetingId?: string;
  actionTab?: string;
  actionLabel?: string;
}

interface NotificationDropdownProps {
  currentUser: User;
  onNavigateTab?: (tab: string, meta?: any) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'meetings' | 'anomalies'>('all');
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`kmtams_read_notifs_${currentUser.id || currentUser.email}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries — skip all if user is not logged in
  const { data: notifsResponse, refetch: refetchNotifs } = useGetNotificationsQuery(undefined, {
    skip: !currentUser?.id && !currentUser?.email,
    pollingInterval: 10000,
  });

  const { data: meetingsResponse, refetch: refetchMeetings } = useGetMeetingsQuery(undefined, {
    skip: !currentUser?.id && !currentUser?.email,
    pollingInterval: 10000,
  });

  const { data: auditLogsResponse, refetch: refetchAudit } = useGetAuditLogsQuery(undefined, {
    skip: !currentUser || currentUser.role !== 'admin',
    pollingInterval: 10000,
  });

  const { data: reportsResponse, refetch: refetchReports } = useGetReportsQuery(undefined, {
    skip: !currentUser || currentUser.role !== 'hr',
    pollingInterval: 10000,
  });

  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [markOneRead] = useMarkNotificationReadMutation();

  // Save localReadIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        `kmtams_read_notifs_${currentUser.id || currentUser.email}`,
        JSON.stringify(Array.from(localReadIds))
      );
    } catch (e) {
      console.error(e);
    }
  }, [localReadIds, currentUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMIC NOTIFICATIONS GENERATION
  // ──────────────────────────────────────────────────────────────────────────
  const allNotifications: AppNotification[] = useMemo(() => {
    const list: AppNotification[] = [];
    const now = new Date();
    const nowHoursMins = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    // 1. Database Notifications
    const dbNotifs: any[] = Array.isArray(notifsResponse?.data?.notifications)
      ? notifsResponse.data.notifications
      : Array.isArray(notifsResponse?.data)
      ? notifsResponse.data
      : [];
    dbNotifs.forEach((n: any) => {
      const id = n.notification_id || `db_${n.id}`;
      const isRead = n.is_read || localReadIds.has(id);
      let type: AppNotification['type'] = 'general';
      let severity: AppNotification['severity'] = 'info';

      if (n.notification_type === 'attendance_opened') {
        type = 'signature_open';
        severity = 'success';
      } else if (n.notification_type === 'attendance_closed') {
        type = 'signature_closed';
        severity = 'warning';
      } else if (n.notification_type === 'report_submitted' || n.notification_type === 'report_received_by_hr') {
        type = 'report_submitted';
        severity = 'info';
      }

      list.push({
        id,
        type,
        title: n.title || 'System Notification',
        message: n.message || '',
        timestamp: n.created_at || new Date().toISOString(),
        timeLabel: new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead,
        severity,
        meetingId: n.related_meeting_id,
        actionTab: n.related_meeting_id ? 'meetings' : undefined,
        actionLabel: n.related_meeting_id ? 'View Register' : undefined,
      });
    });

    // 2. Real-Time Meeting Alerts
    const allMeetings: any[] = Array.isArray(meetingsResponse?.data) ? meetingsResponse.data : [];
    const meetings = allMeetings.filter((m: any) => m.created_by === currentUser.id);
    meetings.forEach((m: any) => {
      const isToday = m.meeting_date === todayStr;
      const meetingStart = m.start_time || '00:00';
      const meetingEnd = m.end_time || '23:59';
      const openTime = m.attendance_open_time ? new Date(m.attendance_open_time) : null;
      const closeTime = m.attendance_close_time ? new Date(m.attendance_close_time) : null;

      // A) Meeting Signature Window is OPEN
      if (m.attendance_status === 'open') {
        const id = `sig_open_${m.meeting_id}`;
        list.push({
          id,
          type: 'signature_open',
          title: 'Signature Window is OPEN',
          message: `Attendance register is currently active for "${m.title}". Attendees can sign in with PIN: ${m.meeting_pin || m.pin || '------'}.`,
          timestamp: m.attendance_open_time || m.created_at || new Date().toISOString(),
          timeLabel: openTime ? openTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live Now',
          isRead: localReadIds.has(id),
          severity: 'success',
          meetingId: m.meeting_id,
          actionTab: 'meetings',
          actionLabel: 'Open Register',
        });
      }

      // B) Meeting Signature Window is CLOSED
      if (m.attendance_status === 'closed') {
        const id = `sig_closed_${m.meeting_id}`;
        list.push({
          id,
          type: 'signature_closed',
          title: 'Signature Window Closed',
          message: `Attendance is closed for "${m.title}". Ready for report generation or submission to HR.`,
          timestamp: m.attendance_close_time || m.updated_at || new Date().toISOString(),
          timeLabel: closeTime ? closeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Closed',
          isRead: localReadIds.has(id),
          severity: 'warning',
          meetingId: m.meeting_id,
          actionTab: 'meetings',
          actionLabel: 'View Report',
        });
      }

      // C) Meeting Starting in < 15 mins (Countdown Alert)
      if (m.attendance_status === 'not_started' && isToday && meetingStart > nowHoursMins) {
        const [startH, startM] = meetingStart.split(':').map(Number);
        const [nowH, nowM] = nowHoursMins.split(':').map(Number);
        const diffMins = (startH * 60 + startM) - (nowH * 60 + nowM);

        if (diffMins > 0 && diffMins <= 15) {
          const id = `countdown_${m.meeting_id}`;
          list.push({
            id,
            type: 'meeting_arrived',
            title: `Meeting Starts in ${diffMins} min${diffMins === 1 ? '' : 's'}`,
            message: `"${m.title}" is scheduled to begin at ${meetingStart} (${m.venue || 'KeNHA'}). Click to open attendance.`,
            timestamp: new Date().toISOString(),
            timeLabel: `in ${diffMins}m`,
            isRead: localReadIds.has(id),
            severity: 'critical',
            meetingId: m.meeting_id,
            actionTab: 'meetings',
            actionLabel: 'Open Attendance Now',
          });
        }
      }

      // D) Meeting In Session Today
      if (isToday && meetingStart <= nowHoursMins && meetingEnd >= nowHoursMins && m.attendance_status !== 'closed') {
        if (!list.some(item => item.id === `sig_open_${m.meeting_id}`)) {
          const id = `insession_${m.meeting_id}`;
          list.push({
            id,
            type: 'meeting_arrived',
            title: 'Meeting In Session (Starting Now)',
            message: `"${m.title}" scheduled from ${meetingStart} to ${meetingEnd} is happening today at ${m.venue || 'KeNHA Office'}.`,
            timestamp: m.meeting_date || new Date().toISOString(),
            timeLabel: `${meetingStart} - ${meetingEnd}`,
            isRead: localReadIds.has(id),
            severity: 'info',
            meetingId: m.meeting_id,
            actionTab: 'meetings',
            actionLabel: 'View Meeting',
          });
        }
      }
    });

    // 3. Admin Anomalies & System Failures (For ICT Admin)
    if (currentUser.role === 'admin') {
      const logs: any[] = Array.isArray(auditLogsResponse?.data) ? auditLogsResponse.data : [];
      
      // Anomaly Detection in Audit Logs
      logs.slice(0, 50).forEach((log: any) => {
        const actionStr = (log.action || '').toLowerCase();
        const detailsStr = (log.details || '').toLowerCase();
        const isFailure =
          detailsStr.includes('fail') ||
          detailsStr.includes('error') ||
          detailsStr.includes('invalid') ||
          detailsStr.includes('unauthorized') ||
          detailsStr.includes('denied') ||
          detailsStr.includes('lockout') ||
          actionStr.includes('fail');

        if (isFailure) {
          const id = `audit_anomaly_${log.log_id}`;
          list.push({
            id,
            type: 'anomaly',
            title: 'System Security / Operation Anomaly',
            message: `Detected failure event [${log.action}]: ${log.details || 'Operation failed'}${log.ip_address ? ` from IP ${log.ip_address}` : ''}.`,
            timestamp: log.created_at || new Date().toISOString(),
            timeLabel: new Date(log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: localReadIds.has(id),
            severity: 'critical',
            actionTab: 'logs',
            actionLabel: 'Inspect Logs',
          });
        }
      });

      // Structural Data Anomaly
      meetings.forEach((m: any) => {
        if (!m.meeting_pin && !m.pin) {
          const id = `anomaly_missing_pin_${m.meeting_id}`;
          list.push({
            id,
            type: 'anomaly',
            title: 'Meeting Configuration Anomaly',
            message: `Meeting "${m.title}" was created without an attendance PIN. Attendees will not be able to sign in without a valid PIN.`,
            timestamp: m.created_at || new Date().toISOString(),
            timeLabel: 'Config Alert',
            isRead: localReadIds.has(id),
            severity: 'critical',
            meetingId: m.meeting_id,
            actionTab: 'meetings',
            actionLabel: 'Fix Meeting',
          });
        }
      });
    }

    // 4. HR Review Alerts (For HR Officers)
    if (currentUser.role === 'hr') {
      const reports: any[] = Array.isArray(reportsResponse?.data) ? reportsResponse.data : [];
      reports.forEach((r: any) => {
        if (r.status === 'submitted_to_hr') {
          const id = `hr_sub_${r.report_id}`;
          list.push({
            id,
            type: 'report_submitted',
            title: 'New Register Submitted to HR',
            message: `Meeting attendance report for "${r.meetings?.title || 'Meeting Register'}" has been submitted for HR verification (${r.total_attendance || 0} attendees).`,
            timestamp: r.submitted_at || r.created_at || new Date().toISOString(),
            timeLabel: 'Awaiting Review',
            isRead: localReadIds.has(id),
            severity: 'info',
            actionTab: 'hr_archive',
            actionLabel: 'Review Report',
          });
        }
      });
    }

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [
    notifsResponse,
    meetingsResponse,
    auditLogsResponse,
    reportsResponse,
    localReadIds,
    currentUser,
  ]);

  // Unread Count
  const unreadCount = useMemo(() => {
    if (!Array.isArray(allNotifications)) return 0;
    return allNotifications.filter(n => !n.isRead).length;
  }, [allNotifications]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(allNotifications)) return [];
    if (activeFilter === 'unread') return allNotifications.filter(n => !n.isRead);
    if (activeFilter === 'meetings') return allNotifications.filter(n => n.type === 'meeting_arrived' || n.type === 'signature_open' || n.type === 'signature_closed');
    if (activeFilter === 'anomalies') return allNotifications.filter(n => n.type === 'anomaly');
    return allNotifications;
  }, [allNotifications, activeFilter]);

  const handleMarkAllRead = async () => {
    const allIds = new Set(allNotifications.map(n => n.id));
    setLocalReadIds(allIds);
    try {
      await markAllRead(undefined).unwrap();
    } catch {
      // ignore
    }
  };

  const handleMarkOneRead = (notif: AppNotification) => {
    setLocalReadIds(prev => new Set([...prev, notif.id]));
    if (!notif.id.startsWith('sig_') && !notif.id.startsWith('meeting_') && !notif.id.startsWith('audit_')) {
      markOneRead(notif.id).catch(() => {});
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    handleMarkOneRead(notif);
    if (notif.actionTab && onNavigateTab) {
      onNavigateTab(notif.actionTab, { meetingId: notif.meetingId });
      setIsOpen(false);
    }
  };

  const handleRefreshAll = () => {
    refetchNotifs();
    refetchMeetings();
    if (currentUser.role === 'admin') refetchAudit();
    if (currentUser.role === 'hr') refetchReports();
  };

  // Icon Helper
  const renderNotifIcon = (notif: AppNotification) => {
    if (notif.type === 'anomaly') {
      return (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldAlert size={18} />
        </div>
      );
    }
    if (notif.type === 'signature_open') {
      return (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PlayCircle size={18} />
        </div>
      );
    }
    if (notif.type === 'signature_closed') {
      return (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={18} />
        </div>
      );
    }
    if (notif.type === 'meeting_arrived') {
      return (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Calendar size={18} />
        </div>
      );
    }
    return (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText size={18} />
      </div>
    );
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* ── Bell Action Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="btn btn-sm btn-ghost rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 flex items-center gap-2 text-slate-700 relative select-none cursor-pointer transition-all shadow-2xs"
        title="System Alerts & Notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? 'text-indigo-600 animate-bounce' : 'text-slate-600'} />
        <span className="hidden xl:inline text-xs font-semibold">Alerts</span>

        {unreadCount > 0 ? (
          <span className="badge badge-xs font-bold px-1.5 py-1 text-[9px] bg-indigo-600 text-white border-none shadow-2xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : (
          <span className="badge badge-xs font-semibold px-1 py-0.5 text-[9px] bg-slate-200 text-slate-600 border-none">
            0
          </span>
        )}
      </button>

      {/* ── Dropdown Modal / Popup ── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '420px',
            maxWidth: '92vw',
            maxHeight: '560px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.12), 0 10px 10px -5px rgba(0,0,0,0.04)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                Notifications &amp; Alerts
              </div>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#5645d4',
                    color: '#ffffff',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleRefreshAll}
                title="Refresh notifications"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RefreshCw size={14} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#5645d4',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                    borderRadius: '6px',
                  }}
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderBottom: '1px solid #f1f5f9',
              background: '#ffffff',
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              style={{
                fontSize: '11.5px',
                fontWeight: activeFilter === 'all' ? 700 : 500,
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                background: activeFilter === 'all' ? '#5645d4' : '#f1f5f9',
                color: activeFilter === 'all' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              All ({allNotifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              style={{
                fontSize: '11.5px',
                fontWeight: activeFilter === 'unread' ? 700 : 500,
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                background: activeFilter === 'unread' ? '#5645d4' : '#f1f5f9',
                color: activeFilter === 'unread' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Unread ({unreadCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('meetings')}
              style={{
                fontSize: '11.5px',
                fontWeight: activeFilter === 'meetings' ? 700 : 500,
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                background: activeFilter === 'meetings' ? '#5645d4' : '#f1f5f9',
                color: activeFilter === 'meetings' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Meetings
            </button>

            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveFilter('anomalies')}
                style={{
                  fontSize: '11.5px',
                  fontWeight: activeFilter === 'anomalies' ? 700 : 500,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeFilter === 'anomalies' ? '#ef4444' : '#fee2e2',
                  color: activeFilter === 'anomalies' ? '#ffffff' : '#b91c1c',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Anomalies
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle2 size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>All Caught Up!</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  No notifications matching the selected filter.
                </div>
              </div>
            ) : (
              filteredNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid #f8fafc',
                    background: n.isRead ? '#ffffff' : '#f8faff',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = n.isRead ? '#ffffff' : '#f8faff')}
                >
                  {/* Unread Accent Dot */}
                  {!n.isRead && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '6px',
                        top: '18px',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: '#5645d4',
                      }}
                    />
                  )}

                  {/* Icon */}
                  {renderNotifIcon(n)}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: n.isRead ? 600 : 700,
                          fontSize: '12.5px',
                          color: n.severity === 'critical' ? '#dc2626' : '#0f172a',
                        }}
                      >
                        {n.title}
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {n.timeLabel}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                      {n.message}
                    </p>

                    {/* Action button if present */}
                    {n.actionLabel && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: n.severity === 'critical' ? '#dc2626' : '#5645d4',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          {n.actionLabel} &rarr;
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: '#64748b',
            }}
          >
            <span>Live System Updates Active</span>
            <button
              type="button"
              onClick={() => {
                setLocalReadIds(new Set(allNotifications.map(n => n.id)));
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
