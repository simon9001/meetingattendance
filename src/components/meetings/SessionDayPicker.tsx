import React, { useEffect, useRef, useState } from 'react';
import { CalendarCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useGetSignableDatesMutation } from '../../features/apis/apiSlice';

// =============================================================================
// Multi-day meetings: choose the day(s) a signature is for
// -----------------------------------------------------------------------------
// A participant who missed Monday can sign for it on Wednesday, and can tick
// several days to sign them all at once. Only days up to today that this
// person has not signed yet are offered — the server decides both, using its
// own Kenya date rather than the phone's clock, and checks again on submit.
// =============================================================================

export interface SessionDayStatus {
  /** The list has loaded for the current name. */
  loaded: boolean;
  /** How many days this person can still sign for. */
  availableCount: number;
}

interface SessionDayPickerProps {
  meetingId: string;
  meetingPin: string;
  fullName: string;
  participantType: 'staff' | 'visitor';
  /** Selected days, as "DD/MM/YYYY". */
  selected: string[];
  onChange: (days: string[]) => void;
  onStatusChange?: (status: SessionDayStatus) => void;
}

interface SignableDates {
  today: string;
  available: string[];
  signed: string[];
  upcoming: string[];
}

// "05/10/2026" → "Monday, 05 Oct"
const dayLabel = (ddmmyyyy: string): string => {
  const [d, m, y] = ddmmyyyy.split('/').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(date.getTime())) return ddmmyyyy;
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' });
};

const shortLabel = (ddmmyyyy: string): string => {
  const [d, m, y] = ddmmyyyy.split('/').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(date.getTime())) return ddmmyyyy;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
};

export const SessionDayPicker: React.FC<SessionDayPickerProps> = ({
  meetingId,
  meetingPin,
  fullName,
  participantType,
  selected,
  onChange,
  onStatusChange,
}) => {
  const [fetchDates, { isLoading }] = useGetSignableDatesMutation();
  const [info, setInfo] = useState<SignableDates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const requestRef = useRef(0);

  const name = fullName.trim();

  // Which days are signable depends on who is signing, so reload when the name
  // or participant type changes — debounced so it does not fire per keystroke.
  useEffect(() => {
    if (name.length < 2) {
      setInfo(null);
      setError(null);
      onChange([]);
      onStatusChange?.({ loaded: false, availableCount: 0 });
      return;
    }
    const ticket = ++requestRef.current;
    const timer = setTimeout(async () => {
      try {
        const res: any = await fetchDates({
          meeting_id: meetingId,
          meeting_pin: meetingPin,
          full_name: name,
          participant_type: participantType,
        }).unwrap();
        if (ticket !== requestRef.current) return;
        const data: SignableDates = res?.data;
        setInfo(data);
        setError(null);
        // Today is the usual case, so it starts ticked when it is available.
        onChange(data.available.includes(data.today) ? [data.today] : []);
        onStatusChange?.({ loaded: true, availableCount: data.available.length });
      } catch (err: any) {
        if (ticket !== requestRef.current) return;
        setInfo(null);
        setError(err?.data?.error || 'Could not load the meeting days. Check your connection and try again.');
        onStatusChange?.({ loaded: false, availableCount: 0 });
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, participantType, meetingId, meetingPin]);

  const toggle = (day: string) =>
    onChange(selected.includes(day) ? selected.filter(d => d !== day) : [...selected, day]);

  const allSelected = !!info && info.available.length > 0 && info.available.every(d => selected.includes(d));
  const toggleAll = () => onChange(allSelected ? [] : [...(info?.available ?? [])]);

  const summary = selected.length === 0
    ? 'Choose the day(s) you are signing for'
    : selected.length === 1
      ? dayLabel(selected[0])
      : `${selected.length} days: ${[...selected].sort((a, b) => a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join(''))).map(shortLabel).join(', ')}`;

  return (
    <div className="form-group">
      <label className="form-label" htmlFor="session-day-toggle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarCheck size={15} aria-hidden="true" /> Days you are signing for <span style={{ color: '#ef4444' }}>*</span>
      </label>

      {name.length < 2 ? (
        <p className="form-hint" style={{ marginTop: 4 }}>Enter your full name above to see the days you can sign for.</p>
      ) : isLoading && !info ? (
        <p className="form-hint" style={{ marginTop: 4 }}>Loading the meeting days…</p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : info && info.available.length === 0 ? (
        <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4, padding: '10px 12px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 13, lineHeight: 1.45 }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            You have already signed for every day so far
            {info.upcoming.length > 0 ? `. Come back on ${dayLabel(info.upcoming[0])} to sign for that day.` : '.'}
          </span>
        </div>
      ) : info ? (
        <div style={{ marginTop: 4 }}>
          <button
            id="session-day-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="session-day-list"
            onClick={() => setOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              minHeight: 44, padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
              background: 'var(--bg-card, #fff)', color: selected.length ? 'var(--text-main)' : 'var(--text-muted)',
              border: `1.5px solid ${open ? '#0F172A' : 'var(--border-color, #E2E8F0)'}`, borderRadius: 8,
              fontSize: 14, fontWeight: selected.length ? 600 : 500,
            }}
          >
            <span style={{ minWidth: 0 }}>{summary}</span>
            <ChevronDown size={18} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>

          {/* In the page flow rather than floating, so it can never be clipped on a phone */}
          {open && (
            <div
              id="session-day-list"
              role="group"
              aria-label="Days you are signing for"
              style={{ marginTop: 6, border: '1px solid var(--border-color, #E2E8F0)', borderRadius: 8, background: 'var(--bg-card, #fff)', overflow: 'hidden' }}
            >
              {info.available.length > 1 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-color, #E2E8F0)', background: 'var(--bg-app, #F8FAFC)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 18, height: 18, accentColor: '#EAB308' }} />
                  Select all ({info.available.length} days)
                </label>
              )}
              {info.available.map(day => (
                <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', cursor: 'pointer', fontSize: 14, borderTop: '1px solid var(--border-color, #F1F5F9)' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(day)}
                    onChange={() => toggle(day)}
                    style={{ width: 18, height: 18, accentColor: '#EAB308' }}
                  />
                  <span style={{ flex: 1 }}>{dayLabel(day)}</span>
                  {day === info.today && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FEF9C3', color: '#854D0E' }}>Today</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {info.signed.length > 0 && (
            <p className="form-hint" style={{ marginTop: 6 }}>
              Already signed: {info.signed.map(shortLabel).join(', ')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};
