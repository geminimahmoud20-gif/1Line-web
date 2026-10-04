// =============================================================
//  On the site the brochure is requested on WhatsApp, not downloaded: the visitor sends the
//  company a ready message with the unit code, so the team sees exactly who is interested and
//  replies with the PDF (CRM → العقارات → زر البروشور).
// =============================================================

import { getWhatsAppUrl } from '../founderCmsData.js';
import { trackEvent } from '../visitorTracker.js';
import { SITE_URL } from '../../config/siteConfig.js';
import { brochureCode } from './brochureData.js';

export function brochureRequestUrl(property) {
  const p = property || {};
  const code = brochureCode(p);
  const title = String(p.title_ar || '').trim();
  const lines = [
    `مرحباً 1Line، أرغب في استلام بروشور الوحدة كود ${code}${title ? ` (${title})` : ''}.`,
    p.id ? `🔗 ${SITE_URL.replace(/\/+$/, '')}/properties/${p.id}` : ''
  ];
  return getWhatsAppUrl(lines.filter(Boolean).join('\n'));
}

/** For an <a href> onClick: record the request (no personal data) and let the link open WhatsApp */
export function trackBrochureRequest(property) {
  trackEvent('brochure_request', { propertyId: property?.id || '', code: brochureCode(property || {}) });
}
