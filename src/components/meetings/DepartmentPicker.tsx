import React from 'react';
import { Building2, Building, Check, Sparkles } from 'lucide-react';

interface DepartmentOption {
  department_id: string;
  name: string;
}

interface DepartmentPickerProps {
  mode: 'single' | 'custom';
  deptId: string;
  deptLabel: string;
  departments: DepartmentOption[];
  onModeChange: (mode: 'single' | 'custom') => void;
  onDeptIdChange: (id: string) => void;
  onDeptLabelChange: (label: string) => void;
}

const CUSTOM_DEPT_SUGGESTIONS = [
  'All KeNHA Directorates',
  'Joint Directorate Taskforce',
  'Inter-Agency / Stakeholder Session',
  'KeNHA & Contractor Project Team',
];

export const DepartmentPicker: React.FC<DepartmentPickerProps> = ({
  mode,
  deptId,
  deptLabel,
  departments,
  onModeChange,
  onDeptIdChange,
  onDeptLabelChange,
}) => {
  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label htmlFor={mode === 'single' ? 'm-dept' : 'm-dept-label'} style={{ fontWeight: 600, color: '#0f172a' }}>
          Hosting Department / Directorate
        </label>
        <span style={{ fontSize: 11.5, color: '#64748b' }}>
          {mode === 'single' ? 'Specific KeNHA division' : 'Multi-department or joint'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => onModeChange('single')}
          style={{
            padding: '12px 14px',
            background: mode === 'single' ? '#f4f2fc' : '#ffffff',
            border: mode === 'single' ? '2px solid #5645d4' : '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            transition: 'all .15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: mode === 'single' ? '#5645d4' : '#f1f5f9',
                color: mode === 'single' ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: mode === 'single' ? '#391c57' : '#334155' }}>
                Single Department
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Hosted by 1 KeNHA Department</div>
            </div>
          </div>
          {mode === 'single' && <Check size={16} style={{ color: '#5645d4', flexShrink: 0 }} />}
        </button>

        <button
          type="button"
          onClick={() => onModeChange('custom')}
          style={{
            padding: '12px 14px',
            background: mode === 'custom' ? '#f4f2fc' : '#ffffff',
            border: mode === 'custom' ? '2px solid #5645d4' : '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            transition: 'all .15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: mode === 'custom' ? '#5645d4' : '#f1f5f9',
                color: mode === 'custom' ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: mode === 'custom' ? '#391c57' : '#334155' }}>
                Cross-Departmental / Joint
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Multiple divisions or external</div>
            </div>
          </div>
          {mode === 'custom' && <Check size={16} style={{ color: '#5645d4', flexShrink: 0 }} />}
        </button>
      </div>

      {mode === 'single' ? (
        <div>
          <select
            id="m-dept"
            className="filter-select"
            style={{ width: '100%', padding: '9px 12px', fontSize: 13.5 }}
            value={deptId}
            onChange={e => onDeptIdChange(e.target.value)}
          >
            {departments.map(d => (
              <option key={d.department_id} value={d.department_id}>
                {d.name}
              </option>
            ))}
          </select>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            This meeting will be categorized under this department in reports and dashboard views.
          </p>
        </div>
      ) : (
        <div>
          <input
            id="m-dept-label"
            type="text"
            className="form-input"
            placeholder="e.g. All Departments, ICT & HR Joint Session, Regional Corridor Teams"
            value={deptLabel}
            onChange={e => onDeptLabelChange(e.target.value)}
            maxLength={200}
            style={{ padding: '9px 12px', fontSize: 13.5 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Sparkles size={12} style={{ color: '#eab308' }} /> Quick presets:
            </span>
            {CUSTOM_DEPT_SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onDeptLabelChange(s)}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  background: deptLabel === s ? '#e6e0f5' : '#f1f5f9',
                  color: deptLabel === s ? '#391c57' : '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

