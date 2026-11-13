// =============================================================
//  «تقرير الحملات»: per ad campaign (utm_campaign) or per ad (utm_content), how many leads came,
//  how far they got, and what each cost. Pure, so tests/unit/campaign-report.test.mjs runs it.
//  A lead "reached a visit" when it is in site_visit or later, or its stage history shows it ever was
//  (so a client lost after a visit still counts as a visit, and avgDaysToVisit can be worked out).
// =============================================================
import { leadCampaign, leadCreatedMs } from './crmLeadViews.js';
import { reachedAny, msToReach, avgDays } from './stageHistory.js';

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
    const row = rows.get(key) || { key, campaign: c.campaign, ad, source: c.source, leads: 0, contacted: 0, visits: 0, closed: 0, lost: 0, toVisit: [], reasons: {} };
    row.leads += 1;
    if (reachedAny(l, CONTACTED)) row.contacted += 1;
    if (reachedAny(l, VISITED)) { row.visits += 1; row.toVisit.push(msToReach(l, VISITED)); }
    if (reachedAny(l, ['closed'])) row.closed += 1;
    if (l.status === 'lost') { row.lost += 1; const why = l.lostReason || 'other'; row.reasons[why] = (row.reasons[why] || 0) + 1; }
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((r) => {
      const cost = Number(spend[r.key]) || 0;
      const { toVisit, reasons, ...rest } = r;
      // The reason most lost clients gave (ties: the one that came first), with how many
      const top = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
      return {
        ...rest,
        topLostReason: top ? { id: top[0], count: top[1] } : null,
        avgDaysToVisit: avgDays(toVisit),
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
