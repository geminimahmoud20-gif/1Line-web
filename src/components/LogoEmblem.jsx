import React from 'react';

/**
 * 🏛️ 1LINE Official Logo Emblem
 * Faithfully matches the original brand identity:
 * - Royal blue pitched roof with apex
 * - Sunny golden capsule / pill
 * - Signature center blue pillar extending from roof apex through and below the capsule
 * - Left and right blue pillars inside the capsule
 */
export const LogoEmblem = ({ size = 42, className = '' }) => (
  <svg 
    viewBox="0 0 100 90" 
    width={size} 
    height={Math.round(size * 0.9)} 
    xmlns="http://www.w3.org/2000/svg" 
    className={`logo-emblem-svg ${className}`}
    style={{ flexShrink: 0, overflow: 'visible' }}
    aria-label="1Line Logo Emblem"
  >
    <defs>
      <linearGradient id="logoCapsuleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fed141" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>

    {/* Golden Pill / Capsule Background */}
    <rect 
      x="22" 
      y="40" 
      width="56" 
      height="28" 
      rx="14" 
      className="logo-emblem-capsule" 
      fill="url(#logoCapsuleGradient)" 
    />

    {/* Triangular Roof Outline */}
    <path 
      d="M 12 40 L 50 14 L 88 40" 
      className="logo-emblem-roof" 
      stroke="#0b4ea2" 
      strokeWidth="5.5" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />

    {/* Left Vertical Pillar (inside capsule) */}
    <line 
      x1="35" 
      y1="43" 
      x2="35" 
      y2="65" 
      className="logo-emblem-pillar" 
      stroke="#0b4ea2" 
      strokeWidth="5" 
      strokeLinecap="round" 
    />

    {/* Center Vertical Signature Line (from roof apex down through capsule & extends below) */}
    <line 
      x1="50" 
      y1="14" 
      x2="50" 
      y2="78" 
      className="logo-emblem-pillar logo-emblem-center" 
      stroke="#0b4ea2" 
      strokeWidth="5.5" 
      strokeLinecap="round" 
    />

    {/* Right Vertical Pillar (inside capsule) */}
    <line 
      x1="65" 
      y1="43" 
      x2="65" 
      y2="65" 
      className="logo-emblem-pillar" 
      stroke="#0b4ea2" 
      strokeWidth="5" 
      strokeLinecap="round" 
    />
  </svg>
);

export default LogoEmblem;
