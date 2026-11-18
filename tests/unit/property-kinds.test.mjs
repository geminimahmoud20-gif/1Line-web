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

test('the floor fact follows what the unit is: a house has floors, a flat is on one', async () => {
  const { floorSpec, isHouseType } = await import('../../src/utils/propertyKinds.js');
  assert.equal(isHouseType('villa'), true);
  assert.equal(isHouseType('apartment'), false);
  // a house or villa: how many floors it has (never «الدور»), even if an old record kept a floor number
  assert.equal(floorSpec({ type: 'villa', totalFloors: 2, floor: 0 }), 'دورين');
  assert.equal(floorSpec({ type: 'villa', totalFloors: 3, floor: 3 }), '3 أدوار');
  assert.equal(floorSpec({ type: 'villa', totalFloors: 1 }), 'دور واحد');
  assert.equal(floorSpec({ type: 'villa', totalFloors: 12 }), '12 دور');
  assert.equal(floorSpec({ type: 'villa' }), '');
  assert.equal(floorSpec({ type: 'villa', totalFloors: 2 }, false), '2 floors');
  // a whole building: its floors
  assert.equal(floorSpec({ type: 'building', totalFloors: 5 }), '5 أدوار');
  // a flat: its floor, and the building's when known
  assert.equal(floorSpec({ type: 'apartment', floor: 0 }), 'أرضي');
  assert.equal(floorSpec({ type: 'apartment', floor: 3 }), 'الدور 3');
  assert.equal(floorSpec({ type: 'apartment', floor: 3, totalFloors: 8 }), 'الدور 3 من 8');
  assert.equal(floorSpec({ type: 'apartment', floor: 9, totalFloors: 8 }), 'الدور 9'); // a total smaller than the floor is a typo
  assert.equal(floorSpec({ type: 'apartment', floor: '' }), '');
  // shops, offices and land keep their own lines
  assert.equal(floorSpec({ type: 'commercial', floor: 1 }), '');
  assert.equal(floorSpec({ type: 'land' }), '');
});
