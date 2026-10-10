// Turns the Firestore analytics documents (api/_track-core.js) into dashboard numbers. Pure.

export const PRICE_BANDS = [
  { id: 'lt1m', ar: 'أقل من مليون', en: '< 1M' },
  { id: 'm1_2', ar: '1 – 2 مليون', en: '1–2M' },
  { id: 'm2_3', ar: '2 – 3 مليون', en: '2–3M' },
  { id: 'm3_5', ar: '3 – 5 مليون', en: '3–5M' },
  { id: 'm5_10', ar: '5 – 10 مليون', en: '5–10M' },
  { id: 'gte10m', ar: '10 مليون فأكثر', en: '10M+' },
];
export const bandLabel = (id, isAr = true) => {
  const b = PRICE_BANDS.find((x) => x.id === id);
  return b ? (isAr ? b.ar : b.en) : id;
};

export const SOURCE_LABELS = {
  direct: { ar: 'دخول مباشر', en: 'Direct' }, facebook: { ar: 'فيسبوك', en: 'Facebook' },
  instagram: { ar: 'إنستجرام', en: 'Instagram' }, google: { ar: 'جوجل', en: 'Google' },
  tiktok: { ar: 'تيك توك', en: 'TikTok' }, youtube: { ar: 'يوتيوب', en: 'YouTube' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' }, linkedin: { ar: 'لينكدإن', en: 'LinkedIn' },
  twitter: { ar: 'إكس / تويتر', en: 'X / Twitter' }, bing: { ar: 'بينج', en: 'Bing' },
  referral: { ar: 'مواقع أخرى', en: 'Other sites' },
};
export const sourceLabel = (id, isAr = true) => SOURCE_LABELS[id]?.[isAr ? 'ar' : 'en'] || id;

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v)
  && typeof v.toMillis !== 'function' && !(v instanceof Date);

/** Adds every number in `src` into `target`, recursing into maps; other values are ignored. */
export function mergeCounts(target, src) {
  for (const [k, v] of Object.entries(src || {})) {
    if (typeof v === 'number' && Number.isFinite(v)) target[k] = (target[k] || 0) + v;
    else if (isPlainObject(v)) mergeCounts((target[k] = isPlainObject(target[k]) ? target[k] : {}), v);
  }
  return target;
}

/** Calendar day in Egypt, `offset` days from `now`. */
export const cairoDay = (now = Date.now(), offset = 0) => new Date(now + offset * 86_400_000)
  .toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

/** The last `days` calendar days (oldest first). */
export const dayRange = (days, now = Date.now()) => Array.from({ length: days }, (_, i) => cairoDay(now, i - days + 1));

/** Shards → { totals, byDay: { 'YYYY-MM-DD': counts } } */
export function sumDays(docs = []) {
  const totals = {};
  const byDay = {};
  for (const d of docs) {
    mergeCounts(totals, d);
    const day = d.date || String(d.id || '').slice(0, 10);
    mergeCounts((byDay[day] = byDay[day] || {}), d);
  }
  return { totals, byDay };
}

export const topEntries = (map = {}, n = 6) => Object.entries(map || {})
  .filter(([, v]) => typeof v === 'number' && v > 0)
  .sort((a, b) => b[1] - a[1])
  .slice(0, n);

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/** Headline numbers for the period. */
export function kpis(t = {}) {
  const sessions = t.sessions || 0;
  const contacts = (t.contacts?.whatsapp || 0) + (t.contacts?.phone || 0);
  return {
    visitors: t.visitors || 0,
    newVisitors: t.newVisitors || 0,
    sessions,
    pageViews: t.pageViews || 0,
    propertyViews: t.propertyViews || 0,
    avgReadSeconds: t.engagedViews ? Math.round((t.engagedSeconds || 0) / t.engagedViews) : 0,
    contacts,
    whatsapp: t.contacts?.whatsapp || 0,
    calls: t.contacts?.phone || 0,
    leads: t.leads || 0,
    calculatorUses: t.calculatorUses || 0,
    formStarts: t.formStarts || 0,
    conversionRate: pct(t.leads || 0, sessions),
    contactRate: pct(contacts, sessions),
    // Share of traffic sent without analytics consent (counted, but not tied to a visitor)
    anonymousShare: pct(t.anonymousBatches || 0, t.batches || 0),
  };
}

export const FUNNEL_STEPS = [
  { id: 'sessions', ar: 'زيارات', en: 'Visits' },
  { id: 'viewed', ar: 'فتحوا عقار', en: 'Opened a listing' },
  { id: 'engaged', ar: 'قروا التفاصيل', en: 'Read the details' },
  { id: 'planned', ar: 'حسبوا/قارنوا/حفظوا', en: 'Calculated / compared / saved' },
  { id: 'contacted', ar: 'تواصلوا', en: 'Contacted us' },
  { id: 'lead', ar: 'سجّلوا طلب', en: 'Submitted a request' },
];
export function funnel(t = {}) {
  const sessions = t.sessions || 0;
  return FUNNEL_STEPS.map((s) => {
    const count = s.id === 'sessions' ? sessions : (t.funnel?.[s.id] || 0);
    return { ...s, count, pctOfVisits: pct(count, sessions) };
  });
}

/** Area / type / budget demand: what people opened plus what they searched for. */
export function demand(t = {}) {
  const combine = (a = {}, b = {}) => mergeCounts(mergeCounts({}, a), b);
  return {
    areas: topEntries(combine(t.viewAreas, t.searchAreas), 8),
    types: topEntries(combine(t.viewTypes, t.searchTypes), 6),
    bands: PRICE_BANDS.map((b) => [b.id, (t.viewBands?.[b.id] || 0) + (t.searchBands?.[b.id] || 0) + (t.calcBands?.[b.id] || 0)]),
  };
}

export const intentLevel = (score = 0) => (score >= 25 ? 'hot' : score >= 10 ? 'warm' : 'cold');

/** What one visitor seems to want, from their profile document. */
export function visitorInterests(profile = {}) {
  const props = mergeCounts({}, profile.props || {});
  const secs = profile.propSecs || {};
  const topProps = Object.keys({ ...props, ...secs })
    .map((id) => ({ id, views: props[id] || 0, seconds: secs[id] || 0, favorite: Boolean(profile.favorites?.[id]), compared: Boolean(profile.compares?.[id]) }))
    .sort((a, b) => (b.seconds + b.views * 20) - (a.seconds + a.views * 20))
    .slice(0, 6);
  const contacts = (profile.contacts?.whatsapp || 0) + (profile.contacts?.phone || 0);
  return {
    level: intentLevel(profile.intent || 0),
    intent: profile.intent || 0,
    areas: topEntries(profile.areas, 3),
    types: topEntries(profile.types, 3),
    bands: topEntries(profile.bands, 2),
    topProps,
    contacts,
    sessions: profile.sessions || 0,
    calculatorUses: profile.calculatorUses || 0,
    lastCalc: profile.lastCalc || null,
    lastSearch: profile.lastSearch || null,
    engagedSeconds: profile.engagedSeconds || 0,
  };
}

/** "3د 20ث" / "3m 20s" */
export function formatSeconds(total = 0, isAr = true) {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return isAr ? `${r}ث` : `${r}s`;
  return isAr ? `${m}د ${r}ث` : `${m}m ${r}s`;
}
