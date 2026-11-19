// The listing page, opened with ?lc=<client id>, tells the server once per visit (api/link-open.js) and then drops the tag
// from the address bar. Same gates as the rest of the site's measurement: nothing on the CRM pages, nothing when the visitor
// has not allowed measurement, and no repeat within a session. Never throws and never blocks the page.
import { leadIdFromSearch, searchWithoutLead } from './linkTracking.js';
import { hasAnalyticsConsent } from './analytics.js';

const SEEN = 'oneline_link_open_v1';

const read = () => { try { return JSON.parse(sessionStorage.getItem(SEEN) || '[]'); } catch { return []; } };

/** Report this listing's open for the client in the address, if there is one. Returns what it did (for tests and the page). */
export function reportLinkOpen(propertyId, { search = window.location.search, fetchImpl = fetch, consent = hasAnalyticsConsent() } = {}) {
  try {
    const leadId = leadIdFromSearch(search);
    if (!leadId || !propertyId) return 'none';
    // The tag goes out of the address either way: a link copied from the bar must not carry the client's id onward
    try { window.history.replaceState(window.history.state, '', `${window.location.pathname}${searchWithoutLead(search)}${window.location.hash}`); } catch { /* the address stays as it is */ }
    if (!consent) return 'no-consent';
    const key = `${leadId}|${propertyId}`;
    const seen = read();
    if (seen.includes(key)) return 'seen';
    try { sessionStorage.setItem(SEEN, JSON.stringify([...seen, key].slice(-30))); } catch { /* private mode: it may report again */ }
    fetchImpl('/api/link-open', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lead: leadId, property: String(propertyId) }),
      keepalive: true
    }).catch(() => {});
    return 'sent';
  } catch {
    return 'error';
  }
}
