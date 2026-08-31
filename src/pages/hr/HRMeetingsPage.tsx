import React, { useState } from 'react';
import { Search, Eye, Edit3, FileText } from 'lucide-react';
import { PageSpinner } from '../../components/shared/Feedback';
import { useGetMeetingsQuery, useGetMeetingAttendanceQuery } from '../../features/apis/apiSlice';
import { GenerateDocumentModal } from '../../components/documents/GenerateDocumentModal';
import { PrintEditorModal } from '../../components/documents/PrintEditorModal';
import { resolveDepartmentDisplay } from '../../types/formConfig';

import type { User } from '../../data/mockData';

interface HRMeetingsPageProps {
  currentUser?: User;
  dbTick?: number;
  showToast?: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate?: () => void;
  navigate?: (path: string) => void;
  setActiveQRMeeting?: (m: any) => void;
}

export const HRMeetingsPage: React.FC<HRMeetingsPageProps> = ({ showToast = () => {} }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [generateDocModal, setGenerateDocModal] = useState<{isOpen: boolean; meetingId: string}>({isOpen: false, meetingId: ''});
  const [printEditorOpen, setPrintEditorOpen] = useState(false);

  // Queries
  const { data: meetingsResponse, isLoading: isMeetingsLoading } = useGetMeetingsQuery(undefined, {
    pollingInterval: 3000, // real-time refresh
  });

  const { data: attendanceResponse, isLoading: isAttendanceLoading } = useGetMeetingAttendanceQuery(
    selectedMeetingId || '',
    {
      skip: !selectedMeetingId,
      pollingInterval: 3000, // real-time attendee list
    }
  );

  const selectedMeeting = React.useMemo(() => {
    if (!selectedMeetingId || !Array.isArray(meetingsResponse?.data)) return null;
    return meetingsResponse.data.find((m: any) => m.meeting_id === selectedMeetingId);
  }, [selectedMeetingId, meetingsResponse]);

  const filteredMeetings = React.useMemo(() => {
    if (!Array.isArray(meetingsResponse?.data)) return [];
    return meetingsResponse.data.filter((m: any) => {
      const matchesSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.venue || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.profiles?.email || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter ? m.meeting_type === typeFilter : true;
      return matchesSearch && matchesType;
    });
  }, [meetingsResponse, search, typeFilter]);

  const handlePrint = () => setPrintEditorOpen(true);

  if (selectedMeetingId && selectedMeeting) {
    const staffAttendees = Array.isArray(attendanceResponse?.data?.staff) ? attendanceResponse.data.staff : [];
    const visitorAttendees = Array.isArray(attendanceResponse?.data?.visitors) ? attendanceResponse.data.visitors : [];
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
                {resolveDepartmentDisplay(selectedMeeting, 'KeNHA Department')}
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
            <div style={{ display: 'flex', gap: 10 }} className="btn-group-no-print">
              <button type="button" onClick={() => setGenerateDocModal({ isOpen: true, meetingId: selectedMeeting.meeting_id })} className="btn btn-primary">
                <FileText size={16} /> Generate Document
              </button>
              <button type="button" onClick={handlePrint} className="btn btn-secondary">
                <Edit3 size={16} /> Edit &amp; Print
              </button>
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
            ) : (
              <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid var(--border-color)', paddingBottom: 6 }}>
                  1. KeNHA Internal Staff Register
                </h3>
                {staffAttendees.length === 0 ? (
                  <p style={{ padding: 12, color: 'var(--text-muted)' }}>No staff registered.</p>
                ) : (
                  <div className="table-responsive" style={{ marginBottom: 24 }}>
                    <table className="table-fluent">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Full Name</th>
                          <th>Designation</th>
                          <th>Department</th>
                          <th>Time Signed</th>
                          <th>Digital Signature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffAttendees.map((att: any, index: number) => (
                          <tr key={att.attendance_id}>
                            <td>{index + 1}</td>
                            <td style={{ fontWeight: 600 }}>{att.full_name}</td>
                            <td>{att.designation}</td>
                            <td>{att.departments?.name || 'Internal'}</td>
                            <td>{new Date(att.submitted_at).toLocaleString()}</td>
                            <td>
                              <img src={att.signature_data} alt="Signature drawing" className="sig-img" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '32px 0 12px 0', borderBottom: '2px solid var(--border-color)', paddingBottom: 6 }}>
                  2. External Visitors Register
                </h3>
                {visitorAttendees.length === 0 ? (
                  <p style={{ padding: 12, color: 'var(--text-muted)' }}>No external visitors registered.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table-fluent">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Full Name</th>
                          <th>Company / Organization</th>
                          <th>Position</th>
                          <th>Purpose</th>
                          <th>Time Signed</th>
                          <th>Digital Signature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorAttendees.map((att: any, index: number) => (
                          <tr key={att.attendance_id}>
                            <td>{index + 1}</td>
                            <td style={{ fontWeight: 600 }}>{att.full_name}</td>
                            <td>{att.organization}</td>
                            <td>{att.position_title || 'N/A'}</td>
                            <td>
                              <span className="badge badge-submitted">{att.purpose.toUpperCase()}</span>
                            </td>
                            <td>{new Date(att.submitted_at).toLocaleString()}</td>
                            <td>
                              <img src={att.signature_data} alt="Signature drawing" className="sig-img" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <PrintEditorModal
          isOpen={printEditorOpen}
          onClose={() => setPrintEditorOpen(false)}
          meeting={selectedMeeting}
          staff={attendanceResponse?.data?.staff || []}
          visitors={attendanceResponse?.data?.visitors || []}
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
            placeholder="Search meetings by title, venue, or organizer email..."
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
                    <th>Organizer</th>
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
                      <td>{resolveDepartmentDisplay(m, 'KeNHA Department')}</td>
                      <td>{m.profiles?.email || 'N/A'}</td>
                      <td>
                        <span className={`badge ${m.attendance_status === 'open' ? 'badge-active' : m.attendance_status === 'not_started' ? 'badge-closed' : 'badge-submitted'}`}>
                          {m.attendance_status === 'open' ? 'Open' : m.attendance_status === 'not_started' ? 'Awaiting' : 'Closed'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedMeetingId(m.meeting_id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          <Eye size={12} className="btn-icon" /> View Register
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <GenerateDocumentModal
        isOpen={generateDocModal.isOpen}
        onClose={() => setGenerateDocModal({ isOpen: false, meetingId: '' })}
        meetingId={generateDocModal.meetingId}
        showToast={showToast}
      />
    </div>
  );
};
