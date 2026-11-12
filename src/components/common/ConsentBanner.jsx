import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isPrivatePath } from '../../utils/privatePaths';
import { initGa4 } from '../../utils/ga4';
import { initMetaPixel, sendMetaEvent } from '../../utils/metaPixel';

const CLARITY_ID = 'ykuhk4dxes';

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
 * Starts the measurement tools (Clarity, GA4, Meta Pixel) on public pages with no consent prompt.
 * The CRM and client accounts are never measured.
 */
export default function ConsentBanner() {
  
  const location = useLocation();

  const onPrivatePage = isPrivatePath(location.pathname);

  // Only on public pages: the CRM and a client's account show other people's details (PDPL 151/2020)
  useEffect(() => {
    if (onPrivatePage) {
      stopClarity();
    } else {
      startClarity();
      initGa4();
      // The page view that happened before the click counts once the Pixel can run
      if (initMetaPixel()) sendMetaEvent('page_view', { path: location.pathname });
    }
  }, [onPrivatePage]); // eslint-disable-line react-hooks/exhaustive-deps -- location.pathname: page views come from App

  return null;
}
