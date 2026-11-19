// =============================================================
//  Cloudflare Turnstile (a free, mostly invisible check that the visitor is a person).
//  Off until VITE_TURNSTILE_SITE_KEY is set at build time: then getTurnstileToken() loads Cloudflare's script
//  on demand (so no visitor downloads it until they send a request) and returns a one-use token for /api/lead.
//  It never blocks a form: when the script is blocked or slow it returns '' and the caller carries on.
// =============================================================

const SITE_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURNSTILE_SITE_KEY) || '';
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const turnstileEnabled = () => Boolean(SITE_KEY) && typeof document !== 'undefined';

let scriptPromise = null;
const loadScript = () => {
  if (typeof window !== 'undefined' && window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile-missing')));
      s.onerror = () => { scriptPromise = null; reject(new Error('turnstile-blocked')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
};

/** A fresh token, or '' (not set up, blocked, or no answer in time) */
export async function getTurnstileToken(timeoutMs = 12000) {
  if (!turnstileEnabled()) return '';
  let host = null;
  try {
    const api = await loadScript();
    host = document.createElement('div');
    // Only shown if Cloudflare needs the visitor to tap; otherwise nothing appears
    host.style.cssText = 'position:fixed;inset-inline:0;bottom:16px;display:flex;justify-content:center;z-index:2147483000;pointer-events:none';
    document.body.appendChild(host);
    return await new Promise((resolve) => {
      let done = false;
      const finish = (token) => { if (!done) { done = true; resolve(token || ''); } };
      const timer = setTimeout(() => finish(''), timeoutMs);
      api.render(host, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        callback: (t) => { clearTimeout(timer); finish(t); },
        'error-callback': () => { clearTimeout(timer); finish(''); },
        'timeout-callback': () => { clearTimeout(timer); finish(''); }
      });
      host.firstChild && (host.firstChild.style.pointerEvents = 'auto');
    });
  } catch {
    return '';
  } finally {
    setTimeout(() => host?.remove(), 500);
  }
}
