// =============================================================
//  What the dashboard's charts and trend figures show: the last `days` days against the `days` before,
//  a daily series for the sparklines, the funnel and the sources of the clients who arrived in that
//  window, and the sellers' league. It only gathers what utils/performanceReport already computes for the
//  reports (one source of numbers), for a desk agent only their own desk. Pure: tests/unit/dashboard-view.test.mjs
// =============================================================
import { periodMetrics, compareMetrics, dailySeries, cohortReports, sellerPerformance, STAGE_LABELS } from './performanceReport.js';
import { addDays, dayOf } from './reportPeriods.js';
import { LEAD_SOURCES } from './crmLeadViews.js';

/** Fewer arrivals than this and a funnel or a source split says nothing (the charts say so instead of drawing it) */
export const MIN_FOR_CHARTS = 5;
export const MAX_SOURCE_SLICES = 4;

const sourceName = (id, fallback, isAr) => {
  const s = LEAD_SOURCES.find((x) => x.id === id);
  return s ? (isAr ? s.ar : s.en) : fallback || id;
};

/** The first `MAX_SOURCE_SLICES` sources by clients, the rest as one «أخرى» slice; each with its share */
export function sourceSlices(sources = [], isAr = true) {
  const total = sources.reduce((s, r) => s + r.leads, 0);
  if (!total) return [];
  const sorted = [...sources].sort((a, b) => b.leads - a.leads);
  const head = sorted.slice(0, MAX_SOURCE_SLICES).map((r) => ({ id: r.id, label: sourceName(r.id, r.label, isAr), value: r.leads }));
  const rest = sorted.slice(MAX_SOURCE_SLICES).reduce((s, r) => s + r.leads, 0);
  const slices = rest > 0 ? [...head, { id: 'other', label: isAr ? 'أخرى' : 'Other', value: rest }] : head;
  return slices.map((s) => ({ ...s, pct: Math.round((s.value / total) * 100) }));
}

/**
 * @param leads  the clients loaded in the CRM
 * @param opts   { now, scopeDesk (a desk agent sees only their desk), days (window, default 30), trendDays (default 14), isAr }
 */
export function dashboardView(allLeads = [], { now = Date.now(), scopeDesk = null, days = 30, trendDays = 14, isAr = true } = {}) {
  const leads = scopeDesk ? allLeads.filter((l) => l && l.assignedTo === scopeDesk) : allLeads.filter(Boolean);
  const today = dayOf(now);
  const range = { from: addDays(today, -(days - 1)), to: today };
  const prevRange = { from: addDays(range.from, -days), to: addDays(range.from, -1) };

  const cur = periodMetrics(leads, [], range);
  const prev = periodMetrics(leads, [], prevRange);
  const cmp = compareMetrics(cur, prev);

  const series = dailySeries(leads, { from: addDays(today, -(trendDays - 1)), to: today }).buckets;
  const cohort = cohortReports(leads, range);
  const funnelRows = cohort.funnel.rows.map((r) => ({
    id: r.id,
    label: (STAGE_LABELS[r.id] || {})[isAr ? 'ar' : 'en'] || r.id,
    value: r.reached,
    ofAll: r.ofAll,
    ofPrevious: r.ofPrevious
  }));
  const sellers = scopeDesk ? [] : sellerPerformance(leads, [], range, now).filter((s) => s.leads || s.closed).slice(0, 5);

  return {
    range,
    days,
    metrics: cur,
    change: cmp,
    series,
    trend: { newLeads: series.map((b) => b.newLeads), closed: series.map((b) => b.closed) },
    funnel: { rows: funnelRows, total: cohort.funnel.total, lost: cohort.funnel.lost },
    sources: sourceSlices(cohort.sources, isAr),
    sellers,
    enough: cohort.funnel.total >= MIN_FOR_CHARTS
  };
}
