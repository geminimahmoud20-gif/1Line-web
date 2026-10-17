// Pure logic for api/contact-intent.js: a visitor tapped WhatsApp on the site (see
// src/utils/contactIntent.js). Only the reference, page and unit are stored: no name, phone or
// message text exists at this point, and none is accepted.

export const MAX_BODY_BYTES = 1024;
export const INTENT_LIMITS = { perIp: { max: 12, windowMs: 10 * 60 * 1000 }, overall: { max: 600, windowMs: 60 * 60 * 1000 } };

const REF_RE = /^W-[2-9A-HJ-NP-Z]{4}$/;
const key = (v, max = 80) => (typeof v === 'string' && /^[\w-]{1,80}$/.test(v) ? v.slice(0, max) : '');
const path = (v) => (typeof v === 'string' && /^\/[\w\-/%.]{0,119}$/.test(v) ? v : '/');

/** Clean intent, or null when the body isn't one. */
export function sanitizeIntent(body) {
  if (!body || typeof body !== 'object' || !REF_RE.test(String(body.ref || ''))) return null;
  return {
    ref: body.ref,
    channel: 'whatsapp',
    path: path(body.path),
    propertyId: key(body.propertyId),
    source: key(body.source, 40) || 'direct',
    placement: key(body.placement, 40),
    device: body.device === 'mobile' ? 'mobile' : 'desktop'
  };
}

/** Firestore REST fields for a new contact_intents/{ref} document. */
export function intentFields(intent, now = Date.now()) {
  const s = (v) => ({ stringValue: String(v) });
  return {
    ref: s(intent.ref),
    channel: s(intent.channel),
    path: s(intent.path),
    propertyId: s(intent.propertyId),
    source: s(intent.source),
    placement: s(intent.placement),
    device: s(intent.device),
    status: s('open'),
    createdAt: { timestampValue: new Date(now).toISOString() }
  };
}

/**
 * Rate limits, validates and writes one intent. deps: { limitIp(ip), limitOverall(), write(intent) }.
 * Answers a status only: the browser never waits on or retries this.
 */
export async function handleIntent(text, ip, deps) {
  if (deps.limitIp(ip) || deps.limitOverall()) return 429;
  if (typeof text !== 'string' || text.length > MAX_BODY_BYTES) return 413;
  let body;
  try { body = JSON.parse(text); } catch { return 400; }
  const intent = sanitizeIntent(body);
  if (!intent) return 400;
  return (await deps.write(intent)) ? 204 : 502;
}
