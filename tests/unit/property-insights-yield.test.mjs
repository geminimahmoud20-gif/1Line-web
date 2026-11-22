import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRentalYield, yieldSanity } from '../../src/utils/propertyInsights.js';

test('a believable shop rent gives a normal yield and no warning', () => {
  // 3,000,000 shop, 60 m², 25,000 a month for the whole shop
  const r = computeRentalYield({ price: 3000000, size: 60, rentPerSqm: 25000 / 60, occupancyPct: 100, opexPct: 2 });
  assert.equal(Math.round(r.grossYieldPct), 10);
  assert.equal(yieldSanity(r), null);
});

test('the whole-shop rent typed as per-m² is flagged instead of shown as 352%', () => {
  const r = computeRentalYield({ price: 3000000, size: 60, rentPerSqm: 15000, occupancyPct: 100, opexPct: 2 });
  assert.ok(r.grossYieldPct > 300);
  assert.equal(yieldSanity(r), 'high');
  assert.equal(yieldSanity(computeRentalYield({ price: 3000000, size: 60, rentPerSqm: 1, occupancyPct: 100, opexPct: 0 })), 'low');
  assert.equal(yieldSanity(null), null);
});

import { sensibleRentPerSqm } from '../../src/utils/propertyInsights.js';
test('a stored rent that gives an unbelievable yield is not shown to visitors', () => {
  // Nile Plaza office: 13.95M for 305 m²; 45,000 «rent per m²» is the sale price per m² → 1,180% a year
  assert.equal(sensibleRentPerSqm({ price: 13_950_000, size: 305, commercial: { rentPerSqm: 45_000 } }), 0);
  // 400 EGP per m² a month → about 10.5% a year: kept
  assert.equal(sensibleRentPerSqm({ price: 13_950_000, size: 305, commercial: { rentPerSqm: 400 } }), 400);
  // far too low (under 2%): dropped too
  assert.equal(sensibleRentPerSqm({ price: 13_950_000, size: 305, commercial: { rentPerSqm: 50 } }), 0);
  assert.equal(sensibleRentPerSqm({ price: 1_000_000, size: 100 }), 0);
});
