// =============================================================
//  The investment calculator (/financing → تحليل العائد الاستثماري): what a unit bought for
//  `price` and let at `monthlyRent` returns over `years`, with the costs an owner really has:
//  yearly maintenance, the months it stands empty, rent that rises each year, and the 2.5% sale
//  tax (Law 91/2005) when it is sold. Pure: tests/unit/roi-plan.test.mjs.
// =============================================================

export const SALE_TAX_PCT = 2.5;

/** Yearly upkeep: 0.5% of the price, at least 6,000 and at most 35,000 EGP */
export const yearlyMaintenance = (price) => Math.min(35000, Math.max(6000, Math.round((Number(price) || 0) * 0.005)));

/**
 * { grossYield, netYield, years: [{ year, value, rent, netRent }], totalNetRent, saleValue, saleTax,
 *   profit, profitPct, yearlyPct, paybackYears }
 * Percentages are numbers (9.99 = 9.99%). `yearlyPct` is the steady yearly rate that turns the
 * price into price + profit over `years`.
 */
export function roiPlan({ price, monthlyRent, growthPct = 12, rentGrowthPct = 10, vacantMonths = 1, years = 5 } = {}) {
  const p = Math.max(0, Number(price) || 0);
  const rent = Math.max(0, Number(monthlyRent) || 0);
  const vacant = Math.min(12, Math.max(0, Number(vacantMonths) || 0));
  const g = (Number(growthPct) || 0) / 100;
  const rg = (Number(rentGrowthPct) || 0) / 100;
  const upkeep = yearlyMaintenance(p);
  const rows = [];
  for (let y = 1; y <= years; y++) {
    const monthly = rent * Math.pow(1 + rg, y - 1);
    const gross = monthly * 12;
    const net = Math.max(0, monthly * (12 - vacant) - upkeep);
    rows.push({ year: y, value: Math.round(p * Math.pow(1 + g, y)), rent: Math.round(gross), netRent: Math.round(net) });
  }
  const first = rows[0] || { rent: 0, netRent: 0 };
  const totalNetRent = rows.reduce((s, r) => s + r.netRent, 0);
  const saleValue = rows.length ? rows[rows.length - 1].value : p;
  const saleTax = Math.round(saleValue * SALE_TAX_PCT / 100);
  const profit = saleValue - saleTax - p + totalNetRent;
  const pct = (n) => (p ? Math.round((n / p) * 10000) / 100 : 0);
  return {
    upkeep,
    vacant,
    grossYield: pct(first.rent),
    netYield: pct(first.netRent),
    firstYearNet: first.netRent,
    firstYearCosts: first.rent - first.netRent,
    years: rows,
    totalNetRent,
    saleValue,
    saleTax,
    profit,
    profitPct: pct(profit),
    yearlyPct: p && years ? Math.round((Math.pow(Math.max(0, (p + profit) / p), 1 / years) - 1) * 10000) / 100 : 0,
    paybackYears: first.netRent > 0 ? Math.round((p / first.netRent) * 10) / 10 : null
  };
}
