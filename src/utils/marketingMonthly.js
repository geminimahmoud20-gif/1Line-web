// =============================================================
//  «التسويق بالشهر»: for each calendar month, what marketing cost and what it brought. The clients who
//  arrived that month (a cohort) are followed to how far they got since: qualified, a meeting / viewing,
//  a closed deal. Spend is the ad account's monthly spend (Meta, pulled) plus what was typed in for other
//  channels; the cost per client / qualified / viewing / deal is worked out over the clients from ads only,
//  since organic clients cost nothing. Pure: tests/unit/marketing-monthly.test.mjs
// =============================================================
import { isSellerLead, isAccountLead, leadCreatedMs, leadSourceKey } from './crmLeadViews.js';
import { reachedAny } from './stageHistory.js';

const QUALIFIED = ['contacted', 'site_visit', 'negotiating', 'closing', 'closed'];
const VISITED = ['site_visit', 'negotiating', 'closing', 'closed'];

/** 'YYYY-MM' of a time, in the viewer's local calendar */
export const monthKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** The last `count` month keys up to the month of `now`, newest first */
export function lastMonths(count = 6, now = Date.now()) {
  const d = new Date(now);
  return Array.from({ length: count }, (_, i) => monthKey(new Date(d.getFullYear(), d.getMonth() - i, 1).getTime()));
}

const ratio = (a, b) => (a && b ? Math.round(a / b) : 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/**
 * spendMonths: { 'YYYY-MM': { meta?: number, other?: number } }
 * Rows newest first: { month, spend, meta, other, leads, owners, buyers, accounts, ads, adOwners, adBuyers,
 *   qualified, visits, deals, adQualified, adVisits, adDeals, costPerLead, costPerQualified, costPerVisit,
 *   costPerDeal, qualifiedPct, visitPct } plus totals over the shown months.
 */
export function marketingMonthly(leads = [], spendMonths = {}, { months = 6, now = Date.now() } = {}) {
  const keys = lastMonths(months, now);
  const rows = Object.fromEntries(keys.map((m) => {
    const s = spendMonths?.[m] || {};
    const meta = Math.max(0, Math.round(Number(s.meta) || 0));
    const other = Math.max(0, Math.round(Number(s.other) || 0));
    return [m, { month: m, meta, other, spend: meta + other, leads: 0, owners: 0, buyers: 0, accounts: 0, ads: 0, adOwners: 0, adBuyers: 0, qualified: 0, visits: 0, deals: 0, adQualified: 0, adVisits: 0, adDeals: 0 }];
  }));

  for (const l of leads) {
    if (!l || l.isArchived) continue;
    const created = leadCreatedMs(l);
    if (!created) continue;
    const r = rows[monthKey(created)];
    if (!r) continue;
    const owner = isSellerLead(l);
    const account = !owner && isAccountLead(l);
    const fromAds = leadSourceKey(l) === 'ads';
    const q = reachedAny(l, QUALIFIED);
    const v = reachedAny(l, VISITED);
    const d = (l.status || 'new') === 'closed';
    r.leads += 1;
    if (owner) r.owners += 1; else if (account) r.accounts += 1; else r.buyers += 1;
    if (q) r.qualified += 1;
    if (v) r.visits += 1;
    if (d) r.deals += 1;
    if (fromAds) {
      r.ads += 1;
      if (owner) r.adOwners += 1; else if (!account) r.adBuyers += 1;
      if (q) r.adQualified += 1;
      if (v) r.adVisits += 1;
      if (d) r.adDeals += 1;
    }
  }

  const finish = (r) => ({
    ...r,
    costPerLead: ratio(r.spend, r.ads),
    costPerQualified: ratio(r.spend, r.adQualified),
    costPerVisit: ratio(r.spend, r.adVisits),
    costPerDeal: ratio(r.spend, r.adDeals),
    qualifiedPct: pct(r.qualified, r.leads),
    visitPct: pct(r.visits, r.leads),
  });
  const list = keys.map((m) => finish(rows[m]));
  const sum = (k) => list.reduce((n, r) => n + r[k], 0);
  const totals = finish(Object.fromEntries(['meta', 'other', 'spend', 'leads', 'owners', 'buyers', 'accounts', 'ads', 'adOwners', 'adBuyers', 'qualified', 'visits', 'deals', 'adQualified', 'adVisits', 'adDeals'].map((k) => [k, sum(k)])));
  return { rows: list, totals };
}
