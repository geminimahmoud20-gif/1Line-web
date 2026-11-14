import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { loadNotifyStatus } from '../../firebaseLazy';
import './alert-health-banner.css';

/**
 * Super admin only: warns when the WhatsApp alert for new requests used to work and its last send
 * failed. A number that was never set up is a choice (it is explained in إدارة المنظومة → تنبيهات
 * الطلبات), so it no longer nags on every screen.
 */
const HIDE_KEY = 'crm_alert_health_hidden';
const today = () => new Date().toISOString().slice(0, 10);
// Closed for the day: the banner came back on every screen and every reload
const hiddenToday = () => { try { return localStorage.getItem(HIDE_KEY) === today(); } catch { return false; } };

export default function AlertHealthBanner({ onOpen }) {
  const [problem, setProblem] = useState('');
  const [hidden, setHidden] = useState(hiddenToday);
  const hide = () => {
    setHidden(true);
    try { localStorage.setItem(HIDE_KEY, today()); } catch { /* private mode: this visit only */ }
  };

  useEffect(() => {
    let alive = true;
    loadNotifyStatus().then((s) => {
      if (!alive) return;
      if (s && s.lastOkAt && s.lastFailAt > s.lastOkAt) setProblem('failing');
      else setProblem('');
    }).catch(() => { /* offline: say nothing */ });
    return () => { alive = false; };
  }, []);

  if (!problem || hidden) return null;
  return (
    <div className="crm-alert-health" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <p title="لو التنبيه مش شغال، عميل جديد (حتى من إعلان) يدخل ومحدش يعرف">
        آخر تنبيه واتساب للفريق ما وصلش
      </p>
      <div className="crm-alert-health__actions">
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={onOpen}>جرّب رسالة تجربة</button>
        <button type="button" className="crm-alert-health__x" aria-label="إخفاء لحد بكرة" onClick={hide}><X size={16} /></button>
      </div>
    </div>
  );
}
