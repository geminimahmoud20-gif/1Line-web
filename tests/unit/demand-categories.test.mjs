import test from 'node:test';
import assert from 'node:assert/strict';
import { inDemandCategory, requestsCountAr, DEMAND_CATEGORIES } from '../../src/components/demands/demandCategories.js';

test('owner search and pills group request types the same way', () => {
  assert.equal(inDemandCategory('apartment', ''), true);
  assert.equal(inDemandCategory('land', ''), true);
  assert.equal(inDemandCategory('land', 'apartment'), false);
  assert.equal(inDemandCategory('shop', 'retail'), true);
  assert.equal(inDemandCategory('clinic', 'office'), true);
  assert.equal(inDemandCategory('apartment', 'apartment'), true);
  assert.ok(DEMAND_CATEGORIES.every((c) => c.single_ar && c.label_ar));
});

test('Arabic request counts read naturally', () => {
  assert.equal(requestsCountAr(1), 'طلب واحد مطابق');
  assert.equal(requestsCountAr(2), 'طلبين مطابقين');
  assert.equal(requestsCountAr(3), '3 طلبات مطابقة');
  assert.equal(requestsCountAr(12), '12 طلب مطابق');
});
