// =============================================================
//  العقارات الحصرية: a listing the owner gave only to us for a period. An exclusive listing is the strongest asset a
//  brokerage has (no competitor can sell it), so the CRM tracks it: which listings, until when, how many days are
//  left, and how much of the portfolio is exclusive. The terms are internal (the date the agreement ends is not for
//  the site), so they live in property_private/{id} (staff only), never on the public listing.
//  Pure: tests/unit/exclusivity.test.mjs
// =============================================================
import { liveListings } from './marketStats.js';

/** An agreement ending within this many days is «ينتهي قريبًا» (time to renew) */
export const EXCLUSIVE_SOON_DAYS = 14;

const DAY_MS = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' → that day's UTC midnight (ms), or NaN. Day keys avoid the time zone shifting a date. */
const dayMs = (key) => (DATE_RE.test(String(key || '')) ? Date.parse(`${key}T00:00:00Z`) : NaN);

/** Today's key in Cairo, which is the day the team means */
export const todayKey = (now = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/**
 * Where an agreement stands today.
 * entry: { exclusive, exclusiveFrom, exclusiveUntil } (the private doc's fields) or null.
 * → { status: 'none' | 'open' | 'active' | 'soon' | 'expired', daysLeft: number | null }
 *   open: exclusive with no end date written; expired: the end date has passed.
 */
export function exclusiveStatus(entry, today = todayKey()) {
  if (!entry || entry.exclusive !== true) return { status: 'none', daysLeft: null };
  const end = dayMs(entry.exclusiveUntil);
  if (Number.isNaN(end)) return { status: 'open', daysLeft: null };
  const daysLeft = Math.round((end - dayMs(today)) / DAY_MS);
  if (daysLeft < 0) return { status: 'expired', daysLeft };
  return { status: daysLeft <= EXCLUSIVE_SOON_DAYS ? 'soon' : 'active', daysLeft };
}

/** What a chip on the listing says */
export function exclusiveLabel(st, isAr = true) {
  if (!st || st.status === 'none') return '';
  if (st.status === 'open') return isAr ? 'حصري' : 'Exclusive';
  if (st.status === 'expired') return isAr ? 'الحصرية انتهت' : 'Exclusivity ended';
  if (st.daysLeft === 0) return isAr ? 'حصري · ينتهي النهارده' : 'Exclusive · ends today';
  return isAr ? `حصري · باقي ${st.daysLeft} يوم` : `Exclusive · ${st.daysLeft}d left`;
}

/**
 * The portfolio's picture: how many live listings, how many are exclusive (and what share), which agreements end soon,
 * and which already ended without a renewal. `entries` is a Map or object of property id → private fields.
 */
export function exclusiveSummary(properties = [], entries = new Map(), today = todayKey()) {
  const get = (id) => (entries instanceof Map ? entries.get(String(id)) : entries?.[String(id)]);
  const live = liveListings(properties);
  const rows = [];
  for (const p of live) {
    const entry = get(p.id);
    const st = exclusiveStatus(entry, today);
    if (st.status !== 'none') rows.push({ property: p, ...st, until: entry?.exclusiveUntil || '' });
  }
  const active = rows.filter((r) => r.status !== 'expired');
  return {
    live: live.length,
    exclusive: active.length,
    share: live.length ? Math.round((active.length / live.length) * 100) : 0,
    soon: rows.filter((r) => r.status === 'soon').sort((a, b) => a.daysLeft - b.daysLeft),
    expired: rows.filter((r) => r.status === 'expired').sort((a, b) => b.daysLeft - a.daysLeft),
    open: rows.filter((r) => r.status === 'open').length
  };
}

/** Is this the shape the rules accept: dates are 'YYYY-MM-DD' or empty, the end not before the start */
export function cleanExclusive({ exclusive, exclusiveFrom, exclusiveUntil } = {}) {
  const from = DATE_RE.test(String(exclusiveFrom || '')) ? exclusiveFrom : '';
  let until = DATE_RE.test(String(exclusiveUntil || '')) ? exclusiveUntil : '';
  if (from && until && until < from) until = '';
  return { exclusive: exclusive === true, exclusiveFrom: from, exclusiveUntil: until };
}

/** The alert thresholds, in days left: each agreement is announced once as it crosses each (14, 7, 3, and the day it ends) */
export const EXCLUSIVE_ALERT_DAYS = [14, 7, 3, 0];
/** An agreement that ended longer ago than this is no longer news */
export const EXCLUSIVE_ALERT_GRACE_DAYS = 7;

const bucketOf = (daysLeft) => (daysLeft <= 0 ? 0 : daysLeft <= 3 ? 3 : daysLeft <= 7 ? 7 : 14);

/**
 * Which agreements to tell the manager about today. `alerted` is { propertyId: lowest threshold already announced }.
 * → { fresh: [{ id, daysLeft, until }] (closest first), next: the new `alerted` map }.
 * An agreement is announced when it first drops under a threshold; one renewed far out is forgotten, so it can be
 * announced again next time. An open-ended agreement, or one that ended over a week ago, is never announced.
 */
export function exclusiveAlerts(entries = new Map(), alerted = {}, today = todayKey()) {
  const fresh = [];
  const next = {};
  const list = entries instanceof Map ? [...entries.entries()] : Object.entries(entries || {});
  for (const [id, entry] of list) {
    const st = exclusiveStatus(entry, today);
    if (st.status === 'none' || st.status === 'open' || st.status === 'active') continue;
    if (st.daysLeft < -EXCLUSIVE_ALERT_GRACE_DAYS) continue;
    const bucket = bucketOf(st.daysLeft);
    const before = alerted?.[id];
    next[id] = before === undefined ? bucket : Math.min(before, bucket);
    if (before === undefined || bucket < before) fresh.push({ id: String(id), daysLeft: st.daysLeft, until: entry.exclusiveUntil || '' });
  }
  fresh.sort((a, b) => a.daysLeft - b.daysLeft);
  return { fresh, next };
}

/** The manager's phone notification: { title, body, url }, or null when there is nothing to say. `titles`: { id: listing title } */
export function exclusiveAlertPayload(fresh = [], titles = {}) {
  if (!fresh.length) return null;
  const when = (d) => (d < 0 ? `انتهت من ${-d} يوم` : d === 0 ? 'بتنتهي النهارده' : `باقي ${d} يوم`);
  const name = (f) => String(titles[f.id] || 'عقار').slice(0, 50);
  const shown = fresh.slice(0, 3).map((f) => `${name(f)} (${when(f.daysLeft)})`).join('، ');
  return {
    title: fresh.length === 1 ? 'اتفاق حصري محتاج تجديد' : `${fresh.length} اتفاقات حصرية محتاجة تجديد`,
    body: `${shown}${fresh.length > 3 ? ` و${fresh.length - 3} غيرهم` : ''}`,
    url: '/crm?tab=properties'
  };
}
