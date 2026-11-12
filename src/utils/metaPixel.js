// =============================================================
//  Meta (Facebook / Instagram) Pixel: measures which ads bring visits, WhatsApp clicks and leads,
//  and builds audiences for retargeting.
//
//  - The Pixel ID comes from CRM → إعدادات الموقع → الإعلانات (site_cms.tracking.metaPixelId),
//    or VITE_META_PIXEL_ID at build time. No ID → nothing loads.
//  - Runs on public pages with no consent prompt, and never on the CRM or a client's account.
//  - No personal data: no advanced matching, automatic form/button collection switched off,
//    events carry only the listing id, type, area and price.
//  - Leads, visit requests and contact clicks are also sent from the server (api/capi.js, Meta's
//    Conversions API) with the same event_id, so an ad blocker doesn't hide them from the campaign.
//  Events arrive through analytics.track(), the same stream the CRM analytics use.
// =============================================================

import { isPrivatePath } from './privatePaths.js';
import { getSiteSettings, subscribeSiteSettings } from './siteSettings.js';

const PIXEL_ID_RE = /^\d{8,20}$/;
const isBrowser = typeof window !== 'undefined';

/** A Pixel ID is 8–20 digits; anything else → '' */
export const cleanPixelId = (v) => {
  const id = String(v ?? '').replace(/\s+/g, '');
  return PIXEL_ID_RE.test(id) ? id : '';
};

const envId = cleanPixelId(import.meta.env?.VITE_META_PIXEL_ID);
const pixelId = () => cleanPixelId(getSiteSettings()?.tracking?.metaPixelId) || envId;

// Measurement runs on every public page without a consent prompt (staff pages are excluded in canRun)
const hasConsent = () => true;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
};
const key = (v) => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || undefined;
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/**
 * Our analytics event → the Meta standard event and its parameters, or null when Meta doesn't
 * need it. Pure (tests/unit/meta-pixel.test.mjs).
 */
export function metaEventFor(type, m = {}) {
  switch (type) {
    case 'page_view': return { name: 'PageView', params: {} };
    case 'property_view': return {
      name: 'ViewContent',
      params: compact({
        content_type: 'product',
        content_ids: key(m.propertyId) ? [key(m.propertyId)] : undefined,
        content_category: key(m.type),
        area: key(m.area),
        value: num(m.price),
        currency: num(m.price) ? 'EGP' : undefined
      })
    };
    case 'search': return { name: 'Search', params: {} };
    case 'favorite_added': return { name: 'AddToWishlist', params: compact({ content_ids: key(m.propertyId) ? [key(m.propertyId)] : undefined }) };
    case 'contact_click': return { name: 'Contact', params: compact({ channel: m.channel === 'phone' ? 'phone' : 'whatsapp', placement: key(m.placement) }) };
    case 'reservation_requested': return { name: 'Schedule', params: compact({ content_ids: key(m.propertyId) ? [key(m.propertyId)] : undefined }) };
    case 'lead_submitted': return { name: 'Lead', params: compact({ content_category: key(m.form) }) };
    default: return null;
  }
}

// Events that also go through the server (api/capi.js); Meta merges them by event_id
const CAPI_NAMES = new Set(['Lead', 'Schedule', 'Contact']);
const newEventId = () => {
  try { if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, ''); } catch { /* fall through */ }
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};
const cookie = (name) => {
  try { return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] || ''; } catch { return ''; }
};
// _fbc is set by the Pixel; before it loads, build it from the ad click id in the URL
const clickId = () => {
  const c = cookie('_fbc');
  if (c) return c;
  try {
    const id = new URLSearchParams(window.location.search).get('fbclid');
    return id ? `fb.1.${Date.now()}.${id}` : '';
  } catch { return ''; }
};

function sendToServer(ev, eventId) {
  try {
    fetch('/api/capi', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_name: ev.name,
        event_id: eventId,
        event_source_url: window.location.href,
        pixel_id: pixelId(),
        fbp: cookie('_fbp'),
        fbc: clickId(),
        custom_data: ev.params
      })
    }).catch(() => {});
  } catch { /* never affects the page */ }
}

let loadedId = '';
let lastPage = { path: '', at: 0 };
const sentLeads = new Set();

const canRun = () => isBrowser && Boolean(pixelId()) && hasConsent() && !isPrivatePath(window.location.pathname);

/** Load the Pixel once consent and an ID are both there; true when it is running. */
export function initMetaPixel() {
  if (!canRun()) return false;
  const id = pixelId();
  if (loadedId === id) return true;
  try {
    if (!window.fbq) {
      // Meta's loader: queues calls until fbevents.js arrives
      const fbq = function fbq() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      window.fbq = fbq;
      if (!window._fbq) window._fbq = fbq;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
    }
    // No automatic scraping of form fields or button text
    window.fbq('set', 'autoConfig', false, id);
    window.fbq('init', id);
    loadedId = id;
    return true;
  } catch {
    return false;
  }
}

/** Forward one analytics event (called by analytics.track). */
export function sendMetaEvent(type, m = {}) {
  const ev = metaEventFor(type, m);
  if (!ev || !canRun()) return;
  const pixelRunning = initMetaPixel();
  if (ev.name === 'PageView') {
    const path = String(m.path || window.location.pathname).split('?')[0];
    const now = Date.now();
    if (lastPage.path === path && now - lastPage.at < 800) return;
    lastPage = { path, at: now };
  }
  if (ev.name === 'Lead' && m.leadId) {
    const k = String(m.leadId);
    if (sentLeads.has(k)) return;
    sentLeads.add(k);
  }
  const eventId = CAPI_NAMES.has(ev.name) ? newEventId() : undefined;
  if (pixelRunning) {
    try { window.fbq('track', ev.name, ev.params, eventId ? { eventID: eventId } : undefined); } catch { /* blocked by the browser */ }
  }
  if (eventId) sendToServer(ev, eventId);
}

// The ID usually arrives with the site settings a moment after the first page view
if (isBrowser) {
  subscribeSiteSettings(() => {
    if (!loadedId && initMetaPixel()) sendMetaEvent('page_view', { path: window.location.pathname });
  });
}
