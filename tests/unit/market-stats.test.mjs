import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaMarketStats, budgetMatches, liveListings, assetClass, sampleKind, typeConflict, pricedListings } from '../../src/utils/marketStats.js';

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
  assert.equal(girga.villa.count, 1); // villas are their own market, not averaged with flats
  assert.equal(girga.residential.count, 0);
  assert.equal(girga.villa.ppmSample, 0); // no size → no price per m²
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

test('flats and villas are priced separately', () => {
  // Live New Sohag (Oct 2026): five flats and one villa
  const list = [
    { id: 1, areaKey: 'ns', type: 'apartment', price: 2520000, size: 156 },
    { id: 2, areaKey: 'ns', type: 'apartment', price: 2600000, size: 180 },
    { id: 3, areaKey: 'ns', type: 'apartment', price: 2300000, size: 183 },
    { id: 4, areaKey: 'ns', type: 'apartment', price: 2600000, size: 152 },
    { id: 5, areaKey: 'ns', type: 'apartment', price: 2000000, size: 140 },
    { id: 6, areaKey: 'ns', type: 'villa', price: 9750000, size: 500 },
  ];
  const [ns] = areaMarketStats(list);
  assert.deepEqual(ns.classes, ['residential', 'villa']);
  assert.equal(ns.residential.medianPpm, 14444); // 12,568 · 14,286 · 14,444 · 16,154 · 17,105
  assert.equal(ns.villa.medianPpm, 19500);
});

test('a listing saved under a type its own text contradicts stays out of the prices', () => {
  // Live Corniche East (Oct 2026): a corner shop saved as «شقة» (the form default)
  const shopAsFlat = { id: 's', areaKey: 'c', type: 'apartment', category: 'residential', price: 16850000, size: 226,
    title_ar: 'تجاري موج النيل _ ناصية على شارعين · خطوات من الكورنيش', description_ar: 'موقع  تجاري مميز جدا و استيراتيجي' };
  assert.equal(typeConflict(shopAsFlat), 'commercial');
  assert.equal(pricedListings([shopAsFlat]).length, 0);
  const [c] = areaMarketStats([shopAsFlat, { id: 'k', areaKey: 'c', type: 'commercial', price: 23700000, size: 320, title_ar: 'مشروع الماسة التجاري' }]);
  assert.equal(c.residential.count, 0);
  assert.equal(c.commercial.count, 1);
  // Ordinary titles are not flagged
  for (const p of [
    { type: 'apartment', title_ar: 'شقة فيو نيلي ش الجمهورية استيلم فوري' },
    { type: 'apartment', title_ar: 'شقه روف علي المحور الرئيسي بموقع استيراتيجي' },
    { type: 'apartment', title_ar: 'شقة بإطلالة طبيعية', description_ar: 'قريبة من المحلات والخدمات' },
    { type: 'villa', title_ar: 'فيلا _ مجاورة 7 _ خلف الرئيسي البحري' },
    { type: 'commercial', title_ar: 'تجاري نايل بلازا _ الكورنيش الشرقي' },
    { type: 'office', title_ar: 'مكتب اداري بمشروع نايل بلازا' },
  ]) assert.equal(typeConflict(p), '', p.title_ar);
  assert.equal(typeConflict({ type: 'office', title_ar: 'شقة 3 غرف للبيع' }), 'residential');
});
