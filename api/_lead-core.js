// =============================================================
//  The server half of «إرسال طلب من الموقع»: what a visitor's form may send, and Cloudflare Turnstile.
//  Pure (no network except the injected fetch), so tests/unit/lead-core.test.mjs covers it.
//  The limits below mirror validLeadBasics() / lead_contacts in firestore.rules, which still guard the
//  database itself: this file is the stricter front door.
// =============================================================
import { CONTACT_FIELDS } from '../src/utils/leadContactFields.js';

export const LEAD_LIMITS = {
  nameMin: 2, nameMax: 100, textMax: 2000, keysMax: 60,
  phoneMin: 8, phoneMax: 25, shortMax: 200, jsonMax: 24_000
};

// Fields a visitor must never set: staff-only state, ownership, ids, server stamps
const FORBIDDEN = new Set([
  'id', 'role', 'isAdmin', 'createdAt', 'updatedAt', 'ownerUid', 'ownerName', 'claimedBy',
  'isArchived', 'firstContactedAt', 'lastContactedAt', 'lastActivityAt', 'outcomes', 'callOutcomes',
  '_cloud', '_inlineContact', 'queuedAt'
]);
// The site routes a request to a team's desk itself (utils/leadRoutingEngine): keep a plausible desk name, never anything else
const DESK_RE = /^[\p{L}\p{N} .'_-]{1,60}$/u;

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const digits = (s) => String(s ?? '').replace(/\D/g, '');

/**
 * Checks and cleans what a visitor posted. { ok: true, lead, contact } with the contact fields split off
 * (they live in lead_contacts/{id}), or { ok: false, error } with a short code the browser can show.
 */
export function sanitizePublicLead(input) {
  if (!isObj(input)) return { ok: false, error: 'bad-lead' };
  let json;
  try { json = JSON.stringify(input); } catch { return { ok: false, error: 'bad-lead' }; }
  if (json.length > LEAD_LIMITS.jsonMax) return { ok: false, error: 'too-large' };

  const lead = {};
  const contact = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || FORBIDDEN.has(key) || key.startsWith('__') || key.includes('/')) continue;
    if (CONTACT_FIELDS.includes(key)) {
      if (value !== null && value !== '') contact[key] = String(value).trim();
    } else if (key === 'details') {
      if (isObj(value)) {
        const d = {};
        for (const [k, v] of Object.entries(value)) if (!CONTACT_FIELDS.includes(k)) d[k] = v;
        lead.details = d;
      }
    } else {
      lead[key] = value;
    }
  }

  if (lead.assignedTo !== undefined && !(typeof lead.assignedTo === 'string' && DESK_RE.test(lead.assignedTo))) lead.assignedTo = 'Unassigned';
  const name = typeof lead.name === 'string' ? lead.name.trim() : '';
  if (name.length < LEAD_LIMITS.nameMin || name.length > LEAD_LIMITS.nameMax) return { ok: false, error: 'bad-name' };
  lead.name = name;
  if (Object.keys(lead).length > LEAD_LIMITS.keysMax) return { ok: false, error: 'too-many-fields' };
  for (const k of ['notes', 'message']) {
    if (lead[k] !== undefined && (typeof lead[k] !== 'string' || lead[k].length > LEAD_LIMITS.textMax)) return { ok: false, error: 'bad-text' };
  }
  if (lead.status !== undefined && lead.status !== 'new') return { ok: false, error: 'bad-status' };

  // A request needs a way to reach the person: at least one real phone or WhatsApp number
  const reach = [contact.phone, contact.whatsapp].map(digits).filter((d) => d.length >= LEAD_LIMITS.phoneMin && d.length <= LEAD_LIMITS.phoneMax);
  if (!reach.length) return { ok: false, error: 'bad-phone' };
  for (const k of ['phone', 'whatsapp', 'altPhone']) {
    if (contact[k] && contact[k].length > LEAD_LIMITS.phoneMax) return { ok: false, error: 'bad-phone' };
  }
  if (contact.email && (contact.email.length > 120 || !/^[^@\s]+@[^@\s]+$/.test(contact.email))) delete contact.email;
  return { ok: true, lead, contact };
}

/**
 * Cloudflare Turnstile server check. With no secret configured it passes (the site works before the keys
 * are set up); with one, a missing or rejected token fails. `fetchImpl` is injected for tests.
 * → { ok: true, skipped?: true } | { ok: false, error: 'captcha' | 'captcha-unavailable' }
 */
export async function verifyTurnstile({ secret, token, ip }, fetchImpl = fetch) {
  if (!secret) return { ok: true, skipped: true };
  if (!token || typeof token !== 'string' || token.length > 2048) return { ok: false, error: 'captcha' };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: 'captcha-unavailable' };
    const data = await res.json();
    return data?.success === true ? { ok: true } : { ok: false, error: 'captcha' };
  } catch {
    return { ok: false, error: 'captcha-unavailable' };
  }
}
