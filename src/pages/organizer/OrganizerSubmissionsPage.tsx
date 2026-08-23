import React from 'react';
import { useGetReportsQuery } from '../../features/apis/apiSlice';
import { Loader2 } from 'lucide-react';
import { resolveDepartmentDisplay } from '../../types/formConfig';

export const OrganizerSubmissionsPage: React.FC = () => {
  const { data: reportsResponse, isLoading } = useGetReportsQuery(undefined, {
    pollingInterval: 3000,
  });

  const submittedReports = React.useMemo(() => {
    if (!reportsResponse?.data) return [];
    return reportsResponse.data.filter(
      (r: any) => r.status === 'submitted_to_hr' || r.status === 'archived'
    );
  }, [reportsResponse]);

  return (
    <div className="dashboard-panel">
      <div className="panel-header"><h3>Submitted HR Reports</h3></div>
      <div className="panel-body">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : submittedReports.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>You have not submitted any reports yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table-fluent">
              <thead>
                <tr>
                  <th>Meeting Title</th>
                  <th>Department</th>
                  <th>Date Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {submittedReports.map((r: any) => (
                  <tr key={r.report_id}>
                    <td style={{ fontWeight: 600 }}>{r.meetings?.title || 'N/A'}</td>
                    <td>{resolveDepartmentDisplay(r.meetings, 'N/A')}</td>
                    <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'N/A'}</td>
                    <td><span className="badge badge-submitted">Filed in repository</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
