// =============================================================
//  Brokerage commission figures for the CRM: per lead, the stage-weighted forecast for the pipeline,
//  and what was won this month. Pure (tests/unit/commission.test.mjs).
//
//  Deal value: a value the team typed on the lead, else the owner's asking price, else the budget.
//  Rate: the lead's own commissionPct when set, else the side's rate (utils/commissionRates.js):
//  2.5% for an owner (seller), 1.5% for a buyer. A client who only opened an account counts as a buyer.
//  On top of it the legal review fee (500 EGP per million) from the same side; gross = both.
// =============================================================
import { parseMoney, isSellerLead } from './crmLeadViews.js';
import { BUYER_COMMISSION_PCT, SELLER_COMMISSION_PCT, LEGAL_FEE_PER_MILLION, legalFee } from './commissionRates.js';

export { BUYER_COMMISSION_PCT, SELLER_COMMISSION_PCT, LEGAL_FEE_PER_MILLION, legalFee };

/** The side's rate when the lead has none of its own: owner 2.5%, buyer 1.5% */
export const defaultPctFor = (l) => (isSellerLead(l || {}) ? SELLER_COMMISSION_PCT : BUYER_COMMISSION_PCT);

// How likely a deal at each stage is to close; the weighted forecast uses these
export const STAGE_PROBABILITY = { new: 0.05, contacted: 0.15, site_visit: 0.3, negotiating: 0.5, closing: 0.8, closed: 1, lost: 0 };

export const dealValue = (l) => parseMoney(l?.dealValue)
  || parseMoney(l?.details?.askingPrice)
  || parseMoney(l?.budget)
  || parseMoney(l?.details?.budget)
  || parseMoney(l?.details?.expectedPrice);

export const commissionPct = (l, fallback = defaultPctFor(l)) => {
  const own = Number(l?.commissionPct);
  return own > 0 && own <= 20 ? own : fallback;
};

/** { value, pct, commission, legal, gross (commission + legal, if it closes), probability, weighted } */
export function leadCommission(l, fallback = defaultPctFor(l)) {
  const value = dealValue(l);
  const pct = commissionPct(l, fallback);
  const commission = Math.round(value * (pct / 100));
  const legal = legalFee(value);
  const gross = commission + legal;
  const probability = STAGE_PROBABILITY[l?.status || 'new'] ?? 0;
  return { value, pct, commission, legal, gross, probability, weighted: Math.round(gross * probability) };
}

const OPEN = ['new', 'contacted', 'site_visit', 'negotiating', 'closing'];
/**
 * When a won deal was closed (ms): the stage history first, then the close date, then the last stage change.
 * Never «updatedAt»: any later edit of an old deal would move it into this month's commission.
 */
export function closedMs(l) {
  const hist = (Array.isArray(l?.stageHistory) ? l.stageHistory : []).filter((e) => e && e.s === 'closed' && e.at);
  const stamp = hist.length ? hist[hist.length - 1].at : (l?.closedAt || l?.statusUpdatedAt || l?.lastStatusUpdate || '');
  const ms = typeof stamp === 'number' ? stamp : Date.parse(stamp);
  return Number.isFinite(ms) ? ms : 0;
}

const sameMonth = (iso, now) => {
  const d = new Date(iso);
  const n = new Date(now);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
};

/** Open pipeline (gross if all close, weighted by stage) and commission on deals won this month */
export function commissionForecast(leads = [], { now = Date.now(), fallback } = {}) {
  let gross = 0;
  let weighted = 0;
  let late = 0; // negotiating + closing: the near-term part
  let wonThisMonth = 0;
  let wonCount = 0;
  let missingValue = 0;
  let valued = 0; // open deals that carry a value (what the forecast adds up)
  for (const l of leads) {
    if (!l || l.isArchived) continue;
    const st = l.status || 'new';
    const c = fallback ? leadCommission(l, fallback) : leadCommission(l);
    if (OPEN.includes(st)) {
      if (!c.value) { missingValue += 1; continue; }
      valued += 1;
      gross += c.gross;
      weighted += c.weighted;
      if (st === 'negotiating' || st === 'closing') late += c.gross;
    } else if (st === 'closed' && closedMs(l) && sameMonth(closedMs(l), now)) {
      wonThisMonth += c.gross;
      wonCount += 1;
    }
  }
  return { gross, weighted, late, wonThisMonth, wonCount, missingValue, valued };
}
