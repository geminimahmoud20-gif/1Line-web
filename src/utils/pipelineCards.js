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
  if (lead?.lastContactedAt || lead?.lastOutcome || (Array.isArray(lead?.outcomes) && lead.outcomes.length > 0)) return false;
  const c = createdMs(lead);
  return Number.isFinite(c) && now - c > DAY;
}

/** Crisp relative time: "الآن" · "من 5 د" · "من ساعتين" · "النهارده" · "من 3 أيام" */
export function relativeTimeLabel(time, now = Date.now(), isAr = true) {
  const ms = typeof time === 'number' ? time : new Date(time).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const diff = Math.max(0, now - ms);
  const m = Math.floor(diff / 60000);
  if (m < 1) return isAr ? 'الآن' : 'just now';
  if (m < 60) return isAr ? `من ${m} د` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isAr ? (h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${h} س`) : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return isAr ? 'أمس' : 'yesterday';
  if (d === 2) return isAr ? 'من يومين' : '2d ago';
  if (d <= 10) return isAr ? `من ${d} أيام` : `${d}d ago`;
  return isAr ? `من ${d} يوم` : `${d}d ago`;
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

/** "1.4 مليار" · "12.5 مليون" · "850 ألف" */
export function shortMoney(n, isAr = true) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) {
    const b = Math.round((v / 1_000_000_000) * 10) / 10;
    return isAr ? `${b} مليار` : `${b}B`;
  }
  if (v >= 1_000_000) {
    const m = Math.round((v / 1_000_000) * 10) / 10;
    return isAr ? `${m} مليون` : `${m}M`;
  }
  const k = Math.round(v / 1000);
  return isAr ? `${k} ألف` : `${k}K`;
}

/**
 * A money total as a KpiTile {value, unit} pair, switching from مليون to مليار at 1000 مليون
 * (1e9) so a KPI never shows "1,444.9 مليون" when "1.4 مليار" reads at a glance.
 */
export function moneyScale(n, isAr = true) {
  const v = Number(n) || 0;
  const billions = v >= 1_000_000_000;
  return {
    value: v > 0 ? v / (billions ? 1_000_000_000 : 1_000_000) : null,
    unit: isAr ? (billions ? 'مليار ج.م' : 'مليون ج.م') : (billions ? 'B EGP' : 'M EGP')
  };
}
