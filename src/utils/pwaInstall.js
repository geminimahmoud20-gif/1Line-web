// "Install the app": Chrome/Edge/Samsung fire `beforeinstallprompt` once, early, and only if the
// site is installable; we keep that event so a button can show the browser's own install dialog.
// iPhone Safari has no such event: the visitor adds the site from Share → Add to Home Screen.
// Imported from main.jsx so the listener is attached before the browser fires the event.

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our button instead of the browser's mini-infobar
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
}

/** iPhone / iPad in Safari (where Add to Home Screen exists), not an in-app browser. */
export function isIosSafari(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\//.test(ua);
  return ios && !otherBrowser && /Safari/.test(ua);
}

/** 'prompt' (one-tap install), 'ios' (show the Share steps) or null (nothing to offer). */
export function installMode() {
  if (isStandalone()) return null;
  if (deferredPrompt) return 'prompt';
  if (isIosSafari()) return 'ios';
  return null;
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Opens the browser's install dialog. Resolves to 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  const evt = deferredPrompt;
  if (!evt) return 'unavailable';
  deferredPrompt = null; // the event can be used once
  notify();
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    return outcome || 'dismissed';
  } catch {
    return 'unavailable';
  }
}
