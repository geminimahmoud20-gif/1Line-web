import test from 'node:test';
import assert from 'node:assert/strict';
import { roiPlan, yearlyMaintenance } from '../../src/utils/roiPlan.js';

test('net yield takes off upkeep and the months the unit stands empty', () => {
  const r = roiPlan({ price: 8_000_000, monthlyRent: 69_500, growthPct: 15, rentGrowthPct: 0, vacantMonths: 1 });
  assert.equal(yearlyMaintenance(8_000_000), 35_000);
  assert.equal(r.grossYield, 10.43);               // 834,000 / 8M
  assert.equal(r.firstYearNet, 69_500 * 11 - 35_000); // 729,500
  assert.equal(r.netYield, 9.12);
  assert.equal(r.firstYearCosts, 69_500 + 35_000);
});

test('five years: value, rent rising each year, sale tax and the yearly rate', () => {
  const r = roiPlan({ price: 1_000_000, monthlyRent: 10_000, growthPct: 10, rentGrowthPct: 10, vacantMonths: 0 });
  assert.deepEqual(r.years.map((y) => y.value), [1_100_000, 1_210_000, 1_331_000, 1_464_100, 1_610_510]);
  assert.equal(r.years[1].rent, 132_000);
  assert.equal(r.saleTax, Math.round(1_610_510 * 0.025));
  assert.equal(r.profit, r.saleValue - r.saleTax - 1_000_000 + r.totalNetRent);
  assert.ok(r.yearlyPct > 10 && r.yearlyPct < 30, String(r.yearlyPct));
  assert.ok(r.paybackYears > 8 && r.paybackYears < 9);
});

test('no price or no rent gives zeros, not NaN', () => {
  const r = roiPlan({ price: 0, monthlyRent: 0 });
  assert.equal(r.netYield, 0);
  assert.equal(r.yearlyPct, 0);
  assert.equal(r.paybackYears, null);
});
