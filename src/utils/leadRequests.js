// What a lead is asking for, in one place: the CRM filters, the bell, desktop alerts and the
// WhatsApp alert all name requests the same way. Pure functions (unit-tested).

export const REQUEST_KINDS = {
  reservation_request: { icon: '🔒', ar: 'طلب حجز', en: 'Reservation request', plural_ar: 'طلبات حجز' },
  viewing_request: { icon: '👁', ar: 'طلب معاينة', en: 'Viewing request', plural_ar: 'طلبات معاينة' },
  seller: { icon: '🏠', ar: 'عرض بيع', en: 'Property to sell', plural_ar: 'عروض بيع' },
  client_account: { icon: '👤', ar: 'حساب جديد على الموقع', en: 'New site account', plural_ar: 'حسابات جديدة' },
  callback_request: { icon: '📞', ar: 'طلب اتصال', en: 'Callback request', plural_ar: 'طلبات اتصال' },
  buyer: { icon: '🔎', ar: 'طلب شراء', en: 'Buyer', plural_ar: 'طلبات شراء' },
  investor: { icon: '💎', ar: 'مستثمر', en: 'Investor', plural_ar: 'مستثمرون' },
  broker: { icon: '🤝', ar: 'وسيط', en: 'Broker', plural_ar: 'وسطاء' }
};

/**
 * The request kind of a lead. Site-account sign-ups used to be saved as type "buyer" with
 * source "client_account"; they count as accounts, not buyers.
 */
export function leadKind(lead = {}) {
  const type = lead.type || 'buyer';
  if (type === 'client_account' || (lead.source === 'client_account' && type === 'buyer')) return 'client_account';
  return type;
}

export const kindInfo = (kind) => REQUEST_KINDS[kind] || { icon: '🔔', ar: 'طلب جديد', en: 'New request', plural_ar: 'طلبات' };

const SLOT_AR = { morning: 'صباحاً', evening: 'مساءً' };
const DAY_MS = 24 * 60 * 60 * 1000;
const dayStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/**
 * The visit a viewing request asked for: { date: 'YYYY-MM-DD', slot, dayDiff, label } or null
 * when no date was picked. dayDiff is 0 for today, 1 for tomorrow, negative when it has passed.
 */
export function requestedVisit(lead = {}, now = Date.now()) {
  if (leadKind(lead) !== 'viewing_request') return null;
  const raw = String(lead.date || lead.details?.date || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slot = SLOT_AR[lead.slot || lead.details?.slot] || '';
  const video = (lead.tourType || lead.details?.tourType) === 'video';
  if (!m) return { date: '', slot, video, dayDiff: null, label: `أقرب موعد${slot ? ` ${slot}` : ''}` };
  const at = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const dayDiff = Math.round((at - dayStart(now)) / DAY_MS);
  const when = dayDiff === 0 ? 'النهارده' : dayDiff === 1 ? 'بكرة' : `${m[3]}/${m[2]}`;
  return { date: raw, slot, video, dayDiff, label: `${when}${slot ? ` ${slot}` : ''}` };
}

/** Viewing requests in visit order: dated ones soonest first (past last), undated after. */
export function sortByRequestedVisit(list = [], now = Date.now()) {
  const rank = (l) => {
    const v = requestedVisit(l, now);
    if (!v || v.dayDiff === null) return 1e6;
    return v.dayDiff >= 0 ? v.dayDiff : 1e5 - v.dayDiff;
  };
  return [...list].sort((a, b) => rank(a) - rank(b));
}

/** One line that says what the lead wants, for alerts: "👁 طلب معاينة: شقة … (P-120) — بكرة مساءً". */
export function describeRequest(lead = {}, isAr = true, now = Date.now()) {
  const info = kindInfo(leadKind(lead));
  const name = String(lead.name || (isAr ? 'عميل' : 'Lead')).slice(0, 60);
  const what = lead.propertyTitle ? `${String(lead.propertyTitle).slice(0, 60)}${lead.propertyId ? ` (${String(lead.propertyId).toUpperCase()})` : ''}` : '';
  const visit = requestedVisit(lead, now);
  const parts = [`${info.icon} ${isAr ? info.ar : info.en}: ${name}`];
  if (what) parts.push(what);
  if (visit) parts.push(visit.label);
  if (lead.returningClient) parts.push(isAr ? 'عميل راجع' : 'returning');
  return parts.join(' — ');
}
