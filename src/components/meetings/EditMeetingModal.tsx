import React, { useState, useEffect } from 'react';
import { Info, MapPin, ShieldCheck, Sliders } from 'lucide-react';
import { useUpdateMeetingMutation, useGetDepartmentsQuery } from '../../features/apis/apiSlice';
import { InlineSpinner } from '../shared/Feedback';
import { Modal } from '../shared/Modal';
import { FormSection } from './FormSection';
import { DepartmentPicker } from './DepartmentPicker';
import { FormFieldsCustomizer } from './FormFieldsCustomizer';
import {
  parseMeetingFormConfig,
  getCleanMeetingDescription,
  DEFAULT_MEETING_FORM_CONFIG,
  type MeetingFormConfig,
} from '../../types/formConfig';

interface EditMeetingModalProps {
  meeting: any | null;
  isOpen: boolean;
  onClose: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}

// Reverses combineDateAndTime()'s local-time round-trip: given a stored
// ISO timestamp, extracts the local HH:MM the organizer originally typed.
const isoToLocalTimeHHMM = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({ meeting, isOpen, onClose, showToast }) => {
  const { data: deptsResponse } = useGetDepartmentsQuery(undefined);
  const [updateMeeting, { isLoading: isSaving }] = useUpdateMeetingMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'physical' | 'virtual' | 'hybrid'>('physical');
  const [venue, setVenue] = useState('');
  const [vLink, setVLink] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [deptId, setDeptId] = useState('');
  const [deptMode, setDeptMode] = useState<'single' | 'custom'>('single');
  const [deptLabel, setDeptLabel] = useState('');
  const [formConfig, setFormConfig] = useState<MeetingFormConfig>(DEFAULT_MEETING_FORM_CONFIG);

  // Re-populate the form whenever a different meeting is opened for editing
  useEffect(() => {
    if (!meeting || !isOpen) return;
    setTitle(meeting.title || '');
    setDescription(getCleanMeetingDescription(meeting.description) || '');
    setType(meeting.meeting_type || 'physical');
    setVenue(meeting.venue || '');
    setVLink(meeting.virtual_link || '');
    setDate(meeting.meeting_date || '');
    setStartTime((meeting.start_time || '').slice(0, 5));
    setEndTime((meeting.end_time || '').slice(0, 5));
    setOpenTime(isoToLocalTimeHHMM(meeting.attendance_open_time));
    setCloseTime(isoToLocalTimeHHMM(meeting.attendance_close_time));
    setFormConfig(parseMeetingFormConfig(meeting));
    if (meeting.department_label) {
      setDeptMode('custom');
      setDeptLabel(meeting.department_label);
      setDeptId('');
    } else {
      setDeptMode('single');
      setDeptId(meeting.department_id || '');
      setDeptLabel('');
    }
  }, [meeting, isOpen]);

  if (!isOpen || !meeting) return null;

  const handleDeptModeChange = (newMode: 'single' | 'custom') => {
    setDeptMode(newMode);
    setFormConfig(prev => ({
      ...prev,
      includeDepartment: newMode !== 'single',
    }));
  };

  const combineDateAndTime = (dateStr: string, timeStr: string) => {
    const formattedTime = timeStr.split(':').slice(0, 2).join(':');
    const localDateTime = new Date(`${dateStr}T${formattedTime}:00`);
    return localDateTime.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (deptMode === 'custom' && !deptLabel.trim()) {
      showToast('Please select at least one participating department, or enter a department label', 'error');
      return;
    }

    try {
      const cleanDesc = description.trim();
      const fullDescription = `${cleanDesc} <!--KMTAMS_FORM_CONFIG:${JSON.stringify(formConfig)}-->`;

      await updateMeeting({
        id: meeting.meeting_id,
        title,
        description: fullDescription,
        meeting_type: type,
        venue: type !== 'virtual' ? venue : undefined,
        virtual_link: type !== 'physical' ? vLink : undefined,
        meeting_date: date,
        start_time: startTime,
        end_time: endTime,
        attendance_open_time: combineDateAndTime(date, openTime),
        attendance_close_time: combineDateAndTime(date, closeTime),
        department_id: deptMode === 'single' ? (deptId || null) : null,
        department_label: deptMode === 'custom' ? deptLabel.trim() : null,
        form_config: formConfig,
        custom_fields: formConfig.customFields,
      }).unwrap();

      showToast(`Meeting "${title}" updated successfully!`);
      onClose();
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to update meeting', 'error');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Edit Meeting — ${meeting.title}`}
      maxWidth={720}
      // A long edit form: a stray backdrop click must not discard the changes.
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? (<><InlineSpinner /> Saving…</>) : 'Save Changes'}
          </button>
        </>
      }
    >
      <>
            <FormSection
              step={1}
              title="Basic Info"
              helperText="What is this session about, and what should it be called?"
              icon={<Info size={16} className="text-[#B45309]" />}
            >
              <div className="form-group">
                <label htmlFor="e-m-title">Meeting Title</label>
                <input
                  id="e-m-title"
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="e-m-desc">Description</label>
                <textarea
                  id="e-m-desc"
                  className="form-input"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>
            </FormSection>

            <FormSection
              step={2}
              title="Schedule & Venue"
              helperText="Where and when the meeting itself takes place."
              icon={<MapPin size={16} className="text-[#B45309]" />}
            >
              <div className="meeting-form-grid">
                <div className="form-group">
                  <label htmlFor="e-m-type">Meeting Type</label>
                  <select
                    id="e-m-type"
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
                    <label htmlFor="e-m-venue">Venue / Location</label>
                    <input
                      id="e-m-venue"
                      type="text"
                      className="form-input"
                      value={venue}
                      onChange={e => setVenue(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {type !== 'physical' && (
                <div className="form-group">
                  <label htmlFor="e-m-vlink">Virtual Meeting Link (Microsoft Teams / Zoom)</label>
                  <input
                    id="e-m-vlink"
                    type="url"
                    className="form-input"
                    value={vLink}
                    onChange={e => setVLink(e.target.value)}
                    required={type === 'virtual'}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="e-m-date">Meeting Date</label>
                <input id="e-m-date" type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
              </div>

              <DepartmentPicker
                mode={deptMode}
                deptId={deptId}
                deptLabel={deptLabel}
                departments={deptsResponse?.data || []}
                onModeChange={handleDeptModeChange}
                onDeptIdChange={setDeptId}
                onDeptLabelChange={setDeptLabel}
              />

              <div className="meeting-form-grid" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label htmlFor="e-m-start">Start Time</label>
                  <input id="e-m-start" type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="e-m-end">End Time</label>
                  <input id="e-m-end" type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>
            </FormSection>

            <FormSection
              step={3}
              title="Attendance Window & Security"
              helperText="Controls when the sign-in link becomes active. The PIN itself can't be changed here."
              icon={<ShieldCheck size={16} className="text-[#B45309]" />}
            >
              <div className="meeting-form-grid" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="e-m-open">Attendance Logging Opening Time</label>
                  <input id="e-m-open" type="time" className="form-input" value={openTime} onChange={e => setOpenTime(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="e-m-close">Attendance Logging Closing Time</label>
                  <input id="e-m-close" type="time" className="form-input" value={closeTime} onChange={e => setCloseTime(e.target.value)} required />
                </div>
              </div>
            </FormSection>

            <FormSection
              step={4}
              title="Attendance Form & Dynamic Fields"
              helperText="Configure which fields appear on the sign-in form and attendance register (designation, department, custom fields, multi-day schedule)."
              icon={<Sliders size={16} className="text-[#B45309]" />}
            >
              <FormFieldsCustomizer config={formConfig} onChange={setFormConfig} />
            </FormSection>
      </>
    </Modal>
  );
};
