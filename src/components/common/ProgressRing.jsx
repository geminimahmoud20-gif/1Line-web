import './progress-ring.css';

/**
 * Green completion ring used by the sell form and /match. Emerald reads as safe and "go",
 * the percentage sits in the middle and turns solid green at 100%.
 */
export default function ProgressRing({ percent = 0, size, label }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <span className={`pr-ring${p === 100 ? ' is-full' : ''}`} style={size ? { '--pr-size': `${size}px` } : undefined}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-valuetext={`${p}%`} aria-label={label}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id="pr-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <circle className="pr-track" cx="24" cy="24" r={r} />
        <circle className="pr-bar" cx="24" cy="24" r={r} stroke="url(#pr-grad)" strokeDasharray={`${(p / 100) * c} ${c}`} />
      </svg>
      <span className="pr-num">{p}<small>%</small></span>
    </span>
  );
}
