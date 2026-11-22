// =============================================================
//  «المؤشرات»: the handful of numbers that say whether the business is healthy, each against a target with a
//  colour (green on target, amber close, red off). Speed (first reply on time), conversion (qualified,
//  viewing, win rate), flow (late in stage, untouched), capacity (load, unassigned) and marketing cost.
//  Built on the other reports so the numbers match them. Pure: tests/unit/kpi-scorecard.test.mjs
// =============================================================
import { leadCreatedMs, responseSlaMs, toMs } from './crmLeadViews.js';
import { reachedAny } from './stageHistory.js';
import { flowReport } from './flowReport.js';
import { orgReport } from './orgReport.js';
import { marketingMonthly } from './marketingMonthly.js';

const DAY = 86400000;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

/**
 * Targets: `good` is on target, `ok` is the amber line; `higher` says which way is better.
 * Defaults for a young brokerage; a target can be changed here in one place.
 */
export const KPI_TARGETS = {
  replyOnTime: { good: 80, ok: 60, higher: true },
  qualifiedPct: { good: 40, ok: 25, higher: true },
  visitPct: { good: 15, ok: 8, higher: true },
  winRate: { good: 20, ok: 10, higher: true },
  latePct: { good: 15, ok: 30, higher: false },
  idlePct: { good: 10, ok: 25, higher: false },
  loadPct: { good: 85, ok: 100, higher: false },
  unassigned: { good: 0, ok: 3, higher: false },
  costPerQualified: null, // no default: set it once the first months show what a qualified client costs
};

/** 'good' | 'ok' | 'bad' | 'none' (no value, or no target) */
export function colourOf(value, target) {
  if (value === null || value === undefined || !target) return 'none';
  if (target.higher) return value >= target.good ? 'good' : value >= target.ok ? 'ok' : 'bad';
  return value <= target.good ? 'good' : value <= target.ok ? 'ok' : 'bad';
}

/**
 * { items: [{ id, group, value, unit, target, colour, note }], counts: { good, ok, bad } }
 * Conversion and reply speed look at clients who arrived in the last `days` days (30 by default).
 */
export function kpiScorecard(leads = [], { members = [], access = {}, capacity = {}, spend = {}, days = 30, now = Date.now(), targets = KPI_TARGETS } = {}) {
  const from = now - days * DAY;
  const recent = leads.filter((l) => l && !l.isArchived && leadCreatedMs(l) >= from && leadCreatedMs(l) <= now);

  // First reply within the promise (15 minutes for an ad client, 2 hours otherwise); a client still waiting past it counts as late
  let onTime = 0; let judged = 0;
  for (const l of recent) {
    const created = leadCreatedMs(l);
    const first = toMs(l.firstContactedAt) || toMs(l.lastContactedAt);
    const limit = responseSlaMs(l);
    if (first) { judged += 1; if (first - created <= limit) onTime += 1; } else if (now - created > limit) judged += 1;
  }
  const qualified = recent.filter((l) => reachedAny(l, ['contacted', 'site_visit', 'negotiating', 'closing', 'closed'])).length;
  const visited = recent.filter((l) => reachedAny(l, ['site_visit', 'negotiating', 'closing', 'closed'])).length;
  const decided = leads.filter((l) => l && !l.isArchived && ['closed', 'lost'].includes(l.status) && (toMs(l.updatedAt) || leadCreatedMs(l)) >= now - 90 * DAY);
  const won = decided.filter((l) => l.status === 'closed').length;

  const flow = flowReport(leads, { now });
  const org = members.length ? orgReport(leads, members, access, capacity, { now }) : null;
  const month = marketingMonthly(leads, spend, { months: 1, now }).rows[0];

  const raw = [
    { id: 'replyOnTime', group: 'speed', value: pct(onTime, judged), unit: '%', note: `${onTime} من ${judged} اترد عليهم في الوقت` },
    { id: 'qualifiedPct', group: 'conversion', value: pct(qualified, recent.length), unit: '%', note: `${qualified} من ${recent.length} عميل وصل آخر ${days} يوم` },
    { id: 'visitPct', group: 'conversion', value: pct(visited, recent.length), unit: '%', note: `${visited} وصلوا لاجتماع أو معاينة` },
    { id: 'winRate', group: 'conversion', value: pct(won, decided.length), unit: '%', note: `${won} صفقة من ${decided.length} اتحسموا آخر 90 يوم` },
    { id: 'latePct', group: 'flow', value: flow.totals.open ? flow.totals.latePct : null, unit: '%', note: `${flow.totals.late} من ${flow.totals.open} عميل مفتوح` },
    { id: 'idlePct', group: 'flow', value: pct(flow.totals.idle, flow.totals.open), unit: '%', note: `${flow.totals.idle} عميل من غير لمسة 48 ساعة` },
    { id: 'loadPct', group: 'capacity', value: org && org.totals.capacity ? org.totals.pct : null, unit: '%', note: org ? `${org.totals.open} عميل من سعة ${org.totals.capacity}` : 'قايمة الفريق مش متاحة' },
    { id: 'unassigned', group: 'capacity', value: flow.owners.find((o) => o.id === '—')?.open ?? 0, unit: '', note: 'عملاء مفتوحين من غير مسؤول' },
    { id: 'costPerQualified', group: 'marketing', value: month && month.spend && month.adQualified ? month.costPerQualified : null, unit: 'ج', note: month && month.spend ? `صرف الشهر ${month.spend.toLocaleString('en-US')} ج · ${month.adQualified} مؤهل من الإعلانات` : 'صرف الشهر مش متسجّل' },
  ];
  const items = raw.map((k) => ({ ...k, target: targets[k.id] || null, colour: colourOf(k.value, targets[k.id]) }));
  const counts = items.reduce((c, k) => ({ ...c, [k.colour]: (c[k.colour] || 0) + 1 }), { good: 0, ok: 0, bad: 0, none: 0 });
  return { items, counts };
}
