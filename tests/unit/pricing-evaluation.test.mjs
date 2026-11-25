import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateListingPricing } from '../../src/utils/pricingEvaluation.js';

const areas = [
  { id: 'east', name_ar: 'شرق سوهاج', avgPricePerMeter: 20000, priceMode: 'auto' },
  { id: 'new_sohag', name_ar: 'سوهاج الجديدة', avgPricePerMeter: 12000, priceMode: 'manual' }
];

const comparableListings = [
  { id: 'c1', areaKey: 'east', type: 'apartment', price: 2_000_000, size: 100, status: 'published' },
  { id: 'c2', areaKey: 'east', type: 'apartment', price: 2_000_000, size: 100, status: 'published' },
  { id: 'c3', areaKey: 'east', type: 'apartment', price: 2_000_000, size: 100, status: 'published' }
];

test('auto mode classifies below-market, fair, and owner-priced against area median', () => {
  const deal = { id: 'p1', areaKey: 'east', type: 'apartment', price: 1_700_000, size: 100, status: 'published' };
  const fair = { id: 'p2', areaKey: 'east', type: 'apartment', price: 2_100_000, size: 100, status: 'published' };
  const high = { id: 'p3', areaKey: 'east', type: 'apartment', price: 2_500_000, size: 100, status: 'published' };

  const rDeal = evaluateListingPricing(deal, { lang: 'ar', areas, allListings: comparableListings });
  assert.equal(rDeal.status, 'opportunity');
  assert.equal(rDeal.isOwnerPriced, false);
  assert.match(rDeal.cardBadge.label, /15%/);

  const rFair = evaluateListingPricing(fair, { lang: 'ar', areas, allListings: comparableListings });
  assert.equal(rFair.status, 'fair');
  assert.equal(rFair.isOwnerPriced, false);

  const rHigh = evaluateListingPricing(high, { lang: 'ar', areas, allListings: comparableListings });
  assert.equal(rHigh.status, 'owner_priced');
  assert.equal(rHigh.isOwnerPriced, true);
  assert.equal(rHigh.diffPercent, 25);
  assert.equal(rHigh.cardBadge.tone, 'owner');
  assert.ok(rHigh.detailNote.body.includes('المالك'));
});

test('explicit CRM pricingMode overrides work for any sector including commercial and buildings', () => {
  const shop = {
    id: 's1',
    areaKey: 'east',
    type: 'commercial',
    price: 5_000_000,
    size: 50,
    status: 'published',
    pricingMode: 'owner_priced',
    ownerPriceNote_ar: 'المالك متمسك بالسعر لوجود واجهة ١٠ متر.'
  };
  const r = evaluateListingPricing(shop, { lang: 'ar', areas, allListings: comparableListings });
  assert.equal(r.status, 'owner_priced');
  assert.equal(r.isOwnerPriced, true);
  assert.equal(r.detailNote.body, 'المالك متمسك بالسعر لوجود واجهة ١٠ متر.');

  const hidden = evaluateListingPricing({ ...shop, pricingMode: 'hide' }, { lang: 'ar', areas, allListings: comparableListings });
  assert.equal(hidden.status, 'none');
  assert.equal(hidden.cardBadge, null);
});

test('demo and sold listings never show pricing evaluation badges', () => {
  const demo = { id: 'd1', areaKey: 'east', type: 'apartment', price: 2_600_000, size: 100, isDemo: true };
  const sold = { id: 's2', areaKey: 'east', type: 'apartment', price: 2_600_000, size: 100, status: 'sold' };
  assert.equal(evaluateListingPricing(demo, { areas, allListings: comparableListings }).status, 'none');
  assert.equal(evaluateListingPricing(sold, { areas, allListings: comparableListings }).status, 'none');
});
