import React, { useState, useEffect, useMemo } from 'react';
import {
  Info, MapPin, ShieldCheck, Video, Laptop,
  Building2, CheckCircle2, AlertCircle, Dices,
  Check, FileText, Clock
} from 'lucide-react';
import type { User } from '../../data/mockData';
import { useCreateMeetingMutation, useGetDepartmentsQuery } from '../../features/apis/apiSlice';
import { PageSpinner, InlineSpinner } from '../../components/shared/Feedback';
import { FormFieldsCustomizer } from '../../components/meetings/FormFieldsCustomizer';
import { FormSection } from '../../components/meetings/FormSection';
import { DepartmentPicker } from '../../components/meetings/DepartmentPicker';
import type { MeetingFormConfig } from '../../types/formConfig';
import { DEFAULT_MEETING_FORM_CONFIG } from '../../types/formConfig';

interface CreateMeetingPageProps {
  currentUser: User;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
  setActiveTab: (t: string) => void;
}

const TITLE_SUGGESTIONS = [
  'FY 2026/27 Budget Consultation',
  'Regional Highway Safety Audit',
  'Senior Management Quarterly Review',
  'Contractors & Consultants Site Briefing',
  'ICT Systems & Security Training',
];

const SAMPLE_DESCRIPTION =
  'Official consultative session to review project milestones, align on operational deliverables, and verify attendance compliance for KeNHA records.';

// Helper to compute local current date and times dynamically
const getInitialMeetingTimes = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Round up start minute to next 5 or 0 minute
  const startMinute = Math.ceil(currentMinute / 5) * 5;
  const startTotalMins = currentHour * 60 + startMinute;
  const startH = Math.floor(startTotalMins / 60) % 24;
  const startM = startTotalMins % 60;
  const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

  // End time: + 2 hours
  const endTotalMins = startTotalMins + 120;
  const endH = Math.floor(endTotalMins / 60) % 24;
  const endM = endTotalMins % 60;
  const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  // Open time: 15 mins before start
  const openTotalMins = Math.max(0, startTotalMins - 15);
  const openH = Math.floor(openTotalMins / 60) % 24;
  const openM = openTotalMins % 60;
  const openTimeStr = `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`;

  // Close time: 1 hr after end
  const closeTotalMins = Math.min(23 * 60 + 59, endTotalMins + 60);
  const closeH = Math.floor(closeTotalMins / 60) % 24;
  const closeM = closeTotalMins % 60;
  const closeTimeStr = `${String(closeH).padStart(2, '0')}:${String(closeM).padStart(2, '0')}`;

  return { todayStr, startTimeStr, endTimeStr, openTimeStr, closeTimeStr };
};

export const CreateMeetingPage: React.FC<CreateMeetingPageProps> = ({
  currentUser,
  showToast,
  setActiveTab,
}) => {
  const initialTimes = useMemo(() => getInitialMeetingTimes(), []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formConfig, setFormConfig] = useState<MeetingFormConfig>(DEFAULT_MEETING_FORM_CONFIG);
  const [type, setType] = useState<'physical' | 'virtual' | 'hybrid'>('physical');
  const [venue, setVenue] = useState('');
  const [vLink, setVLink] = useState('');

  // Initialized to CURRENT date and CURRENT start time automatically
  const [date, setDate] = useState(initialTimes.todayStr);
  const [startTime, setStartTime] = useState(initialTimes.startTimeStr);
  const [endTime, setEndTime] = useState(initialTimes.endTimeStr);
  const [openTime, setOpenTime] = useState(initialTimes.openTimeStr);
  const [closeTime, setCloseTime] = useState(initialTimes.closeTimeStr);

  const [deptId, setDeptId] = useState('');
  const [deptMode, setDeptMode] = useState<'single' | 'custom'>('single');
  const [deptLabel, setDeptLabel] = useState('');
  const [customPin, setCustomPin] = useState('');

  // Queries & Mutations
  const { data: deptsResponse, isLoading: isDeptsLoading } = useGetDepartmentsQuery(undefined);
  const [createMeeting, { isLoading: isCreating }] = useCreateMeetingMutation();

  // Find user's department ID as default when depts are loaded
  useEffect(() => {
    if (deptsResponse?.data && deptsResponse.data.length > 0) {
      const matched = deptsResponse.data.find(
        (d: any) => d.name.toLowerCase() === currentUser.department.toLowerCase()
      );
      setDeptId(matched ? matched.department_id : deptsResponse.data[0].department_id);
    }
  }, [deptsResponse, currentUser]);

  // Format human-friendly date e.g. "Monday, September 1, 2026"
  const formattedMeetingDate = useMemo(() => {
    try {
      if (!date) return '';
      const [y, m, d] = date.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (isNaN(dt.getTime())) return date;
      return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return date;
    }
  }, [date]);

  // Calculate Meeting Duration
  const meetingDurationInfo = useMemo(() => {
    if (!startTime || !endTime) return { valid: true, text: '' };
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diff = endMins - startMins;
    if (diff <= 0) {
      return { valid: false, text: 'End time must be after start time' };
    }
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    return { valid: true, text: parts.join(' ') };
  }, [startTime, endTime]);

  // Calculate Attendance Window Duration
  const windowDurationInfo = useMemo(() => {
    if (!openTime || !closeTime) return { valid: true, text: '' };
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    const diff = closeMins - openMins;
    if (diff <= 0) {
      return { valid: false, text: 'Closing time must be after opening time' };
    }
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    return { valid: true, text: parts.join(' ') };
  }, [openTime, closeTime]);

  // Quick preset duration for meeting
  const handleSetMeetingDuration = (hours: number) => {
    if (!startTime) return;
    const [sh, sm] = startTime.split(':').map(Number);
    const endTotalMins = sh * 60 + sm + hours * 60;
    const endH = Math.min(23, Math.floor(endTotalMins / 60));
    const endM = endTotalMins % 60;
    const formatted = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    setEndTime(formatted);
  };

  // Smart Sync Attendance Window: 15 mins before start, 1 hr after end
  const handleAutoSyncWindow = () => {
    if (!startTime || !endTime) return;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    const openTotalMins = Math.max(0, sh * 60 + sm - 15);
    const openH = Math.floor(openTotalMins / 60);
    const openM = openTotalMins % 60;
    setOpenTime(`${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`);

    const closeTotalMins = Math.min(23 * 60 + 59, eh * 60 + em + 60);
    const closeH = Math.floor(closeTotalMins / 60);
    const closeM = closeTotalMins % 60;
    setCloseTime(`${String(closeH).padStart(2, '0')}:${String(closeM).padStart(2, '0')}`);

    showToast('Attendance window synced to session times', 'success');
  };

  // Generate random 6 digit numeric PIN
  const handleGenerateRandomPin = () => {
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomPin(random);
    showToast(`Generated PIN: ${random}`, 'success');
  };

  // Auto-toggle formConfig.includeDepartment when switching single vs multi-department mode
  const handleDeptModeChange = (newMode: 'single' | 'custom') => {
    setDeptMode(newMode);
    setFormConfig(prev => ({
      ...prev,
      includeDepartment: newMode !== 'single',
    }));
  };

  // Step completion flags for visual indicators
  const isStep1Complete = Boolean(title.trim() && description.trim());
  const isStep2Complete = Boolean(
    date &&
    startTime &&
    endTime &&
    meetingDurationInfo.valid &&
    (type === 'virtual' || venue.trim()) &&
    (type === 'physical' || vLink.trim()) &&
    (deptMode === 'single' ? deptId : deptLabel.trim())
  );
  const isStep3Complete = Boolean(openTime && closeTime && windowDurationInfo.valid);

  const combineDateAndTime = (dateStr: string, timeStr: string) => {
    const formattedTime = timeStr.split(':').slice(0, 2).join(':');
    const localDateTime = new Date(`${dateStr}T${formattedTime}:00`);
    return localDateTime.toISOString();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      showToast('Please fill in the meeting title and description', 'error');
      return;
    }

    if (type !== 'virtual' && !venue.trim()) {
      showToast('Please specify the meeting venue / location', 'error');
      return;
    }

    if (type !== 'physical' && !vLink.trim()) {
      showToast('Please provide the virtual meeting link (Teams / Zoom / Meet)', 'error');
      return;
    }

    if (!meetingDurationInfo.valid) {
      showToast('Meeting End Time must be later than Start Time', 'error');
      return;
    }

    if (!windowDurationInfo.valid) {
      showToast('Attendance Closing Time must be later than Opening Time', 'error');
      return;
    }

    if (deptMode === 'custom' && !deptLabel.trim()) {
      showToast('Please select at least one participating department, or enter a department label', 'error');
      return;
    }

    const pin = customPin.trim();
    if (pin && (pin.length !== 6 || !/^\d+$/.test(pin))) {
      showToast('Meeting PIN must be exactly 6 digits (e.g. 581294)', 'error');
      return;
    }

    try {
      const openIso = combineDateAndTime(date, openTime);
      const closeIso = combineDateAndTime(date, closeTime);

      const cleanDesc = description.trim();
      const fullDescription = `${cleanDesc} <!--KMTAMS_FORM_CONFIG:${JSON.stringify(formConfig)}-->`;

      const payload = {
        title: title.trim(),
        description: fullDescription,
        meeting_type: type,
        venue: type !== 'virtual' ? venue.trim() : undefined,
        virtual_link: type !== 'physical' ? vLink.trim() : undefined,
        meeting_date: date,
        start_time: startTime,
        end_time: endTime,
        attendance_open_time: openIso,
        attendance_close_time: closeIso,
        department_id: deptMode === 'single' ? (deptId || undefined) : undefined,
        department_label: deptMode === 'custom' ? deptLabel.trim() : undefined,
        meeting_pin: pin || undefined,
        form_config: formConfig,
        custom_fields: formConfig.customFields,
      };

      await createMeeting(payload).unwrap();

      showToast(`Meeting "${title}" register created successfully!`, 'success');
      setActiveTab('meetings');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to create meeting', 'error');
    }
  };

  return (
    <div className="dashboard-panel">
      {/* Clean Header Bar */}
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Create Meeting Attendance Register
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
            Configure meeting schedule, sign-in security, and attendance columns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '5px 12px' }}
        >
          Cancel
        </button>
      </div>

      <div className="panel-body">
        {isDeptsLoading ? (
          <PageSpinner text="Loading organization departments..." />
        ) : (
          <form onSubmit={handleFormSubmit}>

            {/* STEP 1: BASIC DETAILS */}
            <FormSection
              step={1}
              title="Basic Details"
              helperText="Provide the session title and purpose for participant sign-in and printed registers."
              icon={<Info size={15} className="text-brand-700" />}
              isCompleted={isStep1Complete}
            >
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label htmlFor="m-title" style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                    Meeting Title *
                  </label>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    {title.length}/150 characters
                  </span>
                </div>
                <input
                  id="m-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. FY 2026/27 Budget Public Consultation, Highway Design Review"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={150}
                  required
                  style={{ fontSize: 13, padding: '8px 12px' }}
                />

                {/* Clean Title Suggestions Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Suggestions:</span>
                  {TITLE_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTitle(s)}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: title === s ? '#fef9c3' : '#f8fafc',
                        color: title === s ? '#854d0e' : '#475569',
                        border: title === s ? '1px solid #facc15' : '1px solid #e2e8f0',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: title === s ? 700 : 500,
                      }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label htmlFor="m-desc" style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                    Description &amp; Objectives *
                  </label>
                  <button
                    type="button"
                    onClick={() => setDescription(SAMPLE_DESCRIPTION)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b45309',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    Insert standard template
                  </button>
                </div>
                <textarea
                  id="m-desc"
                  className="form-input"
                  rows={3}
                  placeholder="Provide context, key topics, or objectives of this session. This appears on the participant sign-in page and document header."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  style={{ resize: 'vertical', fontSize: 12.5, padding: '8px 12px' }}
                />
              </div>
            </FormSection>

            {/* STEP 2: SCHEDULE & LOCATION */}
            <FormSection
              step={2}
              title="Schedule &amp; Location"
              helperText="Specify meeting format, date, start/end times, and hosting department scope."
              icon={<MapPin size={15} className="text-brand-700" />}
              isCompleted={isStep2Complete}
            >
              {/* Meeting Type Selection */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Meeting Format *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  {/* Physical */}
                  <button
                    type="button"
                    onClick={() => setType('physical')}
                    style={{
                      padding: '10px 12px',
                      background: type === 'physical' ? '#fefce8' : '#ffffff',
                      border: type === 'physical' ? '2px solid #eab308' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'all .12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} style={{ color: type === 'physical' ? '#b45309' : '#64748b' }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: type === 'physical' ? '#78350f' : '#334155' }}>
                          Physical Meeting
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>In-person venue</div>
                      </div>
                    </div>
                    {type === 'physical' && <Check size={14} style={{ color: '#b45309' }} />}
                  </button>

                  {/* Virtual */}
                  <button
                    type="button"
                    onClick={() => setType('virtual')}
                    style={{
                      padding: '10px 12px',
                      background: type === 'virtual' ? '#fefce8' : '#ffffff',
                      border: type === 'virtual' ? '2px solid #eab308' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'all .12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Video size={16} style={{ color: type === 'virtual' ? '#b45309' : '#64748b' }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: type === 'virtual' ? '#78350f' : '#334155' }}>
                          Virtual Meeting
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>Teams / Zoom link</div>
                      </div>
                    </div>
                    {type === 'virtual' && <Check size={14} style={{ color: '#b45309' }} />}
                  </button>

                  {/* Hybrid */}
                  <button
                    type="button"
                    onClick={() => setType('hybrid')}
                    style={{
                      padding: '10px 12px',
                      background: type === 'hybrid' ? '#fefce8' : '#ffffff',
                      border: type === 'hybrid' ? '2px solid #eab308' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'all .12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Laptop size={16} style={{ color: type === 'hybrid' ? '#b45309' : '#64748b' }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: type === 'hybrid' ? '#78350f' : '#334155' }}>
                          Hybrid Meeting
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>Venue &amp; online link</div>
                      </div>
                    </div>
                    {type === 'hybrid' && <Check size={14} style={{ color: '#b45309' }} />}
                  </button>
                </div>
              </div>

              {/* Dynamic Venue / Link inputs */}
              <div className="meeting-form-grid">
                {type !== 'virtual' && (
                  <div className="form-group">
                    <label htmlFor="m-venue" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12.5 }}>
                      Physical Venue / Room *
                    </label>
                    <input
                      id="m-venue"
                      type="text"
                      className="form-input"
                      placeholder="e.g. KeNHA HQ Boardroom 1st Floor, Machakos Regional Office"
                      value={venue}
                      onChange={e => setVenue(e.target.value)}
                      required
                      style={{ padding: '8px 12px', fontSize: 12.5 }}
                    />
                  </div>
                )}

                {type !== 'physical' && (
                  <div className="form-group">
                    <label htmlFor="m-vlink" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12.5 }}>
                      Virtual Meeting Link (Teams / Zoom / Meet) *
                    </label>
                    <input
                      id="m-vlink"
                      type="url"
                      className="form-input"
                      placeholder="e.g. https://teams.microsoft.com/l/meetup-join/..."
                      value={vLink}
                      onChange={e => setVLink(e.target.value)}
                      required={type === 'virtual'}
                      style={{ padding: '8px 12px', fontSize: 12.5 }}
                    />
                  </div>
                )}
              </div>

              {/* Department Scope Picker */}
              <DepartmentPicker
                mode={deptMode}
                deptId={deptId}
                deptLabel={deptLabel}
                departments={deptsResponse?.data || []}
                onModeChange={handleDeptModeChange}
                onDeptIdChange={setDeptId}
                onDeptLabelChange={setDeptLabel}
              />

              {/* Date & Time Row */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label htmlFor="m-date" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>
                        Date *
                      </label>
                      {formattedMeetingDate && (
                        <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                          {formattedMeetingDate}
                        </span>
                      )}
                    </div>
                    <input
                      id="m-date"
                      type="date"
                      className="form-input"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                      style={{ padding: '7px 10px', fontSize: 12.5 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label htmlFor="m-start" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>
                        Start Time *
                      </label>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>Current: {initialTimes.startTimeStr}</span>
                    </div>
                    <input
                      id="m-start"
                      type="time"
                      className="form-input"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      required
                      style={{ padding: '7px 10px', fontSize: 12.5 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label htmlFor="m-end" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>
                        End Time *
                      </label>
                      {meetingDurationInfo.valid && meetingDurationInfo.text && (
                        <span style={{ fontSize: 11, color: '#166534', fontWeight: 700, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: 4 }}>
                          Duration: {meetingDurationInfo.text}
                        </span>
                      )}
                    </div>
                    <input
                      id="m-end"
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      required
                      style={{ padding: '7px 10px', fontSize: 12.5 }}
                    />
                  </div>
                </div>

                {/* Duration warning */}
                {!meetingDurationInfo.valid && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#991b1b', fontWeight: 600 }}>
                      <AlertCircle size={14} /> {meetingDurationInfo.text}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetMeetingDuration(2)}
                      style={{ fontSize: 11, padding: '2px 8px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Fix: Set End Time to +2 hrs
                    </button>
                  </div>
                )}

                {/* Clean duration presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Duration:</span>
                  <button type="button" onClick={() => handleSetMeetingDuration(1)} className="btn btn-secondary" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                    1 Hour
                  </button>
                  <button type="button" onClick={() => handleSetMeetingDuration(2)} className="btn btn-secondary" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                    2 Hours
                  </button>
                  <button type="button" onClick={() => handleSetMeetingDuration(4)} className="btn btn-secondary" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                    Half Day (4h)
                  </button>
                  <button type="button" onClick={() => handleSetMeetingDuration(8)} className="btn btn-secondary" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                    Full Day (8h)
                  </button>
                </div>
              </div>
            </FormSection>

            {/* STEP 3: ATTENDANCE WINDOW & ACCESS PIN */}
            <FormSection
              step={3}
              title="Attendance Window &amp; Access PIN"
              helperText="Set active signing hours and optional 6-digit access security PIN."
              icon={<ShieldCheck size={15} className="text-brand-700" />}
              isCompleted={isStep3Complete}
              badge={
                <button
                  type="button"
                  onClick={handleAutoSyncWindow}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    background: '#fef9c3',
                    color: '#854d0e',
                    border: '1px solid #fde047',
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontWeight: 600,
                  }}
                >
                  <Clock size={12} /> Auto-Sync Window
                </button>
              }
            >
              <div className="meeting-form-grid">
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label htmlFor="m-open" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12.5 }}>
                      Sign-In Opening Time *
                    </label>
                    <span style={{ fontSize: 11, color: '#64748b' }}>15m before start</span>
                  </div>
                  <input
                    id="m-open"
                    type="time"
                    className="form-input"
                    value={openTime}
                    onChange={e => setOpenTime(e.target.value)}
                    required
                    style={{ padding: '7px 10px', fontSize: 12.5 }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label htmlFor="m-close" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12.5 }}>
                      Sign-In Closing Time *
                    </label>
                    {windowDurationInfo.valid && windowDurationInfo.text && (
                      <span style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>
                        Open for {windowDurationInfo.text}
                      </span>
                    )}
                  </div>
                  <input
                    id="m-close"
                    type="time"
                    className="form-input"
                    value={closeTime}
                    onChange={e => setCloseTime(e.target.value)}
                    required
                    style={{ padding: '7px 10px', fontSize: 12.5 }}
                  />
                </div>
              </div>

              {!windowDurationInfo.valid && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#991b1b', fontWeight: 600, marginBottom: 10 }}>
                  <AlertCircle size={14} /> {windowDurationInfo.text}
                </div>
              )}

              {/* Clean 6-Digit Meeting PIN Box */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                  <label htmlFor="m-pin" style={{ fontWeight: 600, color: '#0f172a', fontSize: 12.5, margin: 0 }}>
                    Meeting 6-Digit PIN (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPin}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: '#fef9c3',
                        color: '#854d0e',
                        border: '1px solid #fde047',
                        borderRadius: 4,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600,
                      }}
                    >
                      <Dices size={12} /> Generate PIN
                    </button>
                    {customPin && (
                      <button
                        type="button"
                        onClick={() => setCustomPin('')}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: '#ffffff',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    id="m-pin"
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="e.g. 581294 (Leave blank to auto-generate on save)"
                    value={customPin}
                    onChange={e => setCustomPin(e.target.value.replace(/\D/g, ''))}
                    style={{ fontSize: 13, letterSpacing: 2, fontWeight: 700, maxWidth: 280 }}
                  />
                  {customPin.length === 6 ? (
                    <span style={{ fontSize: 11.5, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} /> PIN Set
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {customPin.length > 0 ? `${customPin.length}/6 digits` : 'Auto-generates on submit'}
                    </span>
                  )}
                </div>
              </div>
            </FormSection>

            {/* STEP 4: ATTENDANCE FORM BUILDER */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#fef9c3',
                      color: '#854d0e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    4
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    Attendance Form &amp; Register Columns
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#854d0e', fontWeight: 600, background: '#fef9c3', padding: '2px 8px', borderRadius: 12 }}>
                  Customizable Columns &amp; Multi-day
                </span>
              </div>
              <p style={{ margin: '0 0 14px 36px', fontSize: 12, color: '#64748b' }}>
                Select standard columns, add custom columns (e.g. National ID or Phone), enable multi-day registers, and preview live print layouts.
              </p>

              {/* Attendance Form & Register Column Customizer */}
              <FormFieldsCustomizer config={formConfig} onChange={setFormConfig} />
            </div>

            {/* AT A GLANCE SUMMARY BEFORE SUBMIT */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} className="text-brand-700" />
                Meeting Register Summary:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11.5 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Title: </span>
                  <strong style={{ color: '#0f172a' }}>{title || '(Not set yet)'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Format: </span>
                  <strong style={{ textTransform: 'capitalize', color: '#0f172a' }}>{type}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Date &amp; Time: </span>
                  <strong style={{ color: '#0f172a' }}>{date} ({startTime} - {endTime})</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Sign-in Window: </span>
                  <strong style={{ color: '#0f172a' }}>{openTime} to {closeTime}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Audience: </span>
                  <strong style={{ color: '#0f172a' }}>{formConfig.allowVisitors ? 'Staff & Visitors' : 'Staff Only'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Register Mode: </span>
                  <strong style={{ color: '#0f172a' }}>{formConfig.isMultiDay ? `Multi-Day (${formConfig.sessionDates?.length || 0} days)` : 'Single Day'}</strong>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="form-actions-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setActiveTab('meetings')}
                className="btn btn-secondary"
                disabled={isCreating}
                style={{ fontSize: 12 }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreating || !title.trim() || !description.trim()}
                style={{ padding: '9px 22px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isCreating ? (
                  <>
                    <InlineSpinner />
                    Creating Register...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Create Meeting Register
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


