// =============================================================
//  Limited-time offers on listings — shared by the public site and the CRM, so what the admin
//  schedules is exactly what visitors see, and an offer disappears on its own after its last day.
//
//  Property field:
//    offer: {
//      type:     'cash_discount'           — the only type for now (more types plug in below)
//      price:    number                    — offer cash price in EGP, below the listing price
//      from:     'YYYY-MM-DD' | null       — first day shown (inclusive, local time); null = now
//      until:    'YYYY-MM-DD'              — last day shown (inclusive). Required: offers end.
//      basePrice: number                   — listing price when the offer was saved
//      terms_ar, terms_en: string          — conditions shown on the listing page
//      extended: boolean                   — the end date was moved later after launch
//    }
//
//  Honesty rules enforced here, not just in the editor:
//    • the "was" price is the listing's own price, never a separate number — and never higher than
//      it was when the offer was saved, so raising the price mid-offer can't inflate the discount
//    • an offer that isn't actually cheaper, or has no end date, is never shown
// =============================================================

export const OFFER_TYPES = {
  cash_discount: { ar: 'عرض كاش', en: 'Cash offer' }
};

export const OFFER_MAX_DAYS = 90;
export const OFFER_MAX_PCT = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDay = (value, endOfDay = false) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d).getTime();
};

const toNumber = (v) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** The "was" price: the current listing price, capped at the price when the offer was saved */
const wasPrice = (property) => {
  const current = toNumber(property?.price);
  const atSave = toNumber(property?.offer?.basePrice);
  return atSave ? Math.min(current, atSave) : current;
};

/** 'none' | 'invalid' | 'scheduled' | 'active' | 'expired' */
export function offerState(property, now = Date.now()) {
  const offer = property?.offer;
  if (!offer || !OFFER_TYPES[offer.type]) return 'none';
  const base = wasPrice(property);
  const price = toNumber(offer.price);
  const until = parseDay(offer.until, true);
  if (!base || !price || price >= base || !until) return 'invalid';
  const from = parseDay(offer.from);
  if (from && now < from) return 'scheduled';
  if (now > until) return 'expired';
  return 'active';
}

/** The running offer, ready to display — or null */
export function getActiveOffer(property, now = Date.now()) {
  if (offerState(property, now) !== 'active') return null;
  const { offer } = property;
  const basePrice = wasPrice(property);
  const price = toNumber(offer.price);
  const endsAt = parseDay(offer.until, true);
  return {
    type: offer.type,
    label: OFFER_TYPES[offer.type],
    price,
    basePrice,
    savings: basePrice - price,
    // Whole percent, rounded down so the badge never overstates the discount
    pct: Math.floor(((basePrice - price) / basePrice) * 100),
    endsAt,
    msLeft: Math.max(0, endsAt - now),
    terms_ar: offer.terms_ar || '',
    terms_en: offer.terms_en || '',
    extended: !!offer.extended
  };
}

/** Published listings with a running offer, ending soonest first */
export function getOfferListings(list = [], now = Date.now()) {
  return list
    .filter((p) => p && !p.isDemo && !p.isDeleted && !['trash', 'hidden', 'draft', 'sold'].includes(p.status))
    .map((property) => ({ property, offer: getActiveOffer(property, now) }))
    .filter((x) => x.offer)
    .sort((a, b) => a.offer.endsAt - b.offer.endsAt);
}

// Arabic counting: 1 يوم، 2 يومين، 3–10 أيام، 11+ يوم
const arCount = (n, [one, two, few, many]) => (n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`);
const AR_DAYS = ['يوم', 'يومين', 'أيام', 'يوم'];
const AR_HOURS = ['ساعة', 'ساعتين', 'ساعات', 'ساعة'];
const AR_MINUTES = ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'];

/** "3 أيام و5 ساعات" / "5 ساعات و12 دقيقة" / "45 دقيقة" (English: "3d 5h", "5h 12m", "45m") */
export function formatTimeLeft(ms, isAr = true) {
  const totalMin = Math.max(1, Math.ceil(ms / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (!isAr) {
    if (days) return hours ? `${days}d ${hours}h` : `${days}d`;
    if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
  }
  if (days) return hours ? `${arCount(days, AR_DAYS)} و${arCount(hours, AR_HOURS)}` : arCount(days, AR_DAYS);
  if (hours) return minutes ? `${arCount(hours, AR_HOURS)} و${arCount(minutes, AR_MINUTES)}` : arCount(hours, AR_HOURS);
  return arCount(minutes, AR_MINUTES);
}

/**
 * Checks an offer before it is saved. Returns a list of { ar, en } messages (empty = valid).
 */
export function validateOffer(offer, basePrice, now = Date.now()) {
  const errors = [];
  const base = toNumber(basePrice);
  const price = toNumber(offer?.price);
  const today = new Date(now);
  const from = parseDay(offer?.from) ?? new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const until = parseDay(offer?.until, true);
  if (!OFFER_TYPES[offer?.type]) errors.push({ ar: 'نوع العرض غير معروف', en: 'Unknown offer type' });
  if (!base) errors.push({ ar: 'حدد سعر العقار أولاً — العرض يُحسب منه', en: 'Set the listing price first — the offer is based on it' });
  if (!price) errors.push({ ar: 'اكتب سعر العرض', en: 'Enter the offer price' });
  else if (base && price >= base) errors.push({ ar: 'سعر العرض لازم يكون أقل من سعر العقار الحالي', en: 'The offer price must be below the current listing price' });
  else if (base && ((base - price) / base) * 100 > OFFER_MAX_PCT) errors.push({ ar: `الخصم أكبر من ${OFFER_MAX_PCT}% — راجع الرقم`, en: `Discount above ${OFFER_MAX_PCT}% — check the number` });
  if (!until) errors.push({ ar: 'حدد آخر يوم للعرض — العرض لازم يكون له نهاية', en: 'Pick the last day — offers must end' });
  else {
    if (until < from) errors.push({ ar: 'تاريخ النهاية قبل البداية', en: 'End date is before the start date' });
    if (until < now) errors.push({ ar: 'تاريخ النهاية في الماضي', en: 'The end date is in the past' });
    if ((until - from) / DAY_MS > OFFER_MAX_DAYS) errors.push({ ar: `أقصى مدة للعرض ${OFFER_MAX_DAYS} يوم`, en: `Offers can run at most ${OFFER_MAX_DAYS} days` });
  }
  return errors;
}

/** True when a running offer's end date moves later — the site then says so ("تم تمديد العرض") */
export function isExtension(previous, next, now = Date.now()) {
  if (!previous?.until || !next?.until) return false;
  const prevEnd = parseDay(previous.until, true);
  const prevStart = parseDay(previous.from) ?? 0;
  const started = now >= prevStart;
  return started && parseDay(next.until, true) > prevEnd;
}

const trim = (n, digits) => String(Number(n.toFixed(digits)));

/**
 * The saving as a headline: "450" + "ألف ج.م", "1.25" + "مليون ج.م".
 * Rounded down so the headline never promises more than the real saving.
 */
export function savingsHeadline(amount, isAr) {
  const n = Math.max(0, Number(amount) || 0);
  const cur = isAr ? 'ج.م' : 'EGP';
  if (n >= 1e6) return { value: trim(Math.floor(n / 1e4) / 100, 2), unit: isAr ? `مليون ${cur}` : `M ${cur}` };
  if (n >= 1e4) return { value: trim(Math.floor(n / 100) / 10, 1), unit: isAr ? `ألف ${cur}` : `K ${cur}` };
  return { value: n.toLocaleString('en-US'), unit: cur };
}
