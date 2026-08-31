import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
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

export const AdminDepartmentsPage: React.FC<AdminDepartmentsPageProps> = ({ showToast }) => {
  const [newDeptName, setNewDeptName] = useState('');

  const { data: deptsResponse, isLoading } = useGetDepartmentsQuery(undefined, {
    pollingInterval: 3000, // real-time refresh
  });
  const [createDept] = useCreateDepartmentMutation();
  const [deleteDept] = useDeleteDepartmentMutation();

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;

    const exists = Array.isArray(deptsResponse?.data) && deptsResponse.data.some(
      (d: any) => d.name.toLowerCase() === newDeptName.toLowerCase()
    );
    if (exists) {
      showToast('Department already exists', 'error');
      return;
    }

    // Auto-generate code from name
    const words = newDeptName.replace(/[^a-zA-Z ]/g, '').toUpperCase().split(' ').filter(Boolean);
    let code = words.map(w => w[0]).join('');
    if (code.length < 2) {
      code = (newDeptName.slice(0, 3) + Math.floor(Math.random() * 100)).toUpperCase();
    }
    code = code.slice(0, 10);

    try {
      await createDept({
        department_code: code,
        name: newDeptName,
        description: `Department of ${newDeptName}`
      }).unwrap();

      showToast('Department added successfully');
      setNewDeptName('');
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to create department', 'error');
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

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="dashboard-panel" style={{ marginBottom: 24 }}>
        <div className="panel-header"><h3>Add Department</h3></div>
        <div className="panel-body">
          <form onSubmit={handleAddDept} style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Enter department name"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header"><h3>Registered Departments</h3></div>
        <div className="panel-body">
          {isLoading ? (
            <PageSpinner text="Loading departments..." />
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, padding: 0 }}>
              {deptsResponse?.data?.map((dept: any) => (
                <li
                  key={dept.department_id}
                  style={{
                    padding: 12,
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{dept.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'monospace' }}>
                      ({dept.department_code})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="badge badge-physical">Active</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDept(dept.department_id, dept.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-danger, #EF4444)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex'
                      }}
                      title="Delete Department"
                    >
                      <Trash2 size={14} />
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
