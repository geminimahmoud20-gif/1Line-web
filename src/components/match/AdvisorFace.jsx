/**
 * The founder as a cartoon, traced from his photo's proportions: a full round face, short hair with a
 * high hairline and a small tuft in the middle, a thick rounded beard, a wide smile, thin metal-rim
 * glasses, a white shirt under a navy blazer with a gold «1L» pin, and the office chair behind him. Lit with gradients for depth. The parts that move
 * (head, lids, mouth, glint) carry class names that advisor.css animates.
 */
export default function AdvisorFace() {
  return (
    <svg viewBox="0 0 480 480" className="adv-face" aria-hidden="true">
      <defs>
        <radialGradient id="af-bg" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#FBF7EF" />
          <stop offset="100%" stopColor="#E4DCCB" />
        </radialGradient>
        <radialGradient id="af-skin" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#F7D3B6" />
          <stop offset="55%" stopColor="#EAB592" />
          <stop offset="100%" stopColor="#CF9470" />
        </radialGradient>
        <linearGradient id="af-shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34508C" />
          <stop offset="50%" stopColor="#223A6E" />
          <stop offset="100%" stopColor="#15264A" />
        </linearGradient>
        <linearGradient id="af-beard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B2B22" />
          <stop offset="100%" stopColor="#1F1511" />
        </linearGradient>
        <linearGradient id="af-chair" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3A3D44" />
          <stop offset="100%" stopColor="#1E2025" />
        </linearGradient>
        <clipPath id="af-lens">
          <rect x="162" y="146" width="74" height="46" rx="11" />
          <rect x="260" y="146" width="74" height="46" rx="11" />
        </clipPath>
      </defs>

      <rect width="480" height="480" fill="url(#af-bg)" />
      {/* Office chair behind the right shoulder */}
      <path d="M330 230 C 360 214, 420 214, 452 236 L 470 360 L 340 360 Z" fill="url(#af-chair)" />

      {/* Navy blazer over a white open-collar shirt, a gold «1L» pin on the lapel */}
      <path d="M0 480 L 0 392 C 40 352, 120 326, 196 300 L 250 318 L 304 296 C 380 318, 446 346, 480 384 L 480 480 Z" fill="url(#af-shirt)" />
      <path d="M60 384 C 100 358, 140 344, 180 332" stroke="rgba(255,255,255,0.16)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M206 288 L 300 288 L 304 326 Q 252 352, 200 326 Z" fill="#D59A75" />
      {/* Shirt: the white V and its collar points */}
      <path d="M196 304 L 250 330 L 304 300 L 300 480 L 200 480 Z" fill="#F4F6F9" />
      <path d="M196 300 L 248 342 L 222 368 L 182 318 Z" fill="#FFFFFF" stroke="#D7DCE3" strokeWidth="2" />
      <path d="M306 296 L 254 342 L 280 368 L 322 312 Z" fill="#FFFFFF" stroke="#D7DCE3" strokeWidth="2" />
      <path d="M250 348 L 250 480" stroke="#D7DCE3" strokeWidth="3" />
      <circle cx="250" cy="404" r="4.5" fill="#E3E7EC" />
      <circle cx="250" cy="456" r="4.5" fill="#E3E7EC" />
      {/* Blazer lapels */}
      <path d="M160 330 L 200 318 L 238 420 L 214 480 L 150 480 Z" fill="#1B2D62" />
      <path d="M340 326 L 300 312 L 262 420 L 286 480 L 350 480 Z" fill="#1B2D62" />
      <path d="M200 318 L 238 420" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
      <path d="M300 312 L 262 420" stroke="rgba(0,0,0,0.25)" strokeWidth="3" />
      {/* Gold pin */}
      <g transform="translate(318 372) rotate(-8)">
        <rect x="-15" y="-11" width="30" height="22" rx="5" fill="#C9A15A" />
        <text x="0" y="6" textAnchor="middle" fontSize="15" fontWeight="900" fill="#1B2D62" fontFamily="system-ui, sans-serif">1L</text>
      </g>

      <g className="adv-head">
        {/* Ears */}
        <ellipse cx="150" cy="196" rx="15" ry="27" fill="#DFA27E" />
        <ellipse cx="346" cy="192" rx="15" ry="27" fill="#DFA27E" />
        <path d="M150 182 Q 142 196, 150 210" stroke="#C88663" strokeWidth="4" fill="none" />
        <path d="M346 178 Q 354 192, 346 206" stroke="#C88663" strokeWidth="4" fill="none" />

        {/* Face */}
        <path d="M152 162 C 150 86, 196 46, 248 46 C 304 46, 346 86, 344 166 C 344 244, 310 302, 248 306 C 186 302, 152 244, 152 162 Z" fill="url(#af-skin)" />
        <ellipse cx="214" cy="104" rx="34" ry="16" fill="rgba(255,255,255,0.22)" />

        {/* Short hair over the crown, receding at both temples, a small tuft at the front */}
        <path d="M156 150 C 150 92, 186 50, 248 46 C 310 50, 346 92, 340 150 C 334 126, 324 110, 310 100 C 302 88, 290 82, 276 84 C 268 90, 262 98, 256 106 C 252 98, 244 98, 240 106 C 234 98, 228 90, 220 84 C 206 82, 194 88, 186 100 C 172 110, 162 126, 156 150 Z" fill="#2E221C" opacity="0.94" />
        <path d="M200 66 C 230 54, 266 54, 296 66" stroke="rgba(255,255,255,0.12)" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M212 92 C 216 86, 222 84, 226 86 M270 86 C 276 84, 282 86, 286 92" stroke="rgba(46,34,28,0.45)" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Eyebrows */}
        <path className="adv-brow" d="M178 146 Q 202 134, 228 142" stroke="#2A1E18" strokeWidth="9" strokeLinecap="round" fill="none" />
        <path className="adv-brow" d="M268 142 Q 294 134, 318 146" stroke="#2A1E18" strokeWidth="9" strokeLinecap="round" fill="none" />

        {/* Eyes, a little narrowed by the smile */}
        <g className="adv-eyes">
          <ellipse cx="203" cy="169" rx="14" ry="10" fill="#FFFFFF" />
          <ellipse cx="293" cy="169" rx="14" ry="10" fill="#FFFFFF" />
          <circle cx="204" cy="170" r="7.5" fill="#5B6B4E" />
          <circle cx="294" cy="170" r="7.5" fill="#5B6B4E" />
          <circle cx="204" cy="170" r="4" fill="#1E1612" />
          <circle cx="294" cy="170" r="4" fill="#1E1612" />
          <circle cx="207" cy="167" r="2.2" fill="#fff" />
          <circle cx="297" cy="167" r="2.2" fill="#fff" />
          <path d="M189 166 Q 203 156, 217 166 M279 166 Q 293 156, 307 166" stroke="#2A1E18" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect className="adv-lid" x="184" y="156" width="38" height="22" rx="10" fill="#E8B08D" />
          <rect className="adv-lid" x="274" y="156" width="38" height="22" rx="10" fill="#E8B08D" />
        </g>
        <g className="adv-happy-eyes">
          <path d="M188 174 Q 203 158, 218 174" stroke="#2A1E18" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M278 174 Q 293 158, 308 174" stroke="#2A1E18" strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>

        {/* Nose */}
        <path d="M248 172 Q 238 198, 240 206 Q 248 214, 258 206" stroke="#B97A56" strokeWidth="5" strokeLinecap="round" fill="none" />
        <ellipse cx="248" cy="196" rx="9" ry="12" fill="rgba(255,255,255,0.18)" />

        {/* Metal-rim glasses: thin dark frames, clear lenses, bridge and arms */}
        <g className="adv-glasses">
          <rect x="160" y="144" width="78" height="50" rx="12" fill="rgba(210,228,255,0.16)" stroke="#3E444E" strokeWidth="5" />
          <rect x="258" y="144" width="78" height="50" rx="12" fill="rgba(210,228,255,0.16)" stroke="#3E444E" strokeWidth="5" />
          <path d="M166 148 L 232 148 M264 148 L 330 148" stroke="#8A919C" strokeWidth="2" strokeLinecap="round" />
          <path d="M238 160 Q 248 151, 258 160" stroke="#3E444E" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M160 156 L 146 164 M336 156 L 350 162" stroke="#3E444E" strokeWidth="5" strokeLinecap="round" />
          <g clipPath="url(#af-lens)">
            <rect className="adv-glint" x="120" y="120" width="22" height="100" fill="rgba(255,255,255,0.55)" transform="skewX(-25)" />
          </g>
        </g>

        {/* Thick rounded beard from the sideburns to the chin, mustache, wide smile */}
        <path d="M150 168 C 148 240, 176 326, 248 340 C 320 326, 348 240, 346 166 C 340 200, 326 218, 306 224 C 290 216, 272 214, 248 216 C 224 214, 206 216, 190 224 C 170 218, 156 200, 150 168 Z" fill="url(#af-beard)" />
        <path d="M176 262 C 196 300, 222 318, 248 322" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M204 226 Q 248 206, 292 226 Q 248 220, 204 226 Z" fill="#1A120E" />
        <g className="adv-mouth">
          <path d="M210 236 Q 248 276, 286 236 Q 248 248, 210 236 Z" fill="#7A3128" />
          <path d="M216 238 Q 248 258, 280 238 Q 248 246, 216 238 Z" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}
