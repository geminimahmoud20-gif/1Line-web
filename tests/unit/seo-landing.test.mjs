import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDING_KINDS, parseLanding, landingListings, landingSummary, landingCopy, landingFaq, landingPages, landingPath } from '../../src/utils/seoLanding.js';

const apt = LANDING_KINDS.find((k) => k.slug === 'apartments-for-sale');
const list = [
  { id: 'a', type: 'apartment', areaKey: 'new_sohag', price: 2_000_000, size: 100, status: 'published' },
  { id: 'b', type: 'duplex', areaKey: 'new_sohag', price: 3_000_000, size: 150, status: 'published' },
  { id: 'c', type: 'apartment', areaKey: 'east', price: 4_000_000, size: 160, status: 'published' },
  { id: 'd', type: 'apartment', areaKey: 'east', price: 1_000_000, size: 90, isDemo: true },
  { id: 'e', type: 'apartment', areaKey: 'east', price: 1_000_000, size: 90, status: 'sold' },
  { id: 'f', type: 'commercial', areaKey: 'center', price: 5_000_000, size: 60, status: 'published' }
];

test('URLs parse back to their kind and area; unknown ones do not', () => {
  assert.equal(parseLanding('apartments-for-sale').kind, apt);
  assert.equal(parseLanding('apartments-for-sale', 'new-sohag').area.id, 'new_sohag');
  assert.equal(parseLanding('apartments-for-sale', 'mars'), null);
  assert.equal(parseLanding('yachts-for-sale'), null);
  assert.equal(landingPath(apt, { slug: 'new-sohag' }), '/sohag/apartments-for-sale/new-sohag');
});

test('only real, published listings of the kind and area count', () => {
  assert.deepEqual(landingListings(list, apt).map((p) => p.id), ['a', 'b', 'c']);
  assert.deepEqual(landingListings(list, apt, { id: 'new_sohag' }).map((p) => p.id), ['a', 'b']);
});

test('figures and copy come from the listings', () => {
  const s = landingSummary(landingListings(list, apt, { id: 'new_sohag' }));
  assert.deepEqual(s, { count: 2, medianPpm: 20_000, minPrice: 2_000_000, maxPrice: 3_000_000 });
  const c = landingCopy(apt, { ar: 'سوهاج الجديدة' }, s);
  assert.equal(c.h1, 'شقق للبيع في سوهاج الجديدة');
  assert.match(c.description, /2 عروض متاحة/);
  assert.ok(c.description.length <= 165);
  assert.match(landingFaq(apt, null, s)[0].a, /20,000 ج\.م/);
  const empty = landingCopy(apt, null, landingSummary([]));
  assert.match(empty.intro, /لسه مفيش/);
  assert.equal(landingFaq(apt, null, landingSummary([])).length, 2);
});

test('the sitemap gets only pages with listings', () => {
  const paths = landingPages(list).map((p) => p.path);
  assert.deepEqual(paths, [
    '/sohag/apartments-for-sale', '/sohag/apartments-for-sale/new-sohag', '/sohag/apartments-for-sale/east-sohag',
    '/sohag/shops-for-sale', '/sohag/shops-for-sale/downtown'
  ]);
});
