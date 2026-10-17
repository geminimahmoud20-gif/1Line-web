import test from 'node:test';
import assert from 'node:assert/strict';
import { getHomepageSlots, featuredBlocker, homepageSummary } from '../../src/utils/featuredSlots.js';

const p = (id, extra = {}) => ({ id, title_ar: id, status: 'published', ...extra });

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
