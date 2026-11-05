import './beto.css';

/**
 * «بيتو»: 1Line's guide, a little house with a gold roof, a chimney that puffs, big eyes that
 * blink and small arms. Drawn in SVG with light and shade so it reads as rounded and solid;
 * moves with CSS only (bob, blink, wave, puff) and keeps still for reduced-motion users.
 * mood: 'idle' | 'talk' | 'think' | 'happy'
 */
export default function Beto({ mood = 'idle', size = 160, className = '' }) {
  return (
    <div className={`beto is-${mood} ${className}`} style={{ width: size, height: size * 1.12 }} aria-hidden="true">
      <svg viewBox="0 0 200 224" className="beto-svg">
        <defs>
          <radialGradient id="beto-body" cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#2A4A7A" />
            <stop offset="55%" stopColor="#13284A" />
            <stop offset="100%" stopColor="#081426" />
          </radialGradient>
          <linearGradient id="beto-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3DCA4" />
            <stop offset="45%" stopColor="#D2A55A" />
            <stop offset="100%" stopColor="#9C7433" />
          </linearGradient>
          <linearGradient id="beto-chimney" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#B88A44" />
            <stop offset="100%" stopColor="#8A6428" />
          </linearGradient>
          <radialGradient id="beto-eye" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DCE4F0" />
          </radialGradient>
          <radialGradient id="beto-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(7,17,31,0.35)" />
            <stop offset="100%" stopColor="rgba(7,17,31,0)" />
          </radialGradient>
        </defs>

        {/* Ground shadow (shrinks as the body rises) */}
        <ellipse className="beto-shadow" cx="100" cy="212" rx="58" ry="9" fill="url(#beto-shadow)" />

        <g className="beto-float">
          {/* Chimney and its puffs */}
          <g className="beto-puffs">
            <circle cx="142" cy="30" r="6" fill="#E7EEF7" />
            <circle cx="150" cy="18" r="8" fill="#E7EEF7" />
            <circle cx="160" cy="6" r="6" fill="#E7EEF7" />
          </g>
          <rect x="130" y="38" width="22" height="34" rx="5" fill="url(#beto-chimney)" />
          <rect x="127" y="34" width="28" height="9" rx="4" fill="#D2A55A" />

          {/* Arms (behind the body); the right one waves */}
          <g className="beto-arm beto-arm-left">
            <path d="M40 140 C 20 140, 14 156, 22 166" stroke="#13284A" strokeWidth="13" strokeLinecap="round" fill="none" />
            <circle cx="22" cy="167" r="9" fill="#D2A55A" />
          </g>
          <g className="beto-arm beto-arm-right">
            <path d="M160 138 C 180 132, 188 116, 182 104" stroke="#13284A" strokeWidth="13" strokeLinecap="round" fill="none" />
            <circle cx="182" cy="102" r="9" fill="#D2A55A" />
          </g>

          {/* Body: a rounded block with a soft highlight for depth */}
          <rect x="36" y="84" width="128" height="114" rx="34" fill="url(#beto-body)" />
          <path d="M52 104 Q 60 92, 80 90" stroke="rgba(255,255,255,0.28)" strokeWidth="7" strokeLinecap="round" fill="none" />

          {/* Roof: rounded gold triangle with a lighter ridge */}
          <path d="M100 26 Q 106 26, 111 31 L 176 92 Q 182 99, 172 100 L 28 100 Q 18 99, 24 92 L 89 31 Q 94 26, 100 26 Z" fill="url(#beto-roof)" />
          <path d="M100 36 L 40 92" stroke="rgba(255,255,255,0.45)" strokeWidth="5" strokeLinecap="round" />

          {/* Face */}
          <g className="beto-face">
            <g className="beto-eyes">
              <ellipse cx="78" cy="134" rx="17" ry="19" fill="url(#beto-eye)" />
              <ellipse cx="122" cy="134" rx="17" ry="19" fill="url(#beto-eye)" />
              <g className="beto-pupils">
                <circle cx="80" cy="137" r="8.5" fill="#07111F" />
                <circle cx="124" cy="137" r="8.5" fill="#07111F" />
                <circle cx="83" cy="133" r="3" fill="#FFFFFF" />
                <circle cx="127" cy="133" r="3" fill="#FFFFFF" />
              </g>
              {/* Lids for the blink */}
              <rect className="beto-lid" x="58" y="113" width="40" height="42" rx="18" fill="#13284A" />
              <rect className="beto-lid" x="102" y="113" width="40" height="42" rx="18" fill="#13284A" />
            </g>
            {/* Happy eyes ^ ^ */}
            <g className="beto-happy-eyes">
              <path d="M64 138 Q 78 120, 92 138" stroke="#F3DCA4" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M108 138 Q 122 120, 136 138" stroke="#F3DCA4" strokeWidth="6" strokeLinecap="round" fill="none" />
            </g>
            <ellipse cx="62" cy="160" rx="9" ry="5" fill="rgba(244,140,140,0.45)" />
            <ellipse cx="138" cy="160" rx="9" ry="5" fill="rgba(244,140,140,0.45)" />
            <path className="beto-smile" d="M86 162 Q 100 176, 114 162" stroke="#F3DCA4" strokeWidth="5" strokeLinecap="round" fill="none" />
            <ellipse className="beto-mouth" cx="100" cy="166" rx="9" ry="7" fill="#F3DCA4" />
          </g>

          {/* Door-shaped belly badge with the brand mark */}
          <rect x="88" y="178" width="24" height="20" rx="8" fill="rgba(210,165,90,0.22)" />
          <text x="100" y="193" textAnchor="middle" fontSize="13" fontWeight="800" fill="#D2A55A" fontFamily="system-ui, sans-serif">1</text>
        </g>
      </svg>
    </div>
  );
}
