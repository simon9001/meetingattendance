import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { MockDb } from '../../data/mockData';

interface AdminSecurityPageProps {
  dbTick: number;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
}

export const AdminSecurityPage: React.FC<AdminSecurityPageProps> = ({ dbTick, showToast, triggerDbUpdate }) => {
  const [timeout, setTimeoutVal] = useState('15');
  const [pinRetry, setPinRetry] = useState('3');
  const [forceHttps, setForceHttps] = useState(true);

  useEffect(() => {
    setTimeoutVal(localStorage.getItem('kmtams_sec_timeout') || '15');
    setPinRetry(localStorage.getItem('kmtams_sec_retry') || '3');
    setForceHttps(localStorage.getItem('kmtams_sec_https') !== 'false');
  }, [dbTick]);

  const saveSettings = () => {
    localStorage.setItem('kmtams_sec_timeout', timeout);
    localStorage.setItem('kmtams_sec_retry', pinRetry);
    localStorage.setItem('kmtams_sec_https', String(forceHttps));
    MockDb.addAuditLog('admin@kenha.co.ke', 'SECURITY_CONFIG_UPDATE', 'Updated system-wide security settings');
    showToast('Security configurations updated successfully');
    triggerDbUpdate();
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="dashboard-panel">
        <div className="panel-header"><h3>Security Configurations</h3></div>
        <div className="panel-body">
          <div className="settings-group-title">Session & Access Control</div>
          <div className="form-group">
            <label htmlFor="s-timeout">Session Inactivity Timeout (minutes)</label>
            <input
              id="s-timeout"
              type="number"
              className="form-input"
              value={timeout}
              onChange={e => setTimeoutVal(e.target.value)}
            />
          </div>

          <div className="settings-group-title" style={{ marginTop: 24 }}>Form Submission Security</div>
          <div className="form-group">
            <label htmlFor="s-retry">Max PIN Submission Retries</label>
            <input
              id="s-retry"
              type="number"
              className="form-input"
              value={pinRetry}
              onChange={e => setPinRetry(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <button
              type="button"
              onClick={() => setForceHttps(h => !h)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              {forceHttps ? <ToggleRight size={36} color="#F9D616" /> : <ToggleLeft size={36} color="#6B7280" />}
            </button>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>Require Secure HTTPS Encryption</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Block attendance submissions over unencrypted connections.</span>
            </div>
          </div>

          <button type="button" onClick={saveSettings} className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>
            Save Security Configurations
          </button>
        </div>
      </div>
    </div>
  );
};
