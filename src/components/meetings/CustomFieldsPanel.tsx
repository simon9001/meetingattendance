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
      ? newOptionsStr.split(',').map(s => s.trim()).filter(Boolean)
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
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5645d4', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
            {icon}
            {label} Sign-In Fields ({visibleFields.length})
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
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
            Add {label} Field
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
                disabled={alreadyExists || disabled}
                onClick={() => handleQuickAddPreset(preset)}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: alreadyExists ? '#f1f5f9' : '#ffffff',
                  color: alreadyExists ? '#94a3b8' : '#5645d4',
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
      {isAdding && (
        <form
          onSubmit={handleAddField}
          style={{
            background: '#f8fafc',
            border: '2px solid #5645d4',
            borderRadius: 8,
            padding: 14,
            marginBottom: 14,
            boxShadow: '0 4px 12px rgba(86,69,212,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#391c57', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> New {label} Field
            </span>
            <button
              type="button"
              onClick={resetDraft}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newRequired}
                onChange={e => setNewRequired(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Participant Must Fill This (Required)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={alsoShowToOther}
                onChange={e => setAlsoShowToOther(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Also show this field to {otherLabel}
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={resetDraft} className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 12, padding: '5px 14px' }}>
              Save Field
            </button>
          </div>
        </form>
      )}

      {/* List of fields visible to this audience */}
      {visibleFields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
          <FileSpreadsheet size={24} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>No {label.toLowerCase()} fields added yet</div>
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
                background: 'var(--bg-subtle, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 8,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {cf.label}
                    {cf.appliesTo === 'all' && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#e6e0f5', color: '#391c57', padding: '1px 6px', borderRadius: 4 }}>
                        Shared (All)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ textTransform: 'capitalize' }}>Type: <strong>{cf.type}</strong></span>
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
                  onClick={() => handleToggleRequired(cf.id)}
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
                  onClick={() => handleDelete(cf.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'flex' }}
                  title="Delete field"
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
