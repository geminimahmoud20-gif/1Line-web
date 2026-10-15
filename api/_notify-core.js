// =============================================================
//  New-request WhatsApp alerts for the sales team — logic shared by api/notify.js and its tests.
//  (Files starting with "_" in api/ are not deployed as their own routes.)
//
//  The browser only says "I just created <kind>/<id>". The server reads that record itself, so a
//  caller can't make it send arbitrary text, and alerts each record once, only while it is fresh.
//  It doubles as the company's receipt that the customer sent the request: reference, time received
//  (server clock) and a summary. Of the phone it shows only the last 3 digits, enough to match a
//  caller; the full number and the email stay in the CRM behind its rules.
// =============================================================

import { areaLabel, propertyTypeLabel } from '../src/utils/placeLabels.js';

export const KINDS = {
  leads: 'عميل جديد',
  demands: 'طلب عقار (مطلوب)',
  remote_inspections: 'طلب معاينة عن بُعد (مغترب)',
  trade_ins: 'طلب بدل / استبدال'
};

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
export const FRESH_MS = 15 * 60 * 1000;

const TYPE_LABELS = {
  buyer: 'شراء', seller: 'بيع', investor: 'استثمار', broker: 'وسيط', callback_request: 'اتصال سريع',
  deposit: 'جدية حجز', special_request: 'طلب خاص', bespoke_request: 'طلب خاص VIP', financing: 'تمويل',
  valuation: 'تقييم', viewing_request: 'طلب معاينة', visit: 'معاينة ميدانية', viewing: 'طلب معاينة',
  account: 'حساب جديد', client_registration: 'تسجيل حساب'
};

const clean = (v, max = 80) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Validate the request body: { kind, id } */
export function parseRequest(body) {
  const kind = body?.kind;
  const id = body?.id;
  if (!Object.hasOwn(KINDS, kind) || typeof id !== 'string' || !ID_RE.test(id)) return null;
  return { kind, id };
}

/** "••••678": enough to match a caller, useless to anyone reading the company phone. */
export function maskPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? `••••${digits.slice(-3)}` : '';
}

// Free text a customer typed may hold a phone number: runs of 10+ digits (phones, not prices) are hidden
export const scrubDigits = (text) => String(text ?? '').replace(/[+\d٠-٩](?:[\s-]?[\d٠-٩]){9,}/g, '•••');

export function formatReceived(ms) {
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

/**
 * Alert text from the stored record. extra: { phone, receivedMs } — phone is read from the
 * contact record only to show its last 3 digits.
 */
export function buildMessage(kind, id, rec, siteUrl, extra = {}) {
  const d = rec.details && typeof rec.details === 'object' ? rec.details : {};
  let headline = `🔔 ${KINDS[kind]} — 1Line`;

  if (rec.type === 'visit' || rec.type === 'viewing_request' || rec.type === 'viewing' || d.visitDate || d.propertyId || rec.propertyId || rec.date) {
    const code = clean(rec.propertyId || d.propertyCode || d.propertyId || 'عقار', 25);
    const when = (d.visitDate || rec.date) ? ` ${clean(d.visitDate || rec.date, 15)}` : '';
    const slot = (d.visitSlot || rec.slot) ? ` ${clean(d.visitSlot || rec.slot, 15)}` : '';
    headline = `👁 طلب معاينة: كود ${code}${when}${slot} — 1Line`;
  } else if (rec.type === 'seller' || rec.type === 'valuation') {
    const area = clean(areaLabel(rec.area || d.area), 40);
    const kind = clean(propertyTypeLabel(d.propertyType || rec.propertyType), 30) || 'عقار';
    headline = `🏠 عرض بيع: ${area ? `${kind} في ${area}` : `${kind} جديد`} — 1Line`;
  } else if (rec.type === 'buyer') {
    headline = `🎯 طلب شراء جديد — 1Line`;
  } else if (rec.type === 'broker') {
    headline = `🤝 انضمام وسيط عقاري معتمد — 1Line`;
  } else if (rec.type === 'account' || rec.type === 'client_registration') {
    headline = `👤 حساب جديد على المنصة — 1Line`;
  }

  const lines = [
    headline,
    `رقم الطلب: ${id}`
  ];
  const received = formatReceived(extra.receivedMs);
  if (received) lines.push(`وقت الاستلام: ${received}`);
  lines.push(`الاسم: ${clean(rec.name || rec.clientName || '—', 60)}`);
  const tail = maskPhone(extra.phone);
  if (tail) lines.push(`الموبايل: ${tail}`);
  const type = TYPE_LABELS[rec.type] || clean(rec.type || rec.purpose || propertyTypeLabel(rec.propertyType), 40);
  if (type) lines.push(`النوع: ${type}`);
  const area = clean(areaLabel(d.area || rec.area || rec.location || rec.district), 60);
  if (area) lines.push(`المنطقة: ${area}`);
  const budget = clean(d.budget || rec.budget || d.expectedPrice || rec.expectedPrice, 40);
  if (budget) lines.push(`الميزانية: ${budget}`);
  if (kind === 'leads') lines.push(`الفريق: ${clean(rec.assignedTo || 'Unassigned', 40)}`);
  const source = clean(rec.source, 40);
  if (source) lines.push(`المصدر: ${source}`);
  const summary = clean(scrubDigits(rec.notes || rec.message || rec.text_ar || rec.description), 400);
  if (summary) lines.push(`الملخص: ${summary}`);
  const photos = Array.isArray(d.images) ? d.images.length : 0;
  if (photos) lines.push(`الصور: ${photos}`);
  lines.push(`افتح الـ CRM: ${siteUrl}/crm`);
  return lines.join('\n');
}

/**
 * Run one alert. deps: { readRecord(kind,id) → {data, createdAtMs} | null,
 *   claimOnce(kind,id) → true if this call is the first, sendAll(text) → number sent, now() }
 * Returns { status, body } for the HTTP response.
 */
export async function handleNotify(body, deps, siteUrl) {
  const req = parseRequest(body);
  if (!req) return { status: 400, body: { error: 'bad-request' } };
  const rec = await deps.readRecord(req.kind, req.id);
  if (!rec) return { status: 404, body: { error: 'not-found' } };
  if (!rec.createdAtMs || deps.now() - rec.createdAtMs > FRESH_MS) return { status: 200, body: { skipped: 'stale' } };
  if (!(await deps.claimOnce(req.kind, req.id))) return { status: 200, body: { skipped: 'already-sent' } };
  let phone = '';
  try {
    const contact = deps.readContact ? await deps.readContact(req.kind, req.id) : null;
    phone = contact?.phone || contact?.whatsapp || rec.data.phone || rec.data.whatsapp || '';
  } catch { /* the receipt still goes out without the last digits */ }
  const sent = await deps.sendAll(buildMessage(req.kind, req.id, rec.data, siteUrl, { phone, receivedMs: rec.createdAtMs }));
  return { status: 200, body: { sent } };
}

// ── WhatsApp senders ──────────────────────────────────────────────────────────
// CallMeBot (free, each recipient activates once): WHATSAPP_CALLMEBOT="201xxxxxxxxx:apikey,201yyyyyyyyy:apikey"
// Meta WhatsApp Cloud API (official): WHATSAPP_CLOUD_TOKEN, WHATSAPP_CLOUD_PHONE_ID, WHATSAPP_CLOUD_TO
//   (comma-separated numbers) and WHATSAPP_CLOUD_TEMPLATE — an approved template whose body is a
//   single {{1}} parameter (language WHATSAPP_CLOUD_LANG, default "ar").

export function parseCallMeBot(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean).map((pair) => {
    const [phone, apikey] = pair.split(':').map((x) => x.trim());
    return /^\+?\d{8,15}$/.test(phone || '') && apikey ? { phone: phone.replace(/^\+/, ''), apikey } : null;
  }).filter(Boolean);
}

export function makeSenders(env, fetchImpl = fetch) {
  const senders = [];
  for (const r of parseCallMeBot(env.WHATSAPP_CALLMEBOT)) {
    senders.push(async (text) => {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${r.phone}&apikey=${encodeURIComponent(r.apikey)}&text=${encodeURIComponent(text)}`;
      const res = await fetchImpl(url);
      return res.ok;
    });
  }
  const to = String(env.WHATSAPP_CLOUD_TO || '').split(',').map((s) => s.trim().replace(/^\+/, '')).filter((s) => /^\d{8,15}$/.test(s));
  if (env.WHATSAPP_CLOUD_TOKEN && env.WHATSAPP_CLOUD_PHONE_ID && env.WHATSAPP_CLOUD_TEMPLATE && to.length) {
    for (const number of to) {
      senders.push(async (text) => {
        const res = await fetchImpl(`https://graph.facebook.com/v21.0/${encodeURIComponent(env.WHATSAPP_CLOUD_PHONE_ID)}/messages`, {
          method: 'POST',
          headers: { authorization: `Bearer ${env.WHATSAPP_CLOUD_TOKEN}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: number,
            type: 'template',
            template: {
              name: env.WHATSAPP_CLOUD_TEMPLATE,
              language: { code: env.WHATSAPP_CLOUD_LANG || 'ar' },
              // Template parameters may not contain new lines
              components: [{ type: 'body', parameters: [{ type: 'text', text: text.replace(/\n/g, ' • ').slice(0, 1000) }] }]
            }
          })
        });
        return res.ok;
      });
    }
  }
  return senders;
}

export async function sendAll(senders, text, timeoutMs = 8000) {
  const results = await Promise.allSettled(senders.map((send) => Promise.race([
    send(text),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
  ])));
  return results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
}
