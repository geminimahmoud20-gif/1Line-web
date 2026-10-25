import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isPrivatePath } from '../../utils/privatePaths';
import { initGa4 } from '../../utils/ga4';
import { initMetaPixel, sendMetaEvent } from '../../utils/metaPixel';

const STORAGE_KEY = 'oneline_consent_v1';
const CLARITY_ID = 'ykuhk4dxes';

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Clarity keeps recording across in-app navigation once loaded, so it is paused on private pages
function stopClarity() {
  try { window.clarity?.('stop'); } catch { /* not loaded */ }
}

function startClarity() {
  if (typeof window === 'undefined') return;
  if (window.clarity) {
    try { window.clarity('start'); } catch { /* ignore */ }
    return;
  }
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

/**
 * Analytics (Microsoft Clarity session recording & GA4) only load after explicit consent,
 * per Egypt's Personal Data Protection Law No. 151 of 2020.
 */
export default function ConsentBanner({ lang = 'ar' }) {
  const [choice, setChoice] = useState(readConsent);
  const location = useLocation();
  const isAr = lang === 'ar';

  const onPrivatePage = isPrivatePath(location.pathname);

  // Only on public pages: the CRM and a client's account show other people's details (PDPL 151/2020)
  useEffect(() => {
    if (onPrivatePage) {
      stopClarity();
    } else if (choice === 'accepted') {
      startClarity();
      initGa4();
      // The page view that happened before the click counts once the Pixel can run
      if (initMetaPixel()) sendMetaEvent('page_view', { path: location.pathname });
    }
  }, [choice, onPrivatePage]); // eslint-disable-line react-hooks/exhaustive-deps -- location.pathname: page views come from App

  if (choice || onPrivatePage) return null;

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
        {/* Full sentence on desktop; one line on phones so the banner doesn't cover the hero search */}
        <span className="lx-consent-long">
          {isAr
            ? 'بموافقتك نقيس تصفحك للموقع (الوحدات والبحث والحاسبة) ونتائج إعلاناتنا على فيسبوك وإنستجرام، لنرشّح لك الأنسب، من غير أسماء أو أرقام. بياناتك في النماذج تُستخدم فقط للرد على طلبك.'
            : 'We use analytics, including Facebook/Instagram ad measurement, only with your consent. Form data is used only to respond to your request.'}
        </span>
        <span className="lx-consent-short">
          {isAr ? 'نشغّل أدوات القياس بموافقتك فقط.' : 'Analytics run only with your consent.'}
        </span>{' '}
        <Link to="/privacy">
          <span className="lx-consent-long">{isAr ? 'سياسة الخصوصية' : 'Privacy policy'}</span>
          <span className="lx-consent-short">{isAr ? 'التفاصيل' : 'Details'}</span>
        </Link>
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
