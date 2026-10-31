import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaMarketStats, budgetMatches, liveListings, assetClass, sampleKind } from '../../src/utils/marketStats.js';

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
  assert.equal(assetClass({ type: 'office' }), 'administrative');
  assert.equal(assetClass({ type: 'commercial' }), 'commercial');
  assert.equal(assetClass({ type: 'retail' }), 'commercial');
  assert.equal(assetClass({ type: 'agri_land' }), 'agricultural');
  assert.equal(assetClass({ type: 'building' }), 'building');
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

test('each kind of property keeps its own price range; one listing is labelled as one', () => {
  const list = [
    { id: 'a', areaKey: 'north', type: 'apartment', price: 2000000, size: 130 },
    { id: 'b', areaKey: 'north', type: 'apartment', price: 2600000, size: 150 },
    { id: 'c', areaKey: 'north', type: 'apartment', price: 3100000, size: 160 },
    { id: 'd', areaKey: 'north', type: 'commercial', price: 9800000, size: 120 },
    { id: 'e', areaKey: 'north', type: 'office', price: 4000000, size: 80 },
    { id: 'f', areaKey: 'north', type: 'land', price: 7000000, size: 400 },
  ];
  const [north] = areaMarketStats(list);
  assert.deepEqual(north.classes, ['residential', 'commercial', 'administrative', 'land']);
  // the homes' range is homes only: the 9.8M shop and the 7M plot don't widen it
  assert.equal(north.residential.minPrice, 2000000);
  assert.equal(north.residential.maxPrice, 3100000);
  assert.equal(north.residential.minPpm, 15385);
  assert.equal(north.residential.maxPpm, 19375);
  assert.equal(north.commercial.medianPpm, 81667);
  assert.equal(north.administrative.medianPpm, 50000);
  assert.equal(sampleKind(north.residential.ppmSample), 'median');
  assert.equal(sampleKind(2), 'pair');
  assert.equal(sampleKind(north.commercial.ppmSample), 'single');
  assert.equal(sampleKind(0), 'none');
});
