import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FormSectionProps {
  step: number;
  title: string;
  helperText: string;
  icon?: React.ReactNode;
  isCompleted?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  step,
  title,
  helperText,
  icon,
  isCompleted,
  badge,
  children,
}) => (
  <div
    style={{
      background: '#ffffff',
      border: isCompleted ? '1.5px solid #dcfce7' : '1.5px solid #e2e8f0',
      borderRadius: 12,
      padding: '18px 20px',
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: isCompleted ? '#dcfce7' : '#fef9c3',
            color: isCompleted ? '#16a34a' : '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {isCompleted ? <CheckCircle2 size={16} /> : step}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', letterSpacing: -0.2, display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon} {title}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {badge}
        {isCompleted && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Ready
          </span>
        )}
      </div>
    </div>

    <p style={{ margin: '0 0 14px 36px', fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
      {helperText}
    </p>

    <div style={{ paddingLeft: 4 }}>
      {children}
    </div>
  </div>
);
