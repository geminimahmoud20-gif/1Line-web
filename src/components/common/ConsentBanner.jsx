import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const STORAGE_KEY = 'oneline_consent_v1';
const CLARITY_ID = 'ykuhk4dxes';

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function loadClarity() {
  if (typeof window === 'undefined' || window.clarity) return;
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

/**
 * Analytics (Microsoft Clarity session recording) only loads after explicit consent,
 * per Egypt's Personal Data Protection Law No. 151 of 2020.
 */
export default function ConsentBanner({ lang = 'ar' }) {
  const [choice, setChoice] = useState(readConsent);
  const location = useLocation();
  const isAr = lang === 'ar';

  useEffect(() => {
    if (choice === 'accepted') loadClarity();
  }, [choice]);

  if (choice || location.pathname.startsWith('/crm')) return null;

  const decide = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Private mode: remember for this page view only
    }
    setChoice(value);
  };

  return (
    <div className="lx-consent" role="region" aria-label={isAr ? 'إشعار الخصوصية' : 'Privacy notice'} dir={isAr ? 'rtl' : 'ltr'}>
      <p>
        {isAr
          ? 'نستخدم أدوات قياس لتحسين تجربة الموقع، ولا نشغّلها إلا بموافقتك. بياناتك في النماذج تُستخدم فقط للرد على طلبك.'
          : 'We use analytics to improve the site and only run them with your consent. Form data is used only to respond to your request.'}{' '}
        <Link to="/privacy">{isAr ? 'سياسة الخصوصية' : 'Privacy policy'}</Link>
      </p>
      <div className="lx-consent-actions">
        <button type="button" className="lx-btn lx-btn-primary lx-btn-sm" onClick={() => decide('accepted')}>
          {isAr ? 'موافق' : 'Accept'}
        </button>
        <button type="button" className="lx-btn lx-btn-ghost lx-btn-sm" onClick={() => decide('declined')}>
          {isAr ? 'الضروري فقط' : 'Essential only'}
        </button>
      </div>
    </div>
  );
}
