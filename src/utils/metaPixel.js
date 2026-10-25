// =============================================================
//  Meta (Facebook / Instagram) Pixel: measures which ads bring visits, WhatsApp clicks and leads,
//  and builds audiences for retargeting.
//
//  - The Pixel ID comes from CRM → إعدادات الموقع → الإعلانات (site_cms.tracking.metaPixelId),
//    or VITE_META_PIXEL_ID at build time. No ID → nothing loads.
//  - Loads only after the visitor accepts measurement (oneline_consent_v1 === 'accepted'),
//    and never on the CRM or a client's account (PDPL 151/2020).
//  - No personal data: no advanced matching, automatic form/button collection switched off,
//    events carry only the listing id, type, area and price.
//  Events arrive through analytics.track(), the same stream the CRM analytics use.
// =============================================================

import { isPrivatePath } from './privatePaths.js';
import { getSiteSettings, subscribeSiteSettings } from './siteSettings.js';

const CONSENT_KEY = 'oneline_consent_v1';
const PIXEL_ID_RE = /^\d{8,20}$/;
const isBrowser = typeof window !== 'undefined';

/** A Pixel ID is 8–20 digits; anything else → '' */
export const cleanPixelId = (v) => {
  const id = String(v ?? '').replace(/\s+/g, '');
  return PIXEL_ID_RE.test(id) ? id : '';
};

const envId = cleanPixelId(import.meta.env?.VITE_META_PIXEL_ID);
const pixelId = () => cleanPixelId(getSiteSettings()?.tracking?.metaPixelId) || envId;

const hasConsent = () => {
  try { return localStorage.getItem(CONSENT_KEY) === 'accepted'; } catch { return false; }
};

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
  if (!ev || !initMetaPixel()) return;
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
  try { window.fbq('track', ev.name, ev.params); } catch { /* blocked by the browser */ }
}

// The ID usually arrives with the site settings a moment after the first page view
if (isBrowser) {
  subscribeSiteSettings(() => {
    if (!loadedId && initMetaPixel()) sendMetaEvent('page_view', { path: window.location.pathname });
  });
  window.addEventListener('storage', (e) => {
    if (e.key === CONSENT_KEY && e.newValue === 'accepted' && initMetaPixel()) sendMetaEvent('page_view', { path: window.location.pathname });
  });
}
