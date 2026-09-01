import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, Check, X, FileSpreadsheet } from 'lucide-react';
import type { CustomField, MeetingFormConfig, FieldType } from '../../types/formConfig';
import { PRESET_CUSTOM_FIELDS } from '../../types/formConfig';

interface CustomFieldsPanelProps {
  target: 'staff' | 'visitor';
  label: string;
  icon: React.ReactNode;
  helperText: string;
  otherLabel: string;
  disabled?: boolean;
  disabledMessage?: string;
  config: MeetingFormConfig;
  onChange: (newConfig: MeetingFormConfig) => void;
}

const FIELD_TYPE_HINTS: Record<FieldType, string> = {
  text: 'General text input (e.g. Station name, ID number, Designation)',
  tel: 'Telephone / Mobile number input with dial pad on phones',
  number: 'Numeric values only (e.g. PIN, Badge No., Counter)',
  email: 'Email address with validation',
  select: 'Dropdown with multiple predefined choices to pick from',
};

export const CustomFieldsPanel: React.FC<CustomFieldsPanelProps> = ({
  target,
  label,
  icon,
  helperText,
  otherLabel,
  disabled = false,
  disabledMessage,
  config,
  onChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newOptionsStr, setNewOptionsStr] = useState('');
  const [alsoShowToOther, setAlsoShowToOther] = useState(false);

  const visibleFields = config.customFields.filter(
    cf => cf.appliesTo === target || cf.appliesTo === 'all'
  );

  const resetDraft = () => {
    setNewLabel('');
    setNewType('text');
    setNewRequired(false);
    setNewPlaceholder('');
    setNewOptionsStr('');
    setAlsoShowToOther(false);
    setIsAdding(false);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const slug = newLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const id = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const options = newType === 'select'
      ? newOptionsStr.split(',').map((s: string) => s.trim()).filter(Boolean)
      : undefined;

    const newField: CustomField = {
      id,
      label: newLabel.trim(),
      key: slug || id,
      type: newType,
      appliesTo: alsoShowToOther ? 'all' : target,
      required: newRequired,
      placeholder: newPlaceholder.trim() || undefined,
      options: options && options.length > 0 ? options : undefined,
    };

    onChange({ ...config, customFields: [...config.customFields, newField] });
    resetDraft();
  };

  const handleQuickAddPreset = (preset: typeof PRESET_CUSTOM_FIELDS[0]) => {
    const id = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newField: CustomField = { ...preset, id, appliesTo: target };
    onChange({ ...config, customFields: [...config.customFields, newField] });
  };

  const handleDelete = (id: string) => {
    onChange({ ...config, customFields: config.customFields.filter(f => f.id !== id) });
  };

  const handleToggleRequired = (id: string) => {
    onChange({
      ...config,
      customFields: config.customFields.map(f => f.id === id ? { ...f, required: !f.required } : f),
    });
  };

  return (
    <div
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'opacity .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            {icon}
            {label} Specific Columns &amp; Fields ({visibleFields.length})
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>
            {disabled && disabledMessage ? disabledMessage : helperText}
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn btn-primary"
            disabled={disabled}
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} />
            Add Custom Field for {label}
          </button>
        )}
      </div>

      {/* Quick Presets Bar */}
      <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px dashed #cbd5e1', marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={13} style={{ color: '#eab308' }} />
          1-Click Popular Field Presets (Click to add immediately):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESET_CUSTOM_FIELDS.map(preset => {
            const alreadyExists = config.customFields.some(cf => cf.key === preset.key);
            return (
              <button
                key={preset.key}
                type="button"
                disabled={alreadyExists || disabled}
                onClick={() => handleQuickAddPreset(preset)}
                style={{
                  fontSize: 11.5,
                  padding: '4px 10px',
                  background: alreadyExists ? '#f1f5f9' : '#ffffff',
                  color: alreadyExists ? '#94a3b8' : '#1e293b',
                  border: '1px solid',
                  borderColor: alreadyExists ? '#e2e8f0' : '#facc15',
                  borderRadius: 6,
                  cursor: alreadyExists ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: alreadyExists ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {alreadyExists ? <Check size={12} style={{ color: '#16a34a' }} /> : <Plus size={12} style={{ color: '#b45309' }} />}
                <span>{preset.label}</span>
                {alreadyExists && <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>(Added)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Custom Field Creator */}
      {isAdding && (
        <form
          onSubmit={handleAddField}
          style={{
            background: '#ffffff',
            border: '2px solid #eab308',
            borderRadius: 10,
            padding: 16,
            marginBottom: 14,
            boxShadow: '0 4px 16px rgba(234,179,8,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#78350f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Custom Field for {label}
            </span>
            <button
              type="button"
              onClick={resetDraft}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
                Field / Column Name *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Station / Region, National ID No., Project Code"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                required
                autoFocus
                style={{ padding: '8px 10px', fontSize: 13 }}
              />
              <span style={{ fontSize: 10.5, color: '#64748b' }}>
                This label will become a column header in the attendance register.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
                Input Type
              </label>
              <select
                className="filter-select"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                value={newType}
                onChange={e => setNewType(e.target.value as FieldType)}
              >
                <option value="text">Text (General string / name)</option>
                <option value="tel">Phone / Mobile (Telephone)</option>
                <option value="number">Number (Digits / ID)</option>
                <option value="email">Email Address</option>
                <option value="select">Dropdown List (Select options)</option>
              </select>
              <span style={{ fontSize: 10.5, color: '#64748b' }}>
                {FIELD_TYPE_HINTS[newType as FieldType] || ''}
              </span>
            </div>
          </div>

          {newType === 'select' && (
            <div style={{ marginBottom: 12, background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
                Dropdown Choices (Separate each option with a comma) *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Option A, Option B, Option C, None of the above"
                value={newOptionsStr}
                onChange={e => setNewOptionsStr(e.target.value)}
                required={newType === 'select'}
                style={{ padding: '8px 10px', fontSize: 13 }}
              />
              <span style={{ fontSize: 10.5, color: '#64748b' }}>
                Participants will pick one item from this dropdown when signing in.
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14, background: '#f8fafc', padding: 10, borderRadius: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newRequired}
                onChange={e => setNewRequired(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <span>Mandatory Field</span>
                <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 400 }}>Attendees cannot submit without filling this</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={alsoShowToOther}
                onChange={e => setAlsoShowToOther(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <span>Also show to {otherLabel}</span>
                <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 400 }}>Make this a shared column for everyone</div>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={resetDraft} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>
              Save Field
            </button>
          </div>
        </form>
      )}

      {/* List of fields visible to this audience */}
      {visibleFields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', color: '#64748b' }}>
          <FileSpreadsheet size={24} style={{ margin: '0 auto 6px', opacity: 0.5, color: '#b45309' }} />
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>No custom {label.toLowerCase()} columns added yet</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Click a preset button above or click &ldquo;Add Custom Field&rdquo; to capture extra information.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleFields.map(cf => (
            <div
              key={cf.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                flexWrap: 'wrap',
                gap: 10,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {cf.label}
                    {cf.appliesTo === 'all' ? (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 4 }}>
                        Shared (Staff + Visitors)
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                        {label} only
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                    <span>Input Type: <strong style={{ color: '#0f172a' }}>{cf.type}</strong></span>
                    {cf.options && (
                      <>
                        <span>•</span>
                        <span>Dropdown Choices: ({cf.options.join(', ')})</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleToggleRequired(cf.id)}
                  title="Click to toggle mandatory / optional"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: cf.required ? '#bbf7d0' : '#e2e8f0',
                    background: cf.required ? '#f0fdf4' : '#f8fafc',
                    color: cf.required ? '#166534' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {cf.required ? 'Mandatory' : 'Optional'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(cf.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'flex' }}
                  title="Remove this column"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

