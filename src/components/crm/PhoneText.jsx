import { useSyncExternalStore } from 'react';
import { Eye } from 'lucide-react';
import { isPhoneMasked, isRevealable, maskDigits, revealPhone, subscribePhoneReveal, phoneRevealVersion } from '../../utils/phoneReveal';
import { auditPhoneReveal } from '../../utils/contactAudit';
import './phone-reveal.css';

/** Re-render when the policy changes or a reveal runs out */
function usePhoneMasked(leadId) {
  useSyncExternalStore(subscribePhoneReveal, phoneRevealVersion, phoneRevealVersion);
  return isPhoneMasked(leadId);
}

/**
 * A client's number as text: masked until «إظهار» (logged), plain after.
 * `render(text)` lets a caller wrap the plain number (search highlight); `surface` names the screen in the log.
 */
export default function PhoneText({ leadId, value, surface = '', isAr = true, render, className = '', showToggle = true }) {
  const masked = usePhoneMasked(leadId) && isRevealable(value);
  if (!value) return <bdi dir="ltr" className={className}>—</bdi>;
  const reveal = (e) => {
    e?.stopPropagation?.();
    revealPhone(leadId);
    auditPhoneReveal(leadId, surface);
  };
  return (
    <span className="ph-text">
      <bdi dir="ltr" className={className}>{masked ? maskDigits(value) : (render ? render(value) : value)}</bdi>
      {masked && showToggle && leadId && (
        <button type="button" className="ph-reveal" onClick={reveal} aria-label={isAr ? 'إظهار الرقم (بيتسجّل)' : 'Show the number (logged)'} title={isAr ? 'إظهار الرقم (بيتسجّل)' : 'Show the number (logged)'}>
          <Eye size={14} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
