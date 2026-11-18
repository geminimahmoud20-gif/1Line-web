// =============================================================
//  Meta Conversions API: the rules for what the site may forward to Meta from the server, so an
//  ad blocker doesn't hide a lead from the campaign. Pure, tests/unit/capi-core.test.mjs runs it.
//  Only standard events with no personal data: no name, phone or email ever goes through here.
//  The browser Pixel sends the same event with the same event_id, and Meta counts it once.
// =============================================================

export const CAPI_EVENTS = new Set(['Lead', 'Schedule', 'Contact']);
export const CAPI_VERSION = 'v21.0';
export const MAX_CAPI_BODY = 4000;

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PIXEL_RE = /^\d{8,20}$/;
const FBP_RE = /^fb\.\d\.\d{10,14}\.\d{5,20}$/;
const FBC_RE = /^fb\.\d\.\d{10,14}\.[A-Za-z0-9_-]{5,200}$/;
const key = (v) => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || undefined;

/** custom_data: only the listing ids, kind of form or contact channel, and the price */
function customData(c = {}) {
  const out = {};
  if (key(c.content_category)) out.content_category = key(c.content_category);
  if (Array.isArray(c.content_ids)) {
    const ids = c.content_ids.map(key).filter(Boolean).slice(0, 5);
    if (ids.length) out.content_ids = ids;
  }
  if (c.channel === 'phone' || c.channel === 'whatsapp') out.channel = c.channel;
  if (key(c.placement)) out.placement = key(c.placement);
  const value = Math.round(Number(c.value));
  if (Number.isFinite(value) && value > 0) { out.value = value; out.currency = 'EGP'; }
  return out;
}

/**
 * The event to send, or null when the request isn't one we forward.
 * @param {object} body  what the browser posted
 * @param {{ip?: string, ua?: string, now?: number, siteHosts?: string[]}} ctx
 */
export function buildCapiEvent(body, { ip = '', ua = '', now = Date.now(), siteHosts = [] } = {}) {
  if (!body || typeof body !== 'object') return null;
  if (!CAPI_EVENTS.has(body.event_name)) return null;
  if (!ID_RE.test(String(body.event_id || ''))) return null;
  let url;
  try { url = new URL(String(body.event_source_url || '')); } catch { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  if (siteHosts.length && !siteHosts.some((h) => url.host === h || (url.host.endsWith('.vercel.app') && url.host.startsWith('1-line-')))) return null;
  // Never the CRM or a client's account
  if (/^\/(crm|my-account)(\/|$)/.test(url.pathname)) return null;

  const user = { client_user_agent: String(ua).slice(0, 300) };
  if (ip && ip !== 'unknown') user.client_ip_address = ip;
  if (FBP_RE.test(String(body.fbp || ''))) user.fbp = body.fbp;
  if (FBC_RE.test(String(body.fbc || ''))) user.fbc = body.fbc;

  const event = {
    event_name: body.event_name,
    event_time: Math.floor(now / 1000),
    event_id: body.event_id,
    action_source: 'website',
    event_source_url: `${url.origin}${url.pathname}`,
    user_data: user
  };
  const custom = customData(body.custom_data);
  if (Object.keys(custom).length) event.custom_data = custom;
  return event;
}

/** The Pixel ID to send to: the server's own setting first, else the one the site is using */
export function pickPixelId(envId, bodyId) {
  if (PIXEL_RE.test(String(envId || ''))) return String(envId);
  return PIXEL_RE.test(String(bodyId || '')) ? String(bodyId) : '';
}
