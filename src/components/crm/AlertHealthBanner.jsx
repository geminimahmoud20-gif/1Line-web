import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { loadNotifyStatus } from '../../firebaseLazy';
import './alert-health-banner.css';

/**
 * Super admin only: warns when the WhatsApp alert for new requests has never been proven to work,
 * or its last send failed. Without it a new ad client could arrive and nobody would be told.
 */
export default function AlertHealthBanner({ onOpen }) {
  const [problem, setProblem] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    loadNotifyStatus().then((s) => {
      if (!alive) return;
      if (!s || !s.lastOkAt) setProblem('never');
      else if (s.lastFailAt > s.lastOkAt) setProblem('failing');
      else setProblem('');
    }).catch(() => { /* offline: say nothing */ });
    return () => { alive = false; };
  }, []);

  if (!problem || hidden) return null;
  return (
    <div className="crm-alert-health" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <p>
        {problem === 'never'
          ? 'تنبيه واتساب للطلبات الجديدة لسه ما اتجرّبش. لو مش شغال، عميل الإعلان يدخل ومحدش يعرف.'
          : 'آخر تنبيه واتساب للفريق ما وصلش. عملاء جداد ممكن يدخلوا ومحدش يتنبّه.'}
      </p>
      <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={onOpen}>جرّب رسالة تجربة</button>
      <button type="button" className="crm-alert-health__x" aria-label="إخفاء" onClick={() => setHidden(true)}><X size={16} /></button>
    </div>
  );
}
