import React, { useState } from 'react';
import { Building2, Building, Check, Sparkles, Plus, X, Layers, CheckSquare, Square } from 'lucide-react';
import { useCreateDepartmentMutation } from '../../features/apis/apiSlice';

interface DepartmentOption {
  department_id: string;
  name: string;
  department_code?: string;
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
  'Regional Corridor Management Teams',
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
  const [createDept, { isLoading: isCreatingDept }] = useCreateDepartmentMutation();

  // Internal tab: 'single' | 'multi' | 'custom'
  const [activeTab, setActiveTab] = useState<'single' | 'multi' | 'custom'>(() => {
    if (mode === 'single') return 'single';
    return 'multi';
  });

  // Selected department IDs for multi-select
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(() => {
    if (mode === 'single' && deptId) return [deptId];
    if (deptLabel) {
      // Try matching names in deptLabel to department IDs
      const labelParts = deptLabel.split(',').map(s => s.trim().toLowerCase());
      const matched = departments
        .filter(d => labelParts.some(lp => d.name.toLowerCase().includes(lp) || lp.includes(d.name.toLowerCase())))
        .map(d => d.department_id);
      return matched;
    }
    return [];
  });

  // Inline department creation modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptError, setNewDeptError] = useState('');

  // Keep parent mode in sync when internal tab changes
  const handleTabChange = (tab: 'single' | 'multi' | 'custom') => {
    setActiveTab(tab);
    if (tab === 'single') {
      onModeChange('single');
      if (!deptId && departments.length > 0) {
        onDeptIdChange(departments[0].department_id);
      }
    } else {
      onModeChange('custom');
      if (tab === 'multi') {
        if (selectedDeptIds.length === 0 && departments.length > 0) {
          // Default to first 2 or all
          const initial = departments.slice(0, 2).map(d => d.department_id);
          setSelectedDeptIds(initial);
          const initialNames = departments.filter(d => initial.includes(d.department_id)).map(d => d.name).join(', ');
          onDeptLabelChange(initialNames);
        } else {
          const names = departments.filter(d => selectedDeptIds.includes(d.department_id)).map(d => d.name).join(', ');
          onDeptLabelChange(names || 'All KeNHA Directorates');
        }
      }
    }
  };

  // Toggle single department in multi-select mode
  const handleToggleDeptInMulti = (id: string) => {
    let next: string[];
    if (selectedDeptIds.includes(id)) {
      next = selectedDeptIds.filter(x => x !== id);
    } else {
      next = [...selectedDeptIds, id];
    }
    setSelectedDeptIds(next);

    if (next.length === 0) {
      onDeptLabelChange('');
    } else if (next.length === departments.length && departments.length > 1) {
      onDeptLabelChange('All KeNHA Directorates');
    } else {
      const names = departments
        .filter(d => next.includes(d.department_id))
        .map(d => d.name)
        .join(', ');
      onDeptLabelChange(names);
    }
  };

  // Select all departments
  const handleSelectAll = () => {
    const allIds = departments.map(d => d.department_id);
    setSelectedDeptIds(allIds);
    onDeptLabelChange('All KeNHA Directorates');
  };

  // Deselect all departments
  const handleClearAll = () => {
    setSelectedDeptIds([]);
    onDeptLabelChange('');
  };

  // Auto-generate code when user types a name
  const handleNameChange = (name: string) => {
    setNewDeptName(name);
    setNewDeptError('');
    const words = name.replace(/[^a-zA-Z ]/g, '').toUpperCase().split(' ').filter(Boolean);
    let code = words.map(w => w[0]).join('');
    if (code.length < 2) {
      code = (name.slice(0, 3) + Math.floor(Math.random() * 100)).toUpperCase();
    }
    setNewDeptCode(code.slice(0, 8));
  };

  // Submit new department creation
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDeptName.trim();
    if (!trimmed) {
      setNewDeptError('Please enter a department name');
      return;
    }

    try {
      const created = await createDept({
        department_code: newDeptCode.trim().toUpperCase() || trimmed.slice(0, 4).toUpperCase(),
        name: trimmed,
        description: `Department of ${trimmed}`,
      }).unwrap();

      const createdDeptId = created.data?.department_id || created.department_id || created.id;

      setShowAddModal(false);
      setNewDeptName('');
      setNewDeptCode('');
      setNewDeptError('');

      // Auto-select the newly created department
      if (activeTab === 'single' && createdDeptId) {
        onDeptIdChange(createdDeptId);
      } else if (createdDeptId) {
        const next = [...selectedDeptIds, createdDeptId];
        setSelectedDeptIds(next);
        const currentLabel = deptLabel ? `${deptLabel}, ${trimmed}` : trimmed;
        onDeptLabelChange(currentLabel);
      }
    } catch (err: any) {
      setNewDeptError(err?.data?.error || err?.message || 'Failed to create department');
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: 16 }}>
      {/* Header and Quick Add Department Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div>
          <label style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={16} style={{ color: '#5645d4' }} />
            Hosting Department / Directorate Scope *
          </label>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            Choose whether this session is for one department, multiple departments, or cross-agency.
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11.5,
            fontWeight: 700,
            color: '#5645d4',
            background: '#f4f2fc',
            border: '1px solid #c7d2fe',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          <Plus size={13} />
          Create New Department
        </button>
      </div>

      {/* 3 Scope Selection Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 12 }}>
        {/* Single Department Option */}
        <button
          type="button"
          onClick={() => handleTabChange('single')}
          style={{
            padding: '10px 12px',
            background: activeTab === 'single' ? '#f4f2fc' : '#ffffff',
            border: activeTab === 'single' ? '2px solid #5645d4' : '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            transition: 'all .15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={16} style={{ color: activeTab === 'single' ? '#5645d4' : '#64748b' }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: activeTab === 'single' ? '#391c57' : '#334155' }}>
                Single Department
              </div>
              <div style={{ fontSize: 10.5, color: '#64748b' }}>1 specific KeNHA unit</div>
            </div>
          </div>
          {activeTab === 'single' && <Check size={14} style={{ color: '#5645d4', flexShrink: 0 }} />}
        </button>

        {/* Multiple Departments Option */}
        <button
          type="button"
          onClick={() => handleTabChange('multi')}
          style={{
            padding: '10px 12px',
            background: activeTab === 'multi' ? '#f4f2fc' : '#ffffff',
            border: activeTab === 'multi' ? '2px solid #5645d4' : '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            transition: 'all .15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} style={{ color: activeTab === 'multi' ? '#5645d4' : '#64748b' }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: activeTab === 'multi' ? '#391c57' : '#334155' }}>
                Multiple Departments
              </div>
              <div style={{ fontSize: 10.5, color: '#64748b' }}>Select 2 or more units</div>
            </div>
          </div>
          {activeTab === 'multi' && <Check size={14} style={{ color: '#5645d4', flexShrink: 0 }} />}
        </button>

        {/* Custom / Joint Label Option */}
        <button
          type="button"
          onClick={() => handleTabChange('custom')}
          style={{
            padding: '10px 12px',
            background: activeTab === 'custom' ? '#f4f2fc' : '#ffffff',
            border: activeTab === 'custom' ? '2px solid #5645d4' : '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            transition: 'all .15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={16} style={{ color: activeTab === 'custom' ? '#5645d4' : '#64748b' }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: activeTab === 'custom' ? '#391c57' : '#334155' }}>
                Custom / Joint Label
              </div>
              <div style={{ fontSize: 10.5, color: '#64748b' }}>Type custom joint name</div>
            </div>
          </div>
          {activeTab === 'custom' && <Check size={14} style={{ color: '#5645d4', flexShrink: 0 }} />}
        </button>
      </div>

      {/* TAB CONTENT: 1. Single Department */}
      {activeTab === 'single' && (
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <label htmlFor="m-dept" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Select Department:
          </label>
          <select
            id="m-dept"
            className="filter-select"
            style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
            value={deptId}
            onChange={e => onDeptIdChange(e.target.value)}
          >
            {departments.map(d => (
              <option key={d.department_id} value={d.department_id}>
                {d.name} {d.department_code ? `(${d.department_code})` : ''}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
            Meeting reports and registers will be categorized under this single department.
          </span>
        </div>
      )}

      {/* TAB CONTENT: 2. Multiple Departments (Multi-Select) */}
      {activeTab === 'multi' && (
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1.5px solid #c7d2fe' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e3a8a' }}>
              Check All Participating Departments ({selectedDeptIds.length} of {departments.length} selected):
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  background: '#e0e7ff',
                  color: '#3730a3',
                  border: '1px solid #c7d2fe',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <CheckSquare size={12} /> Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Square size={12} /> Clear
              </button>
            </div>
          </div>

          {/* Department Selection Checkbox Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 4, marginBottom: 12 }}>
            {departments.map(d => {
              const isSelected = selectedDeptIds.includes(d.department_id);
              return (
                <button
                  key={d.department_id}
                  type="button"
                  onClick={() => handleToggleDeptInMulti(d.department_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    background: isSelected ? '#f4f2fc' : '#ffffff',
                    border: isSelected ? '1.5px solid #5645d4' : '1px solid #e2e8f0',
                    borderRadius: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .12s',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: isSelected ? '#5645d4' : '#ffffff',
                      border: isSelected ? 'none' : '1.5px solid #94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={13} style={{ color: '#ffffff', strokeWidth: 3 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#391c57' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.name}
                    </div>
                    {d.department_code && (
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                        {d.department_code}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Combined Department Label Preview / Edit */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              Combined Meeting Register Label (Auto-Generated from Selection):
            </label>
            <input
              type="text"
              className="form-input"
              value={deptLabel}
              onChange={e => onDeptLabelChange(e.target.value)}
              placeholder="e.g. ICT, Human Resources, Highway Design"
              style={{ fontSize: 12.5, padding: '7px 10px', width: '100%' }}
            />
            <span style={{ fontSize: 10.5, color: '#64748b', marginTop: 3, display: 'block' }}>
              ✓ You can edit this text if you wish to adjust how the multi-department group is printed in the register.
            </span>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. Custom / Freeform Label */}
      {activeTab === 'custom' && (
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <label htmlFor="m-dept-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Custom Department / Joint Session Label:
          </label>
          <input
            id="m-dept-label"
            type="text"
            className="form-input"
            placeholder="e.g. All Departments, ICT & HR Joint Session, Regional Corridor Teams"
            value={deptLabel}
            onChange={e => onDeptLabelChange(e.target.value)}
            maxLength={200}
            style={{ padding: '9px 12px', fontSize: 13, width: '100%' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Sparkles size={12} style={{ color: '#eab308' }} /> 1-Click Presets:
            </span>
            {CUSTOM_DEPT_SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onDeptLabelChange(s)}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: deptLabel === s ? '#e6e0f5' : '#ffffff',
                  color: deptLabel === s ? '#391c57' : '#475569',
                  border: deptLabel === s ? '1px solid #5645d4' : '1px solid #cbd5e1',
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

      {/* INLINE MODAL: Create New Department */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} style={{ color: '#5645d4' }} />
                Create New Department
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {newDeptError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {newDeptError}
              </div>
            )}

            <form onSubmit={handleCreateDepartment}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Department Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Environment & Social Safeguards"
                  value={newDeptName}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: 13 }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Department Code * (Auto-Generated or Custom)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ESS"
                  value={newDeptCode}
                  onChange={e => setNewDeptCode(e.target.value.toUpperCase())}
                  required
                  maxLength={10}
                  style={{ width: '100%', fontSize: 13, textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  disabled={isCreatingDept || !newDeptName.trim()}
                >
                  {isCreatingDept ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


