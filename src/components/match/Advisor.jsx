import './advisor.css';

/**
 * 1Line's guide on «رشّحلي شقتي»: a friendly advisor drawn as a rounded, lit cartoon (rimless
 * glasses, full beard, navy shirt, a tablet on the desk). SVG with gradients for depth; CSS
 * animates breathing, a slow nod, blinking, a glint across the glasses and a talking mouth.
 * Still for reduced-motion users. mood: 'idle' | 'talk' | 'think' | 'happy'
 */
export default function Advisor({ mood = 'idle', size = 160, className = '' }) {
  return (
    <div className={`adv is-${mood} ${className}`} style={{ width: size, height: size * 1.2 }} aria-hidden="true">
      <svg viewBox="0 0 200 240" className="adv-svg">
        <defs>
          <radialGradient id="adv-skin" cx="42%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#F6D2B4" />
            <stop offset="60%" stopColor="#E7B48E" />
            <stop offset="100%" stopColor="#C98F69" />
          </radialGradient>
          <linearGradient id="adv-neck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C98F69" />
            <stop offset="100%" stopColor="#E2AC86" />
          </linearGradient>
          <linearGradient id="adv-shirt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2E4677" />
            <stop offset="55%" stopColor="#1C2E55" />
            <stop offset="100%" stopColor="#111D38" />
          </linearGradient>
          <linearGradient id="adv-hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A2C24" />
            <stop offset="100%" stopColor="#1E1612" />
          </linearGradient>
          <linearGradient id="adv-tablet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4A4F59" />
            <stop offset="100%" stopColor="#1D2027" />
          </linearGradient>
          <radialGradient id="adv-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(7,17,31,0.3)" />
            <stop offset="100%" stopColor="rgba(7,17,31,0)" />
          </radialGradient>
          <clipPath id="adv-lenses">
            <rect x="70" y="88" width="27" height="20" rx="6" />
            <rect x="103" y="88" width="27" height="20" rx="6" />
          </clipPath>
        </defs>

        <ellipse cx="100" cy="234" rx="80" ry="7" fill="url(#adv-shadow)" />

        <g className="adv-body">
          {/* Shoulders and shirt */}
          <path d="M14 240 C 16 206, 34 186, 68 174 L 100 168 L 132 174 C 166 186, 184 206, 186 240 Z" fill="url(#adv-shirt)" />
          <path d="M40 196 C 52 186, 62 182, 74 178" stroke="rgba(255,255,255,0.16)" strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* Neck */}
          <path d="M86 140 L 114 140 L 116 172 Q 100 182, 84 172 Z" fill="url(#adv-neck)" />
          {/* Collar and placket */}
          <path d="M84 168 L 100 184 L 92 194 L 72 174 Z" fill="#26396A" />
          <path d="M116 168 L 100 184 L 108 194 L 128 174 Z" fill="#26396A" />
          <line x1="100" y1="186" x2="100" y2="240" stroke="#14213F" strokeWidth="2" />
          <circle cx="100" cy="200" r="2.4" fill="#E8ECF2" />
          <circle cx="100" cy="220" r="2.4" fill="#E8ECF2" />

          {/* Head, nodding gently */}
          <g className="adv-head">
            <ellipse cx="60" cy="104" rx="7" ry="11" fill="#D9A07A" />
            <ellipse cx="140" cy="104" rx="7" ry="11" fill="#D9A07A" />
            <ellipse cx="100" cy="100" rx="40" ry="48" fill="url(#adv-skin)" />
            {/* Short hair with a high hairline */}
            <path d="M62 94 C 60 70, 74 50, 100 47 C 126 50, 140 70, 138 94 C 134 84, 130 74, 122 68 C 116 66, 110 70, 100 69 C 90 70, 84 66, 78 68 C 70 74, 66 84, 62 94 Z" fill="url(#adv-hair)" />
            {/* Eyebrows */}
            <path className="adv-brow" d="M73 85 Q 83 80, 94 84" stroke="#2A1F19" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path className="adv-brow" d="M106 84 Q 117 80, 127 85" stroke="#2A1F19" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Eyes (with blink lids) and happy eyes */}
            <g className="adv-eyes">
              <ellipse cx="84" cy="98" rx="5" ry="4.5" fill="#2A1F19" />
              <ellipse cx="116" cy="98" rx="5" ry="4.5" fill="#2A1F19" />
              <circle cx="85.8" cy="96.4" r="1.6" fill="#fff" />
              <circle cx="117.8" cy="96.4" r="1.6" fill="#fff" />
              <rect className="adv-lid" x="77" y="92" width="14" height="12" rx="6" fill="#E7B48E" />
              <rect className="adv-lid" x="109" y="92" width="14" height="12" rx="6" fill="#E7B48E" />
            </g>
            <g className="adv-happy-eyes">
              <path d="M78 100 Q 84 93, 90 100" stroke="#2A1F19" strokeWidth="3.4" strokeLinecap="round" fill="none" />
              <path d="M110 100 Q 116 93, 122 100" stroke="#2A1F19" strokeWidth="3.4" strokeLinecap="round" fill="none" />
            </g>
            {/* Nose */}
            <path d="M100 100 Q 96 110, 98 113 Q 101 115, 104 113" stroke="#B87D58" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            {/* Rimless glasses with a moving glint */}
            <g className="adv-glasses">
              <rect x="70" y="88" width="27" height="20" rx="6" fill="rgba(220,235,255,0.12)" stroke="#C7CDD6" strokeWidth="1.6" />
              <rect x="103" y="88" width="27" height="20" rx="6" fill="rgba(220,235,255,0.12)" stroke="#C7CDD6" strokeWidth="1.6" />
              <path d="M97 95 Q 100 92, 103 95" stroke="#C7CDD6" strokeWidth="1.6" fill="none" />
              <line x1="70" y1="94" x2="60" y2="97" stroke="#C7CDD6" strokeWidth="1.6" />
              <line x1="130" y1="94" x2="140" y2="97" stroke="#C7CDD6" strokeWidth="1.6" />
              <g clipPath="url(#adv-lenses)">
                <rect className="adv-glint" x="40" y="80" width="8" height="40" fill="rgba(255,255,255,0.55)" transform="skewX(-25)" />
              </g>
            </g>
            {/* Full beard, mustache and a warm smile */}
            <path d="M61 100 C 61 124, 70 148, 100 157 C 130 148, 139 124, 139 100 C 135 113, 127 121, 117 121 C 110 119, 90 119, 83 121 C 73 121, 65 113, 61 100 Z" fill="url(#adv-hair)" />
            <path d="M85 122 Q 100 114, 115 122 Q 100 120, 85 122 Z" fill="#1E1612" />
            <g className="adv-mouth">
              <path d="M88 126 Q 100 140, 112 126 Q 100 131, 88 126 Z" fill="#6B2E26" />
              <path d="M90 127 Q 100 133, 110 127 Q 100 130, 90 127 Z" fill="#FFFFFF" />
            </g>
          </g>

          {/* Tablet on the desk, and a hand resting beside it */}
          <g className="adv-tablet">
            <path d="M10 204 L 78 196 L 84 240 L 14 240 Z" fill="url(#adv-tablet)" />
            <path d="M16 208 L 74 201" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
            <circle cx="47" cy="222" r="5" fill="rgba(217,185,126,0.55)" />
          </g>
          <ellipse cx="150" cy="232" rx="20" ry="9" fill="#E2AC86" />
          <path d="M136 230 Q 150 224, 166 230" stroke="#C98F69" strokeWidth="1.6" fill="none" />
        </g>
      </svg>
    </div>
  );
}
