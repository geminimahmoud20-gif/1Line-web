// =============================================================
//  Homepage featured slots — shared by HomePage and the CRM board,
//  so what the admin sees in "Homepage now" is exactly what visitors get.
//
//  Property fields:
//    featured       boolean  — admin intent
//    featuredFrom   'YYYY-MM-DD' | null  — first day shown (inclusive, local time)
//    featuredUntil  'YYYY-MM-DD' | null  — last day shown (inclusive); null = open-ended
//    featuredOrder  number   — slot position, lower first
// =============================================================

export const HOME_FEATURED_SLOTS = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDay = (value, endOfDay = false) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d).getTime();
};

export const toDayInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDays = (days, from = Date.now()) => toDayInput(from + days * DAY_MS);

/** Same visibility rule the public homepage uses */
export const isPublishedProperty = (p) =>
  !!p && !p.isDeleted && !['trash', 'hidden', 'draft', 'sold'].includes(p.status);

/** 'none' | 'scheduled' | 'active' | 'expired' */
export function featuredState(p, now = Date.now()) {
  if (!p?.featured) return 'none';
  const from = parseDay(p.featuredFrom);
  const until = parseDay(p.featuredUntil, true);
  if (from && now < from) return 'scheduled';
  if (until && now > until) return 'expired';
  return 'active';
}

/** Whole days left including today (null when open-ended or not active) */
export function featuredDaysLeft(p, now = Date.now()) {
  const until = parseDay(p?.featuredUntil, true);
  if (!until || featuredState(p, now) !== 'active') return null;
  return Math.max(1, Math.ceil((until - now) / DAY_MS));
}

const byOrder = (a, b) => {
  const oa = Number.isFinite(Number(a.featuredOrder)) ? Number(a.featuredOrder) : 999;
  const ob = Number.isFinite(Number(b.featuredOrder)) ? Number(b.featuredOrder) : 999;
  if (oa !== ob) return oa - ob;
  return String(b.featuredFrom || '').localeCompare(String(a.featuredFrom || ''));
};

/**
 * Resolves the homepage slots.
 * Returns [{ property, source: 'featured' | 'auto' }] — active featured first (by order),
 * remaining slots filled with the newest published listings so the grid is never half empty.
 */
export function getHomepageSlots(list = [], limit = HOME_FEATURED_SLOTS, now = Date.now()) {
  const published = list.filter(isPublishedProperty);
  const featured = published.filter((p) => featuredState(p, now) === 'active').sort(byOrder).slice(0, limit);
  const taken = new Set(featured.map((p) => p.id));
  const filler = published.filter((p) => !taken.has(p.id)).slice(0, Math.max(0, limit - featured.length));
  return [
    ...featured.map((property) => ({ property, source: 'featured' })),
    ...filler.map((property) => ({ property, source: 'auto' }))
  ];
}

/** Featured listings that are not on the homepage right now, for the CRM board */
export function getFeaturedQueue(list = [], limit = HOME_FEATURED_SLOTS, now = Date.now()) {
  const published = list.filter(isPublishedProperty);
  const live = published.filter((p) => featuredState(p, now) === 'active').sort(byOrder);
  return {
    overflow: live.slice(limit),
    scheduled: published.filter((p) => featuredState(p, now) === 'scheduled').sort((a, b) => String(a.featuredFrom).localeCompare(String(b.featuredFrom))),
    expired: published.filter((p) => featuredState(p, now) === 'expired')
  };
}
