import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeStoredAreas, DEFAULT_SOHAG_AREAS } from '../../src/utils/areasData.js';

const ids = (list) => list.map((a) => a.id);

test('nothing saved → the built-in list', () => {
  assert.deepEqual(ids(mergeStoredAreas(null)), ids(DEFAULT_SOHAG_AREAS));
  assert.deepEqual(ids(mergeStoredAreas([])), ids(DEFAULT_SOHAG_AREAS));
});

test('a deleted built-in area stays deleted', () => {
  const saved = DEFAULT_SOHAG_AREAS.filter((a) => a.id !== 'kawthar');
  const out = mergeStoredAreas(saved);
  assert.ok(!ids(out).includes('kawthar'));
  assert.equal(out.length, DEFAULT_SOHAG_AREAS.length - 1);
});

test('"all" is always present and first', () => {
  const out = mergeStoredAreas([{ id: 'east', name_ar: 'شرق' }, { id: 'zahraa', name_ar: 'الزهراء' }]);
  assert.deepEqual(ids(out), ['all', 'east', 'zahraa']);
  const moved = mergeStoredAreas([{ id: 'east' }, { id: 'all', name_ar: 'الكل' }]);
  assert.deepEqual(ids(moved), ['all', 'east']);
  assert.equal(moved[0].name_ar, 'الكل');
});

test('built-in reference data fills gaps; saved values win, 0% growth kept', () => {
  const [east] = mergeStoredAreas([{ id: 'east', name_ar: 'شرق سوهاج', annualGrowthRate: 0 }]).slice(1);
  const def = DEFAULT_SOHAG_AREAS.find((a) => a.id === 'east');
  assert.equal(east.annualGrowthRate, 0);
  assert.equal(east.avgPricePerMeter, def.avgPricePerMeter);
  assert.deepEqual(east.amenities, def.amenities);
  const [mine] = mergeStoredAreas([{ id: 'east', amenities: [] }]).slice(1);
  assert.deepEqual(mine.amenities, []);
});

test('duplicates and junk entries are dropped', () => {
  const out = mergeStoredAreas([{ id: 'x' }, { id: 'x', name_ar: 'dup' }, null, { name_ar: 'no id' }]);
  assert.deepEqual(ids(out), ['all', 'x']);
});
