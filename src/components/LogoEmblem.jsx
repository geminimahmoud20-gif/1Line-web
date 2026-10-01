import React from 'react';
import emblemImg from '../assets/logo-emblem-transparent.png';

/**
 * 🏛️ 1LINE Official Brand Logo Emblem
 * Uses the authentic high-resolution emblem:
 * - Royal blue pitched architectural roof
 * - Golden 3D infinity ribbon loop
 * - Signature center blue pillar extending downward
 * - Dual vertical blue support pillars
 */
export const LogoEmblem = ({ size = 42, className = '', alt = '1Line Solutions' }) => {
  const pixelSize = typeof size === 'number' ? size : parseInt(size, 10) || 42;

  return (
    <img
      src={emblemImg}
      alt={alt}
      width={pixelSize}
      height={pixelSize}
      className={`logo-emblem-img logo-emblem-svg ${className}`}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        objectFit: 'contain',
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
      loading="eager"
      decoding="async"
    />
  );
};

export default LogoEmblem;
