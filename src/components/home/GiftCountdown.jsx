import { useEffect, useState } from 'react';

const two = (n) => String(n).padStart(2, '0');

/**
 * Days : hours : minutes : seconds left on an offer, ticking every second.
 * Keeps its own clock so the gift box around it doesn't re-render. Calls onEnd once at zero.
 */
export default function GiftCountdown({ endsAt, isAr = true, onEnd, compact = false }) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, endsAt - now);

  useEffect(() => {
    if (left <= 0) {
      onEnd?.();
      return undefined;
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = Math.floor(left / 1000);
  const parts = [
    { v: Math.floor(s / 86400), ar: 'يوم', en: 'days' },
    { v: Math.floor((s % 86400) / 3600), ar: 'ساعة', en: 'hrs' },
    { v: Math.floor((s % 3600) / 60), ar: 'دقيقة', en: 'min' },
    { v: s % 60, ar: 'ثانية', en: 'sec' }
  ];
  const label = isAr
    ? `باقي ${parts[0].v} يوم و${parts[1].v} ساعة و${parts[2].v} دقيقة`
    : `${parts[0].v} days ${parts[1].v} hours ${parts[2].v} minutes left`;

  return (
    <span className={`gx-count ${compact ? 'gx-count--compact' : ''}`} role="timer" aria-label={label}>
      {parts.map((p, i) => (
        <span key={p.en} className="gx-count-cell" aria-hidden="true">
          <b>{i === 0 ? p.v : two(p.v)}</b>
          <small>{isAr ? p.ar : p.en}</small>
        </span>
      ))}
    </span>
  );
}
