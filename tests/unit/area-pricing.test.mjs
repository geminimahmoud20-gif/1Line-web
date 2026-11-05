import test from 'node:test';
import assert from 'node:assert/strict';
import { areaPrice, priceModeOf } from '../../src/utils/areaPricing.js';

const areas = [
  { id: 'new', name_ar: 'سوهاج الجديدة', avgPricePerMeter: 12000 },
  { id: 'd5', name_ar: 'الحي الخامس', parentId: 'new' },
  { id: 'east', name_ar: 'شرق', avgPricePerMeter: 20000, priceMode: 'manual' },
  { id: 'empty', name_ar: 'فاضية', avgPricePerMeter: 9000 }
];
const flat = (areaKey, price, size, extra = {}) => ({ areaKey, price, size, type: 'apartment', title_ar: 'شقة', status: 'published', ...extra });

test('auto: the median of the flats, sub-areas counted under the main area', () => {
  const props = [flat('new', 1_000_000, 100), flat('d5', 1_500_000, 100), flat('new', 2_000_000, 100)];
  const r = areaPrice(areas[0], props, areas);
  assert.equal(r.source, 'listings');
  assert.equal(r.ppm, 15000);
  assert.equal(r.sample, 3);
  assert.equal(r.kind, 'median');
  assert.equal(r.count, 3);
});

test('auto: no flats → the kind with most listings', () => {
  const props = [flat('new', 3_000_000, 50, { type: 'commercial', title_ar: 'محل' })];
  const r = areaPrice(areas[0], props, areas);
  assert.equal(r.cls, 'commercial');
  assert.equal(r.ppm, 60000);
  assert.equal(r.kind, 'single');
});

test('auto with nothing listed shows nothing, never the typed figure', () => {
  const r = areaPrice(areas[3], [], areas);
  assert.equal(r.source, 'none');
  assert.equal(r.ppm, 0);
});

test('manual: the CRM figure, listings still counted', () => {
  const r = areaPrice(areas[2], [flat('east', 5_000_000, 100)], areas);
  assert.equal(r.source, 'manual');
  assert.equal(r.ppm, 20000);
  assert.equal(r.count, 1);
});

test('areas saved before the choice existed are priced from listings', () => {
  assert.equal(priceModeOf({}), 'auto');
  assert.equal(priceModeOf({ priceMode: 'manual' }), 'manual');
});
