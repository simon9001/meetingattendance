import React from 'react';
import { Building2, Building } from 'lucide-react';

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
      <label>Department</label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
        <div
          onClick={() => onModeChange('single')}
          style={{
            padding: '10px 12px',
            background: mode === 'single' ? '#f2effc' : '#ffffff',
            border: mode === 'single' ? '2px solid #5645d4' : '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all .15s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Building2 size={16} style={{ color: mode === 'single' ? '#5645d4' : '#64748b', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: mode === 'single' ? '#391c57' : '#334155' }}>
              Single Department
            </div>
            <div style={{ fontSize: 10.5, color: '#64748b' }}>Meeting belongs to one department</div>
          </div>
        </div>

        <div
          onClick={() => onModeChange('custom')}
          style={{
            padding: '10px 12px',
            background: mode === 'custom' ? '#f2effc' : '#ffffff',
            border: mode === 'custom' ? '2px solid #5645d4' : '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all .15s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Building size={16} style={{ color: mode === 'custom' ? '#5645d4' : '#64748b', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: mode === 'custom' ? '#391c57' : '#334155' }}>
              Multiple / Cross-Departmental
            </div>
            <div style={{ fontSize: 10.5, color: '#64748b' }}>Type a custom label instead</div>
          </div>
        </div>
      </div>

      {mode === 'single' ? (
        <select
          id="m-dept"
          className="filter-select"
          style={{ width: '100%' }}
          value={deptId}
          onChange={e => onDeptIdChange(e.target.value)}
        >
          {departments.map(d => (
            <option key={d.department_id} value={d.department_id}>
              {d.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          id="m-dept-label"
          type="text"
          className="form-input"
          placeholder="e.g. All Departments, ICT & HR Joint Session"
          value={deptLabel}
          onChange={e => onDeptLabelChange(e.target.value)}
          maxLength={200}
        />
      )}
    </div>
  );
};
