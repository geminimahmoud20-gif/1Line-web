import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { formatTimeLeft } from '../../utils/propertyOffers';

/**
 * "ينتهي خلال 3 أيام و5 ساعات" — keeps its own clock (each minute, then each 15 s in the last hour)
 * so the card around it doesn't re-render. Renders nothing once the offer has ended.
 */
export default function OfferCountdown({ endsAt, isAr = true, className = 'pcx-offer-timer', prefix = true }) {
  const [now, setNow] = useState(() => Date.now());
  const left = endsAt - now;
  const fast = left < 60 * 60 * 1000;

  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setInterval(() => setNow(Date.now()), fast ? 15000 : 60000);
    return () => clearInterval(t);
  }, [fast, left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (left <= 0) return null;
  const text = formatTimeLeft(left, isAr);
  return (
    <span className={className} role="timer" aria-live="off">
      <Timer size={13} strokeWidth={2} aria-hidden="true" />
      <span>{prefix ? (isAr ? `ينتهي خلال ${text}` : `Ends in ${text}`) : text}</span>
    </span>
  );
}
