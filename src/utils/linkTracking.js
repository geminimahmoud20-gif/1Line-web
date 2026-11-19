// =============================================================
//  «العميل فتح الرابط»: a listing link the team sends to a client carries `?lc=<the client's id>`. When the site opens
//  with it, the page tells api/link-open.js, which records the visit and lets the salesperson know. The id is the
//  client's Firestore id (an unguessable string, never a phone or a name). The tag is removed from the address bar once
//  reported, so a link the client forwards (copied from the bar) does not carry it to somebody else.
//  Pure: tests/unit/link-tracking.test.mjs
// =============================================================

export const LEAD_PARAM = 'lc';
const ID_RE = /^[\w-]{4,60}$/;

/** Is this a client id the tag can carry (not a phone, not a path, not an empty value) */
export const isLeadId = (v) => typeof v === 'string' && ID_RE.test(v) && !/^\+?\d{8,}$/.test(v);

/**
 * The listing's link for this client: `${origin}/properties/<id>?lc=<client id>`. Without a usable client id it is the
 * plain link, so a share never breaks.
 */
export function trackedListingUrl(origin, propertyId, leadId) {
  const base = `${String(origin || '').replace(/\/+$/, '')}/properties/${encodeURIComponent(String(propertyId ?? ''))}`;
  return isLeadId(String(leadId ?? '')) ? `${base}?${LEAD_PARAM}=${encodeURIComponent(String(leadId))}` : base;
}

/** The client id in a location search string ('?lc=abc'), or '' */
export function leadIdFromSearch(search = '') {
  try {
    const v = new URLSearchParams(search).get(LEAD_PARAM) || '';
    return isLeadId(v) ? v : '';
  } catch { return ''; }
}

/** The same search string without the tag (other parameters kept) */
export function searchWithoutLead(search = '') {
  try {
    const p = new URLSearchParams(search);
    p.delete(LEAD_PARAM);
    const s = p.toString();
    return s ? `?${s}` : '';
  } catch { return ''; }
}
