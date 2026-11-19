// =============================================================
//  «القمع والفلوس»: the money side of the funnel in one place. What the ads cost, what they brought (leads, viewings,
//  deals), what a deal cost, what the won deals paid and what is still likely to come. Built from the pieces the CRM
//  already has (campaignReport for the ads, commissionForecast for the pipeline, the stage history for the steps), so the
//  numbers match the other reports. Everything is «من البداية»: the spend is entered per campaign, not per day, so a
//  date range would put this month's leads against all the spend. Pure: tests/unit/money-report.test.mjs
// =============================================================
import { campaignReport, campaignTotals } from './campaignReport.js';
import { commissionForecast } from './commission.js';
import { reachedAny } from './stageHistory.js';
import { ORDER, STAGE_LABELS } from './performanceReport.js';

/** The fewest clients a step needs behind it before its drop-off means anything */
export const MIN_SAMPLE = 10;

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * How far every client gets (all sources, not archived) and which step loses the most of them.
 * steps: [{ id, reached, ofPrevious }]; weakest: { from, to, rate, lost } or null while there is too little data.
 */
export function funnelSteps(leads = []) {
  const list = leads.filter((l) => l && !l.isArchived);
  const steps = ORDER.map((id, i) => ({ id, reached: i === 0 ? list.length : list.filter((l) => reachedAny(l, ORDER.slice(i))).length }))
    .map((s, i, all) => ({ ...s, ofPrevious: i === 0 ? 100 : pct(s.reached, all[i - 1].reached) }));
  let weakest = null;
  for (let i = 1; i < steps.length; i += 1) {
    const prev = steps[i - 1];
    if (prev.reached < MIN_SAMPLE) continue;
    if (!weakest || steps[i].ofPrevious < weakest.rate) {
      weakest = { from: prev.id, to: steps[i].id, rate: steps[i].ofPrevious, lost: prev.reached - steps[i].reached, of: prev.reached };
    }
  }
  return { total: list.length, steps, weakest };
}

/**
 * @param {object[]} leads
 * @param {{ spend?: Record<string, number>, now?: number }} opts  spend: EGP per campaign key (campaign_spend/all)
 */
export function moneyReport(leads = [], { spend = {}, now = Date.now() } = {}) {
  const rows = campaignReport(leads, { by: 'campaign', days: 0, spend }).filter((r) => r.leads > 0 || r.spend > 0);
  const t = campaignTotals(rows);
  const hasSpend = t.spend > 0;
  const ads = {
    hasSpend,
    spend: t.spend,
    leads: t.leads,
    visits: t.visits,
    closed: t.closed,
    costPerLead: t.costPerLead,
    costPerVisit: t.costPerVisit,
    costPerDeal: hasSpend && t.closed ? Math.round(t.spend / t.closed) : 0,
    wonCommission: t.wonCommission,
    // Commission won minus what the ads cost; the sign matters, so it is not floored at zero
    profit: hasSpend ? t.wonCommission - t.spend : 0,
    returnPerEgp: t.returnPerEgp
  };

  // Campaigns with spend: the ones paying back best, and the ones that spent money and brought nobody to a viewing
  const spent = rows.filter((r) => r.spend > 0);
  const best = spent.filter((r) => r.returnPerEgp > 0).sort((a, b) => b.returnPerEgp - a.returnPerEgp).slice(0, 3);
  const bleeding = spent.filter((r) => r.visits === 0 && r.leads >= 3).sort((a, b) => b.spend - a.spend).slice(0, 3);

  return {
    ads,
    campaigns: { best, bleeding, withSpend: spent.length, withoutSpend: rows.filter((r) => !(r.spend > 0) && r.leads > 0).length },
    funnel: funnelSteps(leads),
    forecast: commissionForecast(leads, { now }),
    stageLabel: (id, isAr = true) => (STAGE_LABELS[id] ? (isAr ? STAGE_LABELS[id].ar : STAGE_LABELS[id].en) : id)
  };
}
