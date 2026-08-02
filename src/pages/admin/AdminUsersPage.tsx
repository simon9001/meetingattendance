import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { PageSpinner } from '../../components/shared/Feedback';
import type { User } from '../../data/mockData';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useDisableUserMutation,
  useEnableUserMutation,
  useResetUserPasswordMutation,
  useGetDepartmentsQuery
} from '../../features/apis/apiSlice';
import { mapProfileToUser } from '../../features/slice/authSlice';

interface AdminUsersPageProps {
  dbTick: number;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ showToast }) => {
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'hr' | 'organizer'>('organizer');
  const [newDeptId, setNewDeptId] = useState('');
  const [tempPassword, setTempPassword] = useState('Admin@2056');
  const [forceChangePass, setForceChangePass] = useState(true);

  // Queries & Mutations
  const { data: usersResponse, isLoading: isUsersLoading } = useGetUsersQuery(undefined, {
    pollingInterval: 3000, // real-time sync
  });
  const { data: deptsResponse, isLoading: isDeptsLoading } = useGetDepartmentsQuery(undefined);

  const [createUser] = useCreateUserMutation();
  const [disableUser] = useDisableUserMutation();
  const [enableUser] = useEnableUserMutation();
  const [resetPassword] = useResetUserPasswordMutation();

  // Set default department selection when loaded
  useEffect(() => {
    if (deptsResponse?.data && deptsResponse.data.length > 0 && !newDeptId) {
      setNewDeptId(deptsResponse.data[0].department_id);
    }
  }, [deptsResponse, newDeptId]);

  // Map backend users to frontend models
  const users = React.useMemo(() => {
    if (!usersResponse?.data) return [];
    return usersResponse.data.map((profile: any) => {
      const deptObj = deptsResponse?.data?.find(
        (d: any) => d.department_id === profile.department_id
      );
      return mapProfileToUser(profile, deptObj?.name);
    });
  }, [usersResponse, deptsResponse]);

  const toggleUserStatus = async (user: User) => {
    try {
      if (user.status === 'active') {
        await disableUser(user.id).unwrap();
        showToast(`User account for ${user.name} has been disabled.`);
      } else {
        await enableUser(user.id).unwrap();
        showToast(`User account for ${user.name} has been enabled.`);
      }
    } catch (err: any) {
      showToast(err?.data?.error || `Failed to update status for ${user.name}`, 'error');
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      await resetPassword(user.id).unwrap();
      showToast(`Password reset to default (Admin@2056). On next sign-in, ${user.name} will be forced to change password.`);
    } catch (err: any) {
      showToast(err?.data?.error || `Failed to reset password for ${user.name}`, 'error');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName || !newEmail) {
      showToast('Name and Email are required fields', 'error');
      return;
    }

    if (!newEmail.endsWith('@kenha.co.ke')) {
      showToast('Only official @kenha.co.ke email domains are allowed', 'error');
      return;
    }

    // Map frontend roles to backend role names
    let backendRole: 'ict_admin' | 'hr_officer' | 'meeting_creator' = 'meeting_creator';
    if (newRole === 'admin') backendRole = 'ict_admin';
    else if (newRole === 'hr') backendRole = 'hr_officer';

    const chosenPassword = tempPassword || 'Admin@2056';

    try {
      await createUser({
        full_name: newName,
        email: newEmail,
        role: backendRole,
        department_id: newDeptId || undefined,
        temp_password: chosenPassword
      }).unwrap();

      showToast(`User account created for ${newName} (Default Password: ${chosenPassword})`);
      setNewName('');
      setNewEmail('');
      setNewRole('organizer');
      setTempPassword('Admin@2056');
      if (deptsResponse?.data && deptsResponse.data.length > 0) {
        setNewDeptId(deptsResponse.data[0].department_id);
      }
      setForceChangePass(true);
      setShowAddUserModal(false);
    } catch (err: any) {
      showToast(err?.data?.error || 'Failed to create user', 'error');
    }
  };

  return (
    <div>
      <div className="search-filter-row" style={{ justifyContent: 'flex-end', marginBottom: 20 }}>
        <button type="button" onClick={() => setShowAddUserModal(true)} className="btn btn-primary" disabled={isDeptsLoading}>
          <UserPlus size={16} className="btn-icon" />
          Create User Account
        </button>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header">
          <h3>Registered System Users</h3>
        </div>
        <div className="panel-body">
          {isUsersLoading ? (
            <PageSpinner text="Loading users..." />
          ) : (
            <div className="table-responsive">
              <table className="table-fluent">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Official Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: User) => (
                    <tr key={u.id}>
                      <td><div style={{ fontWeight: 600 }}>{u.name}</div></td>
                      <td>{u.email}</td>
                      <td>
                        <span className="badge badge-physical" style={{ fontSize: 10 }}>{u.role.toUpperCase()}</span>
                      </td>
                      <td>{u.department}</td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-active' : 'badge-closed'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {u.email !== 'admin@kenha.co.ke' && (
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleResetPassword(u)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              title="Force password reset on next login"
                            >
                              Reset Password
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(u)}
                              className={`btn ${u.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              {u.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Create User Account</h3>
              <button onClick={() => setShowAddUserModal(false)} className="modal-close-btn"><Trash2 size={16} /></button>
            </div>
            <form onSubmit={handleCreateUserSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="n-name">Full Name</label>
                  <input
                    id="n-name"
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="n-email">Official KeNHA Email</label>
                  <input
                    id="n-email"
                    type="email"
                    className="form-input"
                    placeholder="e.g. name@kenha.co.ke"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="n-role">User Role</label>
                  <select
                    id="n-role"
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                  >
                    <option value="organizer">Meeting Organizer</option>
                    <option value="hr">Human Resource Officer</option>
                    <option value="admin">ICT Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="n-dept">Department</label>
                  <select
                    id="n-dept"
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={newDeptId}
                    onChange={e => setNewDeptId(e.target.value)}
                  >
                    {deptsResponse?.data?.map((d: any) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="n-pass">Default Temporary Password</label>
                  <input
                    id="n-pass"
                    type="text"
                    className="form-input"
                    value={tempPassword}
                    onChange={e => setTempPassword(e.target.value)}
                    placeholder="Admin@2056"
                    required
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                  <input
                    type="checkbox"
                    id="force-reset"
                    checked={forceChangePass}
                    onChange={e => setForceChangePass(e.target.checked)}
                  />
                  <label htmlFor="force-reset" style={{ fontSize: 13, fontWeight: 500 }}>
                    Force password change on first sign-in
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
