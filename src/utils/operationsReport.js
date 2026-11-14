// =============================================================
//  «مركز التقارير» beyond sales: the property portfolio, buyer demands, and the expat / trade-in
//  requests. Each takes a range ({ from, to } day keys, reportPeriods.js) for "new in the period" and
//  looks at the whole list for the rest. Pure: tests/unit/operations-report.test.mjs
// =============================================================
import { toMs } from './crmLeadViews.js';
import { getNormalizedPropertyStatus } from './crmLeadViews.js';
import { listingIssues, ISSUES } from './listingReview.js';
import { LANDING_KINDS } from './seoLanding.js';
import { median } from './marketStats.js';
import { inRange } from './reportPeriods.js';

const DAY = 86_400_000;
const num = (v) => (typeof v === 'number' ? v : parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10) || 0);
const createdMs = (r) => toMs(r?.createdAt) || toMs(r?.timestamp);
const top = (counts, k = 5) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, k).map(([id, count]) => ({ id, count }));

/** Counts of a list in two ranges, as { cur, prev, change } */
const pair = (list, range, prevRange) => {
  const count = (r) => (r ? list.filter((x) => inRange(createdMs(x), r)).length : null);
  const cur = count(range);
  const prev = count(prevRange);
  return { cur, prev, change: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null };
};

/** The property portfolio: by status, by kind with the median price per m², by area, and what needs fixing */
export function portfolioReport(properties = [], { range, prevRange = null, now = Date.now(), areaNames = {}, staleDays = 60 } = {}) {
  const real = properties.filter((p) => p && !p.isDemo);
  const byStatus = { published: 0, under_negotiation: 0, sold: 0, hidden: 0, trash: 0 };
  for (const p of real) byStatus[getNormalizedPropertyStatus(p)] += 1;
  const live = real.filter((p) => getNormalizedPropertyStatus(p) === 'published');

  const kinds = LANDING_KINDS.map((kind) => {
    const list = live.filter((p) => kind.types.includes(p.type));
    const ppm = list.filter((p) => num(p.price) > 0 && num(p.size) > 0).map((p) => Math.round(num(p.price) / num(p.size)));
    return { slug: kind.slug, label: kind.the_ar, count: list.length, medianPpm: ppm.length >= 3 ? median(ppm) : 0, priced: ppm.length };
  }).filter((k) => k.count > 0).sort((a, b) => b.count - a.count);

  const areas = {};
  for (const p of live) areas[p.areaKey || '—'] = (areas[p.areaKey || '—'] || 0) + 1;

  const issueCounts = {};
  let incomplete = 0;
  for (const p of live) {
    const issues = listingIssues(p).filter((i) => i !== 'legacy');
    if (issues.length) incomplete += 1;
    for (const i of issues) issueCounts[i] = (issueCounts[i] || 0) + 1;
  }
  const stale = live.filter((p) => {
    const touched = toMs(p.updatedAt) || createdMs(p);
    return touched > 0 && now - touched > staleDays * DAY;
  }).length;

  return {
    total: real.length - byStatus.trash,
    byStatus,
    added: pair(real, range, prevRange),
    kinds,
    areas: top(areas).map((a) => ({ ...a, label: areaNames[a.id] || (a.id === '—' ? 'من غير منطقة' : a.id) })),
    incomplete,
    issues: top(issueCounts).map((i) => ({ ...i, label: ISSUES[i.id]?.ar || i.id })),
    stale
  };
}

/** Buyer demands: new in the period, by status, the budgets behind the published ones, and where they ask */
export function demandsReport(demands = [], { range, prevRange = null, areaNames = {} } = {}) {
  const status = (d) => d.status || 'published';
  const published = demands.filter((d) => status(d) === 'published');
  const areas = {};
  const types = {};
  for (const d of published) {
    const a = d.areaKey || d.area || '—';
    areas[a] = (areas[a] || 0) + 1;
    if (d.type) types[d.type] = (types[d.type] || 0) + 1;
  }
  const budgets = published.map((d) => num(d.budget)).filter((b) => b > 0);
  return {
    total: demands.length,
    pending: demands.filter((d) => status(d) === 'pending').length,
    published: published.length,
    archived: demands.filter((d) => status(d) === 'archived').length,
    added: pair(demands, range, prevRange),
    totalBudget: budgets.reduce((s, b) => s + b, 0),
    medianBudget: budgets.length >= 3 ? median(budgets) : 0,
    areas: top(areas).map((a) => ({ ...a, label: areaNames[a.id] || (a.id === '—' ? 'من غير منطقة' : a.id) })),
    types: top(types)
  };
}

const CLOSED = new Set(['closed', 'rejected']);
/** Expat inspections and trade-ins (each record carries `_kind`): new in the period, still open, and how long the open ones waited */
export function intakeReport(requests = [], { range, prevRange = null, now = Date.now() } = {}) {
  const row = (kind) => {
    const list = requests.filter((r) => r._kind === kind);
    const open = list.filter((r) => !CLOSED.has(r.status));
    const waits = open.map((r) => now - createdMs(r)).filter((w) => w > 0);
    return {
      kind,
      total: list.length,
      added: pair(list, range, prevRange),
      open: open.length,
      new: list.filter((r) => !r.status || r.status === 'new').length,
      oldestWaitDays: waits.length ? Math.floor(Math.max(...waits) / DAY) : 0
    };
  };
  return { expat: row('remote_inspections'), tradeIns: row('trade_ins') };
}
