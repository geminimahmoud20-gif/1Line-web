import { useCallback, useEffect, useState } from 'react';
import { Phone, X } from 'lucide-react';
import { OUTCOMES, callEntry, outcomePatch } from '../../utils/callOutcomes';
import { readPendingCall, clearPendingCall } from '../../utils/pendingCall';
import './call-outcome.css';

/**
 * Asks how the call just made from the CRM ended, when the person is back from the dialer (the page becomes
 * visible again) or opens the CRM with a call still unanswered in the record. One tap saves it on the client.
 */
export default function CallOutcomePrompt({ leads = [], onUpdateLead, me, isAr = true, enabled = true }) {
  const [pending, setPending] = useState(null);

  const check = useCallback(() => {
    if (!enabled || document.visibilityState === 'hidden') return;
    setPending((cur) => cur || readPendingCall());
  }, [enabled]);

  useEffect(() => {
    const first = setTimeout(check, 0);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => { clearTimeout(first); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
  }, [check]);

  // A call tapped while this screen is already open: the dialer takes focus, so ask only after it is gone
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => { if (!pending && document.visibilityState === 'visible') { const p = readPendingCall(); if (p && Date.now() - p.at > 20_000) setPending(p); } }, 5000);
    return () => clearInterval(id);
  }, [enabled, pending]);

  if (!pending) return null;
  const lead = leads.find((l) => String(l.id) === String(pending.id));
  const close = () => { clearPendingCall(); setPending(null); };
  const choose = (outcome) => {
    const patch = lead ? outcomePatch(lead, callEntry(outcome, me)) : null;
    if (patch && onUpdateLead) onUpdateLead(lead.id, patch, lead.version);
    close();
  };

  return (
    <div className="co-sheet" role="dialog" aria-label={isAr ? 'نتيجة المكالمة' : 'Call result'}>
      <div className="co-sheet__head">
        <Phone size={18} aria-hidden="true" />
        <strong>{isAr ? `كلّمت ${pending.name || 'العميل'}؟ حصل إيه؟` : `Call with ${pending.name || 'client'}: how did it go?`}</strong>
        <button type="button" className="co-x" onClick={close} aria-label={isAr ? 'تجاهل' : 'Dismiss'}><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="co-choices">
        {OUTCOMES.map((o) => <button key={o.id} type="button" className={`co-btn co-btn--${o.id}`} onClick={() => choose(o.id)}>{isAr ? o.ar : o.en}</button>)}
      </div>
      <button type="button" className="co-skip" onClick={close}>{isAr ? 'ما اتصلتش' : 'I did not call'}</button>
    </div>
  );
}
