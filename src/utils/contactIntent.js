// "WhatsApp from the site": when a visitor taps a WhatsApp button that opens a chat with the
// company number, the prefilled message gets a short reference (W-7K3Q) and the CRM gets a row
// saying which unit or page it came from. The chat itself goes to WhatsApp directly, so the site
// never sees the message or the visitor's number; staff link the row to the chat by its reference.
// Only the company number is tagged (a staff member opening a customer's chat is not an intent),
// and nothing is recorded from staff pages.

import { getDynamicWhatsApp } from './founderCmsData.js';
import { isPrivatePath } from './privatePaths.js';

const ROUTE = '/api/contact-intent';
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0/O, 1/I/L
const REF_RE = /W-[2-9A-HJ-NP-Z]{4}/;

export const makeRef = (rand = Math.random) => `W-${Array.from({ length: 4 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('')}`;

const digits = (s) => String(s || '').replace(/\D/g, '');

/** The number a wa.me / api.whatsapp.com link opens, or '' when it isn't a chat with a number. */
export function whatsAppTarget(url) {
  const s = String(url || '');
  const m = /^https?:\/\/wa\.me\/(\d{6,15})/.exec(s) || /^https?:\/\/api\.whatsapp\.com\/send\/?\?(?:.*&)?phone=(\d{6,15})/.exec(s);
  return m ? m[1] : '';
}

/** Adds "رقم المرجع: W-…" to the prefilled text (once). */
export function tagWhatsAppUrl(url, ref) {
  try {
    const u = new URL(url);
    const text = u.searchParams.get('text') || '';
    if (REF_RE.test(text)) return url;
    u.searchParams.set('text', `${text}${text ? '\n\n' : ''}رقم المرجع: ${ref}`);
    return u.toString();
  } catch {
    return url;
  }
}

const pageContext = () => {
  const path = window.location.pathname;
  const unit = /^\/properties\/([\w-]{1,80})/.exec(path);
  // Where the visit came from: analytics' first-touch value when it ran, else this page's own link
  // (utm_source / fbclid / gclid / referrer). A source is not personal data, so no consent needed.
  let source = '';
  try { source = JSON.parse(sessionStorage.getItem('oneline_an_source') || 'null')?.source || ''; } catch { /* none */ }
  if (!source) {
    const q = new URLSearchParams(window.location.search);
    let ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* none */ }
    source = (q.get('utm_source') || '').toLowerCase()
      || (q.get('fbclid') ? 'facebook' : '') || (q.get('gclid') ? 'google' : '')
      || (/facebook\.|fb\.|messenger/.test(ref) ? 'facebook' : /instagram\./.test(ref) ? 'instagram' : /google\./.test(ref) ? 'google' : /tiktok\./.test(ref) ? 'tiktok' : '');
    source = source.replace(/[^\w-]/g, '').slice(0, 40);
  }
  return {
    path: path.slice(0, 120),
    propertyId: unit ? unit[1] : '',
    source: String(source).slice(0, 40),
    device: window.matchMedia?.('(max-width: 768px)').matches ? 'mobile' : 'desktop'
  };
};

function send(payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(ROUTE, new Blob([body], { type: 'application/json' }))) return;
  } catch { /* fall through */ }
  fetch(ROUTE, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
}

/**
 * If `url` opens a chat with the company number from a public page: returns the url with a
 * reference added and records the intent. Otherwise returns the url unchanged.
 */
export function prepareWhatsAppUrl(url, { propertyId = '', placement = '' } = {}) {
  if (typeof window === 'undefined' || isPrivatePath(window.location.pathname)) return url;
  const target = whatsAppTarget(url);
  const company = digits(getDynamicWhatsApp());
  if (!target || !company || target !== company) return url;
  const ref = makeRef();
  const ctx = pageContext();
  send({ ref, ...ctx, propertyId: String(propertyId || ctx.propertyId).slice(0, 80), placement: String(placement || '').slice(0, 40) });
  return tagWhatsAppUrl(url, ref);
}

// Page-wide: WhatsApp links (<a href="https://wa.me/…">) and window.open(...) both go through here,
// so every "talk to us" button is covered without touching each component.
function onClick(e) {
  const a = e.target?.closest?.('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (!whatsAppTarget(href)) return;
  const tagged = prepareWhatsAppUrl(href, { propertyId: a.dataset.propertyId, placement: a.dataset.track });
  if (tagged !== href) a.setAttribute('href', tagged);
}

function watchWindowOpen() {
  const nativeOpen = window.open;
  if (typeof nativeOpen !== 'function' || nativeOpen.__intent) return;
  const wrapped = function open(url, ...rest) {
    let next = url;
    try { if (whatsAppTarget(url)) next = prepareWhatsAppUrl(String(url)); } catch { /* keep url */ }
    return nativeOpen.call(window, next, ...rest);
  };
  wrapped.__intent = true;
  // Keep any wrapper installed before us (analytics counts the click)
  Object.keys(nativeOpen).forEach((k) => { wrapped[k] = nativeOpen[k]; });
  window.open = wrapped;
}

export function installContactIntents() {
  if (typeof window === 'undefined' || window.__contactIntents) return;
  window.__contactIntents = true;
  watchWindowOpen();
  document.addEventListener('click', onClick, true);
}
