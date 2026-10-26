import test from 'node:test';
import assert from 'node:assert/strict';
import { listingIssues, matchesFilters, sortListings, listingReport, pricePerM2, NO_AREA, listingStatus } from '../../src/utils/listingReview.js';

const areas = [{ id: 'east', name_ar: 'شرق سوهاج' }, { id: 'west', name_ar: 'غرب سوهاج' }];
const known = new Set(areas.map((a) => a.id));
const full = { id: 'prop-1700000000000', title_ar: 'شقة', images: ['https://x/1.jpg'], price: 2000000, size: 100, areaKey: 'east', type: 'apartment', status: 'hidden' };

test('a complete listing has no issues; each missing fact is named', () => {
  assert.deepEqual(listingIssues(full, known), []);
  assert.deepEqual(listingIssues({ ...full, images: ['/no-photo.svg'], price: 0, areaKey: 'nowhere' }, known), ['photo', 'price', 'areaGone']);
  assert.deepEqual(listingIssues({ id: 'x' }, known), ['title', 'photo', 'price', 'size', 'area']);
  assert.ok(listingIssues({ ...full, price: 2500000, size: 150, bedrooms: 3 }, known).includes('legacy'));
});

test('filters: readiness, missing fact, no area, ranges, search, trash kept apart', () => {
  const noArea = { ...full, id: 'b', areaKey: '' };
  const sold = { ...full, id: 'c', status: 'sold', price: 5000000, size: 300 };
  const trashed = { ...full, id: 'd', isDeleted: true };
  const pick = (f) => [full, noArea, sold, trashed].filter((p) => matchesFilters(p, f, listingIssues(p, known))).map((p) => p.id);
  assert.deepEqual(pick({ status: 'all' }), ['prop-1700000000000', 'b', 'c']);
  assert.deepEqual(pick({ status: 'trash' }), ['d']);
  assert.deepEqual(pick({ status: 'hidden', readiness: 'ready' }), ['prop-1700000000000']);
  assert.deepEqual(pick({ readiness: 'incomplete' }), ['b']);
  assert.deepEqual(pick({ area: NO_AREA }), ['b']);
  assert.deepEqual(pick({ issue: 'area' }), ['b']);
  // An area deleted from the list counts as "no area" in the filters too
  const gone = { ...full, id: 'e', areaKey: 'removed_area' };
  const pickGone = (f) => [full, gone].filter((p) => matchesFilters(p, f, listingIssues(p, known))).map((p) => p.id);
  assert.deepEqual(pickGone({ area: NO_AREA }), ['e']);
  assert.deepEqual(pickGone({ issue: 'area' }), ['e']);
  assert.deepEqual(pick({ priceMin: 3000000 }), ['c']);
  assert.deepEqual(pick({ sizeMax: 150 }), ['prop-1700000000000', 'b']);
  assert.deepEqual(pick({ q: 'PROP-17' }), ['prop-1700000000000']);
});

test('sorting: newest by id time, price, per m², most incomplete', () => {
  const a = { ...full, id: 'prop-1700000000000', price: 3000000, size: 100 };
  const b = { ...full, id: 'prop-1800000000000', price: 1000000, size: 200, images: [] };
  const issuesOf = (p) => listingIssues(p, known);
  assert.deepEqual(sortListings([a, b], 'newest').map((p) => p.id), [b.id, a.id]);
  assert.deepEqual(sortListings([a, b], 'price_asc').map((p) => p.id), [b.id, a.id]);
  assert.deepEqual(sortListings([b, a], 'price_desc').map((p) => p.id), [a.id, b.id]);
  assert.deepEqual(sortListings([a, b], 'm2_asc').map((p) => p.id), [b.id, a.id]);
  assert.deepEqual(sortListings([a, b], 'incomplete', issuesOf).map((p) => p.id), [b.id, a.id]);
  assert.equal(pricePerM2(a), 30000);
  assert.equal(pricePerM2({ price: 1 }), 0);
});

test('report: status, data quality, ready-to-publish, per area incl. no area, medians', () => {
  const list = [
    full,
    { ...full, id: 'p2', status: 'published', price: 3000000 },
    { ...full, id: 'p3', areaKey: '', images: [] },
    { ...full, id: 'p4', status: 'sold', areaKey: 'west' },
    { ...full, id: 'p5', isDeleted: true },
    { ...full, id: 'demo', isDemo: true }
  ];
  const r = listingReport(list, areas, (t) => (t === 'apartment' ? 'شقق' : t));
  assert.equal(r.total, 4);
  assert.deepEqual(r.byStatus, { published: 1, hidden: 2, under_negotiation: 0, sold: 1 });
  assert.equal(r.quality.ready, 3);
  assert.equal(r.quality.photo, 1);
  assert.equal(r.quality.area, 1);
  assert.equal(r.readyHidden, 1);
  assert.equal(r.onSiteValue, 3000000);
  const east = r.areas.find((a) => a.id === 'east');
  assert.deepEqual([east.label, east.count, east.onSite, east.hidden, east.medianM2], ['شرق سوهاج', 2, 1, 1, 25000]);
  assert.equal(r.areas.find((a) => a.id === NO_AREA).label, 'من غير منطقة');
  assert.deepEqual([r.types[0].label, r.types[0].count, r.types[0].medianPrice], ['شقق', 4, 2000000]);
  assert.equal(listingStatus({ status: 'draft' }), 'hidden');
});
