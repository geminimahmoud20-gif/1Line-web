import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { pushReminderState, enablePushReminders } from '../../firebaseLazy';
import './alert-health-banner.css';

const DISMISS_KEY = 'crm_push_prompt_dismissed';
const read = () => { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } };

/**
 * Offers the phone reminder (late replies, follow-ups due) to a team member on this device.
 * Shown only when the device can get it and the hourly job has published its key.
 */
export default function PushReminderPrompt({ manager = false, name = '' }) {
  const [state, setState] = useState('');
  const [dismissed, setDismissed] = useState(read);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    pushReminderState().then((s) => { if (alive) setState(s); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (dismissed || state !== 'off') return null;

  const turnOn = async () => {
    setBusy(true);
    const r = await enablePushReminders({ manager, name });
    setBusy(false);
    if (r.ok) setState('on');
    else setMsg(r.error === 'denied' ? 'الإشعارات مقفولة للموقع. افتحها من إعدادات المتصفح وجرّب تاني.' : 'مقدرناش نفعّلها دلوقتي. جرّب تاني بعد شوية.');
  };
  const hide = () => { try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* this visit only */ } setDismissed(true); };

  return (
    <div className="crm-alert-health crm-alert-health--info" role="region" aria-label="تذكيرات المتابعة">
      <BellRing size={18} aria-hidden="true" />
      <p>{msg || 'فعّل تذكيرات المتابعة على موبايلك: هتوصلك رسالة بالعملاء المستنيين ردّك والمتابعات المستحقة، حتى والـCRM مقفول.'}</p>
      <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={turnOn} disabled={busy}>{busy ? 'ثواني…' : 'فعّل التذكيرات'}</button>
      <button type="button" className="crm-alert-health__x" aria-label="إخفاء" onClick={hide}><X size={16} /></button>
    </div>
  );
}
