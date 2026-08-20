import React, { useState, useEffect } from 'react';
import type { User } from '../../data/mockData';
import { useCreateMeetingMutation, useGetDepartmentsQuery } from '../../features/apis/apiSlice';
import { PageSpinner, InlineSpinner } from '../../components/shared/Feedback';
import { FormFieldsCustomizer } from '../../components/meetings/FormFieldsCustomizer';
import type { MeetingFormConfig } from '../../types/formConfig';
import { DEFAULT_MEETING_FORM_CONFIG, serializeMeetingDescription } from '../../types/formConfig';

interface CreateMeetingPageProps {
  currentUser: User;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
  setActiveTab: (t: string) => void;
}

export const CreateMeetingPage: React.FC<CreateMeetingPageProps> = ({
  currentUser,
  showToast,
  setActiveTab,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formConfig, setFormConfig] = useState<MeetingFormConfig>(DEFAULT_MEETING_FORM_CONFIG);
  const [type, setType] = useState<'physical' | 'virtual' | 'hybrid'>('physical');
  const [venue, setVenue] = useState('');
  const [vLink, setVLink] = useState('');

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [openTime, setOpenTime] = useState('08:30');
  const [closeTime, setCloseTime] = useState('12:00');

  const [deptId, setDeptId] = useState('');
  const [customPin, setCustomPin] = useState('');

  // Queries & Mutations
  const { data: deptsResponse, isLoading: isDeptsLoading } = useGetDepartmentsQuery(undefined);
  const [createMeeting, { isLoading: isCreating }] = useCreateMeetingMutation();

  // Find user's department ID as default when depts are loaded
  useEffect(() => {
    if (deptsResponse?.data && deptsResponse.data.length > 0) {
      // Find a department matching the user's department name
      const matched = deptsResponse.data.find(
        (d: any) => d.name.toLowerCase() === currentUser.department.toLowerCase()
      );
      setDeptId(matched ? matched.department_id : deptsResponse.data[0].department_id);
    }
  }, [deptsResponse, currentUser]);

  const combineDateAndTime = (dateStr: string, timeStr: string) => {
    const formattedTime = timeStr.split(':').slice(0, 2).join(':');
    const localDateTime = new Date(`${dateStr}T${formattedTime}:00`);
    return localDateTime.toISOString();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (type !== 'virtual' && !venue) {
      showToast('Venue is required for physical/hybrid meetings', 'error');
      return;
    }

    if (type !== 'physical' && !vLink) {
      showToast('Virtual meeting link is required', 'error');
      return;
    }

    const pin = customPin.trim();
    if (pin && (pin.length !== 6 || !/^\d+$/.test(pin))) {
      showToast('Custom PIN must be exactly 6 digits', 'error');
      return;
    }

    try {
      const openIso = combineDateAndTime(date, openTime);
      const closeIso = combineDateAndTime(date, closeTime);

      const serializedDescription = serializeMeetingDescription(description, formConfig);

      const payload = {
        title,
        description: serializedDescription,
        meeting_type: type,
        venue: type !== 'virtual' ? venue : undefined,
        virtual_link: type !== 'physical' ? vLink : undefined,
        meeting_date: date,
        start_time: startTime,
        end_time: endTime,
        attendance_open_time: openIso,
        attendance_close_time: closeIso,
        department_id: deptId || undefined,
        meeting_pin: pin || undefined,
        form_config: formConfig,
        custom_fields: formConfig.customFields,
      };

      await createMeeting(payload).unwrap();

      showToast(`Meeting "${title}" created successfully!`);
      setActiveTab('meetings');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to create meeting', 'error');
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>Create Meeting / Training Session</h3>
      </div>
      <div className="panel-body">
        {isDeptsLoading ? (
          <PageSpinner text="Loading departments..." />
        ) : (
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label htmlFor="m-title">Meeting Title</label>
              <input
                id="m-title"
                type="text"
                className="form-input"
                placeholder="e.g. FY 2026/27 Budget Consultation"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="m-desc">Description</label>
              <textarea
                id="m-desc"
                className="form-input"
                rows={3}
                placeholder="Provide context or objectives of this session"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="meeting-form-grid">
              <div className="form-group">
                <label htmlFor="m-type">Meeting Type</label>
                <select
                  id="m-type"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="physical">Physical Meeting</option>
                  <option value="virtual">Virtual Meeting</option>
                  <option value="hybrid">Hybrid (Both)</option>
                </select>
              </div>
              {type !== 'virtual' && (
                <div className="form-group">
                  <label htmlFor="m-venue">Venue / Location</label>
                  <input
                    id="m-venue"
                    type="text"
                    className="form-input"
                    placeholder="e.g. HQ Boardroom 1st floor"
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {type !== 'physical' && (
              <div className="form-group">
                <label htmlFor="m-vlink">Virtual Meeting Link (Microsoft Teams / Zoom)</label>
                <input
                  id="m-vlink"
                  type="url"
                  className="form-input"
                  placeholder="e.g. https://teams.microsoft.com/..."
                  value={vLink}
                  onChange={e => setVLink(e.target.value)}
                  required={type === 'virtual'}
                />
              </div>
            )}

            <div className="meeting-form-grid">
              <div className="form-group">
                <label htmlFor="m-date">Meeting Date</label>
                <input id="m-date" type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="m-dept">Department</label>
                <select id="m-dept" className="filter-select" style={{ width: '100%' }} value={deptId} onChange={e => setDeptId(e.target.value)}>
                  {deptsResponse?.data?.map((d: any) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="meeting-form-grid">
              <div className="form-group">
                <label htmlFor="m-start">Start Time</label>
                <input id="m-start" type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="m-end">End Time</label>
                <input id="m-end" type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
            </div>

            <div className="meeting-form-grid">
              <div className="form-group">
                <label htmlFor="m-open">Attendance Logging Opening Time</label>
                <input id="m-open" type="time" className="form-input" value={openTime} onChange={e => setOpenTime(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="m-close">Attendance Logging Closing Time</label>
                <input id="m-close" type="time" className="form-input" value={closeTime} onChange={e => setCloseTime(e.target.value)} required />
              </div>
            </div>

            <div className="meeting-form-grid">
              <div className="form-group">
                <label htmlFor="m-pin">Custom Meeting PIN (Optional)</label>
                <input
                  id="m-pin"
                  type="text"
                  maxLength={6}
                  className="form-input"
                  placeholder="6-digit numeric code (e.g. 581294) - leave blank to auto-generate"
                  value={customPin}
                  onChange={e => setCustomPin(e.target.value)}
                />
              </div>
            </div>

            {/* Attendance Form & Register Column Customizer */}
            <FormFieldsCustomizer config={formConfig} onChange={setFormConfig} />

            <div className="form-actions-right" style={{ marginTop: 20 }}>
              <button type="button" onClick={() => setActiveTab('meetings')} className="btn btn-secondary" disabled={isCreating}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>
                {isCreating ? (
                <>
                  <InlineSpinner />
                  Creating...
                </>
              ) : (
                  'Generate Meeting Register'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};
