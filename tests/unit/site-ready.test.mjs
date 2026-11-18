import test from 'node:test';
import assert from 'node:assert/strict';
import { siteGaps, isSiteReady, forSite } from '../../src/utils/siteReady.js';

const full = { id: 'a', title_ar: 'شقة', images: ['https://x/1.webp'], price: 1900000, size: 110, areaKey: 'east' };

test('a complete listing reaches the site', () => {
  assert.deepEqual(siteGaps(full), []);
  assert.equal(isSiteReady(full), true);
});

test('missing photos, price, size, area or title keep it off', () => {
  assert.deepEqual(siteGaps({ ...full, images: [] }), ['photo']);
  assert.deepEqual(siteGaps({ ...full, images: ['/no-photo.svg'] }), ['photo']);
  assert.deepEqual(siteGaps({ ...full, images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c'] }), ['photo']);
  assert.deepEqual(siteGaps({ ...full, price: 0, size: '', areaKey: '' }), ['price', 'size', 'area']);
  assert.deepEqual(siteGaps({ ...full, title_ar: ' ' }), ['title']);
});

test('forSite drops incomplete listings and keeps bundled samples', () => {
  const list = forSite([full, { ...full, id: 'b', images: [] }, { id: 'demo', isDemo: true }]);
  assert.deepEqual(list.map((p) => p.id), ['a', 'demo']);
});
