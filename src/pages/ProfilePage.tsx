import React from 'react';
import { Mail, Shield, Building2, Calendar, BadgeCheck, CircleSlash } from 'lucide-react';
import type { User } from '../data/mockData';

interface ProfilePageProps {
  currentUser: User;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Administrator',
  hr: 'HR Officer',
  organizer: 'Meeting Organizer',
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-3.5 border-b border-base-200 last:border-b-0">
    <span className="flex-shrink-0 text-base-content/40">{icon}</span>
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-base-content/50 font-medium">{label}</span>
      <span className="text-sm text-base-content font-semibold truncate">{value}</span>
    </div>
  </div>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser }) => {
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const roleLabel = ROLE_LABELS[currentUser.role] || currentUser.role;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-content">My Profile</h1>
        <p className="text-sm text-base-content/50 mt-1">View your account details.</p>
      </div>

      <div className="live-dashboard-grid">
        {/* Identity card */}
        <div className="dashboard-panel">
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 24px' }}>
            <div className="bg-brand-600 text-white rounded-full w-20 h-20 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-xs">
              {initials}
            </div>
            <h2 className="text-lg font-bold text-base-content mt-4">{currentUser.name}</h2>
            <span className="text-sm text-base-content/50">{roleLabel}</span>
            <span className={`badge mt-4 ${currentUser.status === 'active' ? 'badge-active' : 'badge-closed'}`}>
              {currentUser.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5"><BadgeCheck size={13} /> Active Account</span>
              ) : (
                <span className="inline-flex items-center gap-1.5"><CircleSlash size={13} /> Disabled</span>
              )}
            </span>
          </div>
        </div>

        {/* Account details */}
        <div className="dashboard-panel">
          <div className="panel-header"><h3>Account Details</h3></div>
          <div className="panel-body" style={{ padding: '4px 20px' }}>
            <InfoRow icon={<Mail size={16} />} label="Email Address" value={currentUser.email} />
            <InfoRow icon={<Shield size={16} />} label="Role" value={roleLabel} />
            <InfoRow icon={<Building2 size={16} />} label="Department" value={currentUser.department || '—'} />
            {currentUser.lastLogin && (
              <InfoRow icon={<Calendar size={16} />} label="Last Login" value={new Date(currentUser.lastLogin).toLocaleString()} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
