// =============================================================
//  «تقرير الحملات»: per ad campaign (utm_campaign) or per ad (utm_content), how many leads came,
//  how far they got, and what each cost. Pure, so tests/unit/campaign-report.test.mjs runs it.
//  A lead "reached a visit" when it is in site_visit or later, or its stage history shows it ever was
//  (so a client lost after a visit still counts as a visit, and avgDaysToVisit can be worked out).
// =============================================================
import { leadCampaign, leadCreatedMs } from './crmLeadViews.js';
import { CAMPAIGN_TYPES, campaignTypeOf } from './utmLinks.js';
import { reachedAny, msToReach, avgDays } from './stageHistory.js';
import { leadCommission } from './commission.js';

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
export function campaignReport(leads = [], { by = 'campaign', days = 0, now = Date.now(), spend = {}, taps = [] } = {}) {
  const since = days > 0 ? now - days * 86400000 : 0;
  const rows = new Map();
  for (const l of leads) {
    const c = leadCampaign(l);
    if (!c) continue;
    if (since && leadCreatedMs(l) < since) continue;
    const ad = by === 'ad' ? (c.ad || '—') : '';
    const key = spendKey(c.campaign, ad === '—' ? '' : ad) + (by === 'ad' && ad === '—' ? '::—' : '');
    const row = rows.get(key) || { key, campaign: c.campaign, ad, source: c.source, contacts: 0, leads: 0, contacted: 0, visits: 0, closed: 0, lost: 0, toVisit: [], reasons: {}, wonCommission: 0, expectedCommission: 0 };
    row.leads += 1;
    if (reachedAny(l, CONTACTED)) row.contacted += 1;
    if (reachedAny(l, VISITED)) { row.visits += 1; row.toVisit.push(msToReach(l, VISITED)); }
    if (reachedAny(l, ['closed'])) row.closed += 1;
    // What the client's deal pays: the whole commission once closed, the stage-weighted part while open
    if (l.status === 'closed') row.wonCommission += leadCommission(l).gross;
    else if (l.status !== 'lost') row.expectedCommission += leadCommission(l).weighted;
    if (l.status === 'lost') { row.lost += 1; const why = l.lostReason || 'other'; row.reasons[why] = (row.reasons[why] || 0) + 1; }
    rows.set(key, row);
  }
  // Taps on WhatsApp or a phone number that came from an ad (contact_intents): the people who went straight to
  // a chat or a call without a form. Counted per campaign (or ad) like the leads; a campaign with taps and
  // no lead still gets its row.
  for (const t of taps) {
    const campaign = String(t?.campaign || '').trim();
    if (!campaign) continue;
    if (since && Number(t.at) < since) continue;
    const content = by === 'ad' ? String(t.content || '').trim() : '';
    const ad = by === 'ad' ? (content || '—') : '';
    const key = spendKey(campaign, content) + (by === 'ad' && !content ? '::—' : '');
    const row = rows.get(key) || { key, campaign, ad, source: String(t.source || ''), contacts: 0, leads: 0, contacted: 0, visits: 0, closed: 0, lost: 0, toVisit: [], reasons: {}, wonCommission: 0, expectedCommission: 0 };
    row.contacts += 1;
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
        // commission won for every pound spent (1.5 = 1.5 EGP back per 1 EGP), once a spend is entered
        returnPerEgp: cost && r.wonCommission ? Math.round((r.wonCommission / cost) * 100) / 100 : 0,
        visitRate: r.leads ? Math.round((r.visits / r.leads) * 100) : 0
      };
    })
    .sort((a, b) => b.visits - a.visits || b.leads - a.leads || b.contacts - a.contacts);
}

/** Totals row for the same rows */
export function campaignTotals(rows = []) {
  const t = rows.reduce((s, r) => ({ contacts: s.contacts + (r.contacts || 0), leads: s.leads + r.leads, contacted: s.contacted + r.contacted, visits: s.visits + r.visits, closed: s.closed + r.closed, spend: s.spend + r.spend, wonCommission: s.wonCommission + (r.wonCommission || 0), expectedCommission: s.expectedCommission + (r.expectedCommission || 0) }), { contacts: 0, leads: 0, contacted: 0, visits: 0, closed: 0, spend: 0, wonCommission: 0, expectedCommission: 0 });
  return { ...t, costPerLead: t.spend && t.leads ? Math.round(t.spend / t.leads) : 0, costPerVisit: t.spend && t.visits ? Math.round(t.spend / t.visits) : 0, returnPerEgp: t.spend && t.wonCommission ? Math.round((t.wonCommission / t.spend) * 100) / 100 : 0 };
}

/**
 * The report's rows added up per kind of ad (buyers, owners, ai, unit, then the rest), only the kinds that have
 * a lead or spend: [{ type, label, campaigns, ...totals }]. Rows are by campaign (not by ad).
 */
export function typeSummary(rows = []) {
  const groups = new Map();
  for (const r of rows) {
    const t = campaignTypeOf(r.campaign);
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(r);
  }
  const labels = Object.fromEntries(CAMPAIGN_TYPES.map((t) => [t.id, t.ar]));
  labels.other = 'أخرى';
  return [...CAMPAIGN_TYPES.map((t) => t.id), 'other']
    .filter((id) => groups.has(id))
    .map((id) => ({ type: id, label: labels[id], campaigns: groups.get(id).length, ...campaignTotals(groups.get(id)) }))
    .filter((g) => g.leads > 0 || g.spend > 0);
}
