import React, { useState, useEffect } from 'react';
import {
  Mail, X, Send, Plus,
  Copy, Check, Clock, MapPin, KeyRound, Sparkles
} from 'lucide-react';
import { InlineSpinner } from '../shared/Feedback';
import { Modal } from '../shared/Modal';
import { useSendMeetingRemindersMutation } from '../../features/apis/apiSlice';
import { parseMeetingFormConfig, formatAttendanceDate } from '../../types/formConfig';

interface InviteAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: any | null;
  showToast: (m: string, t?: 'success' | 'error') => void;
}

export const InviteAttendeesModal: React.FC<InviteAttendeesModalProps> = ({
  isOpen,
  onClose,
  meeting,
  showToast,
}) => {
  const [sendMeetingReminders, { isLoading: isSending }] = useSendMeetingRemindersMutation();

  const [rawEmailsInput, setRawEmailsInput] = useState('');
  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (meeting) {
      const config = parseMeetingFormConfig(meeting);
      if (config.isMultiDay && config.sessionDates && config.sessionDates.length > 0) {
        setSelectedDay(config.sessionDates[0]);
      } else {
        setSelectedDay(meeting.meeting_date || '');
      }
      setEmailChips([]);
      setRawEmailsInput('');
      setCopiedLink(false);
    }
  }, [meeting]);

  if (!isOpen || !meeting) return null;

  const config = parseMeetingFormConfig(meeting);
  const isMultiDay = Boolean(config.isMultiDay && config.sessionDates && config.sessionDates.length > 1);
  const sessionDates = isMultiDay
    ? config.sessionDates!
    : [formatAttendanceDate(meeting.meeting_date) || meeting.meeting_date];

  const attendanceUrl = `${window.location.origin}/attend/${meeting.meeting_id}`;
  const meetingPin = meeting.meeting_pin || meeting.pin || '------';

  const handleAddEmails = (text: string) => {
    if (!text.trim()) return;
    const extracted = text
      .split(/[\n,;\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@') && !emailChips.includes(e));

    if (extracted.length > 0) {
      setEmailChips(prev => [...prev, ...extracted]);
      setRawEmailsInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      handleAddEmails(rawEmailsInput);
    }
  };

  const handleBlur = () => {
    if (rawEmailsInput.trim()) {
      handleAddEmails(rawEmailsInput);
    }
  };

  const removeChip = (emailToRemove: string) => {
    setEmailChips(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(attendanceUrl);
    setCopiedLink(true);
    showToast('Attendance link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddSampleStaff = () => {
    const samples = ['jane.kariuki@kenha.co.ke', 'samuel.omondi@kenha.co.ke', 'peter.kamau@kenha.co.ke'];
    const newItems = samples.filter(s => !emailChips.includes(s));
    setEmailChips(prev => [...prev, ...newItems]);
  };

  const handleSendInvitations = async (e: React.FormEvent) => {
    e.preventDefault();

    // Process any remaining text in the input
    let finalEmails = [...emailChips];
    if (rawEmailsInput.trim()) {
      const extracted = rawEmailsInput
        .split(/[\n,;\s]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => e && e.includes('@') && !finalEmails.includes(e));
      finalEmails = [...finalEmails, ...extracted];
      setEmailChips(finalEmails);
      setRawEmailsInput('');
    }

    try {
      const dayIdx = sessionDates.indexOf(selectedDay);
      const dayLabel = isMultiDay && dayIdx >= 0 ? `Day ${dayIdx + 1}` : 'Session';

      const res = await sendMeetingReminders({
        meetingId: meeting.meeting_id,
        dayLabel,
        dateStr: selectedDay || meeting.meeting_date,
        emails: finalEmails.length > 0 ? finalEmails : undefined,
      }).unwrap();

      showToast(
        res.message || `Successfully sent attendance invitations to ${finalEmails.length || 'all'} recipients!`,
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast(err?.data?.error || err?.data?.message || 'Failed to send invitations', 'error');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite Attendees"
      maxWidth={780}
      // The panel renders its own gradient header and close control.
      hideHeader
      bodyClassName="is-flush"
      closeOnBackdrop={false}
    >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, var(--kenha-black) 0%, var(--kenha-slate) 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(249, 214, 22, 0.15)',
                border: '1px solid rgba(249, 214, 22, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Mail size={22} className="text-brand-500" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                Invite Attendees to Sign Attendance
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                Send digital invitation emails with PIN &amp; 1-click sign-in link via Resend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: 'var(--bg-card)', color: 'var(--text-main)' }}>
          {/* Meeting Quick Info Banner */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                {meeting.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} color="var(--text-muted)" />
                  {formatAttendanceDate(meeting.meeting_date)} ({meeting.start_time} - {meeting.end_time})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="var(--text-muted)" />
                  {meeting.venue || 'Virtual Meeting'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(86, 69, 212, 0.15)',
                  color: '#818cf8',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <KeyRound size={14} />
                PIN: <span style={{ letterSpacing: '1px', fontWeight: 800 }}>{meetingPin}</span>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                }}
              >
                {copiedLink ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSendInvitations}>
            {/* Session Day Picker if multi-day */}
            {isMultiDay && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Select Session Day to Invite Attendees to:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {sessionDates.map((d, idx) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        border: selectedDay === d ? '2px solid #eab308' : '1px solid var(--border-color)',
                        background: selectedDay === d ? '#fef9c3' : 'var(--bg-card)',
                        color: selectedDay === d ? '#854d0e' : 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>Day {idx + 1}</span>
                      <span style={{ fontSize: '11px', color: selectedDay === d ? '#854d0e' : 'var(--text-muted)' }}>
                        ({d})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Recipients Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Recipient Email Addresses:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAddSampleStaff}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b45309',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={13} /> Add KeNHA Staff
                  </button>
                  {emailChips.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEmailChips([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Chips Container */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-app)',
                  minHeight: '85px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignContent: 'flex-start',
                }}
              >
                {emailChips.map(email => (
                  <span
                    key={email}
                    style={{
                      background: '#fef9c3',
                      color: '#854d0e',
                      border: '1px solid #fde047',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Mail size={12} color="#854d0e" />
                    {email}
                    <button
                      type="button"
                      onClick={() => removeChip(email)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#854d0e',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}

                <input
                  type="email"
                  placeholder={
                    emailChips.length === 0
                      ? 'Type or paste emails separated by commas (e.g. jane@kenha.co.ke, visitor@partner.com)...'
                      : 'Add more emails...'
                  }
                  value={rawEmailsInput}
                  onChange={e => setRawEmailsInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  style={{
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    minWidth: '220px',
                    fontSize: '13px',
                    padding: '4px',
                    color: 'var(--text-main)',
                    backgroundColor: 'transparent',
                  }}
                />
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
                💡 Tip: You can paste a list of emails from Excel, Outlook, or text. If left empty, all active KeNHA staff will receive the invitation.
              </p>
            </div>

            {/* Email Preview Card */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-card)',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}
              >
                <Sparkles size={14} color="#b45309" />
                Invitation Email Preview (Sent via Resend)
              </div>

              <div style={{ padding: '16px 20px', fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong>Subject:</strong>{' '}
                  <span style={{ color: '#b45309', fontWeight: 600 }}>
                    Attendance Invitation: {meeting.title} {isMultiDay ? `— ${selectedDay}` : ''}
                  </span>
                </p>

                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    borderLeft: '4px solid #f9d616',
                    color: 'var(--text-main)',
                  }}
                >
                  <div><strong>Meeting:</strong> {meeting.title}</div>
                  <div><strong>Date &amp; Time:</strong> {formatAttendanceDate(selectedDay || meeting.meeting_date)} ({meeting.start_time} - {meeting.end_time})</div>
                  <div><strong>Venue:</strong> {meeting.venue || 'Virtual Meeting'}</div>
                  <div style={{ marginTop: '6px' }}>
                    <strong>Meeting PIN:</strong>{' '}
                    <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid #fde047' }}>
                      {meetingPin}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '14px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#111827',
                      color: '#f9d616',
                      fontWeight: 700,
                      padding: '8px 20px',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    Sign Attendance Register &rarr;
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isSending}
                style={{ padding: '9px 18px', fontSize: '13px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSending}
                style={{
                  padding: '9px 22px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isSending ? (
                  <>
                    <InlineSpinner /> Sending Invitations...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Send Attendance Invitations
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
    </Modal>
  );
};
