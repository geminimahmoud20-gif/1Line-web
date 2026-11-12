// =============================================================
//  «تقرير الحملات»: per ad campaign (utm_campaign) or per ad (utm_content), how many leads came,
//  how far they got, and what each cost. Pure, so tests/unit/campaign-report.test.mjs runs it.
//  A lead "reached a visit" when its status is site_visit or later (or it closed).
// =============================================================
import { leadCampaign, leadCreatedMs } from './crmLeadViews.js';

const VISITED = new Set(['site_visit', 'negotiating', 'closing', 'closed']);
const CONTACTED = new Set(['contacted', ...VISITED]);

export const PERIODS = [
  { id: '7', days: 7, ar: 'آخر ٧ أيام', en: 'Last 7 days' },
  { id: '30', days: 30, ar: 'آخر ٣٠ يوم', en: 'Last 30 days' },
  { id: 'all', days: 0, ar: 'من البداية', en: 'All time' }
];

/** Key under which a campaign's spend is stored */
export const spendKey = (campaign, ad = '') => (ad ? `${campaign}::${ad}` : campaign);

/**
 * Rows for the report, best first.
 * @param {object[]} leads
 * @param {{by?: 'campaign'|'ad', days?: number, now?: number, spend?: Record<string, number>}} opts
 */
export function campaignReport(leads = [], { by = 'campaign', days = 0, now = Date.now(), spend = {} } = {}) {
  const since = days > 0 ? now - days * 86400000 : 0;
  const rows = new Map();
  for (const l of leads) {
    const c = leadCampaign(l);
    if (!c) continue;
    if (since && leadCreatedMs(l) < since) continue;
    const ad = by === 'ad' ? (c.ad || '—') : '';
    const key = spendKey(c.campaign, ad === '—' ? '' : ad) + (by === 'ad' && ad === '—' ? '::—' : '');
    const row = rows.get(key) || { key, campaign: c.campaign, ad, source: c.source, leads: 0, contacted: 0, visits: 0, closed: 0, lost: 0 };
    row.leads += 1;
    if (CONTACTED.has(l.status)) row.contacted += 1;
    if (VISITED.has(l.status)) row.visits += 1;
    if (l.status === 'closed') row.closed += 1;
    if (l.status === 'lost') row.lost += 1;
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((r) => {
      const cost = Number(spend[r.key]) || 0;
      return {
        ...r,
        spend: cost,
        costPerLead: cost && r.leads ? Math.round(cost / r.leads) : 0,
        costPerVisit: cost && r.visits ? Math.round(cost / r.visits) : 0,
        visitRate: r.leads ? Math.round((r.visits / r.leads) * 100) : 0
      };
    })
    .sort((a, b) => b.visits - a.visits || b.leads - a.leads);
}

/** Totals row for the same rows */
export function campaignTotals(rows = []) {
  const t = rows.reduce((s, r) => ({ leads: s.leads + r.leads, contacted: s.contacted + r.contacted, visits: s.visits + r.visits, closed: s.closed + r.closed, spend: s.spend + r.spend }), { leads: 0, contacted: 0, visits: 0, closed: 0, spend: 0 });
  return { ...t, costPerLead: t.spend && t.leads ? Math.round(t.spend / t.leads) : 0, costPerVisit: t.spend && t.visits ? Math.round(t.spend / t.visits) : 0 };
}
