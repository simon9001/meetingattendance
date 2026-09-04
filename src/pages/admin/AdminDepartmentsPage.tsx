import React, { useState } from 'react';
import { Trash2, Plus, Layers, Search, Building2, Sparkles } from 'lucide-react';
import { PageSpinner } from '../../components/shared/Feedback';
import {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation
} from '../../features/apis/apiSlice';

interface AdminDepartmentsPageProps {
  dbTick: number;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
}

const COMMON_KENHA_DEPTS = [
  'Information & Communication Technology',
  'Human Resource & Administration',
  'Highway Design & Safety',
  'Corporate Planning & Strategy',
  'Finance & Accounts',
  'Audit & Risk Management',
  'Legal Services & Board Affairs',
  'Supply Chain Management',
  'Environment & Social Safeguards',
  'Special Projects & Public-Private Partnerships',
];

export const AdminDepartmentsPage: React.FC<AdminDepartmentsPageProps> = ({ showToast }) => {
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [newDeptName, setNewDeptName] = useState('');
  const [bulkDeptsText, setBulkDeptsText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: deptsResponse, isLoading } = useGetDepartmentsQuery(undefined, {
    pollingInterval: 3000,
  });
  const [createDept] = useCreateDepartmentMutation();
  const [deleteDept] = useDeleteDepartmentMutation();

  const generateCode = (name: string) => {
    const words = name.replace(/[^a-zA-Z ]/g, '').toUpperCase().split(' ').filter(Boolean);
    let code = words.map(w => w[0]).join('');
    if (code.length < 2) {
      code = (name.slice(0, 3) + Math.floor(Math.random() * 100)).toUpperCase();
    }
    return code.slice(0, 8);
  };

  const handleAddSingleDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDeptName.trim();
    if (!trimmed) return;

    const exists = Array.isArray(deptsResponse?.data) && deptsResponse.data.some(
      (d: any) => d.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showToast('Department already exists', 'error');
      return;
    }

    const code = generateCode(trimmed);

    try {
      await createDept({
        department_code: code,
        name: trimmed,
        description: `Department of ${trimmed}`
      }).unwrap();

      showToast(`Department "${trimmed}" added successfully!`);
      setNewDeptName('');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to create department', 'error');
    }
  };

  const handleAddBulkDepts = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNames = bulkDeptsText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (rawNames.length === 0) {
      showToast('Please enter at least one department name', 'error');
      return;
    }

    setIsSubmitting(true);
    const existingNames = new Set(
      Array.isArray(deptsResponse?.data)
        ? deptsResponse.data.map((d: any) => d.name.toLowerCase())
        : []
    );

    const newItems = rawNames.filter(name => !existingNames.has(name.toLowerCase()));

    if (newItems.length === 0) {
      showToast('All listed departments already exist!', 'error');
      setIsSubmitting(false);
      return;
    }

    const payload = newItems.map((name, idx) => {
      let code = generateCode(name);
      if (idx > 0) code = code + idx;
      return {
        department_code: code.slice(0, 10),
        name,
        description: `Department of ${name}`,
      };
    });

    try {
      await createDept(payload).unwrap();
      showToast(`Successfully created ${newItems.length} departments!`, 'success');
      setBulkDeptsText('');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to create multiple departments', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete department: ${name}?`)) return;
    try {
      await deleteDept(id).unwrap();
      showToast('Department deleted successfully');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to delete department', 'error');
    }
  };

  const filteredDepts = (deptsResponse?.data || []).filter((dept: any) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      dept.name.toLowerCase().includes(q) ||
      (dept.department_code && dept.department_code.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="dashboard-panel" style={{ marginBottom: 24 }}>
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={18} className="text-brand-700" />
            Register Departments
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setAddMode('single')}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                background: addMode === 'single' ? '#111827' : '#f1f5f9',
                color: addMode === 'single' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={13} /> Single Department
            </button>
            <button
              type="button"
              onClick={() => setAddMode('bulk')}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                background: addMode === 'bulk' ? '#111827' : '#f1f5f9',
                color: addMode === 'bulk' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Layers size={13} /> Multiple / Batch Add
            </button>
          </div>
        </div>

        <div className="panel-body">
          {addMode === 'single' ? (
            <form onSubmit={handleAddSingleDept} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Highway Design & Safety"
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={15} /> Add Department
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddBulkDepts}>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>
                Enter multiple department names separated by <strong>commas</strong> or <strong>new lines</strong>:
              </p>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Information Technology, Human Resources, Highway Design, Audit, Planning, Corporate Affairs"
                value={bulkDeptsText}
                onChange={e => setBulkDeptsText(e.target.value)}
                style={{ width: '100%', fontSize: 13, marginBottom: 8 }}
                required
              />

              {/* Quick suggestions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Sparkles size={12} style={{ color: '#eab308' }} /> Popular KeNHA Units:
                </span>
                {COMMON_KENHA_DEPTS.slice(0, 4).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBulkDeptsText(prev => prev ? `${prev}, ${preset}` : preset)}
                    style={{
                      fontSize: 10.5,
                      padding: '2px 6px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: '#334155',
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !bulkDeptsText.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Layers size={15} />
                  {isSubmitting ? 'Creating Departments...' : 'Create Multiple Departments'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* List of Registered Departments */}
      <div className="dashboard-panel">
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>
            Registered Departments ({filteredDepts.length})
          </h3>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px 4px 28px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div className="panel-body">
          {isLoading ? (
            <PageSpinner text="Loading departments..." />
          ) : filteredDepts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 13 }}>
              No departments found matching your search.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0 }}>
              {filteredDepts.map((dept: any) => (
                <li
                  key={dept.department_id}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{dept.name}</span>
                    {dept.department_code && (
                      <span style={{ fontSize: 10.5, color: '#854d0e', background: '#fef9c3', border: '1px solid #fde047', padding: '1px 6px', borderRadius: 4, marginLeft: 8, fontFamily: 'monospace', fontWeight: 600 }}>
                        {dept.department_code}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-physical" style={{ fontSize: 11 }}>Active</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDept(dept.department_id, dept.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-danger, #EF4444)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                      }}
                      title="Delete Department"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

