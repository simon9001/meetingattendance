import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, ShieldAlert, ShieldCheck, CheckCircle, UserCheck, Users, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { PageSpinner, InlineSpinner, AlertError } from '../../components/shared/Feedback';
import { KeNHALogo } from '../../components/KeNHALogo';
import { SignaturePad } from '../../components/SignaturePad';
import type { Attendance } from '../../data/mockData';
import confetti from 'canvas-confetti';
import { parseMeetingFormConfig, resolveDepartmentDisplay } from '../../types/formConfig';
import {
  useGetPublicMeetingInfoQuery,
  useGetDepartmentsQuery,
  useValidateMeetingPinMutation,
  useSubmitAttendanceMutation
} from '../../features/apis/apiSlice';

interface PublicAttendPageProps {
  meetingId: string;
  showToast: (m: string, t?: 'success' | 'error') => void;
  navigate: (path: string) => void;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  dbTick: number;
  triggerDbUpdate: () => void;
}

export const PublicAttendPage: React.FC<PublicAttendPageProps> = ({
  meetingId,
  showToast,
  navigate,
  theme,
  setTheme,
}) => {
  // Stages: 'pin' | 'form' | 'success' | 'expired' | 'not_started' | 'duplicate'
  const [stage, setStage] = useState<'pin' | 'form' | 'success' | 'expired' | 'not_started' | 'duplicate'>('pin');

  // 6-digit PIN code state & inline error
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState<string | null>(null);
  const pinInputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  // Attendee Form State
  const [attendType, setAttendType] = useState<'staff' | 'visitor'>('staff');
  const [fullName, setFullName] = useState('');

  // Staff inputs
  const [designation, setDesignation] = useState('');
  const [deptId, setDeptId] = useState('');

  // Visitor inputs
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [purpose, setPurpose] = useState<Attendance['purpose']>('Guest');

  // Custom responses state for unique fields
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});

  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: meetingResponse,
    isLoading: isMeetingLoading,
    refetch: refetchMeeting
  } = useGetPublicMeetingInfoQuery(meetingId, {
    pollingInterval: 4000, // Polls every 4s so if organizer opens/closes register it updates automatically
  });
  const { data: deptsResponse } = useGetDepartmentsQuery(undefined);
  const [validatePin, { isLoading: isValidatingPin }] = useValidateMeetingPinMutation();
  const [submitAttendance, { isLoading: isSubmitting }] = useSubmitAttendanceMutation();

  const meeting = meetingResponse?.data;

  // Initialize department selection
  useEffect(() => {
    if (deptsResponse?.data && deptsResponse.data.length > 0 && !deptId) {
      setDeptId(deptsResponse.data[0].department_id);
    }
  }, [deptsResponse, deptId]);

  // Check meeting status & time window
  useEffect(() => {
    if (meeting) {
      const now = new Date();
      const closeDate = new Date(meeting.attendance_close_time);
      const openDate = new Date(meeting.attendance_open_time);

      if (meeting.attendance_status === 'closed' || now > closeDate) {
        setStage('expired');
      } else if (meeting.attendance_status === 'not_started' || now < openDate) {
        setStage('not_started');
      } else {
        // Meeting is open — if we were stuck on not_started/expired, return to pin stage
        setStage(prev => (prev === 'not_started' || prev === 'expired' ? 'pin' : prev));
      }
    }
  }, [meeting]);

  const handlePinDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    setPinError(null);
    const newDigits = [...pinDigits];
    newDigits[index] = val.slice(-1);
    setPinDigits(newDigits);
    if (val && index < 5) {
      pinInputRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter') {
      verifyPin();
    }
  };

  const verifyPin = async () => {
    setPinError(null);
    const enteredPin = pinDigits.join('');

    if (enteredPin.length < 6) {
      const msg = 'Please enter all 6 digits of the Meeting PIN';
      setPinError(msg);
      showToast(msg, 'error');
      return;
    }

    const todayDateStr = new Date().toISOString().split('T')[0];
    const subKey = formConfig.isMultiDay ? `kmtams_submitted_${meetingId}_${todayDateStr}` : `kmtams_submitted_${meetingId}`;
    const localSubmitted = localStorage.getItem(subKey);
    if (localSubmitted) {
      setStage('duplicate');
      return;
    }

    try {
      await validatePin({ meeting_id: meetingId, meeting_pin: enteredPin }).unwrap();
      showToast('PIN verified! Please complete your sign-in.', 'success');
      setStage('form');
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.data?.message || 'Invalid Meeting PIN or meeting is not active';
      setPinError(errMsg);
      showToast(errMsg, 'error');
      setPinDigits(['', '', '', '', '', '']);
      setTimeout(() => pinInputRefs[0].current?.focus(), 100);
    }
  };

  const formConfig = parseMeetingFormConfig(meeting);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    // Validate custom required fields
    for (const cf of formConfig.customFields) {
      const applies =
        cf.appliesTo === 'all' ||
        (attendType === 'staff' && cf.appliesTo === 'staff') ||
        (attendType === 'visitor' && cf.appliesTo === 'visitor');

      if (applies && cf.required && (!customResponses[cf.key] || !customResponses[cf.key].trim())) {
        showToast(`${cf.label} is required`, 'error');
        return;
      }
    }

    if (formConfig.includeSignature !== false && !signatureData) {
      showToast('Please draw your signature to register', 'error');
      return;
    }

    const enteredPin = pinDigits.join('');

    let payload: any = {
      meeting_id: meetingId,
      meeting_pin: enteredPin,
      full_name: fullName.trim(),
      signature_data: signatureData || (formConfig.includeSignature === false ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : ''),
      custom_responses: customResponses,
    };

    if (attendType === 'staff') {
      if (formConfig.includeDesignation && !designation.trim()) {
        showToast('Designation is required', 'error');
        return;
      }
      if (formConfig.includeDepartment && !deptId) {
        showToast('Department selection is required', 'error');
        return;
      }
      payload = {
        ...payload,
        participant_type: 'staff',
        designation: (formConfig.includeDesignation ? designation.trim() : 'Staff') || 'Staff',
        department_id: deptId || deptsResponse?.data?.[0]?.department_id,
      };
    } else {
      if (formConfig.includeOrganization && !company.trim()) {
        showToast('Company/Organization name is required', 'error');
        return;
      }
      payload = {
        ...payload,
        participant_type: 'visitor',
        organization: (formConfig.includeOrganization ? company.trim() : 'External / Visitor') || 'External / Visitor',
        position_title: formConfig.includePosition ? (position.trim() || undefined) : undefined,
        purpose: (formConfig.includePurpose ? (purpose || 'guest') : 'guest').toLowerCase(),
      };
    }

    try {
      await submitAttendance(payload).unwrap();

      const todayDateStr = new Date().toISOString().split('T')[0];
      const subKey = formConfig.isMultiDay ? `kmtams_submitted_${meetingId}_${todayDateStr}` : `kmtams_submitted_${meetingId}`;
      localStorage.setItem(subKey, 'true');
      localStorage.setItem(`kmtams_submitted_responses_${meetingId}`, JSON.stringify(customResponses));
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStage('success');
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.data?.error || err?.data?.message || 'Registration failed';
      showToast(errMsg, 'error');

      // If PIN is invalid or attendance was closed in between, reset to PIN stage with error
      if (errMsg.toLowerCase().includes('pin') || errMsg.toLowerCase().includes('closed') || errMsg.toLowerCase().includes('opened')) {
        setPinDigits(['', '', '', '', '', '']);
        setPinError(errMsg);
        setStage('pin');
        setTimeout(() => pinInputRefs[0].current?.focus(), 100);
      }
    }
  };

  if (isMeetingLoading) {
    return (
      <div className="public-screen">
        <PageSpinner text="Loading meeting credentials..." />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="public-screen">
        <div className="public-card" style={{ textAlign: 'center' }}>
          <AlertError message="The meeting attendance register link you followed is invalid or has been deleted." />
          <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }}>
            Go to Portal Sign-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-screen">
      <div className="public-card">
        <button
          onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
          style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="login-logo-wrapper" style={{ marginBottom: 16 }}>
          <KeNHALogo className="login-logo" width={110} height={55} />
        </div>

        <div className="login-header" style={{ textAlign: 'center', marginBottom: 24 }}>
          <span className="badge badge-hybrid" style={{ marginBottom: 6 }}>KMTAMS Register</span>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{meeting.title}</h2>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Department: <strong style={{ color: 'var(--text-main)' }}>{resolveDepartmentDisplay(meeting, 'KeNHA')}</strong>
          </p>
        </div>

        {/* ── STAGE: NOT STARTED ── */}
        {stage === 'not_started' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Clock size={48} color="#D97706" style={{ margin: '0 auto 16px auto', animation: 'pulse 2s infinite' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Attendance Register Not Open Yet</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '10px 0 20px 0', lineHeight: 1.5 }}>
              The meeting organizer has not yet opened this attendance register (or the scheduled start time has not arrived). Please wait for the organizer to activate attendance.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => refetchMeeting()}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <RefreshCw size={16} /> Check Status Again
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%' }}>
                Portal Login
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE: PIN VERIFICATION ── */}
        {stage === 'pin' && (
          <div className="pin-prompt-box">
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Security Verification Required</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
              Please enter the 6-digit Meeting PIN displayed by the organizer to access the attendance form.
            </p>

            <div className="pin-input-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, margin: '20px 0' }}>
              {pinDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={pinInputRefs[index]}
                  type="text"
                  maxLength={1}
                  className="pin-digit-input"
                  value={digit}
                  onChange={e => handlePinDigitChange(index, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(index, e)}
                  autoFocus={index === 0}
                  disabled={isValidatingPin}
                  style={{
                    width: '100%',
                    height: 45,
                    textAlign: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    borderColor: pinError ? '#ef4444' : undefined,
                  }}
                />
              ))}
            </div>

            {pinError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                marginBottom: 14,
                textAlign: 'left',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={verifyPin}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 4 }}
              disabled={isValidatingPin}
            >
              {isValidatingPin ? (
                <>
                  <InlineSpinner />
                  Verifying PIN...
                </>
              ) : (
                'Verify PIN & Continue'
              )}
            </button>
          </div>
        )}

        {/* ── STAGE: ATTENDANCE FORM ── */}
        {stage === 'form' && (
          <form onSubmit={handleFormSubmit}>
            {/* Multi-day session indicator */}
            {formConfig.isMultiDay && formConfig.sessionDates && (
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
                color: '#ffffff',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#93c5fd', fontWeight: 700 }}>
                    Multi-Day Training Attendance
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                    Active Day: {formConfig.activeSessionDate || formConfig.sessionDates[0]}
                  </div>
                </div>
                <span style={{ fontSize: 11, background: '#fde047', color: '#854d0e', fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                  {formConfig.sessionDates.length} Days
                </span>
              </div>
            )}

            {formConfig.allowVisitors ? (
              <div className="participant-type-selector">
                <button
                  type="button"
                  className={`type-select-btn ${attendType === 'staff' ? 'active' : ''}`}
                  onClick={() => { setAttendType('staff'); setFullName(''); setSignatureData(null); }}
                >
                  <UserCheck size={20} />
                  KeNHA Staff
                </button>
                <button
                  type="button"
                  className={`type-select-btn ${attendType === 'visitor' ? 'active' : ''}`}
                  onClick={() => { setAttendType('visitor'); setFullName(''); setSignatureData(null); }}
                >
                  <Users size={20} />
                  Visitor / Partner
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                color: 'var(--text-muted)', background: 'var(--bg-app)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              }}>
                <UserCheck size={16} style={{ flexShrink: 0 }} />
                This session is limited to KeNHA staff sign-in only.
              </div>
            )}

            <div className="form-group">
              <label htmlFor="p-name">Full Name</label>
              <input
                id="p-name"
                type="text"
                className="form-input"
                placeholder="Enter your official name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

            {attendType === 'staff' ? (
              <>
                {formConfig.includeDesignation && (
                  <div className="form-group">
                    <label htmlFor="p-desig">Designation / Title</label>
                    <input
                      id="p-desig"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Senior Roads Engineer"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      required={formConfig.includeDesignation}
                    />
                  </div>
                )}
                {formConfig.includeDepartment && (
                  <div className="form-group">
                    <label htmlFor="p-dept">Department</label>
                    <select
                      id="p-dept"
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={deptId}
                      onChange={e => setDeptId(e.target.value)}
                      required={formConfig.includeDepartment}
                    >
                      {deptsResponse?.data?.map((d: any) => (
                        <option key={d.department_id} value={d.department_id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                {formConfig.includeOrganization && (
                  <div className="form-group">
                    <label htmlFor="p-company">Company / Organization</label>
                    <input
                      id="p-company"
                      type="text"
                      className="form-input"
                      placeholder="Company name"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      required={formConfig.includeOrganization}
                    />
                  </div>
                )}
                {formConfig.includePosition && (
                  <div className="form-group">
                    <label htmlFor="p-pos">Position / Title (Optional)</label>
                    <input
                      id="p-pos"
                      type="text"
                      className="form-input"
                      placeholder="Position in company"
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                    />
                  </div>
                )}
                {formConfig.includePurpose && (
                  <div className="form-group">
                    <label htmlFor="p-purpose">Purpose of Attendance</label>
                    <select
                      id="p-purpose"
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={purpose}
                      onChange={e => setPurpose(e.target.value as any)}
                    >
                      <option value="Guest">Guest</option>
                      <option value="Consultant">Consultant</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Partner">Partner</option>
                      <option value="Trainer">Trainer</option>
                      <option value="Auditor">Auditor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Dynamic Unique Custom Fields */}
            {formConfig.customFields
              .filter(cf => cf.appliesTo === 'all' || (attendType === 'staff' && cf.appliesTo === 'staff') || (attendType === 'visitor' && cf.appliesTo === 'visitor'))
              .map(cf => (
                <div key={cf.id} className="form-group">
                  <label htmlFor={`custom-${cf.key}`}>
                    {cf.label} {cf.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  {cf.type === 'select' ? (
                    <select
                      id={`custom-${cf.key}`}
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={customResponses[cf.key] || ''}
                      onChange={e => setCustomResponses({ ...customResponses, [cf.key]: e.target.value })}
                      required={cf.required}
                    >
                      <option value="">{cf.placeholder || `Select ${cf.label}...`}</option>
                      {cf.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`custom-${cf.key}`}
                      type={cf.type}
                      className="form-input"
                      placeholder={cf.placeholder || `Enter ${cf.label}`}
                      value={customResponses[cf.key] || ''}
                      onChange={e => setCustomResponses({ ...customResponses, [cf.key]: e.target.value })}
                      required={cf.required}
                    />
                  )}
                </div>
              ))}

            {formConfig.includeSignature !== false && <SignaturePad onChange={setSignatureData} />}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} disabled={isSubmitting}>
            {isSubmitting ? (
                <>
                  <InlineSpinner />
                  Submitting Registration...
                </>
              ) : (
                'Submit Attendance Sign-In'
              )}
            </button>
          </form>
        )}

        {/* ── STAGE: EXPIRED / CLOSED ── */}
        {stage === 'expired' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <ShieldAlert size={48} color="#DC2626" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Attendance Window Closed</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 24px 0', lineHeight: 1.5 }}>
              This meeting's attendance register is closed. Submissions are no longer accepted for this session. Contact the organizer if you believe this is an error.
            </p>
            <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%' }}>
              Portal Login
            </button>
          </div>
        )}

        {/* ── STAGE: DUPLICATE ── */}
        {stage === 'duplicate' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <ShieldCheck size={48} color="#10B981" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Attendance Already Registered</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 24px 0', lineHeight: 1.5 }}>
              Your device has already submitted attendance for this meeting. Duplicate registrations are blocked by system security rules.
            </p>
            <button
              onClick={() => { setStage('pin'); setPinDigits(['', '', '', '', '', '']); setPinError(null); }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Sign-In Another User
            </button>
          </div>
        )}

        {/* ── STAGE: SUCCESS ── */}
        {stage === 'success' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 16px auto', animation: 'bounce 1s' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Attendance Registered Successfully</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 24px 0', lineHeight: 1.5 }}>
              Thank you! Your signature and attendance records have been securely stored in the KeNHA KMTAMS database.
            </p>
            <button
              onClick={() => {
                setStage('pin');
                setPinDigits(['', '', '', '', '', '']);
                setPinError(null);
                setFullName('');
                setDesignation('');
                setCompany('');
                setPosition('');
                setSignatureData(null);
              }}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Sign-In Another User
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

