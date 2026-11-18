// Pipeline (KanbanPipeline) card facts: how long a deal has sat in its stage, when that is too
// long, whether a new request waited a day without a call, and short money labels.
// Pure helpers, unit-tested in tests/unit/pipeline-cards.test.mjs.

const DAY = 24 * 60 * 60 * 1000;

export function toMs(v) {
  if (!v) return NaN;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return new Date(v).getTime();
}

/** When the request came in (staff-added and imported leads carry only createdAt) */
export const createdMs = (lead) => {
  const c = toMs(lead?.createdAt);
  return Number.isFinite(c) ? c : toMs(lead?.timestamp);
};

/** When the deal entered its current stage; falls back to when it came in */
export function stageSinceMs(lead) {
  for (const v of [lead?.statusUpdatedAt, lead?.lastStatusUpdate]) {
    const t = toMs(v);
    if (Number.isFinite(t)) return t;
  }
  return createdMs(lead);
}

/** Days a deal may sit in a stage before the card says it is stalled (none for won deals) */
export const STALE_DAYS = { contacted: 7, site_visit: 7, negotiating: 10, closing: 14 };

export function isStalled(lead, now = Date.now()) {
  const limit = STALE_DAYS[lead?.status || 'new'];
  const since = stageSinceMs(lead);
  return Boolean(limit) && Number.isFinite(since) && now - since > limit * DAY;
}

/** A new request nobody called within 24 hours */
export function isNewOverdue(lead, now = Date.now()) {
  if ((lead?.status || 'new') !== 'new') return false;
  const c = createdMs(lead);
  return Number.isFinite(c) && now - c > DAY;
}

/** "النهارده" · "من يوم" · "من يومين" · "من 5 أيام" · "من 17 يوم" */
export function daysLabel(ms, isAr = true) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const d = Math.floor(ms / DAY);
  if (!isAr) return d === 0 ? 'today' : `${d}d`;
  if (d === 0) return 'النهارده';
  if (d === 1) return 'من يوم';
  if (d === 2) return 'من يومين';
  return `من ${d} ${d <= 10 ? 'أيام' : 'يوم'}`;
}

/** "12.5 مليون" · "850 ألف" */
export function shortMoney(n, isAr = true) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) {
    const m = Math.round((v / 1_000_000) * 10) / 10;
    return isAr ? `${m} مليون` : `${m}M`;
  }
  const k = Math.round(v / 1000);
  return isAr ? `${k} ألف` : `${k}K`;
}
