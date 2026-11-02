// =============================================================
//  Pure logic for api/whatsapp-webhook.js: messages customers send to the company WhatsApp number
//  arrive from Meta's WhatsApp Cloud API and become clients in the CRM by themselves, with the
//  real sender number. A message carrying a site reference («رقم المرجع: W-7K3Q», added by
//  src/utils/contactIntent.js) links the client to the page or unit the visitor tapped from.
//
//  One client per WhatsApp number: leads/wa-<number>. Its first message creates it (status new,
//  unassigned, phone in lead_contacts like every other lead); later messages update it.
//  Tests: tests/unit/whatsapp-inbound.test.mjs
// =============================================================
import { createHmac, timingSafeEqual } from 'node:crypto';

export const MAX_BODY_BYTES = 256 * 1024;
const REF_RE = /W-[2-9A-HJ-NP-Z]{4}/;

/** Meta's subscription check (GET): the challenge to echo back, or null when the token is wrong. */
export function verifyChallenge(params, verifyToken) {
  if (!verifyToken) return null;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  if (mode !== 'subscribe' || !challenge || token !== verifyToken) return null;
  return /^[\w-]{1,200}$/.test(challenge) ? challenge : null;
}

/** X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(raw body, app secret) */
export function validSignature(rawBody, header, appSecret) {
  if (!appSecret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex'), 'utf8');
  const got = Buffer.from(header.slice(7), 'utf8');
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** WhatsApp id (201012345678) → the CRM's phone form (01012345678); other countries keep "+". */
export function phoneFromWaId(waId) {
  const d = String(waId || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(d)) return '';
  if (/^201[0125]\d{8}$/.test(d)) return `0${d.slice(2)}`;
  return `+${d}`;
}

const textOf = (m) => {
  switch (m.type) {
    case 'text': return m.text?.body || '';
    case 'button': return m.button?.text || '';
    case 'interactive': return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
    case 'image': case 'video': case 'document': return m[m.type]?.caption || `[${m.type}]`;
    case 'audio': return '[رسالة صوتية]';
    case 'location': return '[موقع]';
    default: return `[${m.type || 'رسالة'}]`;
  }
};

/**
 * The customer messages in a webhook payload: [{ waId, phone, name, text, ref, id, at }].
 * Delivery statuses and other numbers' events (phoneNumberId set and different) are left out.
 */
export function inboundMessages(payload, { phoneNumberId = '' } = {}) {
  const out = [];
  if (payload?.object !== 'whatsapp_business_account') return out;
  for (const entry of payload.entry || []) {
    for (const change of entry?.changes || []) {
      const v = change?.value;
      if (change?.field !== 'messages' || !v || !Array.isArray(v.messages)) continue;
      if (phoneNumberId && v.metadata?.phone_number_id && String(v.metadata.phone_number_id) !== String(phoneNumberId)) continue;
      const names = new Map((v.contacts || []).map((c) => [String(c?.wa_id || ''), String(c?.profile?.name || '')]));
      for (const m of v.messages) {
        const waId = String(m?.from || '').replace(/\D/g, '');
        const phone = phoneFromWaId(waId);
        if (!phone) continue;
        const text = String(textOf(m)).slice(0, 1000);
        const sec = Number(m.timestamp);
        out.push({
          waId,
          phone,
          name: (names.get(waId) || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80),
          text,
          ref: (REF_RE.exec(text) || [''])[0],
          id: String(m.id || '').slice(0, 120),
          at: Number.isFinite(sec) && sec > 0 ? new Date(sec * 1000).toISOString() : new Date().toISOString()
        });
      }
    }
  }
  return out;
}

export const leadIdFor = (msg) => `wa-${msg.waId}`;

// ── Firestore REST values ──
const s = (v) => ({ stringValue: String(v ?? '') });
const ts = (iso) => ({ timestampValue: iso });
const map = (obj) => ({ mapValue: { fields: obj } });

/**
 * The new client for a first message. `intent`: the contact_intents row for its reference, if any
 * (which page / unit the visitor tapped WhatsApp on).
 */
export function newLeadFields(msg, intent = null) {
  const propertyId = intent?.propertyId || '';
  const where = propertyId ? ` على وحدة #${propertyId.toUpperCase()}` : (intent?.path && intent.path !== '/' ? ` من صفحة ${intent.path}` : '');
  const notes = `رسالة واتساب${where}${msg.ref ? ` · رقم المرجع ${msg.ref}` : ''}:\n${msg.text}`.slice(0, 2000);
  const fields = {
    name: s(msg.name.length >= 2 ? msg.name : 'عميل واتساب'),
    type: s('buyer'),
    status: s('new'),
    source: s(msg.ref ? 'whatsapp_site' : 'whatsapp'),
    assignedTo: s('Unassigned'),
    followUp: s('Pending Contact'),
    temperature: s(''),
    notes: s(notes),
    lastWhatsAppMessage: s(msg.text),
    lastWhatsAppAt: ts(msg.at),
    whatsappMessages: { integerValue: '1' },
    createdBy: s('whatsapp_webhook'),
    timestamp: s(msg.at),
    createdAt: ts(msg.at),
    updatedAt: ts(msg.at),
    lastActivityAt: s(msg.at),
    version: { integerValue: '1' },
    details: map({
      channel: s('whatsapp'),
      ...(propertyId ? { propertyCode: s(propertyId.toUpperCase()) } : {}),
      ...(intent?.path ? { path: s(intent.path) } : {})
    })
  };
  if (msg.ref) fields.contactRef = s(msg.ref);
  if (propertyId) fields.propertyId = s(propertyId);
  if (intent?.source && intent.source !== 'direct') fields.utmSource = s(intent.source);
  return fields;
}

/** The protected contact doc (lead_contacts/<same id>), like every lead's */
export const contactFields = (msg) => ({ phone: s(msg.phone), whatsapp: s(msg.phone), assignedTo: s('Unassigned') });

/** Fields a later message updates on an existing client (plus whatsappMessages +1, a transform) */
export function followUpFields(msg) {
  const fields = { lastWhatsAppMessage: s(msg.text), lastWhatsAppAt: ts(msg.at), lastActivityAt: s(msg.at), updatedAt: ts(msg.at) };
  return fields;
}

/** The contact_intents/<ref> update marking the tap as linked to this client */
export const intentLinkFields = (leadId, nowIso) => ({
  status: s('linked'), leadId: s(leadId), handledBy: s('whatsapp'), handledAt: ts(nowIso)
});

/** contact_intents REST document → { propertyId, path, source } */
export function intentFromDoc(docJson) {
  const f = docJson?.fields || {};
  const v = (k) => String(f[k]?.stringValue || '');
  return { propertyId: v('propertyId'), path: v('path'), source: v('source'), status: v('status') };
}

/**
 * Handles one POST. deps: { readIntent(ref) → intent|null, createLead(id, fields, contact) → 'created'|'exists'|false,
 * updateLead(id, fields) → bool, linkIntent(ref, leadId) → bool, appSecret, phoneNumberId }.
 * Always answers 200 to a signed request (Meta retries anything else for days), 401 otherwise.
 */
export async function handleInbound(rawBody, signature, deps) {
  if (typeof rawBody !== 'string' || rawBody.length > MAX_BODY_BYTES) return { status: 413, handled: 0 };
  if (!validSignature(rawBody, signature, deps.appSecret)) return { status: 401, handled: 0 };
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return { status: 200, handled: 0 }; }
  let handled = 0;
  for (const msg of inboundMessages(payload, { phoneNumberId: deps.phoneNumberId })) {
    const id = leadIdFor(msg);
    const intent = msg.ref ? await deps.readIntent(msg.ref) : null;
    const created = await deps.createLead(id, newLeadFields(msg, intent), contactFields(msg));
    if (created === 'exists') await deps.updateLead(id, followUpFields(msg));
    if (created && intent && intent.status !== 'linked') await deps.linkIntent(msg.ref, id);
    if (created) handled++;
  }
  return { status: 200, handled };
}
