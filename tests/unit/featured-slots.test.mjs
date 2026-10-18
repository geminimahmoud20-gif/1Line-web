import test from 'node:test';
import assert from 'node:assert/strict';
import { getHomepageSlots, featuredBlocker, homepageSummary, homeGridCount, HOME_FEATURED_SLOTS } from '../../src/utils/featuredSlots.js';

// A complete listing (title, photo, price, size, area), so only the field under test changes
const p = (id, extra = {}) => ({ id, title_ar: id, status: 'published', images: [`https://x/${id}.webp`], price: 1000000, size: 100, areaKey: 'east', ...extra });

test('auto-fill skips listings excluded from the homepage', () => {
  const list = [p('a', { homeExcluded: true }), p('b'), p('c'), p('d'), p('e')];
  assert.deepEqual(getHomepageSlots(list, 4).map((s) => s.property.id), ['b', 'c', 'd', 'e']);
});

test('an excluded listing still shows when it is pinned', () => {
  const list = [p('a', { homeExcluded: true, featured: true, featuredOrder: 1 }), p('b')];
  assert.deepEqual(getHomepageSlots(list, 2).map((s) => [s.property.id, s.source]), [['a', 'featured'], ['b', 'auto']]);
});

test('featuredBlocker says why a pinned listing is not on the homepage', () => {
  assert.equal(featuredBlocker(p('a', { featured: true })), null);
  assert.equal(featuredBlocker(p('a', { featured: true, status: 'hidden' })), 'hidden');
  assert.equal(featuredBlocker(p('a', { featured: true, status: 'sold' })), 'sold');
  assert.equal(featuredBlocker(p('a', { featured: true, isDeleted: true })), 'trash');
  assert.equal(featuredBlocker(p('a', { status: 'hidden' })), null);
});

test('homepageSummary separates live, blocked and excluded', () => {
  const list = [
    p('live', { featured: true }),
    p('hid', { featured: true, status: 'hidden' }),
    p('sold', { featured: true, status: 'sold' }),
    p('bin', { featured: true, status: 'trash' }),
    p('out', { homeExcluded: true })
  ];
  const s = homepageSummary(list);
  assert.equal(s.pinned, 3);
  assert.equal(s.live, 1);
  assert.deepEqual(s.blocked.map((x) => x.id), ['hid', 'sold']);
  assert.deepEqual(s.excluded.map((x) => x.id), ['out']);
});

test('an incomplete listing never reaches the homepage, and a pinned one says why', () => {
  const list = [p('a', { featured: true, images: [] }), p('b')];
  assert.deepEqual(getHomepageSlots(list, 2).map((s) => s.property.id), ['b']);
  assert.equal(featuredBlocker(list[0]), 'incomplete');
});

test('the homepage only shows counts that make full rows', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 9].map(homeGridCount), [0, 1, 2, 3, 4, 4, 6, 6]);
  const five = ['a', 'b', 'c', 'd', 'e'].map((id) => p(id));
  assert.equal(getHomepageSlots(five, HOME_FEATURED_SLOTS).length, 4);
  const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => p(id));
  assert.equal(getHomepageSlots(eight, HOME_FEATURED_SLOTS).length, 6);
});
