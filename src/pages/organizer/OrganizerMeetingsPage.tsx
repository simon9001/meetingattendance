import React, { useState, useMemo } from 'react';
import {
  Search, Eye, QrCode, Send, Edit3, FileText, Clock,
  PlayCircle, XCircle, Mail, Calendar, MapPin, Plus,
  ChevronLeft, ChevronRight, MoreVertical, SlidersHorizontal,
  Grid, Activity, Award, UserCheck, Users
} from 'lucide-react';
import { PageSpinner, InlineSpinner } from '../../components/shared/Feedback';
import { GenerateDocumentModal } from '../../components/documents/GenerateDocumentModal';
import { PrintEditorModal } from '../../components/documents/PrintEditorModal';
import { EditMeetingModal } from '../../components/meetings/EditMeetingModal';
import { InviteAttendeesModal } from '../../components/meetings/InviteAttendeesModal';
import type { User } from '../../data/mockData';
import {
  useGetMeetingsQuery,
  useGetMeetingAttendanceQuery,
  useOpenMeetingAttendanceMutation,
  useCloseMeetingAttendanceMutation,
  useExtendMeetingAttendanceMutation,
  useSubmitReportToHRMutation,
} from '../../features/apis/apiSlice';
import {
  parseMeetingFormConfig,
  aggregateMultiDayAttendees,
  formatAttendanceDate,
  resolveDepartmentDisplay,
} from '../../types/formConfig';

interface OrganizerMeetingsPageProps {
  currentUser: User;
  dbTick: number;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
  navigate: (path: string) => void;
  setActiveQRMeeting: (m: any) => void;
  onCreateMeeting?: () => void;
}

export const OrganizerMeetingsPage: React.FC<OrganizerMeetingsPageProps> = ({
  showToast,
  navigate,
  setActiveQRMeeting,
  onCreateMeeting,
}) => {
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action Menu Dropdown State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals State
  const [generateDocModal, setGenerateDocModal] = useState<{ isOpen: boolean; meetingId: string }>({
    isOpen: false,
    meetingId: '',
  });
  const [printEditorOpen, setPrintEditorOpen] = useState(false);
  const [editMeetingTarget, setEditMeetingTarget] = useState<any>(null);
  const [inviteModalTarget, setInviteModalTarget] = useState<any>(null);
  const [extendModal, setExtendModal] = useState<{ isOpen: boolean; meeting: any; minutes: number }>({
    isOpen: false,
    meeting: null,
    minutes: 30,
  });

  // Queries
  const { data: meetingsResponse, isLoading: isMeetingsLoading } = useGetMeetingsQuery(undefined, {
    pollingInterval: 3000,
  });

  const { data: attendanceResponse, isLoading: isAttendanceLoading } = useGetMeetingAttendanceQuery(
    selectedMeetingId || '',
    {
      skip: !selectedMeetingId,
      pollingInterval: 3000,
    }
  );

  // Mutations
  const [openAttendance, { isLoading: isOpening }] = useOpenMeetingAttendanceMutation();
  const [closeAttendance, { isLoading: isClosing }] = useCloseMeetingAttendanceMutation();
  const [extendAttendance, { isLoading: isExtending }] = useExtendMeetingAttendanceMutation();
  const [submitToHR] = useSubmitReportToHRMutation();

  const allMeetings: any[] = Array.isArray(meetingsResponse?.data) ? meetingsResponse.data : [];

  // Compute Top Summary Metrics
  const stats = useMemo(() => {
    const total = allMeetings.length;
    const ongoing = allMeetings.filter(m => m.attendance_status === 'open').length;
    const completed = allMeetings.filter(m => m.attendance_status === 'closed').length;
    const upcoming = allMeetings.filter(m => m.attendance_status === 'not_started').length;
    return { total, ongoing, completed, upcoming };
  }, [allMeetings]);

  // Filtered Meetings
  const filteredMeetings = useMemo(() => {
    return allMeetings.filter((m: any) => {
      // 1. Search filter
      const matchesSearch =
        search.trim() === '' ||
        (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.venue || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.department_label || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.departments?.name || '').toLowerCase().includes(search.toLowerCase());

      // 2. Status filter
      let matchesStatus = true;
      if (statusFilter === 'open') matchesStatus = m.attendance_status === 'open';
      else if (statusFilter === 'closed') matchesStatus = m.attendance_status === 'closed';
      else if (statusFilter === 'not_started') matchesStatus = m.attendance_status === 'not_started';

      // 3. Type filter
      let matchesType = true;
      if (typeFilter !== 'all') matchesType = m.meeting_type === typeFilter;

      // 4. Date filter
      let matchesDate = true;
      if (dateFilter) {
        matchesDate = m.meeting_date === dateFilter;
      }

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [allMeetings, search, statusFilter, typeFilter, dateFilter]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredMeetings.length / pageSize) || 1;
  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMeetings.slice(start, start + pageSize);
  }, [filteredMeetings, currentPage, pageSize]);

  // Selected Meeting Object for Register detail view
  const selectedMeeting = useMemo(() => {
    if (!selectedMeetingId || !meetingsResponse?.data) return null;
    return meetingsResponse.data.find((m: any) => m.meeting_id === selectedMeetingId);
  }, [selectedMeetingId, meetingsResponse]);

  const handleOpenAttendance = async (m: any) => {
    try {
      await openAttendance(m.meeting_id).unwrap();
      showToast('Attendance register is now OPEN and active for attendee sign-in.', 'success');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to open attendance register', 'error');
    }
  };

  const handleCloseAttendance = async (m: any) => {
    try {
      await closeAttendance(m.meeting_id).unwrap();
      showToast('Attendance register is now CLOSED.', 'success');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to close attendance register', 'error');
    }
  };

  const handleExecuteExtend = async () => {
    if (!extendModal.meeting) return;
    try {
      await extendAttendance({
        id: extendModal.meeting.meeting_id,
        minutes: extendModal.minutes,
      }).unwrap();
      showToast(`Attendance window extended by ${extendModal.minutes} minutes!`, 'success');
      setExtendModal({ isOpen: false, meeting: null, minutes: 30 });
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to extend attendance', 'error');
    }
  };

  const handleSubmitToHR = async (m: any) => {
    try {
      await submitToHR(m.meeting_id).unwrap();
      showToast('Attendance report submitted to HR successfully!', 'success');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to submit report to HR', 'error');
    }
  };

  const handlePrint = () => {
    setPrintEditorOpen(true);
  };

  // Helper for Status Badges
  const renderStatusBadge = (status: string) => {
    if (status === 'open') {
      return (
        <span
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            letterSpacing: '0.3px',
          }}
        >
          ONGOING
        </span>
      );
    }
    if (status === 'not_started') {
      return (
        <span
          style={{
            background: 'rgba(2, 132, 199, 0.15)',
            color: '#0284c7',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            letterSpacing: '0.3px',
          }}
        >
          UPCOMING
        </span>
      );
    }
    return (
      <span
        style={{
          background: 'rgba(148, 163, 184, 0.15)',
          color: 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '0.3px',
        }}
      >
        COMPLETED
      </span>
    );
  };

  // Helper for Left Border Color
  const getRowAccentColor = (type: string, status: string) => {
    if (status === 'open') return '#10b981';
    if (type === 'physical') return '#6366f1';
    if (type === 'hybrid') return '#0ea5e9';
    if (type === 'virtual') return '#10b981';
    return '#f59e0b';
  };

  // Helper for Type Badges
  const renderTypeBadge = (type: string) => {
    if (type === 'physical') {
      return (
        <span
          style={{
            background: 'rgba(124, 58, 237, 0.15)',
            color: '#8b5cf6',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          PHYSICAL
        </span>
      );
    }
    if (type === 'hybrid') {
      return (
        <span
          style={{
            background: 'rgba(14, 165, 233, 0.15)',
            color: '#0ea5e9',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          HYBRID
        </span>
      );
    }
    return (
      <span
        style={{
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          fontSize: '10px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        }}
      >
        VIRTUAL
      </span>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW REGISTER DETAIL SCREEN (When a meeting is clicked)
  // ──────────────────────────────────────────────────────────────────────────
  if (selectedMeeting) {
    const rawAttendees: any[] = Array.isArray(attendanceResponse?.data) ? attendanceResponse.data : [];
    const staffAttendees = rawAttendees.filter((a: any) => a.participant_type === 'staff');
    const visitorAttendees = rawAttendees.filter((a: any) => a.participant_type === 'visitor');
    const totalCount = rawAttendees.length;

    return (
      <div style={{ padding: '4px 0 32px 0' }}>
        <button
          type="button"
          onClick={() => setSelectedMeetingId(null)}
          className="btn btn-secondary btn-no-print"
          style={{
            marginBottom: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            borderColor: 'var(--border-color)',
          }}
        >
          <ChevronLeft size={16} /> Back to Meetings Dashboard
        </button>

        <div
          className="dashboard-panel"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
          }}
        >
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="badge badge-submitted">
                  {resolveDepartmentDisplay(selectedMeeting, 'KeNHA Department')}
                </span>
                {renderTypeBadge(selectedMeeting.meeting_type)}
                {renderStatusBadge(selectedMeeting.attendance_status)}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>
                {selectedMeeting.title}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="btn-group-no-print">
              <button
                type="button"
                onClick={() => setInviteModalTarget(selectedMeeting)}
                className="btn btn-primary"
                style={{ background: '#5645d4', borderColor: '#4338ca', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Mail size={16} /> Invite Attendees (Email)
              </button>

              <button
                type="button"
                onClick={() => setGenerateDocModal({ isOpen: true, meetingId: selectedMeeting.meeting_id })}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                <FileText size={16} /> Generate Word Doc
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                <Edit3 size={16} /> Edit &amp; Print
              </button>

              {/* Attendance Controls */}
              {selectedMeeting.attendance_status === 'open' && (
                <>
                  <button
                    type="button"
                    onClick={() => setExtendModal({ isOpen: true, meeting: selectedMeeting, minutes: 30 })}
                    className="btn btn-secondary"
                    style={{ background: '#f59e0b', color: '#fff', borderColor: '#d97706' }}
                  >
                    <Clock size={16} /> Extend (+30m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCloseAttendance(selectedMeeting)}
                    className="btn btn-danger"
                    disabled={isClosing}
                  >
                    <XCircle size={16} /> Close Register
                  </button>
                </>
              )}

              {selectedMeeting.attendance_status === 'not_started' && (
                <button
                  type="button"
                  onClick={() => handleOpenAttendance(selectedMeeting)}
                  className="btn btn-success"
                  disabled={isOpening}
                >
                  <PlayCircle size={16} /> Open Attendance
                </button>
              )}

              {selectedMeeting.attendance_status === 'closed' && (
                <>
                  <button
                    type="button"
                    onClick={() => setExtendModal({ isOpen: true, meeting: selectedMeeting, minutes: 30 })}
                    className="btn btn-warning"
                  >
                    <Clock size={16} /> Reopen / Extend
                  </button>
                  <button type="button" onClick={() => handleSubmitToHR(selectedMeeting)} className="btn btn-primary">
                    <Send size={16} /> Submit to HR
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="panel-body">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Date &amp; Schedule Time
                </span>
                <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>
                  {formatAttendanceDate(selectedMeeting.meeting_date)} ({selectedMeeting.start_time} - {selectedMeeting.end_time})
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Venue / Location
                </span>
                <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>{selectedMeeting.venue || 'Virtual Meeting'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Meeting PIN
                </span>
                <strong style={{ color: '#818cf8', fontSize: '14px', letterSpacing: '1px' }}>
                  {selectedMeeting.meeting_pin || selectedMeeting.pin || '------'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Sign-In Window
                </span>
                <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>
                  {new Date(selectedMeeting.attendance_open_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to{' '}
                  {new Date(selectedMeeting.attendance_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </div>
            </div>

            {/* Attendance Count Cards */}
            <div className="grid-stats" style={{ marginBottom: 24 }}>
              <div className="card-stat" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="stat-info">
                  <span className="stat-value" style={{ color: 'var(--text-main)' }}>{totalCount}</span>
                  <span className="stat-label" style={{ color: 'var(--text-muted)' }}>Total Attendees</span>
                </div>
              </div>
              <div className="card-stat" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="stat-info">
                  <span className="stat-value" style={{ color: 'var(--text-main)' }}>{staffAttendees.length}</span>
                  <span className="stat-label" style={{ color: 'var(--text-muted)' }}>KeNHA Staff</span>
                </div>
              </div>
              <div className="card-stat" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="stat-info">
                  <span className="stat-value" style={{ color: 'var(--text-main)' }}>{visitorAttendees.length}</span>
                  <span className="stat-label" style={{ color: 'var(--text-muted)' }}>External Visitors</span>
                </div>
              </div>
            </div>

            {isAttendanceLoading ? (
              <PageSpinner text="Loading attendance records..." />
            ) : (() => {
              const formConfig = parseMeetingFormConfig(selectedMeeting);
              const isMultiDay = Boolean(formConfig.isMultiDay && formConfig.sessionDates && formConfig.sessionDates.length > 1);
              const sessionDates = isMultiDay
                ? formConfig.sessionDates!
                : [formatAttendanceDate(selectedMeeting.meeting_date) || selectedMeeting.meeting_date];
              const aggregatedStaff = aggregateMultiDayAttendees(staffAttendees, sessionDates);
              const aggregatedVisitors = aggregateMultiDayAttendees(visitorAttendees, sessionDates);

              const staffCustomCols = formConfig.customFields.filter(cf => cf.appliesTo === 'all' || cf.appliesTo === 'staff');
              const visitorCustomCols = formConfig.customFields.filter(cf => cf.appliesTo === 'all' || cf.appliesTo === 'visitor');

              return (
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)' }}>
                    <UserCheck size={18} color="#2563eb" /> KeNHA Staff Attendance ({aggregatedStaff.length})
                  </h3>
                  {aggregatedStaff.length === 0 ? (
                    <p style={{ padding: 12, color: 'var(--text-muted)' }}>No staff registered yet.</p>
                  ) : (
                    <div className="table-responsive" style={{ marginBottom: 24 }}>
                      <table className="table-fluent" style={{ borderColor: 'var(--border-color)' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                            <th style={{ color: 'var(--text-main)' }}>No.</th>
                            <th style={{ color: 'var(--text-main)' }}>Full Name</th>
                            {formConfig.includeDesignation && <th style={{ color: 'var(--text-main)' }}>Designation</th>}
                            {formConfig.includeDepartment && <th style={{ color: 'var(--text-main)' }}>Department</th>}
                            {staffCustomCols.map(cf => (
                              <th key={cf.id} style={{ color: '#818cf8' }}>{cf.label}</th>
                            ))}
                            {!isMultiDay ? (
                              <>
                                <th style={{ color: 'var(--text-main)' }}>Time Signed</th>
                                <th style={{ color: 'var(--text-main)' }}>Digital Signature</th>
                              </>
                            ) : (
                              sessionDates.map((d, i) => (
                                <th key={d} style={{ textAlign: 'center', background: '#1e293b', color: '#fff', fontSize: 11 }}>
                                  Day {i + 1} ({d})
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {aggregatedStaff.map((att: any, index: number) => (
                            <tr key={att.attendance_id || index} style={{ borderBottomColor: 'var(--border-color)' }}>
                              <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                              <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{att.full_name}</td>
                              {formConfig.includeDesignation && <td style={{ color: 'var(--text-main)' }}>{att.designation || 'Staff'}</td>}
                              {formConfig.includeDepartment && <td style={{ color: 'var(--text-main)' }}>{att.departments?.name || att.department || 'Internal'}</td>}
                              {staffCustomCols.map(cf => (
                                <td key={cf.id} style={{ color: '#818cf8', fontWeight: 500 }}>
                                  {att.custom_responses?.[cf.key] || att[cf.key] || '—'}
                                </td>
                              ))}
                              {!isMultiDay ? (
                                <>
                                  <td style={{ color: 'var(--text-muted)' }}>{new Date(att.submitted_at).toLocaleString()}</td>
                                  <td>
                                    {att.signature_data ? (
                                      <img src={att.signature_data} alt="Signature" className="sig-img" />
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                sessionDates.map(d => {
                                  const sig = att.signaturesByDate[d] || (sessionDates.length === 1 ? att.signature_data : undefined);
                                  return (
                                    <td key={d} style={{ textAlign: 'center' }}>
                                      {sig ? (
                                        <img src={sig} alt="Signature" className="sig-img" style={{ maxHeight: 24, maxWidth: 65, objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                                      ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                      )}
                                    </td>
                                  );
                                })
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {formConfig.allowVisitors && (
                    <>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px 0', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)' }}>
                        <Users size={18} color="#059669" /> Visitors / Partners Attendance ({aggregatedVisitors.length})
                      </h3>
                      {aggregatedVisitors.length === 0 ? (
                        <p style={{ padding: 12, color: 'var(--text-muted)' }}>No visitors registered yet.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table-fluent" style={{ borderColor: 'var(--border-color)' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                                <th style={{ color: 'var(--text-main)' }}>No.</th>
                                <th style={{ color: 'var(--text-main)' }}>Full Name</th>
                                {formConfig.includeOrganization && <th style={{ color: 'var(--text-main)' }}>Company / Organization</th>}
                                {formConfig.includePosition && <th style={{ color: 'var(--text-main)' }}>Position</th>}
                                {formConfig.includePurpose && <th style={{ color: 'var(--text-main)' }}>Purpose</th>}
                                {visitorCustomCols.map(cf => (
                                  <th key={cf.id} style={{ color: '#818cf8' }}>{cf.label}</th>
                                ))}
                                {!isMultiDay ? (
                                  <>
                                    <th style={{ color: 'var(--text-main)' }}>Time Signed</th>
                                    <th style={{ color: 'var(--text-main)' }}>Digital Signature</th>
                                  </>
                                ) : (
                                  sessionDates.map((d, i) => (
                                    <th key={d} style={{ textAlign: 'center', background: '#1e293b', color: '#fff', fontSize: 11 }}>
                                      Day {i + 1} ({d})
                                    </th>
                                  ))
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {aggregatedVisitors.map((att: any, index: number) => (
                                <tr key={att.attendance_id || index} style={{ borderBottomColor: 'var(--border-color)' }}>
                                  <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{att.full_name}</td>
                                  {formConfig.includeOrganization && <td style={{ color: 'var(--text-main)' }}>{att.organization || 'External'}</td>}
                                  {formConfig.includePosition && <td style={{ color: 'var(--text-main)' }}>{att.position_title || 'N/A'}</td>}
                                  {formConfig.includePurpose && (
                                    <td>
                                      <span className="badge badge-submitted">{(att.purpose || 'guest').toUpperCase()}</span>
                                    </td>
                                  )}
                                  {visitorCustomCols.map(cf => (
                                    <td key={cf.id} style={{ color: '#818cf8', fontWeight: 500 }}>
                                      {att.custom_responses?.[cf.key] || att[cf.key] || '—'}
                                    </td>
                                  ))}
                                  {!isMultiDay ? (
                                    <>
                                      <td style={{ color: 'var(--text-muted)' }}>{new Date(att.submitted_at).toLocaleString()}</td>
                                      <td>
                                        {att.signature_data ? (
                                          <img src={att.signature_data} alt="Signature" className="sig-img" />
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                      </td>
                                    </>
                                  ) : (
                                    sessionDates.map(d => {
                                      const sig = att.signaturesByDate[d] || (sessionDates.length === 1 ? att.signature_data : undefined);
                                      return (
                                        <td key={d} style={{ textAlign: 'center' }}>
                                          {sig ? (
                                            <img src={sig} alt="Signature" className="sig-img" style={{ maxHeight: 24, maxWidth: 65, objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                          )}
                                        </td>
                                      );
                                    })
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Modals in Detail View */}
        <InviteAttendeesModal
          isOpen={!!inviteModalTarget}
          onClose={() => setInviteModalTarget(null)}
          meeting={inviteModalTarget}
          showToast={showToast}
        />

        <PrintEditorModal
          isOpen={printEditorOpen}
          onClose={() => setPrintEditorOpen(false)}
          meeting={selectedMeeting}
          staff={staffAttendees}
          visitors={visitorAttendees}
        />

        <GenerateDocumentModal
          isOpen={generateDocModal.isOpen}
          onClose={() => setGenerateDocModal({ isOpen: false, meetingId: '' })}
          meetingId={generateDocModal.meetingId}
          meeting={selectedMeeting}
          staff={staffAttendees}
          visitors={visitorAttendees}
          showToast={showToast}
          onOpenEditor={() => setPrintEditorOpen(true)}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN MEETINGS DASHBOARD (Responsive Themed UI)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '8px 0 40px 0' }}>
      {/* ── TOP HEADER ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              letterSpacing: '-0.5px',
            }}
          >
            Meetings
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
            Manage all meetings and attendance sessions
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onCreateMeeting) onCreateMeeting();
            else navigate('/create-meeting');
          }}
          style={{
            background: '#5645d4',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(86, 69, 212, 0.25)',
            transition: 'all 0.2s',
          }}
        >
          <Plus size={18} /> Create Meeting
        </button>
      </div>

      {/* ── 4 STATS CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Total Meetings */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(124, 58, 237, 0.15)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Grid size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Meetings</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, margin: '2px 0' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 500 }}>This month</div>
          </div>
        </div>

        {/* Card 2: Upcoming Meetings */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Upcoming Meetings</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, margin: '2px 0' }}>
              {stats.upcoming}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 500 }}>Next 7 days</div>
          </div>
        </div>

        {/* Card 3: Ongoing Meetings */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Ongoing Meetings</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, margin: '2px 0' }}>
              {stats.ongoing}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 500 }}>Right now</div>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Completed</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, margin: '2px 0' }}>
              {stats.completed}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 500 }}>This month</div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            minWidth: '220px',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 12px',
          }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search meetings..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '13px',
              color: 'var(--text-main)',
              width: '100%',
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '13px',
            color: 'var(--text-main)',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="all">All Status</option>
          <option value="open">Ongoing (Open)</option>
          <option value="not_started">Upcoming (Awaiting)</option>
          <option value="closed">Completed (Closed)</option>
        </select>

        {/* Types Filter */}
        <select
          value={typeFilter}
          onChange={e => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '13px',
            color: 'var(--text-main)',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="all">All Types</option>
          <option value="physical">Physical</option>
          <option value="virtual">Virtual</option>
          <option value="hybrid">Hybrid</option>
        </select>

        {/* Date Filter Input */}
        <input
          type="date"
          value={dateFilter}
          onChange={e => {
            setDateFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12.5px',
            color: 'var(--text-main)',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
          }}
          title="Filter by meeting date"
        />

        {/* Clear Filters Button */}
        {(search || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setTypeFilter('all');
              setDateFilter('');
              setCurrentPage(1);
            }}
            style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SlidersHorizontal size={14} /> Clear Filters
          </button>
        )}
      </div>

      {/* ── MEETINGS TABLE ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          overflow: 'visible',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {isMeetingsLoading ? (
          <div style={{ padding: '40px 0' }}>
            <PageSpinner text="Loading meetings..." />
          </div>
        ) : paginatedMeetings.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={40} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>No meetings found</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {search || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter
                ? 'Try adjusting your search or filters to see more results.'
                : 'Click "+ Create Meeting" to schedule your first meeting attendance register.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 16px 14px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    MEETING DETAILS
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    AUDIENCE
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    DATE &amp; TIME
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    VENUE
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '14px 20px 14px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', textAlign: 'right' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedMeetings.map((m: any) => {
                  const deptDisplay = resolveDepartmentDisplay(m, 'All Organization');
                  const audienceSubtext = m.department_id ? '1 Department' : m.department_label ? 'Custom Group' : 'All Departments';
                  const accentColor = getRowAccentColor(m.meeting_type, m.attendance_status);

                  return (
                    <tr
                      key={m.meeting_id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Left Accent Bar */}
                      <td style={{ padding: '16px 16px 16px 20px', position: 'relative' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '4px',
                            backgroundColor: accentColor,
                          }}
                        />
                        <div
                          onClick={() => setSelectedMeetingId(m.meeting_id)}
                          style={{
                            fontWeight: 700,
                            fontSize: '13.5px',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            marginBottom: '4px',
                          }}
                        >
                          {m.title}
                        </div>
                        <div>{renderTypeBadge(m.meeting_type)}</div>
                      </td>

                      {/* Audience */}
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                          {deptDisplay}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {audienceSubtext}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          {formatAttendanceDate(m.meeting_date)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                          <Clock size={13} color="var(--text-muted)" />
                          {m.start_time} - {m.end_time}
                        </div>
                      </td>

                      {/* Venue */}
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                          <MapPin size={13} color="var(--text-muted)" />
                          {m.venue || (m.meeting_type === 'virtual' ? 'Virtual Meeting' : 'Online')}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', marginLeft: '19px' }}>
                          {m.meeting_type === 'virtual' ? 'Online' : 'KeNHA Station'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                        {renderStatusBadge(m.attendance_status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px 16px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          {/* View Register Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedMeetingId(m.meeting_id)}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s',
                            }}
                          >
                            <Eye size={14} color="var(--text-muted)" /> View Register
                          </button>

                          {/* Live Board Button */}
                          <button
                            type="button"
                            onClick={() => navigate(`/meeting/${m.meeting_id}/live`)}
                            style={{
                              background: '#5645d4',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            Live Board
                          </button>

                          {/* Context Menu Button */}
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === m.meeting_id ? null : m.meeting_id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuId === m.meeting_id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  marginTop: '4px',
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '10px',
                                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
                                  zIndex: 100,
                                  minWidth: '190px',
                                  padding: '6px 0',
                                  textAlign: 'left',
                                }}
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInviteModalTarget(m);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: '#818cf8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <Mail size={14} color="#818cf8" /> Invite via Email
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveQRMeeting({
                                      id: m.meeting_id,
                                      title: m.title,
                                      pin: m.meeting_pin || m.pin || '',
                                    });
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <QrCode size={14} color="var(--text-muted)" /> Show QR &amp; PIN
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditMeetingTarget(m);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <Edit3 size={14} color="var(--text-muted)" /> Edit Meeting
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setGenerateDocModal({ isOpen: true, meetingId: m.meeting_id });
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <FileText size={14} color="var(--text-muted)" /> Generate Document
                                </button>

                                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                                {m.attendance_status === 'not_started' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenAttendance(m);
                                      setActiveMenuId(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 14px',
                                      border: 'none',
                                      background: 'none',
                                      fontSize: '12.5px',
                                      fontWeight: 500,
                                      color: '#10b981',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}
                                  >
                                    <PlayCircle size={14} color="#10b981" /> Open Attendance
                                  </button>
                                )}

                                {m.attendance_status === 'open' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExtendModal({ isOpen: true, meeting: m, minutes: 30 });
                                        setActiveMenuId(null);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '8px 14px',
                                        border: 'none',
                                        background: 'none',
                                        fontSize: '12.5px',
                                        fontWeight: 500,
                                        color: '#f59e0b',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                      }}
                                    >
                                      <Clock size={14} color="#f59e0b" /> Extend (+30m)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleCloseAttendance(m);
                                        setActiveMenuId(null);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '8px 14px',
                                        border: 'none',
                                        background: 'none',
                                        fontSize: '12.5px',
                                        fontWeight: 500,
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                      }}
                                    >
                                      <XCircle size={14} color="#ef4444" /> Close Attendance
                                    </button>
                                  </>
                                )}

                                {m.attendance_status === 'closed' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExtendModal({ isOpen: true, meeting: m, minutes: 30 });
                                      setActiveMenuId(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 14px',
                                      border: 'none',
                                      background: 'none',
                                      fontSize: '12.5px',
                                      fontWeight: 500,
                                      color: '#f59e0b',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}
                                  >
                                    <Clock size={14} color="#f59e0b" /> Reopen / Extend
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION FOOTER ── */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-card)',
            borderRadius: '0 0 14px 14px',
          }}
        >
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Showing {paginatedMeetings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredMeetings.length)} of {filteredMeetings.length} meetings
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Prev */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: currentPage <= 1 ? 'var(--text-dim)' : 'var(--text-main)',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
              if (totalPages > 6 && p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} style={{ padding: '0 4px', color: 'var(--text-dim)' }}>...</span>;
                }
                return null;
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: isActive ? 'none' : '1px solid var(--border-color)',
                    background: isActive ? '#5645d4' : 'var(--bg-card)',
                    color: isActive ? '#ffffff' : 'var(--text-main)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p}
                </button>
              );
            })}

            {/* Next */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: currentPage >= totalPages ? 'var(--text-dim)' : 'var(--text-main)',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={16} />
            </button>

            {/* Page Size Select */}
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                marginLeft: '8px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '12px',
                color: 'var(--text-main)',
                background: 'var(--bg-card)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <InviteAttendeesModal
        isOpen={!!inviteModalTarget}
        onClose={() => setInviteModalTarget(null)}
        meeting={inviteModalTarget}
        showToast={showToast}
      />

      <EditMeetingModal
        meeting={editMeetingTarget}
        isOpen={!!editMeetingTarget}
        onClose={() => setEditMeetingTarget(null)}
        showToast={showToast}
      />

      <GenerateDocumentModal
        isOpen={generateDocModal.isOpen}
        onClose={() => setGenerateDocModal({ isOpen: false, meetingId: '' })}
        meetingId={generateDocModal.meetingId}
        meeting={paginatedMeetings.find(m => m.meeting_id === generateDocModal.meetingId) || selectedMeeting}
        staff={[]}
        visitors={[]}
        showToast={showToast}
      />

      {/* Extend Attendance Window Modal */}
      {extendModal.isOpen && extendModal.meeting && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="modal-content"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Extend Attendance Window</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {extendModal.meeting.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Choose how much additional time to add to this meeting's attendance register. This immediately keeps or re-opens the session so participants can continue signing in.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[15, 30, 60, 120, 180, 240].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setExtendModal(prev => ({ ...prev, minutes: mins }))}
                  className={`btn ${extendModal.minutes === mins ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: 12,
                    padding: '8px 4px',
                    textAlign: 'center',
                    backgroundColor: extendModal.minutes === mins ? '#5645d4' : 'var(--bg-app)',
                    color: extendModal.minutes === mins ? '#ffffff' : 'var(--text-main)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  +{mins >= 60 ? `${mins / 60} hr${mins / 60 > 1 ? 's' : ''}` : `${mins} mins`}
                </button>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="custom-minutes" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>
                Or enter custom minutes:
              </label>
              <input
                id="custom-minutes"
                type="number"
                min={1}
                max={1440}
                className="form-input"
                value={extendModal.minutes}
                onChange={e => setExtendModal(prev => ({ ...prev, minutes: Math.max(1, parseInt(e.target.value) || 1) }))}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderColor: 'var(--border-color)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setExtendModal({ isOpen: false, meeting: null, minutes: 30 })}
                className="btn btn-secondary"
                disabled={isExtending}
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteExtend}
                className="btn btn-primary"
                disabled={isExtending}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {isExtending ? <InlineSpinner /> : <Clock size={16} />}
                Confirm &amp; Extend ({extendModal.minutes} min)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
