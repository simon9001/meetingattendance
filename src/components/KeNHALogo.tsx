import React from 'react';

interface KeNHALogoProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export const KeNHALogo: React.FC<KeNHALogoProps> = ({ className = '', width = 'auto', height = 'auto', style }) => {
  return (
    <img
      src="/kenhalogo.png"
      alt="KeNHA Logo"
      className={`kenha-logo ${className}`}
      style={{ width, height, objectFit: 'contain', ...style }}
    />
  );
};
