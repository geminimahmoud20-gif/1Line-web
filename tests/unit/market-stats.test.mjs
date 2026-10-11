import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaMarketStats, budgetMatches, liveListings, assetClass } from '../../src/utils/marketStats.js';

const props = [
  { id: 1, areaKey: 'east', type: 'apartment', price: 2000000, size: 100, status: 'published' },
  { id: 2, areaKey: 'east', type: 'apartment', price: 3000000, size: 120, status: 'published' },
  { id: 3, areaKey: 'east', type: 'commercial', price: 4000000, size: 50 },
  { id: 4, areaKey: 'east', type: 'apartment', price: 9000000, size: 100, isDemo: true },
  { id: 5, areaKey: 'girga', type: 'land', price: 1500000, size: 300, status: 'hidden' },
  { id: 6, areaKey: 'girga', type: 'villa', price: 5000000, size: 0 },
];

test('only real, published, priced listings count', () => {
  assert.deepEqual(liveListings(props).map((p) => p.id), [1, 2, 3, 6]);
  assert.equal(assetClass({ type: 'office' }), 'commercial');
  assert.equal(assetClass({ category: 'land' }), 'land');
});

test('per-area medians split homes and commercial', () => {
  const [east, girga] = areaMarketStats(props);
  assert.equal(east.areaId, 'east');
  assert.equal(east.total, 3);
  assert.equal(east.residential.medianPpm, 22500); // median of 20000 and 25000
  assert.equal(east.commercial.medianPpm, 80000);
  assert.equal(girga.residential.count, 1);
  assert.equal(girga.residential.ppmSample, 0); // no area → no price per m²
});

test('budget matches count what is listed now', () => {
  const m = budgetMatches(props, 3000000);
  assert.equal(m.count, 2);
  assert.deepEqual(m.areas, [['east', 2]]);
  assert.deepEqual(m.classes, { residential: 2 });
});
