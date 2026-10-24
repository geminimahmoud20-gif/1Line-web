import test from 'node:test';
import assert from 'node:assert/strict';
import { AMENITY_CATEGORIES, amenityCategory, categoriesIn } from '../../src/utils/amenityCategories.js';

test('the five original ids are still there, so older listings keep their icons', () => {
  const ids = AMENITY_CATEGORIES.map((c) => c.id);
  for (const id of ['education', 'health', 'shopping', 'transport', 'lifestyle']) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length);
});

test('only the categories a listing uses become tabs, in the canonical order', () => {
  const list = [{ category: 'transport' }, { category: 'pharmacy' }, { category: 'transport' }, { category: 'education' }];
  assert.deepEqual(categoriesIn(list).map((c) => c.id), ['education', 'pharmacy', 'transport']);
});

test('unknown or missing categories fall back to "other"', () => {
  assert.equal(amenityCategory('nope').id, 'other');
  assert.equal(amenityCategory().icon, 'MapPin');
  assert.deepEqual(categoriesIn([{ category: 'banks' }, {}]).map((c) => c.id), ['banks', 'other']);
});
