// =============================================================
//  «ضياع العملاء»: the clients lost in a period: why, at which stage, with whom, from which source, how
//  much commission walked away, and which ones were close (lost after a viewing or later) and worth a
//  second try. Pure: tests/unit/lost-report.test.mjs
// =============================================================
import { leadCreatedMs, leadSourceKey, LEAD_SOURCES, LOST_REASONS } from './crmLeadViews.js';
import { leadCommission } from './commission.js';
import { enteredAt, ORDER } from './performanceReport.js';
import { inRange } from './reportPeriods.js';
import { reachedAny } from './stageHistory.js';

const DAY = 86_400_000;
const CLOSE_STAGES = ['site_visit', 'negotiating', 'closing'];

/** The stage the client was in just before being lost (new when the history says nothing) */
export function stageBeforeLoss(lead) {
  const history = (Array.isArray(lead?.stageHistory) ? lead.stageHistory : []).filter((e) => e && e.s && e.at);
  const i = history.findIndex((e) => e.s === 'lost');
  const before = (i > 0 ? history.slice(0, i) : history).filter((e) => ORDER.includes(e.s)).pop();
  if (before) return before.s;
  return lead?.firstContactedAt ? 'contacted' : 'new';
}

const reasonLabel = (id) => LOST_REASONS.find((r) => r.id === id)?.ar || 'سبب آخر';
const count = (list, keyOf) => {
  const out = {};
  for (const x of list) out[keyOf(x)] = (out[keyOf(x)] || 0) + 1;
  return out;
};
const sorted = (counts, labelOf) => Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, label: labelOf(id), count: n }));

/** The clients now lost whose loss fell in the range (the day of the loss, from the history or lostAt) */
export const lostIn = (leads = [], range) => leads.filter((l) => l && !l.isArchived && l.status === 'lost' && inRange(enteredAt(l, ['lost']), range));

/**
 * { total, prevTotal, change, valueLost, close, reasons, stages, sellers, sources, top }.
 * `close`: lost after a viewing or later; `top`: the biggest losses (commission), up to ten.
 */
export function lostReport(leads = [], { range, prevRange = null } = {}) {
  const list = lostIn(leads, range);
  const prevTotal = prevRange ? lostIn(leads, prevRange).length : null;
  const closeOnes = list.filter((l) => reachedAny(l, CLOSE_STAGES));
  const sellers = {};
  for (const l of list) {
    const key = l.ownerUid || l.ownerName || '—';
    const s = sellers[key] || { id: key, label: l.ownerName || 'من غير مسؤول', count: 0, close: 0, commission: 0 };
    s.count += 1;
    if (reachedAny(l, CLOSE_STAGES)) s.close += 1;
    s.commission += leadCommission(l).gross;
    sellers[key] = s;
  }
  return {
    total: list.length,
    prevTotal,
    change: prevTotal > 0 ? Math.round(((list.length - prevTotal) / prevTotal) * 100) : null,
    valueLost: list.reduce((s, l) => s + leadCommission(l).gross, 0),
    close: closeOnes.length,
    daysToLose: list.length ? Math.round(list.reduce((s, l) => s + Math.max(0, (enteredAt(l, ['lost']) - leadCreatedMs(l)) / DAY), 0) / list.length) : 0,
    reasons: sorted(count(list, (l) => l.lostReason || 'other'), reasonLabel),
    stages: sorted(count(list, stageBeforeLoss), (id) => id),
    sellers: Object.values(sellers).sort((a, b) => b.count - a.count),
    sources: sorted(count(list, leadSourceKey), (id) => LEAD_SOURCES.find((s) => s.id === id)?.ar || id),
    top: [...list]
      .map((l) => ({ lead: l, reason: l.lostReason || 'other', stage: stageBeforeLoss(l), commission: leadCommission(l).gross, close: reachedAny(l, CLOSE_STAGES) }))
      .sort((a, b) => Number(b.close) - Number(a.close) || b.commission - a.commission)
      .slice(0, 10)
  };
}
