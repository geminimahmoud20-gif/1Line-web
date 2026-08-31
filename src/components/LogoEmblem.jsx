import React from 'react';

export const LogoEmblem = ({ size = 42 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, overflow: 'visible' }}>
    {/* Yellow Capsule Background */}
    <rect x="18" y="38" width="64" height="24" rx="12" fill="#ffca28" />
    {/* Roof Outline */}
    <path d="M 12 44 L 50 20 L 88 44" stroke="#0d48a1" strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* Three Vertical Pillars */}
    <line x1="32" y1="38" x2="32" y2="62" stroke="#0d48a1" strokeWidth="5.5" strokeLinecap="round" />
    <line x1="50" y1="20" x2="50" y2="72" stroke="#0d48a1" strokeWidth="5.5" strokeLinecap="round" />
    <line x1="68" y1="38" x2="68" y2="62" stroke="#0d48a1" strokeWidth="5.5" strokeLinecap="round" />
  </svg>
);

export default LogoEmblem;
