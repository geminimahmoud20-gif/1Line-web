// Unit tests for the money logic shown to buyers. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFinanceBreakdown, computeRentalYield, splitFamilyCost } from '../../src/utils/propertyInsights.js';
import { findTradeMatches, matchInventory, reachBudget } from '../../src/utils/tradeInEngine.js';

test('finance: complete plan totals and premium over cash', () => {
  const fb = computeFinanceBreakdown({ price: 1_200_000, downPayment: 240_000, monthlyInstallment: 20_000, installmentYears: 5 });
  assert.equal(fb.plan.months, 60);
  assert.equal(fb.plan.total, 240_000 + 20_000 * 60);
  assert.equal(fb.plan.incomplete, false);
  assert.equal(fb.plan.premiumOverCash, fb.plan.total - 1_200_000);
});

test('finance: a plan that does not reach the price is flagged with the exact unscheduled balance', () => {
  const fb = computeFinanceBreakdown({ price: 3_450_000, downPayment: 1_000_000, monthlyInstallment: 25_000, installmentYears: 5, finance: { handoverPayment: 150_000 } });
  assert.equal(fb.plan.incomplete, true);
  assert.equal(fb.plan.unscheduled, 3_450_000 - (1_000_000 + 25_000 * 60 + 150_000));
});

test('finance: cash discount and all-in extras', () => {
  const fb = computeFinanceBreakdown({ price: 1_000_000, finance: { cashPrice: 900_000, maintenancePct: 8, overPrice: 50_000, utilitiesCost: 10_000, transferCost: 5_000 } });
  assert.equal(fb.cashDiscountPct, 10);
  assert.equal(fb.maintenance.amount, 80_000);
  assert.equal(fb.cashAllIn, 900_000 + 50_000 + 80_000 + 10_000 + 5_000);
  assert.equal(fb.plan, null);
});

test('finance: a cash price above the listed price is ignored', () => {
  const fb = computeFinanceBreakdown({ price: 1_000_000, finance: { cashPrice: 1_500_000 } });
  assert.equal(fb.cashPrice, 1_000_000);
});

test('rental yield: cap rate and payback', () => {
  const y = computeRentalYield({ price: 2_000_000, size: 100, rentPerSqm: 200, occupancyPct: 100, opexPct: 0 });
  assert.equal(y.grossAnnual, 240_000);
  assert.equal(y.capRatePct, 12);
  assert.ok(Math.abs(y.paybackYears - 8.333) < 0.01);
  assert.equal(computeRentalYield({ price: 1, size: 1, rentPerSqm: 0 }), null);
});

test('family split: shares normalised to the total', () => {
  const s = splitFamilyCost({ down: 300_000, monthly: 30_000, cashPrice: 3_000_000 }, [50, 25, 25]);
  assert.deepEqual(s.map((x) => Math.round(x.down)), [150_000, 75_000, 75_000]);
  const t = splitFamilyCost({ down: 100, monthly: 10, cashPrice: 1000 }, [1, 1]);
  assert.equal(t[0].share, 50);
});

test('trade-in: mutual swap is found and ranked above one-way', () => {
  const a = { id: 'a', offerType: 'apartment', offerSize: 120, offerValue: 2_000_000, offerGovernorate: 'sohag', wantType: 'villa', diffMode: 'pay', diffAmount: 1_000_000 };
  const b = { id: 'b', offerType: 'villa', offerSize: 300, offerValue: 3_000_000, offerGovernorate: 'sohag', wantType: 'bigger_apartment', diffMode: 'receive', diffAmount: 1_000_000 };
  const c = { id: 'c', offerType: 'villa', offerSize: 280, offerValue: 3_100_000, offerGovernorate: 'qena', wantType: 'land', diffMode: 'even' };
  const m = findTradeMatches([a, b, c]);
  assert.ok(m.length >= 2);
  assert.equal(m[0].mutual, true);
  assert.deepEqual([m[0].a.id, m[0].b.id].sort(), ['a', 'b']);
  assert.equal(reachBudget(a), 3_000_000);
  assert.equal(reachBudget(b), 2_000_000);
});

test('trade-in: inventory matches respect type, size and budget', () => {
  const req = { wantType: 'bigger_apartment', offerType: 'apartment', offerSize: 120, offerValue: 2_000_000, diffMode: 'even' };
  const props = [
    { id: 'p1', type: 'apartment', size: 150, price: 2_100_000 },
    { id: 'p2', type: 'apartment', size: 100, price: 1_500_000 },
    { id: 'p3', type: 'apartment', size: 160, price: 5_000_000 },
    { id: 'p4', type: 'villa', size: 300, price: 2_000_000 },
    { id: 'p5', type: 'apartment', size: 140, price: 1_900_000, status: 'hidden' }
  ];
  assert.deepEqual(matchInventory(req, props).map((x) => x.property.id), ['p1']);
});
