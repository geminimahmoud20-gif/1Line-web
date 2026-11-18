// =============================================================
//  Brokerage commission figures for the CRM: per lead, the stage-weighted forecast for the pipeline,
//  and what was won this month. Pure (tests/unit/commission.test.mjs).
//
//  Deal value: a value the team typed on the lead, else the owner's asking price, else the budget.
//  Rate: the lead's own commissionPct when set, else DEFAULT_COMMISSION_PCT.
// =============================================================
import { parseMoney } from './crmLeadViews.js';

export const DEFAULT_COMMISSION_PCT = 2.5;

// How likely a deal at each stage is to close; the weighted forecast uses these
export const STAGE_PROBABILITY = { new: 0.05, contacted: 0.15, site_visit: 0.3, negotiating: 0.5, closing: 0.8, closed: 1, lost: 0 };

export const dealValue = (l) => parseMoney(l?.dealValue)
  || parseMoney(l?.details?.askingPrice)
  || parseMoney(l?.budget)
  || parseMoney(l?.details?.budget)
  || parseMoney(l?.details?.expectedPrice);

export const commissionPct = (l, fallback = DEFAULT_COMMISSION_PCT) => {
  const own = Number(l?.commissionPct);
  return own > 0 && own <= 20 ? own : fallback;
};

/** { value, pct, gross (if it closes), probability, weighted } */
export function leadCommission(l, fallback = DEFAULT_COMMISSION_PCT) {
  const value = dealValue(l);
  const pct = commissionPct(l, fallback);
  const gross = Math.round(value * (pct / 100));
  const probability = STAGE_PROBABILITY[l?.status || 'new'] ?? 0;
  return { value, pct, gross, probability, weighted: Math.round(gross * probability) };
}

const OPEN = ['new', 'contacted', 'site_visit', 'negotiating', 'closing'];
const sameMonth = (iso, now) => {
  const d = new Date(iso);
  const n = new Date(now);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
};

/** Open pipeline (gross if all close, weighted by stage) and commission on deals won this month */
export function commissionForecast(leads = [], { now = Date.now(), fallback = DEFAULT_COMMISSION_PCT } = {}) {
  let gross = 0;
  let weighted = 0;
  let late = 0; // negotiating + closing: the near-term part
  let wonThisMonth = 0;
  let wonCount = 0;
  let missingValue = 0;
  for (const l of leads) {
    if (!l || l.isArchived) continue;
    const st = l.status || 'new';
    const c = leadCommission(l, fallback);
    if (OPEN.includes(st)) {
      if (!c.value) { missingValue += 1; continue; }
      gross += c.gross;
      weighted += c.weighted;
      if (st === 'negotiating' || st === 'closing') late += c.gross;
    } else if (st === 'closed' && sameMonth(l.closedAt || l.lastStatusUpdate || l.updatedAt, now)) {
      wonThisMonth += c.gross;
      wonCount += 1;
    }
  }
  return { gross, weighted, late, wonThisMonth, wonCount, missingValue };
}
