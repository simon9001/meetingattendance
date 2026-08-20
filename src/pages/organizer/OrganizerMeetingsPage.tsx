import React, { useState } from 'react';
import { Search, Eye, QrCode, Send, Edit3, FileText, Clock, PlayCircle, XCircle, Mail, CalendarDays } from 'lucide-react';
import { PageSpinner, InlineSpinner } from '../../components/shared/Feedback';
import { GenerateDocumentModal } from '../../components/documents/GenerateDocumentModal';
import { PrintEditorModal } from '../../components/documents/PrintEditorModal';
import type { User } from '../../data/mockData';
import {
  useGetMeetingsQuery,
  useGetMeetingAttendanceQuery,
  useOpenMeetingAttendanceMutation,
  useCloseMeetingAttendanceMutation,
  useExtendMeetingAttendanceMutation,
  useGenerateReportMutation,
  useSubmitReportToHRMutation,
  useSendMeetingRemindersMutation,
} from '../../features/apis/apiSlice';
import { parseMeetingFormConfig, aggregateMultiDayAttendees, formatAttendanceDate } from '../../types/formConfig';

interface OrganizerMeetingsPageProps {
  currentUser: User;
  dbTick: number;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
  navigate: (path: string) => void;
  setActiveQRMeeting: (m: any) => void;
}

export const OrganizerMeetingsPage: React.FC<OrganizerMeetingsPageProps> = ({
  showToast,
  navigate,
  setActiveQRMeeting,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [generateDocModal, setGenerateDocModal] = useState<{isOpen: boolean; meetingId: string}>({isOpen: false, meetingId: ''});
  const [printEditorOpen, setPrintEditorOpen] = useState(false);
  const [extendModal, setExtendModal] = useState<{ isOpen: boolean; meeting: any; minutes: number }>({
    isOpen: false,
    meeting: null,
    minutes: 30,
  });

  // Queries
  const { data: meetingsResponse, isLoading: isMeetingsLoading } = useGetMeetingsQuery(undefined, {
    pollingInterval: 3000, // real-time updates for list
  });

  const { data: attendanceResponse, isLoading: isAttendanceLoading } = useGetMeetingAttendanceQuery(
    selectedMeetingId || '',
    {
      skip: !selectedMeetingId,
      pollingInterval: 3000, // real-time attendee list!
    }
  );

  // Mutations
  const [openAttendance, { isLoading: isOpening }] = useOpenMeetingAttendanceMutation();
  const [closeAttendance, { isLoading: isClosing }] = useCloseMeetingAttendanceMutation();
  const [extendAttendance, { isLoading: isExtending }] = useExtendMeetingAttendanceMutation();
  const [generateReport] = useGenerateReportMutation();
  const [submitToHR] = useSubmitReportToHRMutation();
  const [sendMeetingReminders, { isLoading: isSendingReminders }] = useSendMeetingRemindersMutation();

  // Multi-day reminder modal state
  const [reminderModal, setReminderModal] = useState<{
    isOpen: boolean;
    meeting: any;
    dayLabel: string;
    dateStr: string;
    emails: string;
  }>({
    isOpen: false,
    meeting: null,
    dayLabel: '',
    dateStr: '',
    emails: '',
  });

  const handleOpenReminderModal = (m: any) => {
    const config = parseMeetingFormConfig(m);
    const defaultDate = config.activeSessionDate || (config.sessionDates && config.sessionDates[0]) || m.meeting_date;
    const defaultDayIdx = config.sessionDates ? config.sessionDates.indexOf(defaultDate) : -1;
    const defaultDayLabel = defaultDayIdx >= 0 ? `Day ${defaultDayIdx + 1}` : 'Session';
    const defaultEmails = (config.participantEmails || []).join(', ');

    setReminderModal({
      isOpen: true,
      meeting: m,
      dayLabel: defaultDayLabel,
      dateStr: defaultDate,
      emails: defaultEmails,
    });
  };

  const handleSendRemindersExecute = async () => {
    if (!reminderModal.meeting) return;
    try {
      const emailList = reminderModal.emails
        .split(/[\n,;]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => e && e.includes('@'));

      const res = await sendMeetingReminders({
        meetingId: reminderModal.meeting.meeting_id,
        dayLabel: reminderModal.dayLabel,
        dateStr: reminderModal.dateStr,
        emails: emailList.length > 0 ? emailList : undefined,
      }).unwrap();

      showToast(res.message || `Successfully sent reminder emails via Resend!`, 'success');
      setReminderModal({ isOpen: false, meeting: null, dayLabel: '', dateStr: '', emails: '' });
    } catch (err: any) {
      showToast(err?.data?.error || err?.data?.message || 'Failed to dispatch reminders', 'error');
    }
  };

  // Find currently selected meeting details from the list response
  const selectedMeeting = React.useMemo(() => {
    if (!selectedMeetingId || !meetingsResponse?.data) return null;
    return meetingsResponse.data.find((m: any) => m.meeting_id === selectedMeetingId);
  }, [selectedMeetingId, meetingsResponse]);

  const filteredMeetings = React.useMemo(() => {
    if (!meetingsResponse?.data) return [];
    return meetingsResponse.data.filter((m: any) => {
      const matchesSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.venue || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter ? m.meeting_type === typeFilter : true;
      return matchesSearch && matchesType;
    });
  }, [meetingsResponse, search, typeFilter]);

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
        minutes: Number(extendModal.minutes) || 30,
      }).unwrap();
      showToast(`Attendance window extended by ${extendModal.minutes} minutes. Register is OPEN!`, 'success');
      setExtendModal({ isOpen: false, meeting: null, minutes: 30 });
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to extend attendance', 'error');
    }
  };

  const handleSubmitToHR = async (m: any) => {
    try {
      // 1. Generate report first (gives draft)
      const genRes = await generateReport(m.meeting_id).unwrap();
      const reportId = genRes.data?.report?.report_id;
      if (!reportId) {
        throw new Error('Report could not be generated.');
      }

      // 2. Submit to HR
      await submitToHR(reportId).unwrap();
      showToast('Report submitted successfully to the Human Resource repository', 'success');
    } catch (err: any) {
      showToast(err?.data?.error || err?.message || 'Failed to submit report to HR', 'error');
    }
  };

  const handlePrint = () => setPrintEditorOpen(true);

  if (selectedMeetingId && selectedMeeting) {
    const staffAttendees = attendanceResponse?.data?.staff || [];
    const visitorAttendees = attendanceResponse?.data?.visitors || [];
    const totalCount = attendanceResponse?.data?.total || 0;

    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedMeetingId(null)}
          className="btn btn-secondary"
          style={{ marginBottom: 20 }}
        >
          ← Back to Meetings List
        </button>

        <div className="print-only-header">
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 900 }}>KeNHA</h1>
          <p style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>Kenya National Highways Authority</p>
          <div className="print-title">OFFICIAL MEETING & TRAINING ATTENDANCE REGISTER</div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="badge badge-submitted" style={{ marginRight: 8 }}>
                {selectedMeeting.departments?.name || 'KeNHA Department'}
              </span>
              <span
                className={`badge ${
                  selectedMeeting.meeting_type === 'physical'
                    ? 'badge-physical'
                    : selectedMeeting.meeting_type === 'virtual'
                    ? 'badge-virtual'
                    : 'badge-hybrid'
                }`}
              >
                {selectedMeeting.meeting_type.toUpperCase()}
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{selectedMeeting.title}</h2>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} className="btn-group-no-print">
              <button type="button" onClick={() => handleOpenReminderModal(selectedMeeting)} className="btn btn-secondary" style={{ background: '#2563eb', color: '#fff', borderColor: '#1d4ed8' }} title="Send email reminder with PIN & attendance link via Resend">
                <Mail size={16} /> Send Daily Reminder (Resend)
              </button>
              <button type="button" onClick={() => setGenerateDocModal({ isOpen: true, meetingId: selectedMeeting.meeting_id })} className="btn btn-primary">
                <FileText size={16} /> Generate Document
              </button>
              <button type="button" onClick={handlePrint} className="btn btn-secondary">
                <Edit3 size={16} /> Edit &amp; Print
              </button>

              {/* ── Attendance Controls (Open / Extend / Reopen / Close) ── */}
              {selectedMeeting.attendance_status === 'open' && (
                <>
                  <button
                    type="button"
                    onClick={() => setExtendModal({ isOpen: true, meeting: selectedMeeting, minutes: 30 })}
                    className="btn btn-secondary"
                    style={{ background: '#f59e0b', color: '#fff', borderColor: '#d97706' }}
                    title="Extend Attendance Window"
                  >
                    <Clock size={16} /> Extend Time (+30m)
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
                  <PlayCircle size={16} /> Open Attendance Register
                </button>
              )}

              {selectedMeeting.attendance_status === 'closed' && (
                <>
                  <button
                    type="button"
                    onClick={() => setExtendModal({ isOpen: true, meeting: selectedMeeting, minutes: 30 })}
                    className="btn btn-warning"
                    title="Re-open attendance register and extend closing time"
                  >
                    <Clock size={16} /> Reopen / Extend Register
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
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}
              className="meeting-summary-info"
            >
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Organizer</span>
                <strong>{selectedMeeting.profiles?.email || 'Organizing Profile'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Venue</span>
                <strong>{selectedMeeting.venue || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Date / Schedule Time</span>
                <strong>
                  {selectedMeeting.meeting_date} ({selectedMeeting.start_time} - {selectedMeeting.end_time})
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Attendance Log Window</span>
                <strong>
                  {new Date(selectedMeeting.attendance_open_time).toLocaleTimeString()} to{' '}
                  {new Date(selectedMeeting.attendance_close_time).toLocaleTimeString()}
                </strong>
              </div>
            </div>

            <div className="grid-stats" style={{ marginBottom: 24 }}>
              <div className="card-stat">
                <div className="stat-info">
                  <span className="stat-value">{totalCount}</span>
                  <span className="stat-label">Total Submissions</span>
                </div>
              </div>
              <div className="card-stat">
                <div className="stat-info">
                  <span className="stat-value">{staffAttendees.length}</span>
                  <span className="stat-label">KeNHA Staff</span>
                </div>
              </div>
              <div className="card-stat">
                <div className="stat-info">
                  <span className="stat-value">{visitorAttendees.length}</span>
                  <span className="stat-label">External Visitors</span>
                </div>
              </div>
            </div>

            {isAttendanceLoading ? (
              <PageSpinner text="Loading attendance records..." />
            ) : (() => {
              const formConfig = parseMeetingFormConfig(selectedMeeting);
              const isMultiDay = Boolean(formConfig.isMultiDay && formConfig.sessionDates && formConfig.sessionDates.length > 1);
              const sessionDates = isMultiDay ? formConfig.sessionDates! : [formatAttendanceDate(selectedMeeting.meeting_date) || selectedMeeting.meeting_date];
              const aggregatedStaff = aggregateMultiDayAttendees(staffAttendees, sessionDates);
              const aggregatedVisitors = aggregateMultiDayAttendees(visitorAttendees, sessionDates);

              const staffCustomCols = formConfig.customFields.filter(cf => cf.appliesTo === 'all' || cf.appliesTo === 'staff');
              const visitorCustomCols = formConfig.customFields.filter(cf => cf.appliesTo === 'all' || cf.appliesTo === 'visitor');

              return (
                <div style={{ marginTop: 32 }}>
                  {/* Multi-Day Session Days Banner */}
                  {isMultiDay && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CalendarDays size={18} style={{ color: '#16a34a' }} />
                        <div>
                          <strong style={{ fontSize: 13, color: '#166534' }}>
                            Multi-Day Session Active ({sessionDates.length} Days)
                          </strong>
                          <div style={{ fontSize: 11, color: '#15803d' }}>
                            Daily signatures aggregated in 1 row per participant.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {sessionDates.map((d, idx) => (
                          <span key={d} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                            Day {idx + 1}: {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid var(--border-color)', paddingBottom: 6 }}>
                    1. KeNHA Internal Staff Register ({aggregatedStaff.length})
                  </h3>
                  {aggregatedStaff.length === 0 ? (
                    <p style={{ padding: 12, color: 'var(--text-muted)' }}>No staff registered.</p>
                  ) : (
                    <div className="table-responsive" style={{ marginBottom: 24 }}>
                      <table className="table-fluent">
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Full Name</th>
                            {formConfig.includeDesignation && <th>Designation</th>}
                            {formConfig.includeDepartment && <th>Department</th>}
                            {staffCustomCols.map(cf => (
                              <th key={cf.id} style={{ color: '#2563eb' }}>{cf.label}</th>
                            ))}
                            {!isMultiDay ? (
                              <>
                                <th>Time Signed</th>
                                <th>Digital Signature</th>
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
                            <tr key={att.attendance_id || index}>
                              <td>{index + 1}</td>
                              <td style={{ fontWeight: 600 }}>{att.full_name}</td>
                              {formConfig.includeDesignation && <td>{att.designation || 'Staff'}</td>}
                              {formConfig.includeDepartment && <td>{att.departments?.name || att.department || 'Internal'}</td>}
                              {staffCustomCols.map(cf => (
                                <td key={cf.id} style={{ color: '#1e40af', fontWeight: 500 }}>
                                  {att.custom_responses?.[cf.key] || att[cf.key] || '—'}
                                </td>
                              ))}
                              {!isMultiDay ? (
                                <>
                                  <td>{new Date(att.submitted_at).toLocaleString()}</td>
                                  <td>
                                    {att.signature_data ? (
                                      <img src={att.signature_data} alt="Signature" className="sig-img" />
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
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
                                        <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
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

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '32px 0 12px 0', borderBottom: '2px solid var(--border-color)', paddingBottom: 6 }}>
                    2. External Visitors Register ({aggregatedVisitors.length})
                  </h3>
                  {aggregatedVisitors.length === 0 ? (
                    <p style={{ padding: 12, color: 'var(--text-muted)' }}>No external visitors registered.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table-fluent">
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Full Name</th>
                            {formConfig.includeOrganization && <th>Company / Organization</th>}
                            {formConfig.includePosition && <th>Position</th>}
                            {formConfig.includePurpose && <th>Purpose</th>}
                            {visitorCustomCols.map(cf => (
                              <th key={cf.id} style={{ color: '#2563eb' }}>{cf.label}</th>
                            ))}
                            {!isMultiDay ? (
                              <>
                                <th>Time Signed</th>
                                <th>Digital Signature</th>
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
                            <tr key={att.attendance_id || index}>
                              <td>{index + 1}</td>
                              <td style={{ fontWeight: 600 }}>{att.full_name}</td>
                              {formConfig.includeOrganization && <td>{att.organization || 'External'}</td>}
                              {formConfig.includePosition && <td>{att.position_title || 'N/A'}</td>}
                              {formConfig.includePurpose && (
                                <td>
                                  <span className="badge badge-submitted">{(att.purpose || 'guest').toUpperCase()}</span>
                                </td>
                              )}
                              {visitorCustomCols.map(cf => (
                                <td key={cf.id} style={{ color: '#1e40af', fontWeight: 500 }}>
                                  {att.custom_responses?.[cf.key] || att[cf.key] || '—'}
                                </td>
                              ))}
                              {!isMultiDay ? (
                                <>
                                  <td>{new Date(att.submitted_at).toLocaleString()}</td>
                                  <td>
                                    {att.signature_data ? (
                                      <img src={att.signature_data} alt="Signature" className="sig-img" />
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
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
                                        <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
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
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Resend Daily Reminder Modal ── */}
        {reminderModal.isOpen && (
          <dialog className="modal modal-open">
            <div className="modal-box w-11/12 max-w-lg bg-base-100 shadow-2xl rounded-2xl p-6 relative border border-base-200">
              <button
                type="button"
                onClick={() => setReminderModal({ isOpen: false, meeting: null, dayLabel: '', dateStr: '', emails: '' })}
                className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Mail size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Send Attendance Reminder via Resend</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Dispatch daily PIN &amp; sign-in link to participants</p>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{reminderModal.meeting?.title}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  PIN: <strong>{reminderModal.meeting?.pin}</strong> &bull; Venue: {reminderModal.meeting?.venue || 'KeNHA Headquarters'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Session Day Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={reminderModal.dayLabel}
                      onChange={e => setReminderModal({ ...reminderModal, dayLabel: e.target.value })}
                      placeholder="e.g. Day 2"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Session Date</label>
                    <input
                      type="text"
                      className="form-input"
                      value={reminderModal.dateStr}
                      onChange={e => setReminderModal({ ...reminderModal, dateStr: e.target.value })}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Recipient Email Addresses (Leave blank to notify all active staff):
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={reminderModal.emails}
                    onChange={e => setReminderModal({ ...reminderModal, emails: e.target.value })}
                    placeholder="engineer@kenha.co.ke, consultant@partner.com"
                  />
                </div>
              </div>

              <div className="modal-action" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setReminderModal({ isOpen: false, meeting: null, dayLabel: '', dateStr: '', emails: '' })}
                  className="btn btn-secondary"
                  disabled={isSendingReminders}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendRemindersExecute}
                  className="btn btn-primary"
                  disabled={isSendingReminders}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isSendingReminders ? <InlineSpinner /> : <Mail size={16} />}
                  Send Email Reminders
                </button>
              </div>
            </div>
          </dialog>
        )}

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

  return (
    <div>
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search meetings by title or venue..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Meeting Types</option>
          <option value="physical">Physical Only</option>
          <option value="virtual">Virtual Only</option>
          <option value="hybrid">Hybrid Only</option>
        </select>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header"><h3>Meetings Register</h3></div>
        <div className="panel-body">
          {isMeetingsLoading ? (
            <PageSpinner text="Loading meetings..." />
          ) : filteredMeetings.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No meetings found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table-fluent">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Venue / Schedule</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map((m: any) => (
                    <tr key={m.meeting_id}>
                      <td><div style={{ fontWeight: 600 }}>{m.title}</div></td>
                      <td>
                        <span className={`badge ${m.meeting_type === 'physical' ? 'badge-physical' : m.meeting_type === 'virtual' ? 'badge-virtual' : 'badge-hybrid'}`}>
                          {m.meeting_type}
                        </span>
                      </td>
                      <td>
                        <div>{m.venue || 'Virtual'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {m.meeting_date} | {m.start_time}-{m.end_time}
                        </div>
                      </td>
                      <td>{m.departments?.name || 'KeNHA Department'}</td>
                      <td>
                        <span className={`badge ${m.attendance_status === 'open' ? 'badge-active' : m.attendance_status === 'not_started' ? 'badge-closed' : 'badge-submitted'}`}>
                          {m.attendance_status === 'open' ? 'Open' : m.attendance_status === 'not_started' ? 'Awaiting' : 'Closed'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {m.attendance_status === 'not_started' && (
                            <button
                              type="button"
                              onClick={() => handleOpenAttendance(m)}
                              className="btn btn-success"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              title="Open Attendance Register"
                              disabled={isOpening}
                            >
                              <PlayCircle size={12} className="btn-icon" /> Open
                            </button>
                          )}
                          {m.attendance_status === 'open' && (
                            <button
                              type="button"
                              onClick={() => setExtendModal({ isOpen: true, meeting: m, minutes: 30 })}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 11, background: '#f59e0b', color: '#fff', borderColor: '#d97706' }}
                              title="Extend Attendance Window"
                            >
                              <Clock size={12} className="btn-icon" /> +30m
                            </button>
                          )}
                          {m.attendance_status === 'closed' && (
                            <button
                              type="button"
                              onClick={() => setExtendModal({ isOpen: true, meeting: m, minutes: 30 })}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              title="Reopen / Extend Attendance"
                            >
                              <Clock size={12} className="btn-icon" /> Reopen
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedMeetingId(m.meeting_id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                          >
                            <Eye size={12} className="btn-icon" /> View Register
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveQRMeeting({
                              id: m.meeting_id,
                              title: m.title,
                              pin: m.meeting_pin
                            })}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            title="QR Code and Sign-in details"
                          >
                            <QrCode size={12} className="btn-icon" /> Register Info
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/meeting/${m.meeting_id}/live`)}
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                          >
                            Live Board
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Extend Attendance Window Modal ── */}
      {extendModal.isOpen && extendModal.meeting && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div className="modal-content" style={{
            background: 'var(--card-bg, #fff)',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                background: '#fef3c7',
                color: '#d97706',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Clock size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Extend Attendance Window</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {extendModal.meeting.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Choose how much additional time to add to this meeting's attendance register. This immediately keeps or re-opens the session so participants can continue signing in.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[15, 30, 60, 120, 180, 240].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setExtendModal(prev => ({ ...prev, minutes: mins }))}
                  className={`btn ${extendModal.minutes === mins ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12, padding: '8px 4px', textAlign: 'center' }}
                >
                  +{mins >= 60 ? `${mins / 60} hr${mins / 60 > 1 ? 's' : ''}` : `${mins} mins`}
                </button>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="custom-minutes" style={{ fontSize: 12, fontWeight: 600 }}>Or enter custom minutes:</label>
              <input
                id="custom-minutes"
                type="number"
                min={1}
                max={1440}
                className="form-input"
                value={extendModal.minutes}
                onChange={e => setExtendModal(prev => ({ ...prev, minutes: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setExtendModal({ isOpen: false, meeting: null, minutes: 30 })}
                className="btn btn-secondary"
                disabled={isExtending}
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
