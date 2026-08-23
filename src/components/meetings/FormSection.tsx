import React from 'react';

export const FormSection: React.FC<{
  step: number;
  title: string;
  helperText: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ step, title, helperText, icon, children }) => (
  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
      {icon}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {step}. {title}
      </span>
    </div>
    <p style={{ margin: '2px 0 12px', fontSize: 12, color: '#64748b' }}>{helperText}</p>
    {children}
  </div>
);
