import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryOfType, hasNoRooms, isLandType, feddanParts, formatFeddan, sizeLabel, pricePerFeddan, filledSpecs, FEDDAN_M2
} from '../../src/utils/propertyKinds.js';

test('agricultural and industrial types get their own category', () => {
  assert.equal(categoryOfType('agri_land'), 'agricultural');
  assert.equal(categoryOfType('farm'), 'agricultural');
  assert.equal(categoryOfType('factory'), 'industrial');
  assert.equal(categoryOfType('warehouse'), 'industrial');
  assert.equal(categoryOfType('industrial_land'), 'industrial');
  assert.equal(categoryOfType('land'), 'land');
  assert.equal(categoryOfType('apartment'), 'residential');
});

test('rooms and floors only where they make sense', () => {
  for (const t of ['agri_land', 'farm', 'factory', 'warehouse', 'industrial_land', 'land', 'commercial', 'office']) assert.equal(hasNoRooms(t), true, t);
  assert.equal(hasNoRooms('apartment'), false);
  assert.equal(isLandType('agri_land'), true);
  assert.equal(isLandType('industrial_land'), true);
  assert.equal(isLandType('factory'), false);
});

test('feddan and qirat from square metres', () => {
  assert.deepEqual(feddanParts(FEDDAN_M2), { feddan: 1, qirat: 0 });
  assert.deepEqual(feddanParts(FEDDAN_M2 * 2.5), { feddan: 2, qirat: 12 });
  assert.equal(formatFeddan(FEDDAN_M2 * 2.5), '2 فدان و12 قيراط');
  assert.equal(formatFeddan(FEDDAN_M2 / 2, false), '12 qirat');
  assert.equal(formatFeddan(0), '');
});

test('farmland reads in feddan, everything else in m²', () => {
  assert.equal(sizeLabel({ type: 'agri_land', size: FEDDAN_M2 * 3 }), '3 فدان');
  assert.equal(sizeLabel({ type: 'factory', size: 1500 }), '1,500 م²');
  assert.equal(pricePerFeddan({ type: 'agri_land', price: 3_000_000, size: FEDDAN_M2 * 2 }), 1_500_000);
});

test('filledSpecs lists only the filled details of the right family', () => {
  const p = { type: 'agri_land', agriWater: 'بئر', agriSoil: ' ', indPower: '500' };
  assert.deepEqual(filledSpecs(p).map((s) => s.key), ['agriWater']);
  assert.deepEqual(filledSpecs({ type: 'apartment', agriWater: 'x' }), []);
});
