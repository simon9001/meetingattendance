import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, ShieldAlert, ShieldCheck, CheckCircle, UserCheck, Users } from 'lucide-react';
import { PageSpinner, InlineSpinner, AlertError } from '../../components/shared/Feedback';
import { KeNHALogo } from '../../components/KeNHALogo';
import { SignaturePad } from '../../components/SignaturePad';
import type { Attendance } from '../../data/mockData';
import confetti from 'canvas-confetti';
import {
  useGetPublicMeetingInfoQuery,
  useGetDepartmentsQuery,
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
  // Stages: 'pin' | 'form' | 'success' | 'expired' | 'duplicate'
  const [stage, setStage] = useState<'pin' | 'form' | 'success' | 'expired' | 'duplicate'>('pin');

  // 6-digit PIN code state
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
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

  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Queries & Mutations
  const { data: meetingResponse, isLoading: isMeetingLoading } = useGetPublicMeetingInfoQuery(meetingId);
  const { data: deptsResponse } = useGetDepartmentsQuery(undefined);
  const [submitAttendance, { isLoading: isSubmitting }] = useSubmitAttendanceMutation();

  const meeting = meetingResponse?.data;

  // Initialize department selection and check expiration
  useEffect(() => {
    if (deptsResponse?.data && deptsResponse.data.length > 0 && !deptId) {
      setDeptId(deptsResponse.data[0].department_id);
    }
  }, [deptsResponse, deptId]);

  useEffect(() => {
    if (meeting) {
      const now = new Date();
      const closeDate = new Date(meeting.attendance_close_time);

      if (meeting.attendance_status === 'closed' || now > closeDate) {
        setStage('expired');
      }
    }
  }, [meeting]);

  const handlePinDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
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
  };

  const verifyPin = () => {
    const enteredPin = pinDigits.join('');
    if (enteredPin.length < 6) {
      showToast('Please enter a 6-digit PIN', 'error');
      return;
    }

    const localSubmitted = localStorage.getItem(`kmtams_submitted_${meetingId}`);
    if (localSubmitted) {
      setStage('duplicate');
      return;
    }

    setStage('form');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName) {
      showToast('Name is required', 'error');
      return;
    }
    if (!signatureData) {
      showToast('Please draw your signature to register', 'error');
      return;
    }

    const enteredPin = pinDigits.join('');

    let payload: any = {
      meeting_id: meetingId,
      meeting_pin: enteredPin,
      full_name: fullName,
      signature_data: signatureData,
    };

    if (attendType === 'staff') {
      if (!designation) {
        showToast('Designation is required', 'error');
        return;
      }
      if (!deptId) {
        showToast('Department selection is required', 'error');
        return;
      }
      payload = {
        ...payload,
        participant_type: 'staff',
        designation,
        department_id: deptId,
      };
    } else {
      if (!company) {
        showToast('Company/Organization name is required', 'error');
        return;
      }
      payload = {
        ...payload,
        participant_type: 'visitor',
        organization: company,
        position_title: position || undefined,
        purpose: (purpose || 'guest').toLowerCase(), // Must match backend lowercase enum
      };
    }

    try {
      await submitAttendance(payload).unwrap();

      localStorage.setItem(`kmtams_submitted_${meetingId}`, 'true');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStage('success');
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.data?.error || 'Registration failed';
      showToast(errMsg, 'error');

      // If PIN is invalid, reset to PIN stage
      if (errMsg.toLowerCase().includes('pin')) {
        setPinDigits(['', '', '', '', '', '']);
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
            Department: <strong style={{ color: 'var(--text-main)' }}>{meeting.departments?.name || 'KeNHA'}</strong>
          </p>
        </div>

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
                  style={{ width: '100%', height: 45, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={verifyPin}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              Verify PIN & Continue
            </button>
          </div>
        )}

        {stage === 'form' && (
          <form onSubmit={handleFormSubmit}>
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
                <div className="form-group">
                  <label htmlFor="p-desig">Designation / Title</label>
                  <input
                    id="p-desig"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Senior Roads Engineer"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    required={attendType === 'staff'}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-dept">Department</label>
                  <select
                    id="p-dept"
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={deptId}
                    onChange={e => setDeptId(e.target.value)}
                  >
                    {deptsResponse?.data?.map((d: any) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="p-company">Company / Organization</label>
                  <input
                    id="p-company"
                    type="text"
                    className="form-input"
                    placeholder="Company name"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    required={attendType === 'visitor'}
                  />
                </div>
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
              </>
            )}

            <SignaturePad onChange={setSignatureData} />

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

        {stage === 'duplicate' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <ShieldCheck size={48} color="#10B981" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Attendance Already Registered</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 24px 0', lineHeight: 1.5 }}>
              Your device has already submitted attendance for this meeting. Duplicate registrations are blocked by system security rules.
            </p>
            <button
              onClick={() => { setStage('pin'); setPinDigits(['', '', '', '', '', '']); }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Sign-In Another User
            </button>
          </div>
        )}

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
