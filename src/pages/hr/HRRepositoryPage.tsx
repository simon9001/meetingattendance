import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { PageSpinner } from '../../components/shared/Feedback';
import { useGetReportsQuery } from '../../features/apis/apiSlice';
import { resolveDepartmentDisplay } from '../../types/formConfig';

export const HRRepositoryPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: reportsResponse, isLoading } = useGetReportsQuery(undefined, {
    pollingInterval: 3000, // real-time refresh
  });

  const reports = React.useMemo(() => {
    if (!reportsResponse?.data) return [];
    return reportsResponse.data.filter(
      (r: any) => r.status === 'submitted_to_hr' || r.status === 'archived'
    );
  }, [reportsResponse]);

  const filtered = React.useMemo(() => {
    return reports.filter((r: any) => {
      const title = r.meetings?.title || '';
      const dept = resolveDepartmentDisplay(r.meetings, '');
      const organizer = r.profiles?.email || '';
      return (
        title.toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase()) ||
        organizer.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [reports, search]);

  return (
    <div>
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search HR repository by title, department, organizer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header"><h3>HR Official Repository</h3></div>
        <div className="panel-body">
          {isLoading ? (
            <PageSpinner text="Loading HR repository..." />
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No records found in HR Repository.</p>
          ) : (
            <div className="table-responsive">
              <table className="table-fluent">
                <thead>
                  <tr>
                    <th>Meeting Title</th>
                    <th>Department</th>
                    <th>Organizer</th>
                    <th>Meeting Date</th>
                    <th>Submission Date</th>
                    <th>Filing Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => (
                    <tr key={r.report_id}>
                      <td style={{ fontWeight: 600 }}>{r.meetings?.title || 'N/A'}</td>
                      <td>{resolveDepartmentDisplay(r.meetings, 'N/A')}</td>
                      <td>{r.profiles?.email || 'N/A'}</td>
                      <td>{r.meetings?.meeting_date || 'N/A'}</td>
                      <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className="badge badge-submitted">
                          {r.status === 'archived' ? 'Archived & Verified' : 'Submitted & Pending Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
