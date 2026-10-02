import React from 'react';

interface KeNHALogoProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

// kenhalogo.png is a square canvas with the oval mark occupying only its middle
// (≈90% of the width, ≈53% of the height). Drawn as-is the mark came out tiny,
// so the image is enlarged inside a frame cropped to the oval — the same
// ellipse the letterhead banner uses — and `height` is the visible mark height.
const MARK_W = 0.9;
const MARK_H = 0.532;

export const KeNHALogo: React.FC<KeNHALogoProps> = ({ className = '', height = 32, style }) => {
  const h = typeof height === 'number' ? height : parseFloat(String(height)) || 32;
  const imgSize = h / MARK_H;
  const frameW = Math.round(imgSize * MARK_W);

  return (
    <span
      className={`kenha-logo ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        flexShrink: 0,
        width: frameW,
        height: h,
        overflow: 'hidden',
        ...style,
      }}
    >
      <img
        src="/kenhalogo.png"
        alt="KeNHA"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: imgSize,
          height: imgSize,
          maxWidth: 'none',
          transform: 'translate(-50.1%, -49.3%)',
          objectFit: 'contain',
          clipPath: 'ellipse(45% 26.6% at 49.9% 49.3%)',
        }}
      />
    </span>
  );
};
