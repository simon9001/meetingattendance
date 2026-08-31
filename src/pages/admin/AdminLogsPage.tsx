import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { PageSpinner } from '../../components/shared/Feedback';
import { useGetAuditLogsQuery } from '../../features/apis/apiSlice';

export const AdminLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: logsResponse, isLoading } = useGetAuditLogsQuery(undefined, {
    pollingInterval: 5000, // Refresh logs every 5 seconds
  });

  const logs = React.useMemo(() => {
    if (!Array.isArray(logsResponse?.data)) return [];
    return logsResponse.data.map((log: any) => ({
      id: log.log_id,
      timestamp: log.created_at,
      email: log.profiles?.email || 'System / Public',
      actorName: log.profiles?.full_name || 'System / Guest',
      action: log.action,
      details: log.details || '',
      ip: log.ip_address || '127.0.0.1'
    }));
  }, [logsResponse]);

  const filteredLogs = logs.filter((log: any) =>
    log.email.toLowerCase().includes(search.toLowerCase()) ||
    log.actorName.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search logs by action, actor, email, or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header">
          <h3>System Audit Trail</h3>
        </div>
        <div className="panel-body">
          {isLoading ? (
            <PageSpinner text="Loading audit logs..." />
          ) : (
            <div className="table-responsive">
              <table className="table-fluent" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor / Email</th>
                    <th>Action Event</th>
                    <th>Details</th>
                    <th>Client IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.actorName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-submitted" style={{ fontFamily: 'monospace', fontSize: 10 }}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td>{log.details}</td>
                      <td style={{ fontFamily: 'monospace' }}>{log.ip}</td>
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
