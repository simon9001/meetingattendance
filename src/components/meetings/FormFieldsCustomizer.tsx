import React, { useState } from 'react';
import {
  Plus, Trash2, Sliders, Eye, FileSpreadsheet,
  Sparkles, Check, X, Calendar, CalendarDays, Mail,
} from 'lucide-react';
import type { CustomField, MeetingFormConfig, FieldType, FieldTarget } from '../../types/formConfig';
import { PRESET_CUSTOM_FIELDS } from '../../types/formConfig';

interface FormFieldsCustomizerProps {
  config: MeetingFormConfig;
  onChange: (newConfig: MeetingFormConfig) => void;
}

export const FormFieldsCustomizer: React.FC<FormFieldsCustomizerProps> = ({
  config,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'preview'>('fields');
  const [isAddingField, setIsAddingField] = useState(false);

  // Multi-day schedule builder state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [singleDateInput, setSingleDateInput] = useState('');
  const [emailsInput, setEmailsInput] = useState((config.participantEmails || []).join(', '));

  // New field form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');
  const [newAppliesTo, setNewAppliesTo] = useState<FieldTarget>('all');
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newOptionsStr, setNewOptionsStr] = useState('');

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

  // Add custom field
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const slug = newLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const id = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const options = newType === 'select'
      ? newOptionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const newField: CustomField = {
      id,
      label: newLabel.trim(),
      key: slug || id,
      type: newType,
      appliesTo: newAppliesTo,
      required: newRequired,
      placeholder: newPlaceholder.trim() || undefined,
      options: options && options.length > 0 ? options : undefined,
    };

    onChange({
      ...config,
      customFields: [...config.customFields, newField],
    });

    // Reset
    setNewLabel('');
    setNewType('text');
    setNewAppliesTo('all');
    setNewRequired(false);
    setNewPlaceholder('');
    setNewOptionsStr('');
    setIsAddingField(false);
  };

  // Quick add from presets
  const handleQuickAddPreset = (preset: typeof PRESET_CUSTOM_FIELDS[0]) => {
    const id = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newField: CustomField = {
      ...preset,
      id,
    };
    onChange({
      ...config,
      customFields: [...config.customFields, newField],
    });
  };

  // Delete custom field
  const handleDeleteCustomField = (id: string) => {
    onChange({
      ...config,
      customFields: config.customFields.filter(f => f.id !== id),
    });
  };

  // Toggle custom field required status
  const handleToggleCustomRequired = (id: string) => {
    onChange({
      ...config,
      customFields: config.customFields.map(f =>
        f.id === id ? { ...f, required: !f.required } : f
      ),
    });
  };

  return (
    <div style={{ background: 'var(--bg-panel, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10, padding: 18, marginTop: 14 }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: 12, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} style={{ color: 'var(--brand-primary, #2563eb)' }} />
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
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={16} style={{ color: '#2563eb' }} />
              1. Meeting Schedule Mode (Single-Day vs. Multi-Day)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
              {/* Single Day Mode Button */}
              <div
                onClick={() => handleSetMultiDay(false)}
                style={{
                  padding: '12px 14px',
                  background: !config.isMultiDay ? '#eff6ff' : '#ffffff',
                  border: !config.isMultiDay ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} style={{ color: !config.isMultiDay ? '#2563eb' : '#64748b' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: !config.isMultiDay ? '#1e40af' : '#334155' }}>
                        Single-Day Meeting
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Standard 1-day attendance register</div>
                    </div>
                  </div>
                  {!config.isMultiDay && <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span>}
                </div>
              </div>

              {/* Multi-Day Mode Button */}
              <div
                onClick={() => handleSetMultiDay(true)}
                style={{
                  padding: '12px 14px',
                  background: config.isMultiDay ? '#eff6ff' : '#ffffff',
                  border: config.isMultiDay ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarDays size={18} style={{ color: config.isMultiDay ? '#2563eb' : '#64748b' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: config.isMultiDay ? '#1e40af' : '#334155' }}>
                        Multi-Day Training / Workshop
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Multiple signing days aggregated in 1 row per participant</div>
                    </div>
                  </div>
                  {config.isMultiDay && <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span>}
                </div>
              </div>
            </div>

            {/* If Multi-Day Active, Show Session Days & Reminders Config */}
            {config.isMultiDay && (
              <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a' }}>
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
                    <button type="button" onClick={() => handleApplyPresetDays(5)} className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px', background: '#e0e7ff', color: '#3730a3' }}>
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
                        background: '#eff6ff',
                        border: '1px solid #93c5fd',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1e40af',
                      }}
                    >
                      <span style={{ fontSize: 10, background: '#2563eb', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>
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
                      <Mail size={14} style={{ color: '#2563eb' }} />
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #1e293b)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                2. Standard Default Columns
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                Toggle ON/OFF to include or remove from the register
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              
              {/* Full Name (Locked) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 8, opacity: 0.9 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Full Name</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>Primary identity column</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 4 }}>
                  Required (Locked)
                </span>
              </div>

              {/* Designation Toggle */}
              <div
                onClick={() => handleToggleStandard('includeDesignation')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: config.includeDesignation ? 'rgba(37,99,235,0.05)' : 'var(--bg-subtle, #f8fafc)',
                  border: config.includeDesignation ? '1px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: config.includeDesignation ? '#1e40af' : '#64748b' }}>
                    Designation (Staff)
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>Job role / position title</div>
                </div>
                <div style={{ width: 36, height: 20, background: config.includeDesignation ? '#2563eb' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s' }}>
                  <div style={{ width: 16, height: 16, background: '#ffffff', borderRadius: '50%', position: 'absolute', top: 2, left: config.includeDesignation ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {/* Department Toggle */}
              <div
                onClick={() => handleToggleStandard('includeDepartment')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: config.includeDepartment ? 'rgba(37,99,235,0.05)' : 'var(--bg-subtle, #f8fafc)',
                  border: config.includeDepartment ? '1px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: config.includeDepartment ? '#1e40af' : '#64748b' }}>
                    Department (Staff)
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>Directorate / Division</div>
                </div>
                <div style={{ width: 36, height: 20, background: config.includeDepartment ? '#2563eb' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s' }}>
                  <div style={{ width: 16, height: 16, background: '#ffffff', borderRadius: '50%', position: 'absolute', top: 2, left: config.includeDepartment ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {/* Organization (Visitor) */}
              <div
                onClick={() => handleToggleStandard('includeOrganization')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: config.includeOrganization ? 'rgba(37,99,235,0.05)' : 'var(--bg-subtle, #f8fafc)',
                  border: config.includeOrganization ? '1px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: config.includeOrganization ? '#1e40af' : '#64748b' }}>
                    Organization (Visitors)
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>Company / Entity name</div>
                </div>
                <div style={{ width: 36, height: 20, background: config.includeOrganization ? '#2563eb' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s' }}>
                  <div style={{ width: 16, height: 16, background: '#ffffff', borderRadius: '50%', position: 'absolute', top: 2, left: config.includeOrganization ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {/* Position / Title (Visitor) */}
              <div
                onClick={() => handleToggleStandard('includePosition')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: config.includePosition ? 'rgba(37,99,235,0.05)' : 'var(--bg-subtle, #f8fafc)',
                  border: config.includePosition ? '1px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: config.includePosition ? '#1e40af' : '#64748b' }}>
                    Position / Title (Visitors)
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>Role in external organization</div>
                </div>
                <div style={{ width: 36, height: 20, background: config.includePosition ? '#2563eb' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s' }}>
                  <div style={{ width: 16, height: 16, background: '#ffffff', borderRadius: '50%', position: 'absolute', top: 2, left: config.includePosition ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {/* Purpose (Visitor) */}
              <div
                onClick={() => handleToggleStandard('includePurpose')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: config.includePurpose ? 'rgba(37,99,235,0.05)' : 'var(--bg-subtle, #f8fafc)',
                  border: config.includePurpose ? '1px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: config.includePurpose ? '#1e40af' : '#64748b' }}>
                    Purpose of Visit
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>Consultant, Guest, Trainer, etc.</div>
                </div>
                <div style={{ width: 36, height: 20, background: config.includePurpose ? '#2563eb' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'background .2s' }}>
                  <div style={{ width: 16, height: 16, background: '#ffffff', borderRadius: '50%', position: 'absolute', top: 2, left: config.includePurpose ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION B: Unique Custom Fields */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #1e293b)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  2. Unique Custom Fields &amp; Columns ({config.customFields.length})
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                  Add extra columns tailored specifically for this training or meeting session.
                </p>
              </div>

              {!isAddingField && (
                <button
                  type="button"
                  onClick={() => setIsAddingField(true)}
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} />
                  Add Custom Field
                </button>
              )}
            </div>

            {/* Quick Presets Bar */}
            <div style={{ background: 'var(--bg-subtle, #f8fafc)', padding: '8px 12px', borderRadius: 8, border: '1px dashed var(--border-color, #cbd5e1)', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #475569)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} style={{ color: '#eab308' }} />
                Quick-Add Popular Field Presets:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESET_CUSTOM_FIELDS.map(preset => {
                  const alreadyExists = config.customFields.some(cf => cf.key === preset.key);
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      disabled={alreadyExists}
                      onClick={() => handleQuickAddPreset(preset)}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        background: alreadyExists ? '#f1f5f9' : '#ffffff',
                        color: alreadyExists ? '#94a3b8' : '#2563eb',
                        border: '1px solid',
                        borderColor: alreadyExists ? '#e2e8f0' : '#bfdbfe',
                        borderRadius: 5,
                        cursor: alreadyExists ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {alreadyExists ? <Check size={11} /> : <Plus size={11} />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline Custom Field Creator */}
            {isAddingField && (
              <form
                onSubmit={handleAddCustomField}
                style={{
                  background: '#f8fafc',
                  border: '2px solid #3b82f6',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 14,
                  boxShadow: '0 4px 12px rgba(59,130,246,0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={15} /> Create Unique Custom Column
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingField(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                      Field / Column Label *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. National ID No. / Mobile No."
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                      Field Input Type
                    </label>
                    <select
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={newType}
                      onChange={e => setNewType(e.target.value as FieldType)}
                    >
                      <option value="text">Text (General string)</option>
                      <option value="tel">Phone / Mobile (Telephone)</option>
                      <option value="number">Number (Digits / ID)</option>
                      <option value="email">Email Address</option>
                      <option value="select">Dropdown Selection</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                      Applies To
                    </label>
                    <select
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={newAppliesTo}
                      onChange={e => setNewAppliesTo(e.target.value as FieldTarget)}
                    >
                      <option value="all">All Participants (Staff &amp; Visitors)</option>
                      <option value="staff">Staff Only</option>
                      <option value="visitor">Visitors Only</option>
                    </select>
                  </div>
                </div>

                {newType === 'select' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                      Dropdown Options (Comma separated) *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Option A, Option B, Option C"
                      value={newOptionsStr}
                      onChange={e => setNewOptionsStr(e.target.value)}
                      required={newType === 'select'}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newRequired}
                      onChange={e => setNewRequired(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    Participant Must Fill This (Required)
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingField(false)}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '5px 12px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '5px 14px' }}
                    >
                      Save Column
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List of Created Custom Fields */}
            {config.customFields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
                <FileSpreadsheet size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>No custom fields added yet</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Click "+ Add Custom Field" or select a preset above to create extra columns.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {config.customFields.map((cf, index) => (
                  <div
                    key={cf.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-subtle, #ffffff)',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: 8,
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                        Col {index + 4}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                          {cf.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)', display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ textTransform: 'capitalize' }}>Type: <strong>{cf.type}</strong></span>
                          <span>•</span>
                          <span>Audience: <strong>{cf.appliesTo === 'all' ? 'All' : cf.appliesTo === 'staff' ? 'Staff' : 'Visitors'}</strong></span>
                          {cf.options && (
                            <>
                              <span>•</span>
                              <span>Options: ({cf.options.length})</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleCustomRequired(cf.id)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: '1px solid',
                          borderColor: cf.required ? '#bbf7d0' : '#e2e8f0',
                          background: cf.required ? '#f0fdf4' : '#f8fafc',
                          color: cf.required ? '#166534' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        {cf.required ? '✓ Mandatory' : 'Optional'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomField(cf.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                        }}
                        title="Delete custom column"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* TAB 2: LIVE PREVIEW */}
      {activeTab === 'preview' && (() => {
        const previewDates = (config.sessionDates && config.sessionDates.length > 0)
          ? config.sessionDates
          : ['23/02/2026', '24/02/2026', '25/02/2026', '26/02/2026', '27/02/2026'];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Register Column Header Preview */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={15} style={{ color: '#2563eb' }} />
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
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={15} style={{ color: '#2563eb' }} />
                Participant Sign-in Form Preview (What Attendees Will See):
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Full Name *</label>
                  <input type="text" disabled placeholder="e.g. Jane Doe" className="form-input" style={{ opacity: 0.8 }} />
                </div>

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

                {config.customFields.map(cf => (
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
