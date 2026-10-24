import test from 'node:test';
import assert from 'node:assert/strict';
import { similarListings } from '../../src/utils/similarListings.js';

const unit = { id: 'u', type: 'apartment', areaKey: 'new_sohag', price: 2_520_000, size: 156, bedrooms: 3 };
const pool = [
  { id: 'same-area-apt', type: 'apartment', areaKey: 'new_sohag', price: 2_300_000, size: 150, bedrooms: 3 },
  { id: 'nile-apt-pricey', type: 'apartment', areaKey: 'east', price: 7_500_000, size: 186, bedrooms: 3 },
  { id: 'villa-same-area', type: 'villa', areaKey: 'new_sohag', price: 2_600_000, size: 400, bedrooms: 5 },
  { id: 'land-same-area', type: 'land', areaKey: 'new_sohag', price: 2_500_000, size: 300 },
  { id: 'other-area-apt', type: 'apartment', areaKey: 'west', price: 2_700_000, size: 170, bedrooms: 3 },
  { id: 'sold-apt', type: 'apartment', areaKey: 'new_sohag', price: 2_500_000, size: 156, status: 'sold' },
  { id: 'demo-apt', type: 'apartment', areaKey: 'new_sohag', price: 2_500_000, size: 156, isDemo: true }
];

test('similar means the same type at a comparable price, the same area first', () => {
  assert.deepEqual(similarListings(unit, pool).map((p) => p.id), ['same-area-apt', 'other-area-apt']);
});

test('nothing comparable leaves the section empty instead of filling it with anything', () => {
  assert.deepEqual(similarListings({ ...unit, price: 20_000_000 }, pool), []);
});

test('non-residential kinds can match within their own category', () => {
  const shop = { id: 's', type: 'commercial', areaKey: 'east', price: 1_000_000, size: 40 };
  const list = [{ id: 'shop2', type: 'commercial', areaKey: 'west', price: 1_100_000, size: 45 }, { id: 'flat', type: 'apartment', areaKey: 'east', price: 1_000_000, size: 90 }];
  assert.deepEqual(similarListings(shop, list).map((p) => p.id), ['shop2']);
});
