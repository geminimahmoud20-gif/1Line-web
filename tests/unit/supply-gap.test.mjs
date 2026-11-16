import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supplyGapReport, bandLabel, cellLevel, PRICE_BANDS, TYPE_GROUPS } from '../../src/utils/supplyGap.js';
import { NO_AREA } from '../../src/utils/listingReview.js';

const areas = [
  { id: 'a', name_ar: 'سوهاج الجديدة' },
  { id: 'b', name_ar: 'الكورنيش' },
  { id: 'b1', name_ar: 'الكورنيش (شمال)', parentId: 'b' },
  { id: 'c', name_ar: 'جرجا' }
];
const L = (o) => ({ status: 'published', price: 1500000, ...o });
const props = [
  L({ id: 1, type: 'apartment', areaKey: 'a' }),
  L({ id: 2, type: 'apartment', areaKey: 'a', price: 4000000 }),
  L({ id: 3, type: 'apartment', areaKey: 'b1' }),
  L({ id: 4, type: 'commercial', areaKey: 'b', price: 9000000 }),
  L({ id: 5, type: 'farm', areaKey: 'a', price: 0 }),
  L({ id: 6, type: 'apartment', areaKey: 'zzz' }),
  L({ id: 7, type: 'apartment', areaKey: 'a', isDemo: true }),
  L({ id: 8, type: 'villa', areaKey: 'c', status: 'hidden' })
];

test('areas with no listing still appear, flagged empty', () => {
  const r = supplyGapReport(props, areas, 'live');
  const c = r.areas.find((x) => x.id === 'c');
  assert.equal(c.total, 0);
  assert.equal(c.status, 'empty');
  assert.deepEqual(r.summary.emptyAreas, ['جرجا']);
});
test('sub-area units count under their main area', () => {
  const r = supplyGapReport(props, areas, 'live');
  const b = r.areas.find((x) => x.id === 'b');
  assert.equal(b.cells.apartment, 1);
  assert.equal(b.cells.commercial, 1);
});
test('samples are left out and unknown areas go to the no-area row', () => {
  const r = supplyGapReport(props, areas, 'live');
  assert.equal(r.areas.find((x) => x.id === 'a').cells.apartment, 2);
  assert.equal(r.areas.find((x) => x.id === NO_AREA).cells.apartment, 1);
});
test('hidden listings count only on the "all" basis', () => {
  assert.equal(supplyGapReport(props, areas, 'live').colTotals.villa, 0);
  assert.equal(supplyGapReport(props, areas, 'all').colTotals.villa, 1);
});
test('types with nothing anywhere are reported missing', () => {
  const r = supplyGapReport(props, areas, 'live');
  assert.ok(r.summary.missingTypes.includes('villa'));
  assert.ok(r.summary.missingTypes.includes('land'));
  assert.ok(!r.summary.missingTypes.includes('apartment'));
});
test('gap cells = empty cells in real areas', () => {
  const r = supplyGapReport(props, areas, 'live');
  assert.equal(r.summary.cells, 3 * TYPE_GROUPS.length);
  const filled = r.areas.filter((x) => x.id !== NO_AREA).reduce((s, x) => s + Object.values(x.cells).filter((n) => n > 0).length, 0);
  assert.equal(r.summary.gapCells, r.summary.cells - filled);
});
test('price bands per kind: apartments land in the right band', () => {
  const r = supplyGapReport(props, areas, 'live');
  const apt = r.bands.find((x) => x.id === 'apartment');
  // 1.5M x3 (ids 1, 3, 6) -> band 1-2M; 4M -> 3.5-5M
  assert.equal(apt.bands[1].count, 3);
  assert.equal(apt.bands[3].count, 1);
  assert.equal(apt.bands[0].count, 0);
  assert.equal(apt.bands[4].count, 0);
});
test('listings without a price are counted apart from the bands', () => {
  const r = supplyGapReport(props, areas, 'live');
  const agri = r.bands.find((x) => x.id === 'agri');
  assert.equal(agri.total, 1);
  assert.equal(agri.noPrice, 1);
  assert.equal(agri.bands.reduce((s, b) => s + b.count, 0), 0);
});
test('band labels read naturally', () => {
  const cuts = PRICE_BANDS.apartment;
  assert.equal(bandLabel(cuts, 0), 'أقل من 1 مليون');
  assert.equal(bandLabel(cuts, 2), '2 – 3.5 مليون');
  assert.equal(bandLabel(cuts, 4), '5 مليون فأكتر');
});
test('cell levels', () => {
  assert.equal(cellLevel(0), 'gap');
  assert.equal(cellLevel(1), 'thin');
  assert.equal(cellLevel(5), 'ok');
});
