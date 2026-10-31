import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, amenityMetrics, minutesAr, namedAmenities, distanceLabel } from '../../src/utils/amenityDistance.js';

test('reads the distances staff type', () => {
  assert.equal(distanceMeters('300 متر'), 300);
  assert.equal(distanceMeters('٧٥٠م'), 750);
  assert.equal(distanceMeters('1.5 كم'), 1500);
  assert.equal(distanceMeters('2km'), 2000);
  assert.equal(distanceMeters('١٫٢ كيلو'), 1200);
  assert.equal(distanceMeters('قريب'), null);
  assert.equal(distanceLabel(1200), '1.2 كم');
});

test('times follow the distance, not the old defaults', () => {
  // The live listing: every landmark stored «2 دقيقة بالسيارة · 6 دقائق مشي»
  const saved = { timeWalk: '6 دقائق', timeDrive: '2 دقيقة' };
  assert.deepEqual(amenityMetrics({ ...saved, distance: '1 متر' }), { distance: 'على بعد خطوات', walk: '', drive: '' });
  assert.deepEqual(amenityMetrics({ ...saved, distance: '70 متر' }), { distance: '70 متر', walk: 'دقيقة', drive: '' });
  assert.deepEqual(amenityMetrics({ ...saved, distance: '500 متر' }), { distance: '500 متر', walk: '7 دقائق', drive: '3 دقائق' });
  assert.deepEqual(amenityMetrics({ ...saved, distance: '800 متر' }), { distance: '800 متر', walk: '10 دقائق', drive: '3 دقائق' });
  assert.deepEqual(amenityMetrics({ distance: '5 كم' }), { distance: '5 كم', walk: '', drive: '14 دقيقة' });
  assert.equal(minutesAr(2), 'دقيقتين');
  // No number: shown as typed
  assert.deepEqual(amenityMetrics({ distance: 'على الكورنيش' }), { distance: 'على الكورنيش', walk: '', drive: '' });
});

test('landmarks without a name are left out', () => {
  assert.deepEqual(namedAmenities([{ name_ar: 'فندق ازور' }, { name_ar: '  ' }, { distance: '500 متر' }]).length, 1);
});
