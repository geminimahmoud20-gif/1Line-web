import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import './image-upload-field.css';

// The CRM is a single page: a tab left open keeps running the version it loaded, so a change
// published since then (a new button, a fixed screen) doesn't show until the page is reloaded.
// When the tab comes back into view (and every 10 minutes), the page fetches index.html and
// compares its main script with the one running; a different one means a new version is live.
const entryOf = (html) => (html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+\.js)"/) || [])[1] || '';
const runningEntry = () => {
  const el = document.querySelector('script[type="module"][src*="/assets/"]');
  return el ? new URL(el.getAttribute('src'), location.origin).pathname : '';
};

export default function NewVersionNotice({ isAr = true }) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return undefined;
    const running = runningEntry();
    if (!running) return undefined;
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const res = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
        const live = res.ok ? entryOf(await res.text()) : '';
        if (live && new URL(live, location.origin).pathname !== running) setStale(true);
      } catch { /* offline: try again later */ }
      busy = false;
    };
    const timer = setInterval(check, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);

  if (!stale) return null;
  return (
    <div className="crm-new-version" role="status">
      <span>{isAr ? 'فيه تحديث جديد للـCRM.' : 'A new version of the CRM is available.'}</span>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => location.reload()}>
        <RefreshCw size={14} aria-hidden="true" />
        <span>{isAr ? 'حدّث الصفحة' : 'Reload'}</span>
      </button>
    </div>
  );
}
