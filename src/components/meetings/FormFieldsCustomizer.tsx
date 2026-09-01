import React, { useState } from 'react';
import {
  Sliders, Eye, FileSpreadsheet, X, Check,
  Calendar, CalendarDays, Mail,
  Users, UserCheck,
} from 'lucide-react';
import type { MeetingFormConfig } from '../../types/formConfig';
import { CustomFieldsPanel } from './CustomFieldsPanel';

interface FormFieldsCustomizerProps {
  config: MeetingFormConfig;
  onChange: (newConfig: MeetingFormConfig) => void;
}

export const FormFieldsCustomizer: React.FC<FormFieldsCustomizerProps> = ({
  config,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'preview'>('fields');
  const [previewMode, setPreviewMode] = useState<'staff' | 'visitor'>('staff');

  // Multi-day schedule builder state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [singleDateInput, setSingleDateInput] = useState('');
  const [emailsInput, setEmailsInput] = useState((config.participantEmails || []).join(', '));

  // Toggles for standard fields
  const handleToggleStandard = (fieldKey: keyof Omit<MeetingFormConfig, 'customFields' | 'sessionDates' | 'participantEmails'>) => {
    onChange({
      ...config,
      [fieldKey]: !config[fieldKey],
    });
  };

  // Helper to format ISO to DD/MM/YYYY
  const formatIsoToDdMmYyyy = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return iso;
    }
  };

  // Switch Multi-Day mode
  const handleSetMultiDay = (isMulti: boolean) => {
    if (isMulti && (!config.sessionDates || config.sessionDates.length === 0)) {
      // Default 5-day session (e.g. Mon-Fri)
      const now = new Date();
      const defaultDates: string[] = [];
      for (let i = 0; i < 5; i++) {
        const next = new Date(now);
        next.setDate(now.getDate() + i);
        const dd = String(next.getDate()).padStart(2, '0');
        const mm = String(next.getMonth() + 1).padStart(2, '0');
        const yyyy = next.getFullYear();
        defaultDates.push(`${dd}/${mm}/${yyyy}`);
      }
      onChange({
        ...config,
        isMultiDay: true,
        sessionDates: defaultDates,
        activeSessionDate: defaultDates[0],
      });
    } else {
      onChange({
        ...config,
        isMultiDay: isMulti,
      });
    }
  };

  // Generate date range
  const handleGenerateDateRange = () => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return;

    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end && dates.length < 30) {
      const dd = String(current.getDate()).padStart(2, '0');
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const yyyy = current.getFullYear();
      dates.push(`${dd}/${mm}/${yyyy}`);
      current.setDate(current.getDate() + 1);
    }

    onChange({
      ...config,
      isMultiDay: true,
      sessionDates: dates,
      activeSessionDate: dates[0] || '',
    });
  };

  // Add individual date
  const handleAddSingleDate = () => {
    if (!singleDateInput) return;
    const formatted = formatIsoToDdMmYyyy(singleDateInput);
    const current = config.sessionDates || [];
    if (!current.includes(formatted)) {
      const updated = [...current, formatted];
      onChange({
        ...config,
        isMultiDay: true,
        sessionDates: updated,
        activeSessionDate: config.activeSessionDate || updated[0],
      });
    }
    setSingleDateInput('');
  };

  // Remove date
  const handleRemoveDate = (dateToRemove: string) => {
    const updated = (config.sessionDates || []).filter(d => d !== dateToRemove);
    onChange({
      ...config,
      sessionDates: updated,
      activeSessionDate: config.activeSessionDate === dateToRemove ? (updated[0] || '') : config.activeSessionDate,
      isMultiDay: updated.length > 1,
    });
  };

  // Quick preset days
  const handleApplyPresetDays = (count: number) => {
    const now = new Date();
    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
      const next = new Date(now);
      next.setDate(now.getDate() + i);
      const dd = String(next.getDate()).padStart(2, '0');
      const mm = String(next.getMonth() + 1).padStart(2, '0');
      const yyyy = next.getFullYear();
      dates.push(`${dd}/${mm}/${yyyy}`);
    }
    onChange({
      ...config,
      isMultiDay: true,
      sessionDates: dates,
      activeSessionDate: dates[0],
    });
  };

  // Handle participant emails for Resend
  const handleEmailsBlur = () => {
    const parsed = emailsInput
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@'));
    onChange({
      ...config,
      participantEmails: parsed,
    });
  };

  return (
    <div style={{ background: 'var(--bg-panel, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10, padding: 18, marginTop: 14 }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: 12, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} className="text-[#B45309]" />
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Meeting Schedule &amp; Attendance Form Customizer
            </h4>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
            Configure single/multi-day sessions, automated daily Resend email reminders, and custom table columns.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-subtle, #f1f5f9)', padding: 3, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: activeTab === 'fields' ? 700 : 500,
              background: activeTab === 'fields' ? '#ffffff' : 'transparent',
              color: activeTab === 'fields' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: 6,
              boxShadow: activeTab === 'fields' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Sliders size={13} />
            Configure
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: activeTab === 'preview' ? 700 : 500,
              background: activeTab === 'preview' ? '#ffffff' : 'transparent',
              color: activeTab === 'preview' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: 6,
              boxShadow: activeTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Eye size={13} />
            Live Preview
          </button>
        </div>
      </div>

      {/* TAB 1: CONFIGURATION */}
      {activeTab === 'fields' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* SECTION 0: SINGLE DAY vs MULTI-DAY SESSION MODE */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={16} className="text-[#B45309]" />
                1. Meeting Schedule Mode (Single-Day vs. Multi-Day)
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 11.5, color: '#64748b' }}>
                Select whether participants sign once for a standard meeting or sign daily across a multi-day training workshop.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
                {/* Single Day Mode Button */}
                <button
                  type="button"
                  onClick={() => handleSetMultiDay(false)}
                  style={{
                    padding: '14px 16px',
                    background: !config.isMultiDay ? '#fefce8' : '#ffffff',
                    border: !config.isMultiDay ? '2px solid #eab308' : '1px solid #cbd5e1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: !config.isMultiDay ? '#facc15' : '#f1f5f9',
                          color: !config.isMultiDay ? '#0f172a' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: !config.isMultiDay ? '#78350f' : '#334155' }}>
                          Single-Day Meeting
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Standard 1-day attendance register</div>
                      </div>
                    </div>
                    {!config.isMultiDay && <Check size={18} style={{ color: '#b45309', fontWeight: 800 }} />}
                  </div>
                </button>

                {/* Multi-Day Mode Button */}
                <button
                  type="button"
                  onClick={() => handleSetMultiDay(true)}
                  style={{
                    padding: '14px 16px',
                    background: config.isMultiDay ? '#fefce8' : '#ffffff',
                    border: config.isMultiDay ? '2px solid #eab308' : '1px solid #cbd5e1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: config.isMultiDay ? '#facc15' : '#f1f5f9',
                          color: config.isMultiDay ? '#0f172a' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CalendarDays size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: config.isMultiDay ? '#78350f' : '#334155' }}>
                          Multi-Day Workshop / Training
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Daily signatures combined in 1 row</div>
                      </div>
                    </div>
                    {config.isMultiDay && <Check size={18} style={{ color: '#b45309', fontWeight: 800 }} />}
                  </div>
                </button>
              </div>

              {/* If Multi-Day Active, Show Session Days & Reminders Config */}
              {config.isMultiDay && (
                <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>
                      Session Dates ({config.sessionDates?.length || 0} Days):
                    </div>
                    {/* Quick Preset Buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => handleApplyPresetDays(2)} className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}>
                        + 2 Days
                      </button>
                      <button type="button" onClick={() => handleApplyPresetDays(3)} className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}>
                        + 3 Days
                      </button>
                      <button type="button" onClick={() => handleApplyPresetDays(5)} className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px', background: '#fef9c3', color: '#854d0e', border: '1px solid #facc15' }}>
                        + 5 Days (Mon - Fri)
                      </button>
                    </div>
                  </div>

                  {/* Date Range Generator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#475569' }}>From:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 12, padding: '4px 8px', width: 130 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#475569' }}>To:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 12, padding: '4px 8px', width: 130 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateDateRange}
                      className="btn btn-primary"
                      style={{ fontSize: 11, padding: '5px 10px' }}
                      disabled={!startDate || !endDate}
                    >
                      Generate Dates
                    </button>
                  </div>

                  {/* Session Dates Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {(config.sessionDates || []).map((dateStr, idx) => (
                      <div
                        key={dateStr}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#fef9c3',
                          border: '1px solid #facc15',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#854d0e',
                        }}
                      >
                        <span style={{ fontSize: 10, background: '#b45309', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>
                          Day {idx + 1}
                        </span>
                        <span>{dateStr}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDate(dateStr)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Add single date inline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="date"
                        value={singleDateInput}
                        onChange={e => setSingleDateInput(e.target.value)}
                        style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSingleDate}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        disabled={!singleDateInput}
                      >
                        + Add Day
                      </button>
                    </div>
                  </div>

                  {/* Resend Automated Email Reminders Configuration */}
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 12 }}>
                    <div
                      onClick={() => onChange({ ...config, sendDailyReminders: !config.sendDailyReminders })}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(config.sendDailyReminders)}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={14} className="text-[#B45309]" />
                        Send Daily Sign-In Email Reminders to Participants via Resend
                      </div>
                    </div>

                    {config.sendDailyReminders && (
                      <div style={{ marginTop: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, color: '#475569', marginBottom: 4 }}>
                          Participant Email Addresses (comma or newline separated):
                        </label>
                        <textarea
                          value={emailsInput}
                          onChange={e => setEmailsInput(e.target.value)}
                          onBlur={handleEmailsBlur}
                          placeholder="john.mwangi@kenha.co.ke, jane.doe@roads.go.ke, contractor@partner.com"
                          rows={2}
                          className="form-input"
                          style={{ fontSize: 11, width: '100%' }}
                        />
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                          KMTAMS will dispatch daily email reminders containing the meeting 6-digit PIN and 1-click digital sign-in link before each morning session.
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* SECTION A: Standard Default Columns */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  2. Standard Default Columns
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Toggle ON/OFF to include or remove from the register
                </span>
              </div>

              {/* Staff Fields sub-group */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <UserCheck size={13} />
                Internal Staff Columns
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>

                {/* Full Name (Locked) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, opacity: 0.9 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Full Name</div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Primary identity column</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 4 }}>
                    Required (Locked)
                  </span>
                </div>

                {/* Designation Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.includeDesignation}
                  onClick={() => handleToggleStandard('includeDesignation')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: config.includeDesignation ? 'rgba(249,214,22,0.08)' : '#f8fafc',
                    border: config.includeDesignation ? '1.5px solid #eab308' : '1px solid #e2e8f0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: config.includeDesignation ? '#78350f' : '#64748b' }}>
                      Designation / Role
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Job title / position (e.g. Engineer)</div>
                  </div>
                  <div style={{ width: 36, height: 20, background: config.includeDesignation ? '#facc15' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, background: '#111827', borderRadius: '50%', position: 'absolute', top: 2, left: config.includeDesignation ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                  </div>
                </button>

                {/* Department Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.includeDepartment}
                  onClick={() => handleToggleStandard('includeDepartment')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: config.includeDepartment ? 'rgba(249,214,22,0.08)' : '#f8fafc',
                    border: config.includeDepartment ? '1.5px solid #eab308' : '1px solid #e2e8f0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: config.includeDepartment ? '#78350f' : '#64748b' }}>
                      Department Field
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>
                      {config.includeDepartment
                        ? 'Active — attendees pick department'
                        : 'Deactivated — clean for Single Dept'}
                    </div>
                  </div>
                  <div style={{ width: 36, height: 20, background: config.includeDepartment ? '#facc15' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, background: '#111827', borderRadius: '50%', position: 'absolute', top: 2, left: config.includeDepartment ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                  </div>
                </button>
              </div>

              {/* Allow External Visitors — master switch */}
              <button
                type="button"
                role="switch"
                aria-checked={config.allowVisitors}
                onClick={() => onChange({ ...config, allowVisitors: !config.allowVisitors })}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  marginBottom: 12,
                  background: config.allowVisitors ? '#fefce8' : '#fafaf9',
                  border: config.allowVisitors ? '2px solid #eab308' : '1.5px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: config.allowVisitors ? '#facc15' : '#e2e8f0',
                      color: config.allowVisitors ? '#0f172a' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: config.allowVisitors ? '#78350f' : '#334155' }}>
                      Allow External Visitors / Partners to Sign In
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {config.allowVisitors
                        ? 'Anyone with the PIN can sign in as either KeNHA Staff or a Visitor / Partner.'
                        : 'Sign-in is limited to KeNHA Staff only — the visitor option is hidden on the public form.'}
                    </div>
                  </div>
                </div>
                <div style={{ width: 40, height: 22, background: config.allowVisitors ? '#facc15' : '#cbd5e1', borderRadius: 11, position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, background: '#111827', borderRadius: '50%', position: 'absolute', top: 2, left: config.allowVisitors ? 20 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </div>
              </button>

              {/* Visitor Fields sub-group — grayed out when visitors are disallowed */}
              <div
                style={{
                  opacity: config.allowVisitors ? 1 : 0.45,
                  pointerEvents: config.allowVisitors ? 'auto' : 'none',
                  transition: 'opacity .15s',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={13} />
                  External Visitor Columns
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>

                  {/* Organization (Visitor) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.includeOrganization}
                    onClick={() => handleToggleStandard('includeOrganization')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: config.includeOrganization ? 'rgba(249,214,22,0.08)' : '#f8fafc',
                      border: config.includeOrganization ? '1.5px solid #eab308' : '1px solid #e2e8f0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all .15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: config.includeOrganization ? '#78350f' : '#64748b' }}>
                        Organization / Company
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>Company / Entity name</div>
                    </div>
                    <div style={{ width: 36, height: 20, background: config.includeOrganization ? '#facc15' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, background: '#111827', borderRadius: '50%', position: 'absolute', top: 2, left: config.includeOrganization ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    </div>
                  </button>

                  {/* Position / Title (Visitor) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.includePosition}
                    onClick={() => handleToggleStandard('includePosition')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: config.includePosition ? 'rgba(249,214,22,0.08)' : '#f8fafc',
                      border: config.includePosition ? '1.5px solid #eab308' : '1px solid #e2e8f0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all .15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: config.includePosition ? '#78350f' : '#64748b' }}>
                        Position / Title
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>Role in external organization</div>
                    </div>
                    <div style={{ width: 36, height: 20, background: config.includePosition ? '#facc15' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, background: '#111827', borderRadius: '50%', position: 'absolute', top: 2, left: config.includePosition ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    </div>
                  </button>

                  {/* Purpose (Visitor) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.includePurpose}
                    onClick={() => handleToggleStandard('includePurpose')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: config.includePurpose ? 'rgba(249,214,22,0.08)' : '#f8fafc',
                      border: config.includePurpose ? '1.5px solid #eab308' : '1px solid #e2e8f0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all .15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: config.includePurpose ? '#78350f' : '#64748b' }}>
                        Purpose of Attendance
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>Consultant, Guest, Trainer, etc.</div>
                    </div>
                    <div style={{ width: 36, height: 20, background: config.includePurpose ? '#facc15' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, background: '#111827', borderRadius: '50%', position: 'absolute', top: 2, left: config.includePurpose ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    </div>
                  </button>

                </div>
              </div>
            </div>

          {/* SECTION B: Unique Custom Fields — separate builders per audience */}
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              3. Additional Custom Columns &amp; Fields
            </span>
            <p style={{ margin: '2px 0 14px', fontSize: 11.5, color: '#64748b' }}>
              Add extra columns to your attendance register (such as National ID, Mobile Number, Station, or Vehicle Reg No.).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <CustomFieldsPanel
                target="staff"
                label="Staff"
                icon={<UserCheck size={13} />}
                helperText="Extra columns only KeNHA staff fill in when signing in."
                otherLabel="visitors"
                config={config}
                onChange={onChange}
              />

              <div style={{ borderTop: '1px dashed #e2e8f0' }} />

              <CustomFieldsPanel
                target="visitor"
                label="Visitor"
                icon={<Users size={13} />}
                helperText="Extra columns only external visitors/partners fill in when signing in."
                otherLabel="staff"
                disabled={!config.allowVisitors}
                disabledMessage="Visitor sign-in is disabled for this meeting — enable it above to add visitor-specific fields."
                config={config}
                onChange={onChange}
              />
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: LIVE PREVIEW */}
      {activeTab === 'preview' && (() => {
        const previewDates = (config.sessionDates && config.sessionDates.length > 0)
          ? config.sessionDates
          : ['23/02/2026', '24/02/2026', '25/02/2026', '26/02/2026', '27/02/2026'];
        const effectivePreviewMode: 'staff' | 'visitor' = config.allowVisitors ? previewMode : 'staff';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Register Column Header Preview */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={15} className="text-[#B45309]" />
                Resulting Attendance Register Table Columns (Print / Word):
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, background: '#ffffff', border: '1px solid #000' }}>
                  <thead>
                    {!config.isMultiDay ? (
                      <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px', border: '1px solid #000', width: 40, textAlign: 'center' }}>S/NO</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #000' }}>NAME</th>
                        {config.includeDesignation && <th style={{ padding: '6px 8px', border: '1px solid #000' }}>DESIGNATION</th>}
                        {config.includeDepartment && <th style={{ padding: '6px 8px', border: '1px solid #000' }}>DEPARTMENT / ORG</th>}
                        {config.customFields.map(cf => (
                          <th key={cf.id} style={{ padding: '6px 8px', border: '1px solid #000', background: '#1e3a8a', color: '#93c5fd' }}>
                            {cf.label.toUpperCase()}
                          </th>
                        ))}
                        <th style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center', width: 90 }}>DATE SIGNED</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center', width: 90 }}>SIGNATURE</th>
                      </tr>
                    ) : (
                      <>
                        {/* Multi-Day Top Row Header (Matches KeNHA multi-day format) */}
                        <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                          <th rowSpan={2} style={{ padding: '6px 8px', border: '1px solid #000', width: 40, textAlign: 'center', verticalAlign: 'middle' }}>S/NO</th>
                          <th rowSpan={2} style={{ padding: '6px 8px', border: '1px solid #000', verticalAlign: 'middle' }}>NAME</th>
                          {config.includeDesignation && <th rowSpan={2} style={{ padding: '6px 8px', border: '1px solid #000', verticalAlign: 'middle' }}>DESIGNATION</th>}
                          {config.includeDepartment && <th rowSpan={2} style={{ padding: '6px 8px', border: '1px solid #000', verticalAlign: 'middle' }}>DEPARTMENT / ORG</th>}
                          {config.customFields.map(cf => (
                            <th key={cf.id} rowSpan={2} style={{ padding: '6px 8px', border: '1px solid #000', background: '#1e3a8a', color: '#93c5fd', verticalAlign: 'middle' }}>
                              {cf.label.toUpperCase()}
                            </th>
                          ))}
                          <th colSpan={previewDates.length} style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center', background: '#1e293b' }}>
                            SIGNATURE
                          </th>
                        </tr>
                        {/* Multi-Day Sub-Header with session dates */}
                        <tr style={{ background: '#1e293b', color: '#ffffff', textAlign: 'center' }}>
                          {previewDates.map(d => (
                            <th key={d} style={{ padding: '4px 6px', border: '1px solid #000', fontSize: 10, minWidth: 70 }}>
                              {d}
                            </th>
                          ))}
                        </tr>
                      </>
                    )}
                  </thead>
                  <tbody>
                    {!config.isMultiDay ? (
                      <tr>
                        <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center' }}>1.</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #000', fontWeight: 600 }}>Eng. John Mwangi</td>
                        {config.includeDesignation && <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Senior Highway Engineer</td>}
                        {config.includeDepartment && <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Highway Design &amp; Safety</td>}
                        {config.customFields.map(cf => (
                          <td key={cf.id} style={{ padding: '6px 8px', border: '1px solid #000', color: '#1e40af', fontStyle: 'italic' }}>
                            [Sample {cf.label}]
                          </td>
                        ))}
                        <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center' }}>23/02/2026</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center', color: '#059669', fontWeight: 600 }}>✓ Signed</td>
                      </tr>
                    ) : (
                      <tr>
                        <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center' }}>1.</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #000', fontWeight: 600 }}>Eng. John Mwangi</td>
                        {config.includeDesignation && <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Senior Highway Engineer</td>}
                        {config.includeDepartment && <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Highway Design &amp; Safety</td>}
                        {config.customFields.map(cf => (
                          <td key={cf.id} style={{ padding: '6px 8px', border: '1px solid #000', color: '#1e40af', fontStyle: 'italic' }}>
                            [Sample {cf.label}]
                          </td>
                        ))}
                        {previewDates.map((_, i) => (
                          <td key={i} style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center', color: '#059669', fontWeight: 600, fontSize: 10 }}>
                            ✓ Signed
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendee Form Preview */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={15} className="text-[#B45309]" />
                  Participant Sign-in Form Preview (What Attendees Will See):
                </div>

                <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('staff')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: effectivePreviewMode === 'staff' ? 700 : 500,
                      background: effectivePreviewMode === 'staff' ? '#ffffff' : 'transparent',
                      color: effectivePreviewMode === 'staff' ? '#0f172a' : '#64748b',
                      border: 'none',
                      borderRadius: 5,
                      boxShadow: effectivePreviewMode === 'staff' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Staff View
                  </button>
                  <button
                    type="button"
                    onClick={() => config.allowVisitors && setPreviewMode('visitor')}
                    disabled={!config.allowVisitors}
                    title={!config.allowVisitors ? 'Visitor sign-in is disabled for this meeting' : undefined}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: effectivePreviewMode === 'visitor' ? 700 : 500,
                      background: effectivePreviewMode === 'visitor' ? '#ffffff' : 'transparent',
                      color: !config.allowVisitors ? '#cbd5e1' : effectivePreviewMode === 'visitor' ? '#0f172a' : '#64748b',
                      border: 'none',
                      borderRadius: 5,
                      boxShadow: effectivePreviewMode === 'visitor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: config.allowVisitors ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Visitor View
                  </button>
                </div>
              </div>

              {!config.allowVisitors && (
                <div style={{ fontSize: 11, color: '#793400', background: '#fef7d6', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>
                  Visitor sign-in is disabled for this meeting — only the Staff View is shown to participants.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Full Name *</label>
                  <input type="text" disabled placeholder="e.g. Jane Doe" className="form-input" style={{ opacity: 0.8 }} />
                </div>

                {effectivePreviewMode === 'staff' ? (
                  <>
                    {config.includeDesignation && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Designation</label>
                        <input type="text" disabled placeholder="e.g. Principal Officer" className="form-input" style={{ opacity: 0.8 }} />
                      </div>
                    )}
                    {config.includeDepartment && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Department</label>
                        <select disabled className="filter-select" style={{ width: '100%', opacity: 0.8 }}>
                          <option>Select KeNHA Department...</option>
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {config.includeOrganization && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Company / Organization</label>
                        <input type="text" disabled placeholder="Company name" className="form-input" style={{ opacity: 0.8 }} />
                      </div>
                    )}
                    {config.includePosition && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Position / Title (Optional)</label>
                        <input type="text" disabled placeholder="Position in company" className="form-input" style={{ opacity: 0.8 }} />
                      </div>
                    )}
                    {config.includePurpose && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Purpose of Attendance</label>
                        <select disabled className="filter-select" style={{ width: '100%', opacity: 0.8 }}>
                          <option>Guest</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                {config.customFields
                  .filter(cf => cf.appliesTo === 'all' || cf.appliesTo === effectivePreviewMode)
                  .map(cf => (
                  <div key={cf.id}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#1e40af' }}>
                      {cf.label} {cf.required ? '*' : '(Optional)'}
                    </label>
                    {cf.type === 'select' ? (
                      <select disabled className="filter-select" style={{ width: '100%', opacity: 0.8 }}>
                        <option>{cf.placeholder || `Select ${cf.label}...`}</option>
                        {cf.options?.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={cf.type}
                        disabled
                        placeholder={cf.placeholder || `Enter ${cf.label}...`}
                        className="form-input"
                        style={{ opacity: 0.8 }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
};
