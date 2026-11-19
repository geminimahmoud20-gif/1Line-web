// =============================================================
//  The visitor's way to save a request: through /api/lead (server checks: Turnstile, limits, field rules).
//  Returns { status: 'saved', id } or { status: 'unavailable', reason } — the caller then saves the old way
//  (straight to Firestore), so a request is never lost because this route, Cloudflare or the network is down.
//  Pure apart from fetch and the token getter, which are injectable: tests/unit/public-lead.test.mjs.
// =============================================================
import { getTurnstileToken } from '../utils/turnstile.js';

export async function submitPublicLead(lead, { fetchImpl = (typeof fetch === 'function' ? fetch : null), getToken = getTurnstileToken } = {}) {
  if (!fetchImpl) return { status: 'unavailable', reason: 'no-fetch' };
  try {
    const token = await getToken();
    const res = await fetchImpl('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lead, token }),
      keepalive: true // still sent when the visitor is sent on to WhatsApp right after submitting
    });
    let data = null;
    try { data = await res.json(); } catch { /* the site's HTML page: no server functions here */ }
    if (res.ok && data?.ok && data.id) return { status: 'saved', id: String(data.id) };
    return { status: 'unavailable', reason: data?.error || `http-${res.status}` };
  } catch {
    return { status: 'unavailable', reason: 'network' };
  }
}
